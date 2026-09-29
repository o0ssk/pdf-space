import React, { useEffect, useMemo } from "react";
import { ArrowRight, Copy, FileText, X } from "lucide-react";
import { WorkspaceDocument, WorkspacePage } from "../../types/workspace";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type DocumentPickerDialogProps = {
  isOpen: boolean;
  mode: "move" | "copy";
  documents: WorkspaceDocument[];
  selectedPages: WorkspacePage[];
  onClose: () => void;
  onChoose: (targetContainerId: string) => void;
};

export const DocumentPickerDialog: React.FC<DocumentPickerDialogProps> = ({
  isOpen,
  mode,
  documents,
  selectedPages,
  onClose,
  onChoose,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });
  const selectedContainerIds = useMemo(
    () => new Set(selectedPages.map((page) => page.documentId)),
    [selectedPages]
  );
  const readyDocuments = useMemo(
    () => documents.filter((document) => document.status === "ready"),
    [documents]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = mode === "move" ? "Move pages to document" : "Copy pages to document";

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <section
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-picker-title"
        tabIndex={-1}
        className="command-surface flex max-h-[min(720px,90vh)] w-full max-w-lg flex-col overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 px-4 sm:px-5 py-4 border-b border-white/5">
          <div>
            <h2 id="document-picker-title" className="text-[14px] font-extrabold text-primary-text">
              {title}
            </h2>
            <p className="text-[11px] text-muted-text mt-1">
              {selectedPages.length} {selectedPages.length === 1 ? "page" : "pages"} selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="w-9 h-9 rounded-xl border border-white/5 bg-white/5 text-muted-text hover:text-primary-text hover:bg-white/10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto p-3 sm:p-4 flex flex-col gap-2">
          {readyDocuments.length === 0 ? (
            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-white/10 text-muted-text text-[12px]">
              No ready document group is available.
            </div>
          ) : (
            readyDocuments.map((document) => {
              const containsSelectedPages = selectedContainerIds.has(document.id);
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => onChoose(document.id)}
                  className="w-full min-h-16 rounded-xl border border-white/5 bg-white/[0.025] hover:bg-white/5 hover:border-blue-bright/25 px-3.5 py-3 flex items-center gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                >
                  <span
                    className="w-2.5 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: document.color }}
                    aria-hidden="true"
                  />
                  <FileText className="w-4 h-4 text-muted-text flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-grow">
                    <span className="block text-[12.5px] font-extrabold text-primary-text truncate">
                      {document.name}
                    </span>
                    <span className="block text-[10.5px] text-muted-text mt-0.5">
                      {document.pages.length} {document.pages.length === 1 ? "page" : "pages"}
                      {document.pages.length === 0 ? " • Empty group" : ""}
                      {containsSelectedPages ? " • Contains selected pages" : ""}
                    </span>
                  </span>
                  {mode === "move" ? (
                    <ArrowRight className="w-4 h-4 text-blue-bright flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 text-blue-bright flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
