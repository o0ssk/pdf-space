import { describe, expect, it } from "vitest";
import {
  WorkspacePage,
  clampInsertionSlot,
  getInsertionSlotForPlacement,
  getTargetBasePages,
} from "./workspace";

function page(id: string, documentId = "group-a"): WorkspacePage {
  return {
    id,
    documentId,
    sourceDocumentId: "source-a",
    originalPageIndex: 0,
    pageNumber: 1,
    rotation: 0,
    thumbnailStatus: "idle",
  };
}

const pages = [page("A"), page("B"), page("C")];

describe("insertion slot helpers", () => {
  it("clamps slots to valid boundaries", () => {
    expect(clampInsertionSlot(-10, 3)).toBe(0);
    expect(clampInsertionSlot(2, 3)).toBe(2);
    expect(clampInsertionSlot(10, 3)).toBe(3);
  });

  it("calculates before and after positions", () => {
    expect(
      getInsertionSlotForPlacement({ pages, placement: "before", overPageId: "B" })
    ).toBe(1);
    expect(
      getInsertionSlotForPlacement({ pages, placement: "after", overPageId: "B" })
    ).toBe(2);
  });

  it("calculates start, end, and empty positions", () => {
    expect(getInsertionSlotForPlacement({ pages, placement: "start" })).toBe(0);
    expect(getInsertionSlotForPlacement({ pages, placement: "end" })).toBe(3);
    expect(getInsertionSlotForPlacement({ pages: [], placement: "empty" })).toBe(0);
  });

  it("returns null when a referenced page is missing", () => {
    expect(
      getInsertionSlotForPlacement({ pages, placement: "before", overPageId: "Z" })
    ).toBeNull();
  });

  it("removes the active page from a same-group projection base", () => {
    const documents = [
      {
        id: "group-a",
        name: "A.pdf",
        size: 1,
        mimeType: "application/pdf",
        pageCount: 3,
        color: "#fff",
        status: "ready" as const,
        pages,
      },
    ];

    expect(
      getTargetBasePages({
        documents,
        activePageId: "B",
        sourceContainerId: "group-a",
        targetContainerId: "group-a",
      }).map((candidate) => candidate.id)
    ).toEqual(["A", "C"]);
  });
});
