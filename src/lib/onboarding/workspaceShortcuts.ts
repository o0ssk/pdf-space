export type WorkspaceShortcutCategory =
  | "Navigation"
  | "Selection"
  | "Editing"
  | "Search"
  | "History";

export type WorkspaceShortcutDefinition = {
  id: string;
  keys: string[];
  macKeys?: string[];
  label: string;
  category: WorkspaceShortcutCategory;
  context?: string;
};

export const WORKSPACE_SHORTCUTS: readonly WorkspaceShortcutDefinition[] = [
  { id: "quick-navigation", keys: ["Ctrl K"], macKeys: ["⌘ K"], label: "Quick Navigation", category: "Search" },
  { id: "pdf-text-search", keys: ["Ctrl F"], macKeys: ["⌘ F"], label: "Search PDF text", category: "Search" },
  { id: "undo", keys: ["Ctrl Z"], macKeys: ["⌘ Z"], label: "Undo", category: "History" },
  { id: "redo", keys: ["Ctrl Shift Z", "Ctrl Y"], macKeys: ["⌘ Shift Z"], label: "Redo", category: "History" },
  { id: "select-all", keys: ["Ctrl A"], macKeys: ["⌘ A"], label: "Select all pages in the active document", category: "Selection" },
  { id: "multi-select", keys: ["Ctrl Click", "Shift Click"], macKeys: ["⌘ Click", "Shift Click"], label: "Add pages or select a range", category: "Selection" },
  { id: "delete-pages", keys: ["Delete"], label: "Delete selected pages", category: "Editing", context: "When pages are selected" },
  { id: "dismiss", keys: ["Escape"], label: "Close a dialog, cancel rename, or clear selection", category: "Navigation" },
  { id: "activate", keys: ["Enter"], label: "Confirm rename or activate a search result", category: "Navigation" },
  { id: "search-results", keys: ["↑", "↓", "Home", "End"], label: "Move through search results", category: "Navigation", context: "While Search is open" },
  { id: "viewer-pages", keys: ["←", "→"], label: "Previous or next page", category: "Navigation", context: "In the page viewer" },
  { id: "viewer-zoom", keys: ["+", "−", "0", "1"], label: "Zoom in, out, reset, or fit page", category: "Navigation", context: "In the page viewer" },
];

export function isMacPlatform(platform?: string): boolean {
  const value = platform ?? (typeof navigator === "undefined" ? "" : navigator.platform);
  return /Mac|iPhone|iPad|iPod/.test(value);
}

export function shortcutKeys(
  shortcut: WorkspaceShortcutDefinition,
  mac = isMacPlatform()
): string[] {
  return mac && shortcut.macKeys ? shortcut.macKeys : shortcut.keys;
}

export function shortcutLabel(id: string, mac = isMacPlatform()): string {
  const shortcut = WORKSPACE_SHORTCUTS.find((item) => item.id === id);
  return shortcut ? shortcutKeys(shortcut, mac).join(" or ") : "";
}

