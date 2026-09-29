import { PDFDocument } from "pdf-lib";
import { WorkspaceSourceDocument } from "../../types/workspace";
import { PdfExportError, throwIfExportCancelled } from "./exportErrors";
import {
  ExportSourceData,
  ExportSourceOrigin,
  ExportSourceResolver,
  PlannedExportPage,
  ResolvedExportSource,
} from "./exportTypes";

export type PdfSourceLoadProgress = {
  completedSources: number;
  totalSources: number;
  currentSourceDocumentId?: string | undefined;
  currentSourceName?: string | undefined;
  currentSourceNumber?: number | undefined;
};

type SourceUsage = {
  documentIds: string[];
  documentNames: string[];
};

export function getRequiredSourceDocumentIds(
  pages: readonly PlannedExportPage[]
): string[] {
  const sourceIds: string[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    if (!page.sourceDocumentId || seen.has(page.sourceDocumentId)) continue;
    seen.add(page.sourceDocumentId);
    sourceIds.push(page.sourceDocumentId);
  }
  return sourceIds;
}

function sourceUsageForPages(
  pages: readonly PlannedExportPage[],
  fallbackDocumentId?: string,
  fallbackDocumentName?: string
): Map<string, SourceUsage> {
  const usage = new Map<string, SourceUsage>();
  for (const page of pages) {
    const current = usage.get(page.sourceDocumentId) ?? {
      documentIds: [],
      documentNames: [],
    };
    const documentId = fallbackDocumentId;
    const documentName = fallbackDocumentName;
    if (documentId && !current.documentIds.includes(documentId)) {
      current.documentIds.push(documentId);
    }
    if (documentName && !current.documentNames.includes(documentName)) {
      current.documentNames.push(documentName);
    }
    usage.set(page.sourceDocumentId, current);
  }
  return usage;
}

function isResolvedExportSource(
  source: ExportSourceData
): source is ResolvedExportSource {
  return (
    typeof source === "object" &&
    source !== null &&
    "blob" in source &&
    "origin" in source
  );
}

function isPdfHeader(bytes: Uint8Array): boolean {
  const header = new TextDecoder("latin1").decode(bytes);
  return header.includes("%PDF-");
}

function sourceErrorDetails({
  sourceDocumentId,
  sourceMetadata,
  sourceNumber,
  totalSources,
  origin,
  blob,
  usage,
}: {
  sourceDocumentId: string;
  sourceMetadata?: WorkspaceSourceDocument | undefined;
  sourceNumber: number;
  totalSources: number;
  origin: ExportSourceOrigin;
  blob?: Blob | undefined;
  usage?: SourceUsage | undefined;
}) {
  return {
    sourceDocumentId,
    sourceDocumentName: sourceMetadata?.name,
    sourceNumber,
    totalSources,
    sourceOrigin: origin,
    blobSize: blob?.size,
    blobType: blob?.type,
    affectedDocumentIds: usage?.documentIds,
    affectedDocumentNames: usage?.documentNames,
  };
}

async function createFreshSourceBytes({
  source,
  sourceDocumentId,
  sourceMetadata,
  sourceNumber,
  totalSources,
  usage,
}: {
  source: ExportSourceData;
  sourceDocumentId: string;
  sourceMetadata?: WorkspaceSourceDocument | undefined;
  sourceNumber: number;
  totalSources: number;
  usage?: SourceUsage | undefined;
}): Promise<{ bytes: Uint8Array; origin: ExportSourceOrigin; blob?: Blob | undefined }> {
  if (source instanceof Uint8Array) {
    const bytes = source.slice();
    if (bytes.byteLength === 0 || !isPdfHeader(bytes.subarray(0, 1024))) {
      throw new PdfExportError(
        "SOURCE_FILE_INVALID",
        "The original PDF source is empty or does not contain a PDF header.",
        sourceErrorDetails({
          sourceDocumentId,
          sourceMetadata,
          sourceNumber,
          totalSources,
          origin: "test",
          usage,
        })
      );
    }
    return { bytes, origin: "test" };
  }

  const resolved = isResolvedExportSource(source)
    ? source
    : {
        sourceDocumentId,
        blob: source,
        origin: "test" as const,
      };
  const { blob, origin } = resolved;
  const details = sourceErrorDetails({
    sourceDocumentId,
    sourceMetadata,
    sourceNumber,
    totalSources,
    origin,
    blob,
    usage,
  });
  if (!(blob instanceof Blob) || blob.size <= 0) {
    throw new PdfExportError(
      "SOURCE_FILE_INVALID",
      "The original PDF source is not a readable non-empty Blob.",
      details
    );
  }
  if (
    blob.type &&
    blob.type !== "application/pdf" &&
    blob.type !== "application/octet-stream"
  ) {
    throw new PdfExportError(
      "SOURCE_FILE_INVALID",
      "The original PDF source has an unexpected file type.",
      details
    );
  }

  try {
    const headerBytes = new Uint8Array(
      await blob.slice(0, Math.min(blob.size, 1024)).arrayBuffer()
    );
    if (!isPdfHeader(headerBytes)) {
      throw new PdfExportError(
        "SOURCE_FILE_INVALID",
        "The original PDF source does not contain a valid PDF header.",
        details
      );
    }
    const arrayBuffer = await blob.arrayBuffer();
    if (arrayBuffer.byteLength !== blob.size) {
      throw new PdfExportError(
        "SOURCE_READ_FAILED",
        "The original PDF source was not read completely.",
        details
      );
    }
    return {
      bytes: new Uint8Array(arrayBuffer.slice(0)),
      origin,
      blob,
    };
  } catch (error) {
    if (error instanceof PdfExportError) throw error;
    throw new PdfExportError(
      "SOURCE_READ_FAILED",
      "The original PDF source could not be read.",
      details,
      { cause: error }
    );
  }
}

function isEncryptedOrPasswordError(error: unknown): boolean {
  const name =
    error instanceof Error ? error.name.toLowerCase() : "";
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error);
  return (
    name.includes("encrypted") ||
    name.includes("password") ||
    message.includes("encrypted") ||
    message.includes("password")
  );
}

function logSourceFailure(error: PdfExportError): void {
  if (!import.meta.env.DEV || error.code === "EXPORT_CANCELLED") return;
  const cause = error.cause;
  console.error("[PDF export] Source load failed", {
    code: error.code,
    ...error.details,
    causeName: cause instanceof Error ? cause.name : undefined,
    causeMessage: cause instanceof Error ? cause.message : String(cause ?? ""),
  });
}

export async function loadRequiredPdfSources({
  pages,
  sourceDocuments,
  resolveSourceBytes,
  signal,
  documentId,
  documentName,
  onProgress,
}: {
  pages: readonly PlannedExportPage[];
  sourceDocuments: Readonly<Record<string, WorkspaceSourceDocument>>;
  resolveSourceBytes: ExportSourceResolver;
  signal?: AbortSignal | undefined;
  documentId?: string | undefined;
  documentName?: string | undefined;
  onProgress?: ((progress: PdfSourceLoadProgress) => void) | undefined;
}): Promise<Map<string, PDFDocument>> {
  const sourceIds = getRequiredSourceDocumentIds(pages);
  const usageBySource = sourceUsageForPages(
    pages,
    documentId,
    documentName
  );
  const loadedSources = new Map<string, PDFDocument>();

  for (let index = 0; index < sourceIds.length; index += 1) {
    const sourceDocumentId = sourceIds[index];
    if (!sourceDocumentId) continue;
    const sourceMetadata = sourceDocuments[sourceDocumentId];
    const sourceNumber = index + 1;
    const usage = usageBySource.get(sourceDocumentId);
    const baseDetails = {
      documentId,
      documentName,
      sourceDocumentId,
      sourceDocumentName: sourceMetadata?.name,
      sourceNumber,
      totalSources: sourceIds.length,
      affectedDocumentIds: usage?.documentIds,
      affectedDocumentNames: usage?.documentNames,
    };
    onProgress?.({
      completedSources: index,
      totalSources: sourceIds.length,
      currentSourceDocumentId: sourceDocumentId,
      currentSourceName: sourceMetadata?.name,
      currentSourceNumber: sourceNumber,
    });
    throwIfExportCancelled(signal, baseDetails);

    try {
      const source = await resolveSourceBytes(sourceDocumentId);
      throwIfExportCancelled(signal, baseDetails);
      const resolved = await createFreshSourceBytes({
        source,
        sourceDocumentId,
        sourceMetadata,
        sourceNumber,
        totalSources: sourceIds.length,
        usage,
      });
      let sourcePdf: PDFDocument;
      try {
        sourcePdf = await PDFDocument.load(resolved.bytes);
      } catch (error) {
        throw new PdfExportError(
          isEncryptedOrPasswordError(error)
            ? "SOURCE_ENCRYPTED_OR_UNSUPPORTED"
            : "SOURCE_LOAD_FAILED",
          isEncryptedOrPasswordError(error)
            ? "The original PDF source is encrypted or password protected."
            : "The original PDF source could not be parsed for export.",
          {
            ...baseDetails,
            sourceOrigin: resolved.origin,
            blobSize: resolved.blob?.size,
            blobType: resolved.blob?.type,
          },
          { cause: error }
        );
      }

      const requests = pages.filter(
        (page) => page.sourceDocumentId === sourceDocumentId
      );
      const pageCount = sourcePdf.getPageCount();
      for (const request of requests) {
        if (
          request.originalPageIndex < 0 ||
          request.originalPageIndex >= pageCount
        ) {
          throw new PdfExportError(
            "PAGE_INDEX_OUT_OF_RANGE",
            "A page references an original page index outside its source PDF.",
            {
              ...baseDetails,
              pageId: request.workspacePageId,
              originalPageIndex: request.originalPageIndex,
            }
          );
        }
      }
      loadedSources.set(sourceDocumentId, sourcePdf);
    } catch (error) {
      const typed =
        error instanceof PdfExportError
          ? new PdfExportError(
              error.code,
              error.message,
              { ...baseDetails, ...error.details },
              { cause: error.cause ?? error }
            )
          : new PdfExportError(
              "SOURCE_LOAD_FAILED",
              "The original PDF source could not be resolved.",
              baseDetails,
              { cause: error }
            );
      logSourceFailure(typed);
      throw typed;
    }
  }

  onProgress?.({
    completedSources: sourceIds.length,
    totalSources: sourceIds.length,
  });
  return loadedSources;
}
