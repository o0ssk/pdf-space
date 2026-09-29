export type PdfSpacePerformanceSnapshot = {
  mountedPageThumbnails: number;
  queuedThumbnailTasks: number;
  activeThumbnailTasks: number;
  cachedThumbnailEntries: number;
  cachedThumbnailBytes: number;
  loadedPdfJsDocuments: number;
  activePdfDocumentLeases: number;
  indexedTextSourcePages: number;
  textIndexCharacters: number;
  activeTextExtractionTasks: number;
  activeObjectUrls: number;
  pendingAutosaveWrites: number;
  undoEntryCount: number;
  redoEntryCount: number;
  estimatedHistoryBytes: number;
};

type PerformanceMetric = keyof PdfSpacePerformanceSnapshot;

const EMPTY_SNAPSHOT: PdfSpacePerformanceSnapshot = {
  mountedPageThumbnails: 0,
  queuedThumbnailTasks: 0,
  activeThumbnailTasks: 0,
  cachedThumbnailEntries: 0,
  cachedThumbnailBytes: 0,
  loadedPdfJsDocuments: 0,
  activePdfDocumentLeases: 0,
  indexedTextSourcePages: 0,
  textIndexCharacters: 0,
  activeTextExtractionTasks: 0,
  activeObjectUrls: 0,
  pendingAutosaveWrites: 0,
  undoEntryCount: 0,
  redoEntryCount: 0,
  estimatedHistoryBytes: 0,
};

class PerformanceDiagnostics {
  private values: PdfSpacePerformanceSnapshot = { ...EMPTY_SNAPSHOT };

  set(metric: PerformanceMetric, value: number): void {
    this.values[metric] = Math.max(0, Number.isFinite(value) ? value : 0);
  }

  increment(metric: PerformanceMetric, amount = 1): void {
    this.set(metric, this.values[metric] + amount);
  }

  snapshot(): PdfSpacePerformanceSnapshot {
    return { ...this.values };
  }

  reset(): void {
    this.values = { ...EMPTY_SNAPSHOT };
  }
}

export const performanceDiagnostics = new PerformanceDiagnostics();

export function exposePerformanceDiagnostics(): () => void {
  if (!import.meta.env.DEV || typeof window === "undefined") return () => {};
  const performanceSnapshot = () => performanceDiagnostics.snapshot();
  window.__PDF_SPACE_DEBUG__ = {
    ...window.__PDF_SPACE_DEBUG__,
    performanceSnapshot,
  };
  return () => {
    if (window.__PDF_SPACE_DEBUG__?.performanceSnapshot === performanceSnapshot) {
      delete window.__PDF_SPACE_DEBUG__.performanceSnapshot;
    }
  };
}
