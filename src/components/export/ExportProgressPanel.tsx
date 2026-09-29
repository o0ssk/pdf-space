import React from "react";
import { FileArchive, Files } from "lucide-react";
import { ExportUiPhase } from "../../lib/export/exportProgress";

type ExportProgressPanelProps = {
  phase: ExportUiPhase;
  value: number;
  label: string;
  currentOutputName?: string;
  documentIndex: number;
  documentCount: number;
  completedPages: number;
  totalPages: number;
};

export const ExportProgressPanel: React.FC<ExportProgressPanelProps> = ({
  phase,
  value,
  label,
  currentOutputName,
  documentIndex,
  documentCount,
  completedPages,
  totalPages,
}) => {
  const packaging = phase === "creating-zip";
  const downloading = phase === "downloading";
  const clampedValue = Math.max(0, Math.min(100, value));
  const currentDocument =
    documentCount > 0 ? Math.min(documentIndex + 1, documentCount) : 0;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="PDF export progress"
      className="flex min-h-[290px] flex-col justify-center"
    >
      <div className="studio-surface studio-surface-raised p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-bright/20 bg-blue-accent/10 text-blue-bright">
            {packaging ? (
              <FileArchive className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Files className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-primary-text">
              {downloading
                ? "Starting your download"
                : packaging
                  ? "Packaging your PDFs"
                  : "Exporting PDFs"}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-muted-text">
              {packaging
                ? "Creating one ZIP file from the completed documents."
                : documentCount > 0
                  ? `Processing document ${currentDocument} of ${documentCount}`
                  : "Preparing the selected documents."}
            </p>
          </div>
        </div>

        {currentOutputName && !packaging && !downloading && (
          <div className="mt-5 rounded-xl border border-white/5 bg-[#050a14]/65 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-text">
              Current output
            </p>
            <p
              className="mt-1 truncate text-[13px] font-semibold text-secondary-text"
              dir="auto"
              title={currentOutputName}
            >
              {currentOutputName}
            </p>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between gap-4 text-[11px] font-semibold text-muted-text">
            <span className="truncate">{label}</span>
            <span className="shrink-0 tabular-nums text-secondary-text">
              {Math.round(clampedValue)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedValue)}
            aria-label="Export completion"
            className="h-2 overflow-hidden rounded-full border border-border-main bg-main-bg"
          >
            <div
              className="h-full origin-left rounded-full bg-blue-accent transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${clampedValue / 100})` }}
            />
          </div>
          <div className="mt-2.5 flex min-h-4 justify-end text-[10.5px] font-medium text-muted-text">
            {totalPages > 0 && (
              <span className="tabular-nums">
                {completedPages} of {totalPages} pages
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11.5px] leading-5 text-muted-text">
        Preparing your files locally. Keep this window open until the download
        begins.
      </p>
    </section>
  );
};
