import { PdfExportProgress } from "./exportTypes";

export type ExportUiPhase =
  | "idle"
  | "planning"
  | "loading-sources"
  | "copying-pages"
  | "saving-pdfs"
  | "creating-zip"
  | "downloading"
  | "complete"
  | "cancelled"
  | "failed";

export type AggregatedExportProgress = {
  phase: ExportUiPhase;
  documentIndex: number;
  documentCount: number;
  completedPages: number;
  totalPages: number;
  value: number;
  label: string;
  completedSources?: number | undefined;
  totalSources?: number | undefined;
  currentSourceDocumentId?: string | undefined;
  currentSourceName?: string | undefined;
  currentSourceNumber?: number | undefined;
};

export function aggregatePdfExportProgress({
  progress,
  selectedPageCounts,
  previousValue = 0,
}: {
  progress: PdfExportProgress;
  selectedPageCounts: readonly number[];
  previousValue?: number;
}): AggregatedExportProgress {
  const totalPages = selectedPageCounts.reduce(
    (sum, count) => sum + count,
    0
  );
  const completedBefore = selectedPageCounts
    .slice(0, progress.documentIndex)
    .reduce((sum, count) => sum + count, 0);
  const completedPages = Math.min(
    totalPages,
    completedBefore + progress.completedPages
  );
  const rawValue =
    totalPages === 0 ? 0 : Math.round((completedPages / totalPages) * 85);
  const value = Math.max(previousValue, rawValue);
  const phase: ExportUiPhase =
    progress.phase === "planning"
      ? "planning"
      : progress.phase === "loading-sources"
        ? "loading-sources"
        : progress.phase === "copying-pages"
          ? "copying-pages"
          : "saving-pdfs";
  const documentLabel = `document ${Math.min(
    progress.documentIndex + 1,
    progress.documentCount
  )} of ${progress.documentCount}`;
  const label = progress.currentSourceName
    ? `Loading source ${progress.currentSourceNumber ?? "?"} of ${
        progress.totalSources
      }: ${progress.currentSourceName}`
    :
    phase === "planning"
      ? "Preparing export…"
      : phase === "loading-sources"
        ? `Loading PDF sources for ${documentLabel}…`
        : phase === "copying-pages"
          ? `Processing ${completedPages} of ${totalPages} pages…`
          : `Creating PDF ${Math.min(
              progress.documentIndex + 1,
              progress.documentCount
            )} of ${progress.documentCount}…`;

  return {
    phase,
    documentIndex: progress.documentIndex,
    documentCount: progress.documentCount,
    completedPages,
    totalPages,
    value,
    label,
    completedSources: progress.completedSources,
    totalSources: progress.totalSources,
    currentSourceDocumentId: progress.currentSourceDocumentId,
    currentSourceName: progress.currentSourceName,
    currentSourceNumber: progress.currentSourceNumber,
  };
}
