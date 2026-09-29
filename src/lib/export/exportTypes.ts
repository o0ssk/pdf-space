import {
  PageRotation,
  WorkspaceDocument,
  WorkspaceProject,
  WorkspaceSourceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import type { PdfExportError } from "./exportErrors";

export type ExportablePage = {
  id: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: PageRotation;
};

export type ExportableDocument = {
  id: string;
  name: string;
  pages: ExportablePage[];
  sourceDocuments: Record<string, WorkspaceSourceDocument>;
};

export type ExportableProject = {
  id: string;
  name: string;
  documents: ExportableDocument[];
};

export type PlannedExportPage = {
  workspacePageId: string;
  outputIndex: number;
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: PageRotation;
};

export type PdfExportPlan = {
  documentId: string;
  documentName: string;
  suggestedFileName: string;
  pages: PlannedExportPage[];
  requiredSourceDocumentIds: string[];
};

export type ExportSourceOrigin = "memory" | "indexeddb" | "test";

export type ResolvedExportSource = {
  sourceDocumentId: string;
  blob: Blob;
  origin: ExportSourceOrigin;
};

export type ExportSourceData =
  | Uint8Array
  | Blob
  | ResolvedExportSource;

export type ExportSourceResolver = (
  sourceDocumentId: string
) => Promise<ExportSourceData>;

export type ExportedPdfDocument = {
  documentId: string;
  documentName: string;
  suggestedFileName: string;
  pageCount: number;
  bytes: Uint8Array;
  blob: Blob;
};

export type SkippedExportDocument = {
  documentId: string;
  documentName: string;
  reason: "EMPTY_DOCUMENT";
};

export type ExportDocumentFailure = {
  documentId: string;
  documentName: string;
  error: PdfExportError;
};

export type ExportAllResult = {
  exported: ExportedPdfDocument[];
  skipped: SkippedExportDocument[];
  failed: ExportDocumentFailure[];
};

export type PdfExportProgressPhase =
  | "planning"
  | "loading-sources"
  | "copying-pages"
  | "saving"
  | "complete";

export type PdfExportProgress = {
  phase: PdfExportProgressPhase;
  documentId: string;
  documentIndex: number;
  documentCount: number;
  completedPages: number;
  totalPages: number;
  completedSources: number;
  totalSources: number;
  currentSourceDocumentId?: string | undefined;
  currentSourceName?: string | undefined;
  currentSourceNumber?: number | undefined;
};

export type PdfExportProgressCallback = (
  progress: PdfExportProgress
) => void;

export function createExportableDocument(
  workspaceDocument: WorkspaceDocument,
  sourceDocuments: WorkspaceSourceDocuments = {}
): ExportableDocument {
  const relevantSources: Record<string, WorkspaceSourceDocument> = {};
  for (const page of workspaceDocument.pages) {
    const source = sourceDocuments[page.sourceDocumentId];
    if (source) relevantSources[page.sourceDocumentId] = { ...source };
  }

  return {
    id: workspaceDocument.id,
    name: workspaceDocument.name,
    pages: workspaceDocument.pages.map((page) => ({
      id: page.id,
      sourceDocumentId: page.sourceDocumentId,
      originalPageIndex: page.originalPageIndex,
      rotation: page.rotation,
    })),
    sourceDocuments: relevantSources,
  };
}

export function createExportableProject(
  workspaceProject: WorkspaceProject
): ExportableProject {
  return {
    id: workspaceProject.id,
    name: workspaceProject.name,
    documents: workspaceProject.documents.map((document) =>
      createExportableDocument(document, workspaceProject.sourceDocuments)
    ),
  };
}
