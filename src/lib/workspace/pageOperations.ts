import {
  PageDuplicateRequest,
  PageRotation,
  PageRotationDirection,
  WorkspaceDocument,
  WorkspacePage,
} from "../../types/workspace";

function renumberPages(
  document: WorkspaceDocument,
  pages: WorkspacePage[]
): WorkspaceDocument {
  const numberedPages = pages.map((page, index) =>
    page.pageNumber === index + 1
      ? page
      : { ...page, pageNumber: index + 1 }
  );

  const pagesUnchanged =
    numberedPages.length === document.pages.length &&
    numberedPages.every((page, index) => page === document.pages[index]);

  if (pagesUnchanged && document.pageCount === numberedPages.length) {
    return document;
  }

  return {
    ...document,
    pages: numberedPages,
    pageCount: numberedPages.length,
  };
}

export function normalizeRotation(
  rotation: number
): PageRotation {
  const normalized = ((rotation % 360) + 360) % 360;
  return normalized as PageRotation;
}

export function rotatePage(
  page: WorkspacePage,
  direction: PageRotationDirection
): WorkspacePage {
  const rotation = normalizeRotation(
    page.rotation + (direction === "right" ? 90 : 270)
  );

  return {
    ...page,
    rotation,
    thumbnailStatus: "idle",
    thumbnailUrl: undefined,
    errorMessage: undefined,
  };
}

export function rotatePages(
  documents: readonly WorkspaceDocument[],
  pageIds: readonly string[],
  direction: PageRotationDirection
): WorkspaceDocument[] {
  const pageIdSet = new Set(pageIds);
  let changed = false;

  const nextDocuments = documents.map((document) => {
    let documentChanged = false;
    const pages = document.pages.map((page) => {
      if (!pageIdSet.has(page.id)) return page;
      changed = true;
      documentChanged = true;
      return rotatePage(page, direction);
    });

    return documentChanged ? { ...document, pages } : document;
  });

  return changed ? nextDocuments : (documents as WorkspaceDocument[]);
}

export function createPageDuplicate(
  sourcePage: WorkspacePage,
  newPageId: string,
  targetContainerId = sourcePage.documentId
): WorkspacePage {
  return {
    ...sourcePage,
    id: newPageId,
    documentId: targetContainerId,
    duplicatedFromPageId: sourcePage.id,
    thumbnailStatus: "idle",
    thumbnailUrl: undefined,
    errorMessage: undefined,
  };
}

export function duplicatePages(
  documents: readonly WorkspaceDocument[],
  requests: readonly PageDuplicateRequest[]
): WorkspaceDocument[] {
  const requestBySourceId = new Map(
    requests.map((request) => [request.sourcePageId, request])
  );
  let changed = false;

  const nextDocuments = documents.map((document) => {
    const pages: WorkspacePage[] = [];
    let documentChanged = false;

    for (const page of document.pages) {
      pages.push(page);
      const request = requestBySourceId.get(page.id);
      if (!request) continue;

      pages.push(createPageDuplicate(page, request.newPageId));
      changed = true;
      documentChanged = true;
    }

    return documentChanged ? renumberPages(document, pages) : document;
  });

  return changed ? nextDocuments : (documents as WorkspaceDocument[]);
}

function findPagesInRequestedOrder(
  documents: readonly WorkspaceDocument[],
  pageIds: readonly string[]
): WorkspacePage[] {
  const pagesById = new Map(
    documents.flatMap((document) =>
      document.pages.map((page) => [page.id, page] as const)
    )
  );

  return pageIds
    .map((pageId) => pagesById.get(pageId))
    .filter((page): page is WorkspacePage => Boolean(page));
}

export function copyPagesToContainer(
  documents: readonly WorkspaceDocument[],
  targetContainerId: string,
  requests: readonly PageDuplicateRequest[]
): WorkspaceDocument[] {
  const targetDocument = documents.find(
    (document) => document.id === targetContainerId
  );
  if (!targetDocument || targetDocument.status !== "ready") {
    return documents as WorkspaceDocument[];
  }

  const sourcePageIds = requests.map((request) => request.sourcePageId);
  const sourcePages = findPagesInRequestedOrder(documents, sourcePageIds);
  const requestBySourceId = new Map(
    requests.map((request) => [request.sourcePageId, request])
  );
  const copiedPages = sourcePages.map((page) =>
    createPageDuplicate(
      page,
      requestBySourceId.get(page.id)!.newPageId,
      targetContainerId
    )
  );
  if (copiedPages.length === 0) return documents as WorkspaceDocument[];

  return documents.map((document) =>
    document.id === targetContainerId
      ? renumberPages(document, [...document.pages, ...copiedPages])
      : document
  );
}

export function movePagesToContainer(
  documents: readonly WorkspaceDocument[],
  pageIds: readonly string[],
  targetContainerId: string
): WorkspaceDocument[] {
  const targetDocument = documents.find(
    (document) => document.id === targetContainerId
  );
  if (!targetDocument || targetDocument.status !== "ready") {
    return documents as WorkspaceDocument[];
  }

  const uniquePageIds = [...new Set(pageIds)];
  const movedPages = findPagesInRequestedOrder(documents, uniquePageIds);
  if (movedPages.length === 0) return documents as WorkspaceDocument[];

  const movedPageIdSet = new Set(movedPages.map((page) => page.id));
  const nextDocuments = documents.map((document) => {
    const remainingPages = document.pages.filter(
      (page) => !movedPageIdSet.has(page.id)
    );
    const pages =
      document.id === targetContainerId
        ? [
            ...remainingPages,
            ...movedPages.map((page) =>
              page.documentId === targetContainerId
                ? page
                : { ...page, documentId: targetContainerId }
            ),
          ]
        : remainingPages;

    return renumberPages(document, pages);
  });

  const unchanged = nextDocuments.every(
    (document, index) => document === documents[index]
  );
  return unchanged ? (documents as WorkspaceDocument[]) : nextDocuments;
}

export function deletePages(
  documents: readonly WorkspaceDocument[],
  pageIds: readonly string[]
): WorkspaceDocument[] {
  const pageIdSet = new Set(pageIds);
  let changed = false;

  const nextDocuments = documents.map((document) => {
    const pages = document.pages.filter((page) => !pageIdSet.has(page.id));
    if (pages.length === document.pages.length) return document;
    changed = true;
    return renumberPages(document, pages);
  });

  return changed ? nextDocuments : (documents as WorkspaceDocument[]);
}
