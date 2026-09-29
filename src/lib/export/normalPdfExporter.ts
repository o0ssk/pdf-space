import { PDFDocument } from "pdf-lib";
import {
  asPdfExportError,
  PdfExportError,
  throwIfExportCancelled,
} from "./exportErrors";
import { buildPdfExportPlan } from "./exportPlan";
import { materializePdfPages } from "./pdfPageMaterializer";
import {
  ExportAllResult,
  ExportableDocument,
  ExportableProject,
  ExportSourceResolver,
  ExportedPdfDocument,
  PdfExportProgress,
  PdfExportProgressCallback,
} from "./exportTypes";

type ExportPdfDocumentOptions = {
  document: ExportableDocument;
  resolveSourceBytes: ExportSourceResolver;
  signal?: AbortSignal | undefined;
  onProgress?: PdfExportProgressCallback | undefined;
  documentIndex?: number;
  documentCount?: number;
};

function reportProgress(
  onProgress: PdfExportProgressCallback | undefined,
  progress: PdfExportProgress
): void {
  onProgress?.(progress);
}

export async function exportPdfDocument({
  document,
  resolveSourceBytes,
  signal,
  onProgress,
  documentIndex = 0,
  documentCount = 1,
}: ExportPdfDocumentOptions): Promise<ExportedPdfDocument> {
  const progressBase = {
    documentId: document.id,
    documentIndex,
    documentCount,
  };
  throwIfExportCancelled(signal, {
    documentId: document.id,
    documentName: document.name,
  });
  reportProgress(onProgress, {
    phase: "planning",
    ...progressBase,
    completedPages: 0,
    totalPages: document.pages.length,
    completedSources: 0,
    totalSources: 0,
  });

  const plan = buildPdfExportPlan(document);
  try {
    let completedSources = 0;
    reportProgress(onProgress, {
      phase: "loading-sources",
      ...progressBase,
      completedPages: 0,
      totalPages: plan.pages.length,
      completedSources,
      totalSources: plan.requiredSourceDocumentIds.length,
    });

    const destinationPdf = await PDFDocument.create({
      updateMetadata: false,
    });
    let completedPages = 0;
    await materializePdfPages({
      destinationPdf,
      pages: plan.pages,
      sourceDocuments: document.sourceDocuments,
      resolveSourceBytes,
      signal,
      documentId: document.id,
      documentName: document.name,
      onSourceProgress: (sourceProgress) => {
        completedSources = sourceProgress.completedSources;
        reportProgress(onProgress, {
          phase: "loading-sources",
          ...progressBase,
          completedPages: 0,
          totalPages: plan.pages.length,
          completedSources,
          totalSources: plan.requiredSourceDocumentIds.length,
          currentSourceDocumentId:
            sourceProgress.currentSourceDocumentId,
          currentSourceName: sourceProgress.currentSourceName,
          currentSourceNumber: sourceProgress.currentSourceNumber,
        });
      },
      onBeforeCopy: () => {
        reportProgress(onProgress, {
          phase: "copying-pages",
          ...progressBase,
          completedPages,
          totalPages: plan.pages.length,
          completedSources,
          totalSources: plan.requiredSourceDocumentIds.length,
        });
      },
      onPageProgress: (nextCompletedPages) => {
        completedPages = nextCompletedPages;
        reportProgress(onProgress, {
          phase: "copying-pages",
          ...progressBase,
          completedPages,
          totalPages: plan.pages.length,
          completedSources,
          totalSources: plan.requiredSourceDocumentIds.length,
        });
      },
    });

    try {
      destinationPdf.setTitle(document.name);
      destinationPdf.setCreator("PDF Space");
      destinationPdf.setProducer("PDF Space");
      destinationPdf.setModificationDate(new Date());
    } catch (error) {
      console.warn("Unable to set optional PDF export metadata:", error);
    }

    throwIfExportCancelled(signal, {
      documentId: document.id,
      documentName: document.name,
    });
    reportProgress(onProgress, {
      phase: "saving",
      ...progressBase,
      completedPages,
      totalPages: plan.pages.length,
      completedSources,
      totalSources: plan.requiredSourceDocumentIds.length,
    });

    let bytes: Uint8Array;
    try {
      bytes = await destinationPdf.save();
    } catch (error) {
      throw new PdfExportError(
        "PDF_SAVE_FAILED",
        "The exported PDF could not be serialized.",
        {
          documentId: document.id,
          documentName: document.name,
        },
        { cause: error }
      );
    }

    const result: ExportedPdfDocument = {
      documentId: document.id,
      documentName: document.name,
      suggestedFileName: plan.suggestedFileName,
      pageCount: plan.pages.length,
      bytes,
      blob: new Blob([bytes], { type: "application/pdf" }),
    };
    reportProgress(onProgress, {
      phase: "complete",
      ...progressBase,
      completedPages,
      totalPages: plan.pages.length,
      completedSources,
      totalSources: plan.requiredSourceDocumentIds.length,
    });
    return result;
  } catch (error) {
    throw asPdfExportError(error);
  }
}

type ExportAllPdfDocumentsOptions = {
  project: ExportableProject;
  resolveSourceBytes: ExportSourceResolver;
  signal?: AbortSignal | undefined;
  onProgress?: PdfExportProgressCallback | undefined;
};

export async function exportAllPdfDocuments({
  project,
  resolveSourceBytes,
  signal,
  onProgress,
}: ExportAllPdfDocumentsOptions): Promise<ExportAllResult> {
  const result: ExportAllResult = {
    exported: [],
    skipped: [],
    failed: [],
  };

  for (
    let documentIndex = 0;
    documentIndex < project.documents.length;
    documentIndex += 1
  ) {
    throwIfExportCancelled(signal);
    const document = project.documents[documentIndex];
    if (!document) continue;
    if (document.pages.length === 0) {
      result.skipped.push({
        documentId: document.id,
        documentName: document.name,
        reason: "EMPTY_DOCUMENT",
      });
      continue;
    }

    try {
      result.exported.push(
        await exportPdfDocument({
          document,
          resolveSourceBytes,
          signal,
          onProgress,
          documentIndex,
          documentCount: project.documents.length,
        })
      );
    } catch (error) {
      const exportError = asPdfExportError(error);
      if (exportError.code === "EXPORT_CANCELLED") throw exportError;
      result.failed.push({
        documentId: document.id,
        documentName: document.name,
        error: exportError,
      });
    }
  }

  return result;
}
