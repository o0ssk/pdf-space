import { degrees, PDFDocument, PDFPage } from "pdf-lib";
import { WorkspaceSourceDocument } from "../../types/workspace";
import { PdfExportError, throwIfExportCancelled } from "./exportErrors";
import { normalizePdfRotation } from "./exportPlan";
import {
  loadRequiredPdfSources,
  PdfSourceLoadProgress,
} from "./pdfSourceLoader";
import { ExportSourceResolver, PlannedExportPage } from "./exportTypes";

export type MaterializablePdfPage = PlannedExportPage;

type PdfPageMaterializerOptions = {
  destinationPdf: PDFDocument;
  pages: readonly MaterializablePdfPage[];
  sourceDocuments: Readonly<Record<string, WorkspaceSourceDocument>>;
  resolveSourceBytes: ExportSourceResolver;
  signal?: AbortSignal | undefined;
  documentId?: string | undefined;
  documentName?: string | undefined;
  onSourceProgress?: ((progress: PdfSourceLoadProgress) => void) | undefined;
  onBeforeCopy?: ((completedSources: number, totalSources: number) => void) | undefined;
  onPageProgress?: ((completedPages: number, totalPages: number) => void) | undefined;
};

function groupPagesBySource(
  pages: readonly MaterializablePdfPage[]
): Map<string, MaterializablePdfPage[]> {
  const grouped = new Map<string, MaterializablePdfPage[]>();
  for (const page of pages) {
    const requests = grouped.get(page.sourceDocumentId) ?? [];
    requests.push(page);
    grouped.set(page.sourceDocumentId, requests);
  }
  return grouped;
}

export async function materializePdfPages({
  destinationPdf,
  pages,
  sourceDocuments,
  resolveSourceBytes,
  signal,
  documentId,
  documentName,
  onSourceProgress,
  onBeforeCopy,
  onPageProgress,
}: PdfPageMaterializerOptions): Promise<void> {
  const loadedSources = await loadRequiredPdfSources({
    pages,
    sourceDocuments,
    resolveSourceBytes,
    signal,
    documentId,
    documentName,
    onProgress: onSourceProgress,
  });
  const copiedPagesByOutputIndex = new Map<number, PDFPage>();

  try {
    onBeforeCopy?.(loadedSources.size, loadedSources.size);

    for (const [sourceDocumentId, requests] of groupPagesBySource(pages)) {
      throwIfExportCancelled(signal, {
        documentId,
        documentName,
        sourceDocumentId,
      });
      const sourcePdf = loadedSources.get(sourceDocumentId);
      if (!sourcePdf) {
        throw new PdfExportError(
          "SOURCE_LOAD_FAILED",
          "A required PDF source was not loaded.",
          { documentId, documentName, sourceDocumentId }
        );
      }

      let copiedPages: PDFPage[];
      try {
        copiedPages = await destinationPdf.copyPages(
          sourcePdf,
          requests.map((request) => request.originalPageIndex)
        );
      } catch (error) {
        throw new PdfExportError(
          "PAGE_COPY_FAILED",
          "One or more pages could not be copied into the exported PDF.",
          {
            documentId,
            documentName,
            sourceDocumentId,
            sourceDocumentName: sourceDocuments[sourceDocumentId]?.name,
          },
          { cause: error }
        );
      }

      copiedPages.forEach((copiedPage, index) => {
        const request = requests[index];
        if (request) copiedPagesByOutputIndex.set(request.outputIndex, copiedPage);
      });
    }

    let completedPages = 0;
    for (const plannedPage of pages) {
      throwIfExportCancelled(signal, {
        documentId,
        documentName,
        pageId: plannedPage.workspacePageId,
        sourceDocumentId: plannedPage.sourceDocumentId,
        originalPageIndex: plannedPage.originalPageIndex,
      });
      const copiedPage = copiedPagesByOutputIndex.get(
        plannedPage.outputIndex
      );
      if (!copiedPage) {
        throw new PdfExportError(
          "PAGE_COPY_FAILED",
          "A copied page was unavailable while assembling the exported PDF.",
          {
            documentId,
            documentName,
            pageId: plannedPage.workspacePageId,
            sourceDocumentId: plannedPage.sourceDocumentId,
            originalPageIndex: plannedPage.originalPageIndex,
          }
        );
      }
      copiedPage.setRotation(
        degrees(
          normalizePdfRotation(
            copiedPage.getRotation().angle + plannedPage.rotation
          )
        )
      );
      destinationPdf.addPage(copiedPage);
      completedPages += 1;
      onPageProgress?.(completedPages, pages.length);
    }
  } finally {
    copiedPagesByOutputIndex.clear();
    loadedSources.clear();
  }
}
