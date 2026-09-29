import { ProjectedPageDrop, WorkspacePage } from "../../types/workspace";

export type ProjectedGridItem =
  | {
      type: "page";
      id: string;
      page: WorkspacePage;
    }
  | {
      type: "ghost";
      id: string;
      page: WorkspacePage;
      insertionSlot: number;
    };

function insertProjectedGhost({
  pages,
  activePage,
  targetContainerId,
  insertionSlot,
}: {
  pages: readonly WorkspacePage[];
  activePage: WorkspacePage;
  targetContainerId: string;
  insertionSlot: number;
}): ProjectedGridItem[] {
  const safeSlot = Math.max(0, Math.min(insertionSlot, pages.length));
  const pageItems = pages.map((page) => ({
    type: "page" as const,
    id: page.id,
    page,
  }));

  return [
    ...pageItems.slice(0, safeSlot),
    {
      type: "ghost" as const,
      id: `ghost:${targetContainerId}:${safeSlot}`,
      page: activePage,
      insertionSlot: safeSlot,
    },
    ...pageItems.slice(safeSlot),
  ];
}

export function buildSameContainerProjectedItems({
  pages,
  activePageId,
  insertionSlot,
}: {
  pages: readonly WorkspacePage[];
  activePageId: string;
  insertionSlot: number;
}): ProjectedGridItem[] {
  const activePage = pages.find((page) => page.id === activePageId);

  if (!activePage) {
    return pages.map((page) => ({
      type: "page" as const,
      id: page.id,
      page,
    }));
  }

  return insertProjectedGhost({
    pages: pages.filter((page) => page.id !== activePageId),
    activePage,
    targetContainerId: activePage.documentId,
    insertionSlot,
  });
}

export function buildCrossContainerProjectedItems({
  pages,
  activePage,
  targetContainerId,
  insertionSlot,
}: {
  pages: readonly WorkspacePage[];
  activePage: WorkspacePage;
  targetContainerId: string;
  insertionSlot: number;
}): ProjectedGridItem[] {
  return insertProjectedGhost({
    pages,
    activePage,
    targetContainerId,
    insertionSlot,
  });
}

export type PageDropTargetData = {
  type: "page";
  pageId: string;
  containerId: string;
  index: number;
};

export type ContainerDropTargetData = {
  type: "container";
  containerId: string;
};

export type ProjectedSlotDropTargetData = {
  type: "projected-slot";
  containerId: string;
  insertionSlot: number;
};

export type SidebarContainerDropTargetData = {
  type: "sidebar-container";
  containerId: string;
};

export type DropTargetData =
  | PageDropTargetData
  | ContainerDropTargetData
  | ProjectedSlotDropTargetData
  | SidebarContainerDropTargetData;

export function getDropTargetData(value: unknown): DropTargetData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.containerId !== "string") return null;

  switch (candidate.type) {
    case "page":
      return typeof candidate.pageId === "string" &&
        typeof candidate.index === "number"
        ? (candidate as PageDropTargetData)
        : null;
    case "container":
      return candidate as ContainerDropTargetData;
    case "projected-slot":
      return typeof candidate.insertionSlot === "number"
        ? (candidate as ProjectedSlotDropTargetData)
        : null;
    case "sidebar-container":
      return candidate as SidebarContainerDropTargetData;
    default:
      return null;
  }
}

export function isSameProjectedDrop(
  a: ProjectedPageDrop | null,
  b: ProjectedPageDrop | null
): boolean {
  return (
    a === b ||
    Boolean(
      a &&
        b &&
        a.activePageId === b.activePageId &&
        a.sourceContainerId === b.sourceContainerId &&
        a.targetContainerId === b.targetContainerId &&
        a.insertionSlot === b.insertionSlot
    )
  );
}

export function resolveActivePageDragData(
  current: unknown,
  capturedAtDragStart: PageDropTargetData | null
): PageDropTargetData | null {
  const currentTarget = getDropTargetData(current);
  return currentTarget?.type === "page"
    ? currentTarget
    : capturedAtDragStart;
}
