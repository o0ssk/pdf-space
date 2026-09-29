import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { WorkspaceDocument } from "../../types/workspace";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type DeleteDocumentDialogProps = {
  document: WorkspaceDocument | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeleteDocumentDialog: React.FC<DeleteDocumentDialogProps> = ({
  document,
  onCancel,
  onConfirm,
}) => {
  const isOpen = document !== null;
  const { containerRef } = useFocusTrap({ isOpen });
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (!isOpen) return;
    cancelButtonRef.current?.focus();
  }, [isOpen]);

  if (!document) return null;
  const pageLabel =
    document.pages.length === 1
      ? "This document contains 1 page."
      : `This document contains ${document.pages.length} pages.`;

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <section
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-document-title"
        aria-describedby="delete-document-description"
        tabIndex={-1}
        className="command-surface flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col overflow-hidden border-red-500/20"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="delete-document-title"
                dir="auto"
                className="break-words text-[14px] font-extrabold text-primary-text"
              >
                Delete “{document.name}”?
              </h2>
              <p
                id="delete-document-description"
                className="mt-1.5 text-[11.5px] leading-relaxed text-muted-text"
              >
                {pageLabel}
                <br />
                The whole document group will be removed from this workspace.
                The original PDF on your computer will not be deleted.
                <br />
                You can undo this action while the current workspace session
                remains open.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close delete document confirmation"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text hover:bg-white/10 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <footer className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-[12px] font-extrabold text-secondary-text hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[12px] font-extrabold text-white hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete Document
          </button>
        </footer>
      </section>
    </div>
  );
};
