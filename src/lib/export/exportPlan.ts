import { PageRotation } from "../../types/workspace";
import { PdfExportError } from "./exportErrors";
import { createSuggestedPdfFileName } from "./exportFileNames";
import {
  ExportableDocument,
  PdfExportPlan,
  PlannedExportPage,
} from "./exportTypes";

export function normalizePdfRotation(angle: number): PageRotation {
  if (!Number.isFinite(angle)) return 0;
  const normalized = ((angle % 360) + 360) % 360;
  return ((Math.round(normalized / 90) * 90) % 360) as PageRotation;
}

export function buildPdfExportPlan(
  document: ExportableDocument
): PdfExportPlan {
  if (!document?.id?.trim()) {
    throw new PdfExportError(
      "DOCUMENT_NOT_FOUND",
      "The document to export could not be found."
    );
  }
  if (document.pages.length === 0) {
    throw new PdfExportError(
      "EMPTY_DOCUMENT",
      "Empty document groups cannot be exported.",
      {
        documentId: document.id,
        documentName: document.name,
      }
    );
  }

  const pageIds = new Set<string>();
  const sourceIds = new Set<string>();
  const pages: PlannedExportPage[] = document.pages.map((page, outputIndex) => {
    if (!page.id?.trim() || pageIds.has(page.id)) {
      throw new PdfExportError(
        "UNKNOWN",
        "Every workspace page must have a unique page identity.",
        {
          documentId: document.id,
          documentName: document.name,
          pageId: page.id,
        }
      );
    }
    pageIds.add(page.id);

    if (!page.sourceDocumentId?.trim()) {
      throw new PdfExportError(
        "SOURCE_METADATA_MISSING",
        "A page is missing its original PDF source identity.",
        {
          documentId: document.id,
          documentName: document.name,
          pageId: page.id,
        }
      );
    }
    const sourceMetadata = document.sourceDocuments[page.sourceDocumentId];
    if (!sourceMetadata) {
      throw new PdfExportError(
        "SOURCE_METADATA_MISSING",
        "The original PDF source metadata for a page is unavailable.",
        {
          documentId: document.id,
          documentName: document.name,
          pageId: page.id,
          sourceDocumentId: page.sourceDocumentId,
        }
      );
    }
    if (
      !Number.isInteger(page.originalPageIndex) ||
      page.originalPageIndex < 0
    ) {
      throw new PdfExportError(
        "PAGE_INDEX_OUT_OF_RANGE",
        "A page has an invalid zero-based original page index.",
        {
          documentId: document.id,
          documentName: document.name,
          pageId: page.id,
          sourceDocumentId: page.sourceDocumentId,
          sourceDocumentName: sourceMetadata.name,
          originalPageIndex: page.originalPageIndex,
        }
      );
    }

    sourceIds.add(page.sourceDocumentId);
    return {
      workspacePageId: page.id,
      outputIndex,
      sourceDocumentId: page.sourceDocumentId,
      originalPageIndex: page.originalPageIndex,
      rotation: normalizePdfRotation(page.rotation),
    };
  });

  return {
    documentId: document.id,
    documentName: document.name,
    suggestedFileName: createSuggestedPdfFileName(document.name),
    pages,
    requiredSourceDocumentIds: [...sourceIds],
  };
}

export function groupExportRequestsBySource(
  plan: PdfExportPlan
): Map<string, PlannedExportPage[]> {
  const grouped = new Map<string, PlannedExportPage[]>();
  for (const page of plan.pages) {
    const requests = grouped.get(page.sourceDocumentId) ?? [];
    requests.push(page);
    grouped.set(page.sourceDocumentId, requests);
  }
  return grouped;
}
