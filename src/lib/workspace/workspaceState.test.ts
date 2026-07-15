import { describe, expect, it } from "vitest";
import {
  WorkspaceDocument,
  WorkspacePage,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import {
  WorkspaceState,
  getReferencedSourceDocumentIds,
  initialWorkspaceState,
  isSourceDocumentReferenced,
  pruneSourceDocuments,
  workspaceReducer,
} from "./workspaceState";

function makePage(
  id: string,
  documentId = "group-a",
  sourceDocumentId = "source-a"
): WorkspacePage {
  return {
    id,
    documentId,
    sourceDocumentId,
    originalPageIndex: id.charCodeAt(0) - 65,
    pageNumber: 1,
    rotation: 0,
    thumbnailStatus: "idle",
  };
}

function makeDocument(
  id: string,
  pageIds: string[],
  sourceDocumentId = id
): WorkspaceDocument {
  return {
    id,
    name: `${id}.pdf`,
    size: 100,
    mimeType: "application/pdf",
    pageCount: pageIds.length,
    color: "#00f5ff",
    status: "ready",
    pages: pageIds.map((pageId, index) => ({
      ...makePage(pageId, id, sourceDocumentId),
      pageNumber: index + 1,
    })),
  };
}

function makeState(documents: WorkspaceDocument[]): WorkspaceState {
  return { ...initialWorkspaceState, documents };
}

function movePage(
  state: WorkspaceState,
  pageId: string,
  sourceContainerId: string,
  targetContainerId: string,
  insertionSlot: number
) {
  return workspaceReducer(state, {
    type: "MOVE_PAGE",
    payload: {
      pageId,
      sourceContainerId,
      targetContainerId,
      insertionSlot,
    },
  });
}

function pageIds(state: WorkspaceState, documentId: string): string[] {
  return state.documents.find((document) => document.id === documentId)!.pages.map(
    (page) => page.id
  );
}

describe("workspace page movement", () => {
  it("moves forward within the same group", () => {
    const state = makeState([makeDocument("group-a", ["A", "B", "C", "D", "E"])]);
    expect(pageIds(movePage(state, "B", "group-a", "group-a", 3), "group-a")).toEqual([
      "A",
      "C",
      "D",
      "B",
      "E",
    ]);
  });

  it("moves backward within the same group", () => {
    const state = makeState([makeDocument("group-a", ["A", "B", "C", "D", "E"])]);
    expect(pageIds(movePage(state, "D", "group-a", "group-a", 1), "group-a")).toEqual([
      "A",
      "D",
      "B",
      "C",
      "E",
    ]);
  });

  it("moves to the beginning and end", () => {
    const state = makeState([makeDocument("group-a", ["A", "B", "C", "D", "E"])]);
    const atBeginning = movePage(state, "E", "group-a", "group-a", 0);
    const atEnd = movePage(state, "A", "group-a", "group-a", 4);

    expect(pageIds(atBeginning, "group-a")).toEqual(["E", "A", "B", "C", "D"]);
    expect(pageIds(atEnd, "group-a")).toEqual(["B", "C", "D", "E", "A"]);
  });

  it("returns the same state for an adjacent no-op", () => {
    const state = makeState([makeDocument("group-a", ["A", "B", "C", "D", "E"])]);
    expect(movePage(state, "B", "group-a", "group-a", 1)).toBe(state);
  });

  it.each([
    [0, ["B", "X", "Y"]],
    [1, ["X", "B", "Y"]],
    [2, ["X", "Y", "B"]],
  ])("moves across groups to slot %i", (slot, expected) => {
    const state = makeState([
      makeDocument("group-a", ["A", "B", "C"], "source-a"),
      makeDocument("group-b", ["X", "Y"], "source-b"),
    ]);
    const next = movePage(state, "B", "group-a", "group-b", slot);

    expect(pageIds(next, "group-a")).toEqual(["A", "C"]);
    expect(pageIds(next, "group-b")).toEqual(expected);

    const allPages = next.documents.flatMap((document) => document.pages);
    expect(allPages.filter((page) => page.id === "B")).toHaveLength(1);
    const movedPage = allPages.find((page) => page.id === "B")!;
    expect(movedPage.documentId).toBe("group-b");
    expect(movedPage.sourceDocumentId).toBe("source-a");
  });

  it("moves into an empty group without losing or duplicating the page", () => {
    const state = makeState([
      makeDocument("group-a", ["A"], "source-a"),
      makeDocument("group-b", [], "source-b"),
    ]);
    const next = movePage(state, "A", "group-a", "group-b", 0);

    expect(pageIds(next, "group-a")).toEqual([]);
    expect(pageIds(next, "group-b")).toEqual(["A"]);
    expect(next.documents.flatMap((document) => document.pages)).toHaveLength(1);
  });
});

describe("source reference helpers", () => {
  const documents = [
    {
      ...makeDocument("group-b", ["A", "B", "X"], "source-a"),
      pages: [
        makePage("A", "group-b", "source-a"),
        makePage("B", "group-b", "source-a"),
        makePage("X", "group-b", "source-b"),
      ],
    },
  ];

  it("finds mixed and repeated immutable sources", () => {
    expect([...getReferencedSourceDocumentIds(documents)].sort()).toEqual([
      "source-a",
      "source-b",
    ]);
    expect(isSourceDocumentReferenced(documents, "source-a")).toBe(true);
    expect(isSourceDocumentReferenced(documents, "source-c")).toBe(false);
  });

  it("keeps a source while one of several references remains", () => {
    const afterRemovingOne = [
      { ...documents[0], pages: documents[0].pages.filter((page) => page.id !== "A") },
    ];
    expect(isSourceDocumentReferenced(afterRemovingOne, "source-a")).toBe(true);
  });

  it("prunes metadata only after the editable group and final page reference disappear", () => {
    const sourceDocuments: WorkspaceSourceDocuments = {
      "source-a": {
        id: "source-a",
        name: "A.pdf",
        size: 100,
        mimeType: "application/pdf",
        originalPageCount: 2,
        importedAt: 1,
      },
      "source-b": {
        id: "source-b",
        name: "B.pdf",
        size: 100,
        mimeType: "application/pdf",
        originalPageCount: 1,
        importedAt: 1,
      },
    };

    expect(pruneSourceDocuments(sourceDocuments, documents)).toBe(sourceDocuments);
    expect(pruneSourceDocuments(sourceDocuments, [])).toEqual({});
  });

  it("keeps original source metadata after its editable group is removed", () => {
    const sourceDocuments: WorkspaceSourceDocuments = {
      "source-a": {
        id: "source-a",
        name: "Original A.pdf",
        size: 100,
        mimeType: "application/pdf",
        originalPageCount: 1,
        importedAt: 1,
      },
      "group-b": {
        id: "group-b",
        name: "B.pdf",
        size: 100,
        mimeType: "application/pdf",
        originalPageCount: 1,
        importedAt: 1,
      },
    };
    const state: WorkspaceState = {
      ...initialWorkspaceState,
      sourceDocuments,
      documents: [
        makeDocument("source-a", []),
        makeDocument("group-b", ["A"], "source-a"),
      ],
    };

    const withoutOriginalGroup = workspaceReducer(state, {
      type: "REMOVE_DOCUMENT",
      payload: { id: "source-a" },
    });
    expect(withoutOriginalGroup.sourceDocuments["source-a"].name).toBe(
      "Original A.pdf"
    );

    const withoutFinalReference = workspaceReducer(withoutOriginalGroup, {
      type: "REMOVE_DOCUMENT",
      payload: { id: "group-b" },
    });
    expect(withoutFinalReference.sourceDocuments).toEqual({});
  });
});

describe("page-ID updates", () => {
  it("updates a thumbnail before movement", () => {
    const state = makeState([makeDocument("group-a", ["A"])]);
    const next = workspaceReducer(state, {
      type: "UPDATE_PAGE_BY_ID",
      payload: { pageId: "A", changes: { thumbnailStatus: "rendering" } },
    });
    expect(next.documents[0].pages[0].thumbnailStatus).toBe("rendering");
  });

  it("finds and updates the page after movement", () => {
    const state = makeState([
      makeDocument("group-a", ["A"], "source-a"),
      makeDocument("group-b", [], "source-b"),
    ]);
    const moved = movePage(state, "A", "group-a", "group-b", 0);
    const updated = workspaceReducer(moved, {
      type: "UPDATE_PAGE_BY_ID",
      payload: {
        pageId: "A",
        changes: { thumbnailStatus: "ready", thumbnailUrl: "blob:test" },
      },
    });

    expect(updated.documents[1].pages[0]).toMatchObject({
      id: "A",
      documentId: "group-b",
      sourceDocumentId: "source-a",
      thumbnailStatus: "ready",
      thumbnailUrl: "blob:test",
    });
  });

  it("ignores an update after removal and never recreates the page", () => {
    const state = makeState([makeDocument("group-a", ["A"])]);
    const removed = workspaceReducer(state, {
      type: "REMOVE_DOCUMENT",
      payload: { id: "group-a" },
    });
    const updated = workspaceReducer(removed, {
      type: "UPDATE_PAGE_BY_ID",
      payload: { pageId: "A", changes: { thumbnailStatus: "ready" } },
    });

    expect(updated).toBe(removed);
    expect(updated.documents).toEqual([]);
  });
});
