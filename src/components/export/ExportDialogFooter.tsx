import React from "react";
import { Download, LockKeyhole, RefreshCw, X } from "lucide-react";

type ExportDialogFooterProps = {
  isActive: boolean;
  showResult: boolean;
  selectedCount: number;
  canExport: boolean;
  failedCount: number;
  onCancelExport: () => void;
  onClose: () => void;
  onRetryFailed: () => void;
  onExportAgain: () => void;
};

const secondaryButton =
  "min-h-10 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 text-[12px] font-semibold text-secondary-text transition-all duration-200 hover:border-white/10 hover:bg-white/[0.07] hover:text-primary-text active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright";

export const ExportDialogFooter: React.FC<ExportDialogFooterProps> = ({
  isActive,
  showResult,
  selectedCount,
  canExport,
  failedCount,
  onCancelExport,
  onClose,
  onRetryFailed,
  onExportAgain,
}) => (
  <footer className="flex min-h-[76px] shrink-0 flex-col gap-3 border-t border-border-main bg-[#050a14]/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
    <div className="flex items-center gap-2 text-[11px] font-medium text-secondary-text">
      <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-blue-bright" aria-hidden="true" />
      Processed locally in your browser
    </div>

    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      {isActive ? (
        <button
          type="button"
          onClick={onCancelExport}
          className={`${secondaryButton} inline-flex flex-1 items-center justify-center gap-2 sm:flex-none`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Cancel export
        </button>
      ) : showResult ? (
        <>
          {failedCount > 0 && (
            <button
              type="button"
              onClick={onRetryFailed}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] px-3.5 text-[11.5px] font-semibold text-amber-300 transition-all duration-200 hover:bg-amber-400/10 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:flex-none"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry Failed
            </button>
          )}
          <button
            type="button"
            onClick={onExportAgain}
            className={`${secondaryButton} flex-1 sm:flex-none`}
          >
            Export Again
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 flex-1 rounded-xl bg-blue-accent px-4 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(49,92,255,0.22)] transition-all duration-200 hover:bg-blue-bright hover:shadow-[0_10px_28px_rgba(49,92,255,0.3)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a14] sm:flex-none"
          >
            Done
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButton} flex-1 sm:flex-none`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canExport}
            className="inline-flex min-h-10 flex-[1.35] items-center justify-center gap-2 rounded-xl border border-blue-bright/25 bg-blue-accent px-4 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(49,92,255,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 hover:bg-blue-bright hover:shadow-[0_10px_28px_rgba(49,92,255,0.3)] active:translate-y-px disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.055] disabled:text-muted-text disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a14] sm:flex-none"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {selectedCount > 1
              ? `Export ${selectedCount} PDFs`
              : "Export PDF"}
          </button>
        </>
      )}
    </div>
  </footer>
);
