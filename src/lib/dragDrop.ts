export const PDF_SPACE_PAGE_DRAG_TYPE = "application/x-pdf-space-page";

/**
 * Robust helper to identify if a drag-and-drop event represents an external
 * file import from the OS rather than an internal page drag or element drag.
 */
export function isExternalFileDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;

  // Safeguard: Check global flag if internal page dragging is active
  if ((window as any).isInternalDragging) {
    return false;
  }

  const types = Array.from(dataTransfer.types ?? []);

  // Check if our custom MIME type is registered in types
  const isInternalPageDrag = types.includes(PDF_SPACE_PAGE_DRAG_TYPE);

  // Check if "Files" exist in types or items
  const containsFiles =
    types.includes("Files") ||
    Array.from(dataTransfer.items ?? []).some(
      (item) => item.kind === "file"
    );

  return containsFiles && !isInternalPageDrag;
}
