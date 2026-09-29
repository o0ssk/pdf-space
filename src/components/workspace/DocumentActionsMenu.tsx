import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { WorkspaceDocument } from "../../types/workspace";

type DocumentActionsMenuProps = {
  document: WorkspaceDocument;
  canDelete: boolean;
  actionsDisabled: boolean;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  surface: "sidebar" | "canvas";
};

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  document,
  canDelete,
  actionsDisabled,
  onRename,
  onDuplicate,
  onDelete,
  surface,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not([disabled])'
    );
    firstItem?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!actionsDisabled) return;
    setIsOpen(false);
  }, [actionsDisabled]);

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const handleMenuKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    const items: HTMLButtonElement[] = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])'
      ) ?? []
    );
    const currentIndex = items.indexOf(
      globalThis.document.activeElement as HTMLButtonElement
    );
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (Math.max(0, currentIndex) + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="relative flex-shrink-0"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        id={`document-actions-${surface}-${document.id}`}
        type="button"
        aria-label={`Document actions for ${document.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={actionsDisabled}
        title={
          actionsDisabled
            ? "Document actions are unavailable while dragging."
            : `Document actions for ${document.name}`
        }
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text transition-colors hover:bg-white/10 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright disabled:cursor-not-allowed disabled:opacity-35 ${
          surface === "sidebar" ? "lg:h-8 lg:w-8" : ""
        }`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${document.name}`}
          onKeyDown={handleMenuKeyDown}
          className={`absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border-main bg-panel-elevated p-1.5 shadow-dialog ${
            surface === "sidebar" ? "top-full" : "top-full"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(onRename)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[11.5px] font-bold text-secondary-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            aria-label={`Duplicate ${document.name}`}
            onClick={() => runAction(onDuplicate)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[11.5px] font-bold text-secondary-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Duplicate document
          </button>
          <div className="my-1 h-px bg-white/5" role="separator" />
          <button
            type="button"
            role="menuitem"
            disabled={!canDelete}
            aria-label={`Delete ${document.name}`}
            title={
              canDelete
                ? `Delete ${document.name}`
                : "A workspace must contain at least one document."
            }
            onClick={() => runAction(onDelete)}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[11.5px] font-bold text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:text-muted-text disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Delete document
              {!canDelete && (
                <span className="mt-0.5 block text-[9.5px] font-medium leading-4 text-muted-text">
                  A workspace must contain at least one document.
                </span>
              )}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
