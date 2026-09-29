import {
  WorkspaceSearchIndex,
  WorkspaceSearchItem,
} from "./workspaceSearch";

export type RecentWorkspaceNavigationItem = {
  type: "document" | "page";
  documentId: string;
  pageId?: string;
  visitedAt: number;
};

export const MAX_RECENT_WORKSPACE_NAVIGATIONS = 12;

function recentKey(item: RecentWorkspaceNavigationItem): string {
  return item.type === "page" && item.pageId
    ? `page:${item.pageId}`
    : `document:${item.documentId}`;
}

export function addRecentWorkspaceNavigation(
  recent: readonly RecentWorkspaceNavigationItem[],
  item: RecentWorkspaceNavigationItem,
  limit = MAX_RECENT_WORKSPACE_NAVIGATIONS
): RecentWorkspaceNavigationItem[] {
  const key = recentKey(item);
  return [item, ...recent.filter((candidate) => recentKey(candidate) !== key)].slice(
    0,
    Math.max(0, limit)
  );
}

export function resolveRecentWorkspaceNavigation(
  recent: readonly RecentWorkspaceNavigationItem[],
  index: WorkspaceSearchIndex,
  limit = 8
): WorkspaceSearchItem[] {
  const resolved: WorkspaceSearchItem[] = [];
  for (const item of recent) {
    const destination =
      item.type === "page" && item.pageId
        ? index.pageById.get(item.pageId)
        : index.documentById.get(item.documentId);
    if (!destination) continue;
    if (item.type === "document" && destination.documentId !== item.documentId) {
      continue;
    }
    resolved.push(destination);
    if (resolved.length >= limit) break;
  }
  return resolved;
}
