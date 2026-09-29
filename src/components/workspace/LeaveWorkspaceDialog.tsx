import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type LeaveWorkspaceDialogProps = {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export const LeaveWorkspaceDialog: React.FC<LeaveWorkspaceDialogProps> = ({
  isOpen,
  onStay,
  onLeave,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onStay();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onStay]);
  if (!isOpen) return null;

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6">
      <section
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-workspace-title"
        aria-describedby="leave-workspace-description"
        tabIndex={-1}
        className="command-surface w-full max-w-md overflow-hidden border-amber-400/20"
      >
        <div className="flex items-start gap-3 border-b border-white/5 px-5 py-5">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="leave-workspace-title" className="text-[14px] font-extrabold">
              Leave with unsaved changes?
            </h2>
            <p id="leave-workspace-description" className="mt-1.5 text-[11.5px] leading-relaxed text-muted-text">
              PDF Space could not save your latest changes locally. Leaving
              now may lose those changes.
            </p>
          </div>
        </div>
        <footer className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onStay}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-[12px] font-extrabold text-secondary-text hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="min-h-11 rounded-xl bg-amber-500 px-4 text-[12px] font-extrabold text-black hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            Leave Anyway
          </button>
        </footer>
      </section>
    </div>
  );
};
