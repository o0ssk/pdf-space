import { downloadBlob } from "../downloads/downloadBlob";
import {
  asPdfExportError,
  PdfExportError,
  throwIfExportCancelled,
} from "./exportErrors";
import { createSuggestedZipFileName } from "./exportFileNames";
import { createPdfExportZip, ZipExportProgress } from "./exportZip";
import {
  exportAllPdfDocuments,
  exportPdfDocument,
} from "./normalPdfExporter";
import {
  ExportAllResult,
  ExportableDocument,
  ExportSourceResolver,
  ExportedPdfDocument,
  PdfExportProgressCallback,
} from "./exportTypes";
import { ExportUiError, mapPdfExportErrorToUi } from "./exportUiErrors";

export type ExportJobDocumentConfig = {
  documentId: string;
  fileName: string;
};

export type ExportJobSuccess = {
  documentId: string;
  documentName: string;
  fileName: string;
  pageCount: number;
};

export type ExportJobFailure = {
  documentId: string;
  documentName: string;
  fileName: string;
  error: PdfExportError;
  uiError: ExportUiError;
};

export type ExportJobSkipped = {
  documentId: string;
  documentName: string;
  reason: "EMPTY_DOCUMENT";
};

export type ExportJobResult = {
  successful: ExportJobSuccess[];
  failed: ExportJobFailure[];
  skipped: ExportJobSkipped[];
  download:
    | {
        kind: "pdf" | "zip";
        fileName: string;
        documentCount: number;
      }
    | null;
};

export type ExportJobDependencies = {
  exportSingle: typeof exportPdfDocument;
  exportAll: typeof exportAllPdfDocuments;
  createZip: typeof createPdfExportZip;
  download: typeof downloadBlob;
};

const defaultDependencies: ExportJobDependencies = {
  exportSingle: exportPdfDocument,
  exportAll: exportAllPdfDocuments,
  createZip: createPdfExportZip,
  download: downloadBlob,
};

function createFailure({
  document,
  fileName,
  error,
}: {
  document: ExportableDocument;
  fileName: string;
  error: unknown;
}): ExportJobFailure {
  const exportError = asPdfExportError(error);
  if (import.meta.env.DEV) {
    console.error("PDF export failed", {
      code: exportError.code,
      documentId: document.id,
      sourceDocumentId: exportError.details?.sourceDocumentId,
      originalPageIndex: exportError.details?.originalPageIndex,
      cause: exportError.cause,
    });
  }
  return {
    documentId: document.id,
    documentName: document.name,
    fileName,
    error: exportError,
    uiError: mapPdfExportErrorToUi(exportError),
  };
}

function mapSuccess(
  exported: ExportedPdfDocument,
  fileName: string
): ExportJobSuccess {
  return {
    documentId: exported.documentId,
    documentName: exported.documentName,
    fileName,
    pageCount: exported.pageCount,
  };
}

export async function executePdfExportJob({
  projectId,
  projectName,
  documents,
  configurations,
  resolveSourceBytes,
  signal,
  onPdfProgress,
  onZipProgress,
  onDownloading,
  dependencies = defaultDependencies,
}: {
  projectId: string;
  projectName: string;
  documents: readonly ExportableDocument[];
  configurations: readonly ExportJobDocumentConfig[];
  resolveSourceBytes: ExportSourceResolver;
  signal?: AbortSignal | undefined;
  onPdfProgress?: PdfExportProgressCallback | undefined;
  onZipProgress?: ((progress: ZipExportProgress) => void) | undefined;
  onDownloading?: (() => void) | undefined;
  dependencies?: ExportJobDependencies | undefined;
}): Promise<ExportJobResult> {
  throwIfExportCancelled(signal);
  const documentsById = new Map(
    documents.map((document) => [document.id, document])
  );
  const selectedDocuments = configurations
    .map((configuration) => documentsById.get(configuration.documentId))
    .filter((document): document is ExportableDocument => Boolean(document));
  const fileNameByDocumentId = new Map(
    configurations.map((configuration) => [
      configuration.documentId,
      configuration.fileName,
    ])
  );

  if (selectedDocuments.length === 0) {
    return { successful: [], failed: [], skipped: [], download: null };
  }

  if (selectedDocuments.length === 1) {
    const document = selectedDocuments[0];
    if (!document) {
      return { successful: [], failed: [], skipped: [], download: null };
    }
    const fileName = fileNameByDocumentId.get(document.id)!;
    if (document.pages.length === 0) {
      return {
        successful: [],
        failed: [],
        skipped: [
          {
            documentId: document.id,
            documentName: document.name,
            reason: "EMPTY_DOCUMENT",
          },
        ],
        download: null,
      };
    }
    try {
      const exported = await dependencies.exportSingle({
        document,
        resolveSourceBytes,
        signal,
        onProgress: onPdfProgress,
      });
      throwIfExportCancelled(signal);
      onDownloading?.();
      dependencies.download({ blob: exported.blob, fileName });
      return {
        successful: [mapSuccess(exported, fileName)],
        failed: [],
        skipped: [],
        download: {
          kind: "pdf",
          fileName,
          documentCount: 1,
        },
      };
    } catch (error) {
      const exportError = asPdfExportError(error);
      if (exportError.code === "EXPORT_CANCELLED") throw exportError;
      return {
        successful: [],
        failed: [createFailure({ document, fileName, error: exportError })],
        skipped: [],
        download: null,
      };
    }
  }

  let exportResult: ExportAllResult;
  try {
    exportResult = await dependencies.exportAll({
      project: {
        id: projectId,
        name: projectName,
        documents: selectedDocuments,
      },
      resolveSourceBytes,
      signal,
      onProgress: onPdfProgress,
    });
  } catch (error) {
    const exportError = asPdfExportError(error);
    if (exportError.code === "EXPORT_CANCELLED") throw exportError;
    throw exportError;
  }

  const successful = exportResult.exported.map((exported) =>
    mapSuccess(exported, fileNameByDocumentId.get(exported.documentId)!)
  );
  const failed = exportResult.failed.map((failure) => {
    const document = documentsById.get(failure.documentId)!;
    return createFailure({
      document,
      fileName: fileNameByDocumentId.get(failure.documentId)!,
      error: failure.error,
    });
  });
  const skipped = exportResult.skipped;

  if (exportResult.exported.length === 0) {
    return { successful, failed, skipped, download: null };
  }

  throwIfExportCancelled(signal);
  const zipBlob = await dependencies.createZip({
    entries: exportResult.exported.map((exported) => ({
      fileName: fileNameByDocumentId.get(exported.documentId)!,
      bytes: exported.bytes,
    })),
    signal,
    onProgress: onZipProgress,
  });
  throwIfExportCancelled(signal);
  const zipFileName = createSuggestedZipFileName(projectName);
  onDownloading?.();
  dependencies.download({ blob: zipBlob, fileName: zipFileName });

  return {
    successful,
    failed,
    skipped,
    download: {
      kind: "zip",
      fileName: zipFileName,
      documentCount: successful.length,
    },
  };
}
