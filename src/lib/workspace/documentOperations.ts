import {
  WorkspaceDocument,
  WorkspacePage,
} from "../../types/workspace";

export const DOCUMENT_COLORS = [
  "#00f5ff",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#3b82f6",
] as const;

export const DEFAULT_WORKSPACE_DOCUMENT_NAME = "Untitled Document";
export const MAX_WORKSPACE_DOCUMENT_NAME_LENGTH = 100;

export type WorkspaceDocumentNameValidation =
  | { valid: true; name: string }
  | { valid: false; error: string };

export function validateWorkspaceDocumentName(
  value: string
): WorkspaceDocumentNameValidation {
  const name = value.trim();
  if (!name) {
    return { valid: false, error: "Document name cannot be empty." };
  }
  if (Array.from(name).length > MAX_WORKSPACE_DOCUMENT_NAME_LENGTH) {
    return {
      valid: false,
      error: "Document name must be 100 characters or fewer.",
    };
  }
  return { valid: true, name };
}

export function getNextDocumentColor(
  documents: readonly WorkspaceDocument[],
  offset = 0
): string {
  return DOCUMENT_COLORS[
    (documents.length + offset) % DOCUMENT_COLORS.length
  ]!;
}

export function createEmptyWorkspaceDocument({
  id,
  color,
  name = DEFAULT_WORKSPACE_DOCUMENT_NAME,
}: {
  id: string;
  color: string;
  name?: string;
}): WorkspaceDocument {
  return {
    id,
    name,
    size: 0,
    mimeType: "application/pdf",
    pageCount: 0,
    color,
    status: "ready",
    pages: [],
  };
}

export function renameWorkspaceDocument(
  documents: readonly WorkspaceDocument[],
  documentId: string,
  name: string
): WorkspaceDocument[] {
  const document = documents.find((candidate) => candidate.id === documentId);
  if (!document || document.name === name) {
    return documents as WorkspaceDocument[];
  }

  return documents.map((candidate) =>
    candidate.id === documentId ? { ...candidate, name } : candidate
  );
}

export function reorderWorkspaceDocuments(
  documents: readonly WorkspaceDocument[],
  activeDocumentId: string,
  overDocumentId: string
): WorkspaceDocument[] {
  const activeIndex = documents.findIndex(
    (document) => document.id === activeDocumentId
  );
  const overIndex = documents.findIndex(
    (document) => document.id === overDocumentId
  );
  if (
    activeIndex === -1 ||
    overIndex === -1 ||
    activeIndex === overIndex
  ) {
    return documents as WorkspaceDocument[];
  }

  const reordered = [...documents];
  const [activeDocument] = reordered.splice(activeIndex, 1);
  if (!activeDocument) return documents as WorkspaceDocument[];
  reordered.splice(overIndex, 0, activeDocument);
  return reordered;
}

export type DeleteWorkspaceDocumentResult = {
  documents: WorkspaceDocument[];
  deletedDocument: WorkspaceDocument;
  deletedDocumentIndex: number;
  deletedPageIds: string[];
  nextActiveDocumentId: string;
};

export function getNextActiveDocumentId(
  documents: readonly WorkspaceDocument[],
  deletedDocumentId: string,
  currentActiveDocumentId: string | null
): string | null {
  const deletedIndex = documents.findIndex(
    (document) => document.id === deletedDocumentId
  );
  if (deletedIndex === -1 || documents.length <= 1) return null;
  if (
    currentActiveDocumentId !== deletedDocumentId &&
    documents.some((document) => document.id === currentActiveDocumentId)
  ) {
    return currentActiveDocumentId;
  }

  const remainingDocuments = documents.filter(
    (document) => document.id !== deletedDocumentId
  );
  return (
    remainingDocuments[deletedIndex]?.id ??
    remainingDocuments[deletedIndex - 1]?.id ??
    null
  );
}

export function deleteWorkspaceDocument(
  documents: readonly WorkspaceDocument[],
  documentId: string,
  currentActiveDocumentId: string | null
): DeleteWorkspaceDocumentResult | null {
  if (documents.length <= 1) return null;
  const deletedDocumentIndex = documents.findIndex(
    (document) => document.id === documentId
  );
  if (deletedDocumentIndex === -1) return null;

  const deletedDocument = documents[deletedDocumentIndex];
  if (!deletedDocument) return null;
  const nextActiveDocumentId = getNextActiveDocumentId(
    documents,
    documentId,
    currentActiveDocumentId
  );
  if (!nextActiveDocumentId) return null;

  return {
    documents: documents.filter((document) => document.id !== documentId),
    deletedDocument,
    deletedDocumentIndex,
    deletedPageIds: deletedDocument.pages.map((page) => page.id),
    nextActiveDocumentId,
  };
}

function truncateForSuffix(value: string, suffix: string): string {
  const maxBaseLength =
    MAX_WORKSPACE_DOCUMENT_NAME_LENGTH - Array.from(suffix).length;
  return Array.from(value).slice(0, Math.max(0, maxBaseLength)).join("").trimEnd();
}

export function createDuplicatedDocumentName(
  sourceName: string,
  existingNames: readonly string[]
): string {
  const source = sourceName.trim() || DEFAULT_WORKSPACE_DOCUMENT_NAME;
  const normalizedNames = new Set(
    existingNames.map((name) => name.trim().toLocaleLowerCase())
  );

  for (let copyNumber = 1; ; copyNumber += 1) {
    const suffix = copyNumber === 1 ? " Copy" : ` Copy ${copyNumber}`;
    const base = truncateForSuffix(source, suffix);
    const candidate = `${base}${suffix}`;
    if (!normalizedNames.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }
  }
}

export function getDuplicatedDocumentColor(
  documents: readonly WorkspaceDocument[],
  sourceDocumentId: string
): string {
  const sourceIndex = documents.findIndex(
    (document) => document.id === sourceDocumentId
  );
  const sourceDocument = documents[sourceIndex];
  if (!sourceDocument) return getNextDocumentColor(documents);

  const sourceColorIndex = DOCUMENT_COLORS.indexOf(
    sourceDocument.color as (typeof DOCUMENT_COLORS)[number]
  );
  const startIndex =
    sourceColorIndex === -1
      ? (sourceIndex + 1) % DOCUMENT_COLORS.length
      : (sourceColorIndex + 1) % DOCUMENT_COLORS.length;
  const neighborColors = new Set(
    [
      documents[sourceIndex - 1]?.color,
      documents[sourceIndex + 1]?.color,
      sourceDocument.color,
    ].filter(Boolean)
  );

  for (let offset = 0; offset < DOCUMENT_COLORS.length; offset += 1) {
    const color = DOCUMENT_COLORS[
      (startIndex + offset) % DOCUMENT_COLORS.length
    ];
    if (color && !neighborColors.has(color)) return color;
  }
  return DOCUMENT_COLORS[startIndex] ?? DOCUMENT_COLORS[0];
}

export function remapDuplicatedDocumentPages({
  sourcePages,
  targetDocumentId,
  pageIds,
}: {
  sourcePages: readonly WorkspacePage[];
  targetDocumentId: string;
  pageIds: readonly string[];
}): WorkspacePage[] {
  if (sourcePages.length !== pageIds.length) return [];
  const newPageIdBySourceId = new Map(
    sourcePages.map((page, index) => [page.id, pageIds[index]!])
  );

  return sourcePages.map((page, index) => {
    const internalDuplicateSource = page.duplicatedFromPageId
      ? newPageIdBySourceId.get(page.duplicatedFromPageId)
      : undefined;
    return {
      id: pageIds[index]!,
      documentId: targetDocumentId,
      sourceDocumentId: page.sourceDocumentId,
      originalPageIndex: page.originalPageIndex,
      pageNumber: index + 1,
      rotation: page.rotation,
      duplicatedFromPageId: internalDuplicateSource,
      thumbnailStatus: "idle",
    };
  });
}

export function duplicateWorkspaceDocument({
  documents,
  sourceDocumentId,
  newDocumentId,
  newPageIds,
}: {
  documents: readonly WorkspaceDocument[];
  sourceDocumentId: string;
  newDocumentId: string;
  newPageIds: readonly string[];
}): WorkspaceDocument[] {
  const sourceIndex = documents.findIndex(
    (document) => document.id === sourceDocumentId
  );
  const sourceDocument = documents[sourceIndex];
  if (
    !sourceDocument ||
    documents.some((document) => document.id === newDocumentId)
  ) {
    return documents as WorkspaceDocument[];
  }

  const pages = remapDuplicatedDocumentPages({
    sourcePages: sourceDocument.pages,
    targetDocumentId: newDocumentId,
    pageIds: newPageIds,
  });
  if (pages.length !== sourceDocument.pages.length) {
    return documents as WorkspaceDocument[];
  }
  const duplicate: WorkspaceDocument = {
    ...sourceDocument,
    id: newDocumentId,
    name: createDuplicatedDocumentName(
      sourceDocument.name,
      documents.map((document) => document.name)
    ),
    color: getDuplicatedDocumentColor(documents, sourceDocumentId),
    pageCount: pages.length,
    pages,
    errorMessage: undefined,
  };

  return [
    ...documents.slice(0, sourceIndex + 1),
    duplicate,
    ...documents.slice(sourceIndex + 1),
  ];
}
