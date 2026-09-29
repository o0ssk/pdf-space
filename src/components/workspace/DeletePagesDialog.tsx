import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type DeletePagesDialogProps = {
  isOpen: boolean;
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export const DeletePagesDialog: React.FC<DeletePagesDialogProps> = ({
  isOpen,
  selectedCount,
  onCancel,
  onConfirm,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });

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

  if (!isOpen) return null;

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <section
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-pages-title"
        aria-describedby="delete-pages-description"
        tabIndex={-1}
        className="command-surface w-full max-w-md overflow-hidden border-red-500/20"
      >
        <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="delete-pages-title" className="text-[14px] font-extrabold text-primary-text">
                Delete selected pages?
              </h2>
              <p id="delete-pages-description" className="text-[11.5px] text-muted-text leading-relaxed mt-1.5">
                {selectedCount === 1
                  ? "This page will be removed from the workspace."
                  : `${selectedCount} pages will be removed from the workspace.`}
                <br />
                You can undo this action afterward.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close delete confirmation"
            className="w-9 h-9 rounded-xl border border-white/5 bg-white/5 text-muted-text hover:text-primary-text hover:bg-white/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        <footer className="p-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-secondary-text text-[12px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white text-[12px] font-extrabold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Delete Pages
          </button>
        </footer>
      </section>
    </div>
  );
};
