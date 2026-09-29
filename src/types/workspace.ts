export type DocumentStatus =
  | "queued"
  | "loading"
  | "ready"
  | "error";

export type ThumbnailStatus =
  | "idle"
  | "rendering"
  | "ready"
  | "error";

export type WorkspacePage = {
  id: string;
  documentId: string; // current container/group ID
  sourceDocumentId: string; // immutable original source PDF document ID
  originalPageIndex: number; // 0-based index from the original PDF
  pageNumber: number;        // 1-based readable page number in current container
  rotation: PageRotation;
  duplicatedFromPageId?: string | undefined;
  thumbnailStatus: ThumbnailStatus;
  thumbnailUrl?: string | undefined;
  errorMessage?: string | undefined;
};

export type PageRotation = 0 | 90 | 180 | 270;

export type PageRotationDirection = "left" | "right";

export type PageDuplicateRequest = {
  sourcePageId: string;
  newPageId: string;
};

export type WorkspaceDocument = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  pageCount: number;
  color: string;
  status: DocumentStatus;
  pages: WorkspacePage[];
  errorMessage?: string | undefined;
};

export type WorkspaceSourceDocument = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  originalPageCount: number;
  importedAt: number;
  lastModified?: number | undefined;
};

export type WorkspaceSourceDocuments = Record<string, WorkspaceSourceDocument>;

export type WorkspaceProject = {
  id: string;
  name: string;
  documents: WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  createdAt: number;
  updatedAt: number;
};

export type WorkspaceSelectionState = {
  selectedPageIds: string[];
  anchorPageId: string | null;
  activePageId: string | null;
  activeContainerId: string | null;
};

export type PageSelectionModifiers = {
  toggle?: boolean | undefined;
  range?: boolean | undefined;
  preserveExisting?: boolean | undefined;
};

export type ImportedDocumentSource = {
  documentId: string;
  file: File;
  arrayBuffer?: ArrayBuffer | undefined;
};

export type ProjectedPageDrop = {
  activePageId: string;
  sourceContainerId: string;
  targetContainerId: string;
  insertionSlot: number;
};

export type WorkspacePageDragData = {
  type: "page";
  pageId: string;
  containerId: string;
  index: number;
};

export type WorkspaceDocumentDragData = {
  type: "document";
  documentId: string;
};

export type WorkspaceDragData =
  | WorkspacePageDragData
  | WorkspaceDocumentDragData;

export type InsertionPlacement =
  | "before"
  | "after"
  | "start"
  | "end"
  | "empty";

export function getTargetBasePages({
  documents,
  activePageId,
  sourceContainerId,
  targetContainerId,
}: {
  documents: WorkspaceDocument[];
  activePageId: string;
  sourceContainerId: string;
  targetContainerId: string;
}): WorkspacePage[] {
  const targetDoc = documents.find((doc) => doc.id === targetContainerId);
  if (!targetDoc) return [];
  
  if (sourceContainerId === targetContainerId) {
    return targetDoc.pages.filter((page) => page.id !== activePageId);
  }
  return targetDoc.pages;
}

export function clampInsertionSlot(slot: number, pageCount: number): number {
  return Math.max(0, Math.min(slot, pageCount));
}

export function getInsertionSlotForPlacement({
  pages,
  placement,
  overPageId,
}: {
  pages: WorkspacePage[];
  placement: InsertionPlacement;
  overPageId?: string | undefined;
}): number | null {
  if (placement === "start" || placement === "empty") return 0;
  if (placement === "end") return pages.length;
  if (!overPageId) return null;

  const overIndex = pages.findIndex((page) => page.id === overPageId);
  if (overIndex === -1) return null;

  return clampInsertionSlot(
    placement === "before" ? overIndex : overIndex + 1,
    pages.length
  );
}
