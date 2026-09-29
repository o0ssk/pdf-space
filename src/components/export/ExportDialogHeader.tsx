import React from "react";
import { Download, X } from "lucide-react";

type ExportDialogHeaderProps = {
  onClose: () => void;
};

export const ExportDialogHeader: React.FC<ExportDialogHeaderProps> = ({
  onClose,
}) => (
  <header className="relative flex items-start justify-between gap-4 border-b border-border-main bg-panel-elevated/30 px-4 py-4 sm:px-6 sm:py-5">
    <div
      className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-bright/55 to-transparent"
      aria-hidden="true"
    />
    <div className="flex min-w-0 items-start gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-bright/20 bg-blue-accent/10 text-blue-bright shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <Download className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-0.5">
        <h2
          id="export-dialog-title"
          className="text-[20px] font-semibold tracking-[-0.025em] text-primary-text sm:text-[21px]"
        >
          Export PDFs
        </h2>
        <p
          id="export-dialog-description"
          className="mt-1 text-[12.5px] leading-5 text-muted-text sm:text-[13px]"
        >
          Choose the document groups you want to export.
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.035] text-muted-text transition-all duration-200 hover:border-white/10 hover:bg-white/[0.07] hover:text-primary-text active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
      aria-label="Close export dialog"
      title="Close"
    >
      <X className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
    </button>
  </header>
);
