import React from "react";
import { AlertTriangle, Check, FileText } from "lucide-react";
import { ExportDocumentSelection } from "../../lib/export/exportDialogModel";
import { normalizePdfOutputFileName } from "../../lib/export/exportFileNames";

type ExportDocumentCardProps = {
  selection: ExportDocumentSelection;
  onToggle: () => void;
  onFileNameChange: (fileName: string) => void;
};

export function isInteractiveExportCardTarget(
  target: EventTarget | null
): boolean {
  if (
    !target ||
    typeof (target as { closest?: unknown }).closest !== "function"
  ) {
    return false;
  }
  return Boolean(
    (target as unknown as { closest: (selector: string) => unknown }).closest(
      "input, label, button, a"
    )
  );
}

export const ExportDocumentCard: React.FC<ExportDocumentCardProps> = ({
  selection,
  onToggle,
  onFileNameChange,
}) => {
  const unavailable = selection.status !== "ready";
  const selected = selection.selected && !unavailable;
  const checkboxId = `export-document-${selection.documentId}`;
  const fileNameId = `export-file-name-${selection.documentId}`;
  const validationId = `${fileNameId}-validation`;
  const reasonId = `${checkboxId}-reason`;
  const resolvedNameDiffers =
    selection.resolvedFileName !==
    normalizePdfOutputFileName(selection.fileName);

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    if (unavailable) return;
    if (isInteractiveExportCardTarget(event.target)) return;
    onToggle();
  };

  return (
    <article
      data-selected={selected ? "true" : "false"}
      onClick={handleCardClick}
      className={`group relative rounded-2xl border p-4 transition-[border-color,background-color,box-shadow,transform] duration-200 ${
        selected
          ? "border-blue-bright/35 bg-blue-accent/[0.075] shadow-[inset_0_1px_0_rgba(78,123,255,0.08),0_10px_30px_rgba(0,12,38,0.14)]"
          : unavailable
            ? "border-white/[0.045] bg-panel-elevated/20 opacity-70"
            : "cursor-pointer border-border-main bg-panel-elevated/35 hover:border-blue-bright/20 hover:bg-panel-elevated/55"
      }`}
    >
      <div className="flex items-start gap-3">
        <label
          htmlFor={checkboxId}
          className={`relative mt-0.5 flex h-5 w-5 shrink-0 ${
            unavailable ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={selection.selected}
            disabled={unavailable}
            onChange={onToggle}
            aria-label={`Select ${selection.documentName}`}
            aria-describedby={unavailable ? reasonId : undefined}
            className="peer h-5 w-5 appearance-none rounded-md border border-border-strong/70 bg-[#070c17] transition-all duration-200 checked:border-blue-bright checked:bg-blue-accent disabled:border-white/10 disabled:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright focus-visible:ring-offset-2 focus-visible:ring-offset-[#08101f]"
          />
          <Check
            className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </label>

        <span
          className="mt-0.5 h-9 w-1 shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
          style={{ backgroundColor: selection.color, color: selection.color }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[0.035] text-muted-text">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-primary-text sm:text-[14px]">
                  {selection.documentName}
                </h3>
                <p
                  id={selection.status === "empty" ? reasonId : undefined}
                  className="mt-0.5 text-[11.5px] font-medium text-muted-text"
                >
                  {selection.pageCount}{" "}
                  {selection.pageCount === 1 ? "page" : "pages"}
                  {selection.status === "empty" && selection.disabledReason
                    ? ` — ${selection.disabledReason}`
                    : ""}
                </p>
              </div>
            </div>

            {unavailable && selection.status !== "empty" ? (
              <span
                id={reasonId}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] px-2 py-1 text-[10.5px] font-semibold text-amber-300"
              >
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {selection.disabledReason}
              </span>
            ) : selected ? (
              <span className="rounded-lg border border-blue-bright/15 bg-blue-bright/[0.07] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-bright">
                Selected
              </span>
            ) : null}
          </div>

          {selected && (
            <div
              className="mt-4 border-t border-white/[0.055] pt-3.5"
              onClick={(event) => event.stopPropagation()}
            >
              <label
                htmlFor={fileNameId}
                className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-text"
              >
                Output filename
              </label>
              <input
                id={fileNameId}
                type="text"
                dir="auto"
                value={selection.fileName}
                onChange={(event) => onFileNameChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                aria-invalid={Boolean(selection.validationError)}
                aria-describedby={
                  selection.validationError || resolvedNameDiffers
                    ? validationId
                    : undefined
                }
                className="h-10 w-full rounded-xl border border-border-main bg-[#050a14]/80 px-3.5 text-[13px] font-medium text-primary-text shadow-[inset_0_1px_3px_rgba(0,0,0,0.28)] outline-none transition-all duration-200 placeholder:text-muted-text/50 hover:border-border-strong focus:border-blue-bright/65 focus:ring-2 focus:ring-blue-bright/20"
              />
              {selection.validationError ? (
                <p
                  id={validationId}
                  role="alert"
                  className="mt-1.5 text-[11px] leading-4 text-red-300"
                >
                  {selection.validationError}
                </p>
              ) : resolvedNameDiffers ? (
                <p
                  id={validationId}
                  className="mt-1.5 text-[11px] leading-4 text-muted-text"
                  dir="auto"
                >
                  Download name: {selection.resolvedFileName}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
