import {
  WorkspaceDocument,
  WorkspacePage,
  WorkspaceSelectionState,
} from "../../types/workspace";

export const emptyWorkspaceSelection: WorkspaceSelectionState = {
  selectedPageIds: [],
  anchorPageId: null,
  activePageId: null,
  activeContainerId: null,
};

export function mergeSelectedPageIds(
  existingPageIds: readonly string[],
  addedPageIds: readonly string[]
): string[] {
  return [...new Set([...existingPageIds, ...addedPageIds])];
}

export function selectPageOnly(
  selection: WorkspaceSelectionState,
  pageId: string,
  containerId: string
): WorkspaceSelectionState {
  if (
    selection.selectedPageIds.length === 1 &&
    selection.selectedPageIds[0] === pageId &&
    selection.anchorPageId === pageId &&
    selection.activePageId === pageId &&
    selection.activeContainerId === containerId
  ) {
    return selection;
  }

  return {
    selectedPageIds: [pageId],
    anchorPageId: pageId,
    activePageId: pageId,
    activeContainerId: containerId,
  };
}

export function toggleSelectedPage(
  selection: WorkspaceSelectionState,
  pageId: string,
  containerId: string
): WorkspaceSelectionState {
  const selectedPageIds = [...new Set(selection.selectedPageIds)];

  if (!selectedPageIds.includes(pageId)) {
    return {
      selectedPageIds: [...selectedPageIds, pageId],
      anchorPageId: pageId,
      activePageId: pageId,
      activeContainerId: containerId,
    };
  }

  const remainingPageIds = selectedPageIds.filter((id) => id !== pageId);
  if (remainingPageIds.length === 0) {
    return {
      selectedPageIds: [],
      anchorPageId: null,
      activePageId: null,
      activeContainerId: containerId,
    };
  }

  const activePageId =
    selection.activePageId !== pageId &&
    selection.activePageId &&
    remainingPageIds.includes(selection.activePageId)
      ? selection.activePageId
      : remainingPageIds[remainingPageIds.length - 1] ?? null;
  const anchorPageId =
    selection.anchorPageId !== pageId &&
    selection.anchorPageId &&
    remainingPageIds.includes(selection.anchorPageId)
      ? selection.anchorPageId
      : activePageId;

  return {
    selectedPageIds: remainingPageIds,
    anchorPageId,
    activePageId,
    activeContainerId: containerId,
  };
}

export function getPageRange(
  documents: readonly WorkspaceDocument[],
  anchorPageId: string,
  targetPageId: string,
  containerId: string
): string[] | null {
  const document = documents.find((candidate) => candidate.id === containerId);
  if (!document) return null;

  const anchorIndex = document.pages.findIndex((page) => page.id === anchorPageId);
  const targetIndex = document.pages.findIndex((page) => page.id === targetPageId);
  if (anchorIndex === -1 || targetIndex === -1) return null;

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return document.pages.slice(start, end + 1).map((page) => page.id);
}

export function selectPageRange(
  selection: WorkspaceSelectionState,
  documents: readonly WorkspaceDocument[],
  targetPageId: string,
  containerId: string,
  preserveExisting: boolean
): WorkspaceSelectionState {
  const anchorPageId = selection.anchorPageId;
  if (!anchorPageId) {
    return selectPageOnly(selection, targetPageId, containerId);
  }

  const range = getPageRange(
    documents,
    anchorPageId,
    targetPageId,
    containerId
  );
  if (!range) {
    return selectPageOnly(selection, targetPageId, containerId);
  }

  return {
    selectedPageIds: preserveExisting
      ? mergeSelectedPageIds(selection.selectedPageIds, range)
      : range,
    anchorPageId,
    activePageId: targetPageId,
    activeContainerId: containerId,
  };
}

export function selectAllInContainer(
  selection: WorkspaceSelectionState,
  documents: readonly WorkspaceDocument[],
  containerId: string
): WorkspaceSelectionState {
  const document = documents.find((candidate) => candidate.id === containerId);
  if (!document) return selection;

  const selectedPageIds = document.pages.map((page) => page.id);
  if (selectedPageIds.length === 0) {
    return {
      selectedPageIds: [],
      anchorPageId: null,
      activePageId: null,
      activeContainerId: containerId,
    };
  }

  const activePageId =
    selection.activePageId && selectedPageIds.includes(selection.activePageId)
      ? selection.activePageId
      : selectedPageIds[0] ?? null;

  return {
    selectedPageIds,
    anchorPageId: selectedPageIds[0] ?? null,
    activePageId,
    activeContainerId: containerId,
  };
}

export function clearSelection(
  selection: WorkspaceSelectionState
): WorkspaceSelectionState {
  if (
    selection.selectedPageIds.length === 0 &&
    selection.anchorPageId === null &&
    selection.activePageId === null
  ) {
    return selection;
  }

  return {
    selectedPageIds: [],
    anchorPageId: null,
    activePageId: null,
    activeContainerId: selection.activeContainerId,
  };
}

export function getSelectedPagesInWorkspaceOrder(
  documents: readonly WorkspaceDocument[],
  selectedPageIds: readonly string[]
): WorkspacePage[] {
  const selectedPageIdSet = new Set(selectedPageIds);
  return documents.flatMap((document) =>
    document.pages.filter((page) => selectedPageIdSet.has(page.id))
  );
}

export function pruneSelection(
  selection: WorkspaceSelectionState,
  documents: readonly WorkspaceDocument[]
): WorkspaceSelectionState {
  const validPages = documents.flatMap((document) => document.pages);
  const validPageIds = new Set(validPages.map((page) => page.id));
  const selectedPageIds = [...new Set(selection.selectedPageIds)].filter((id) =>
    validPageIds.has(id)
  );
  const activePageId =
    selection.activePageId && selectedPageIds.includes(selection.activePageId)
      ? selection.activePageId
      : selectedPageIds[selectedPageIds.length - 1] ?? null;
  const anchorPageId =
    selection.anchorPageId && selectedPageIds.includes(selection.anchorPageId)
      ? selection.anchorPageId
      : activePageId;
  const documentIds = new Set(documents.map((document) => document.id));
  const activePage = activePageId
    ? validPages.find((page) => page.id === activePageId)
    : null;
  const activeContainerId =
    selection.activeContainerId && documentIds.has(selection.activeContainerId)
      ? selection.activeContainerId
      : activePage?.documentId ?? null;

  if (
    selectedPageIds.length === selection.selectedPageIds.length &&
    selectedPageIds.every((id, index) => id === selection.selectedPageIds[index]) &&
    activePageId === selection.activePageId &&
    anchorPageId === selection.anchorPageId &&
    activeContainerId === selection.activeContainerId
  ) {
    return selection;
  }

  return {
    selectedPageIds,
    anchorPageId,
    activePageId,
    activeContainerId,
  };
}

export function collapseSelectionForDrag(
  selection: WorkspaceSelectionState,
  pageId: string,
  containerId: string
): WorkspaceSelectionState {
  return selectPageOnly(selection, pageId, containerId);
}
