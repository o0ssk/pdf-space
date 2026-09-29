export type WorkspaceSearchShortcutContext = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey?: boolean;
  isTyping: boolean;
  isDialogOpen: boolean;
  isDragging: boolean;
};

export function shouldOpenWorkspaceSearch(
  context: WorkspaceSearchShortcutContext
): boolean {
  return (
    (context.ctrlKey || context.metaKey) &&
    !context.altKey &&
    context.key.toLocaleLowerCase() === "k" &&
    !context.isTyping &&
    !context.isDialogOpen &&
    !context.isDragging
  );
}

export function shouldOpenPdfTextSearch(
  context: WorkspaceSearchShortcutContext
): boolean {
  return (
    (context.ctrlKey || context.metaKey) &&
    !context.altKey &&
    context.key.toLocaleLowerCase() === "f" &&
    !context.isTyping &&
    !context.isDialogOpen &&
    !context.isDragging
  );
}
