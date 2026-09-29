import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceDocument, WorkspaceSourceDocuments } from "../types/workspace";
import {
  createFailedPdfPageText,
  extractPdfPageText,
  PdfTextExtractionError,
} from "../lib/pdf-text/pdfTextExtraction";
import { runPdfTextExtractionQueue } from "../lib/pdf-text/pdfTextExtractionQueue";
import { debugPdfTextSearchPage } from "../lib/pdf-text/pdfTextDiagnostics";
import { createPdfTextIndexCache } from "../lib/pdf-text/pdfTextIndexCache";
import {
  buildWorkspaceTextSearchOccurrences,
  filterTextSearchOccurrences,
  uniqueSourcePageOccurrences,
} from "../lib/pdf-text/pdfTextOccurrences";
import { isPdfTextQuerySearchable, parsePdfTextQuery } from "../lib/pdf-text/pdfTextQuery";
import { searchExtractedPdfText } from "../lib/pdf-text/pdfTextSearch";
import {
  PdfTextExtractionErrorCode,
  PdfTextIndexProgress,
  PdfTextSearchScope,
  WorkspaceTextSearchOccurrence,
  ExtractedPdfPageText,
  PdfTextPageStatus,
} from "../lib/pdf-text/pdfTextTypes";

const EMPTY_PROGRESS: PdfTextIndexProgress = {
  status: "idle",
  scope: "current-document",
  completedSourcePages: 0,
  totalSourcePages: 0,
  searchablePages: 0,
  emptyPages: 0,
  failedPages: 0,
};

export function usePdfTextSearch({
  projectId,
  documents,
  sourceDocuments,
  activeDocumentId,
  isActive,
}: {
  projectId: string;
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  activeDocumentId: string | null;
  isActive: boolean;
}) {
  const cacheRef = useRef(createPdfTextIndexCache());
  const controllerRef = useRef<AbortController | null>(null);
  const pageStatusRef = useRef(new Map<string, PdfTextPageStatus>());
  const currentJobKeysRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<number | null>(null);
  const calculateProgressRef = useRef<
    (status: PdfTextIndexProgress["status"], currentIndex?: number) => PdfTextIndexProgress
  >(() => EMPTY_PROGRESS);
  const [query, setQueryState] = useState("");
  const [scope, setScopeState] = useState<PdfTextSearchScope>("current-document");
  const [paused, setPaused] = useState(false);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [runVersion, setRunVersion] = useState(0);
  const [explicitlySubmitted, setExplicitlySubmitted] = useState(false);
  const [progress, setProgress] = useState<PdfTextIndexProgress>(EMPTY_PROGRESS);

  const occurrences = useMemo(
    () => buildWorkspaceTextSearchOccurrences(documents, sourceDocuments),
    [documents, sourceDocuments]
  );
  const resolvedActiveDocumentId = useMemo(
    () =>
      documents.some((document) => document.id === activeDocumentId)
        ? activeDocumentId
        : documents[0]?.id ?? null,
    [activeDocumentId, documents]
  );
  const scopedOccurrences = useMemo(
    () => filterTextSearchOccurrences(occurrences, scope, resolvedActiveDocumentId),
    [occurrences, resolvedActiveDocumentId, scope]
  );
  const uniquePages = useMemo(
    () => uniqueSourcePageOccurrences(scopedOccurrences),
    [scopedOccurrences]
  );
  useEffect(() => {
    const cache = cacheRef.current;
    cache.setProtectedKeys(
      isActive ? uniquePages.map((item) => item.sourcePageKey) : []
    );
    return () => cache.setProtectedKeys([]);
  }, [isActive, uniquePages]);
  const parsedQuery = useMemo(() => parsePdfTextQuery(query), [query]);
  const queryIsSearchable = isPdfTextQuerySearchable(parsedQuery, explicitlySubmitted);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setExplicitlySubmitted(false);
    setPaused(false);
  }, []);
  const setScope = useCallback((value: PdfTextSearchScope) => {
    setScopeState(value);
    setPaused(false);
  }, []);

  const markCurrentJobCancelled = useCallback((notify = true) => {
    for (const key of currentJobKeysRef.current) {
      if (!cacheRef.current.get(key)) pageStatusRef.current.set(key, "cancelled");
    }
    currentJobKeysRef.current.clear();
    if (notify) setCacheVersion((value) => value + 1);
  }, []);

  const calculateProgress = useCallback(
    (status: PdfTextIndexProgress["status"], currentIndex?: number): PdfTextIndexProgress => {
      let searchablePages = 0;
      let emptyPages = 0;
      let failedPages = 0;
      for (const occurrence of uniquePages) {
        const entry = cacheRef.current.get(occurrence.sourcePageKey);
        if (entry?.status === "ready") searchablePages += 1;
        else if (entry?.status === "empty") emptyPages += 1;
        else if (entry?.status === "failed") failedPages += 1;
      }
      const current = currentIndex === undefined ? undefined : uniquePages[currentIndex];
      return {
        status,
        scope,
        completedSourcePages: searchablePages + emptyPages + failedPages,
        totalSourcePages: uniquePages.length,
        searchablePages,
        emptyPages,
        failedPages,
        currentSourceFileName: current?.sourceFileName,
        currentOriginalPageNumber: current?.originalPageNumber,
      };
    },
    [scope, uniquePages]
  );
  calculateProgressRef.current = calculateProgress;
  const scheduleIndexUiRefresh = useCallback(() => {
    if (refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      setCacheVersion((value) => value + 1);
      setProgress(calculateProgressRef.current("indexing"));
    }, 50);
  }, []);

  useEffect(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    controllerRef.current?.abort();
    markCurrentJobCancelled();
    cacheRef.current.clear();
    pageStatusRef.current.clear();
    setQueryState("");
    setScopeState("current-document");
    setPaused(false);
    setCacheVersion((value) => value + 1);
    setProgress(EMPTY_PROGRESS);
  }, [markCurrentJobCancelled, projectId]);

  useEffect(() => {
    if (!isActive) {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
        markCurrentJobCancelled();
        setPaused(true);
        setProgress(calculateProgressRef.current("paused"));
      }
      return;
    }
    if (!queryIsSearchable) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setProgress({ ...EMPTY_PROGRESS, scope, totalSourcePages: uniquePages.length });
      return;
    }
    if (paused) return;

    const missing = uniquePages.filter((item) => {
      const cached = cacheRef.current.get(item.sourcePageKey);
      if (cached?.status === "ready" && !cached.searchRepresentations) {
        cacheRef.current.delete(item.sourcePageKey);
        return true;
      }
      return !cached;
    });
    if (missing.length === 0) {
      setProgress(calculateProgress("complete"));
      return;
    }

    const controller = new AbortController();
    controllerRef.current?.abort();
    markCurrentJobCancelled(false);
    controllerRef.current = controller;
    currentJobKeysRef.current = new Set(missing.map((item) => item.sourcePageKey));
    for (const item of missing) pageStatusRef.current.set(item.sourcePageKey, "pending");
    const firstMissing = missing[0];
    setProgress(calculateProgress("indexing", firstMissing ? uniquePages.indexOf(firstMissing) : -1));

    void runPdfTextExtractionQueue<WorkspaceTextSearchOccurrence, ExtractedPdfPageText>({
      items: missing.map((item) => ({ key: item.sourcePageKey, value: item })),
      concurrency: 2,
      signal: controller.signal,
      extract: (item, signal) => {
        pageStatusRef.current.set(item.sourcePageKey, "extracting");
        return extractPdfPageText({
          sourceDocumentId: item.sourceDocumentId,
          originalPageIndex: item.originalPageIndex,
          ...(signal ? { signal } : {}),
        });
      },
      onSettled: (item, settled) => {
        if (settled.status === "fulfilled") {
          cacheRef.current.set(item.key, settled.value);
          pageStatusRef.current.set(item.key, settled.value.status);
        } else {
          const reason = settled.reason;
          const errorCode: PdfTextExtractionErrorCode =
            reason instanceof PdfTextExtractionError ? reason.code : "UNKNOWN";
          if (errorCode !== "INDEX_CANCELLED") {
            cacheRef.current.set(
              item.key,
              createFailedPdfPageText({
                sourceDocumentId: item.value.sourceDocumentId,
                originalPageIndex: item.value.originalPageIndex,
                errorCode,
              })
            );
            pageStatusRef.current.set(item.key, "failed");
          } else {
            pageStatusRef.current.set(item.key, "cancelled");
          }
        }
        currentJobKeysRef.current.delete(item.key);
        scheduleIndexUiRefresh();
      },
    }).then(() => {
      if (controller.signal.aborted) return;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      controllerRef.current = null;
      currentJobKeysRef.current.clear();
      setCacheVersion((value) => value + 1);
      setProgress(calculateProgress("complete"));
    });

    return () => {
      controller.abort();
      markCurrentJobCancelled(false);
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [
    calculateProgress,
    isActive,
    markCurrentJobCancelled,
    paused,
    queryIsSearchable,
    runVersion,
    scheduleIndexUiRefresh,
    scope,
    uniquePages,
  ]);

  const searchState = useMemo(
    () => {
      void cacheVersion;
      return queryIsSearchable
        ? searchExtractedPdfText({
            query: parsedQuery,
            cache: cacheRef.current,
            occurrences: scopedOccurrences,
          })
        : { results: [], totalMatches: 0 };
    },
    [cacheVersion, parsedQuery, queryIsSearchable, scopedOccurrences]
  );

  const failedOccurrences = useMemo(
    () => {
      void cacheVersion;
      return uniquePages.filter(
        (item) => cacheRef.current.get(item.sourcePageKey)?.status === "failed"
      );
    },
    [cacheVersion, uniquePages]
  );

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    const inspectTextPage = ({
      documentId,
      pageId,
      sourceDocumentId,
      originalPageIndex,
      query: debugQuery = query,
    }: {
      documentId?: string;
      pageId?: string;
      sourceDocumentId?: string;
      originalPageIndex?: number;
      query?: string;
    }) => {
      const occurrence = occurrences.find(
        (item) =>
          (pageId ? item.pageId === pageId : true) &&
          (documentId ? item.documentId === documentId : true) &&
          (sourceDocumentId ? item.sourceDocumentId === sourceDocumentId : true) &&
          (originalPageIndex === undefined ? true : item.originalPageIndex === originalPageIndex)
      );
      const sourceId = sourceDocumentId ?? occurrence?.sourceDocumentId ?? "";
      const pageIndex = originalPageIndex ?? occurrence?.originalPageIndex ?? -1;
      const key = occurrence?.sourcePageKey ??
        uniquePages.find(
          (item) =>
            item.sourceDocumentId === sourceId && item.originalPageIndex === pageIndex
        )?.sourcePageKey;
      const record = key ? cacheRef.current.get(key) : undefined;
      const extractionStatus =
        (key ? pageStatusRef.current.get(key) : undefined) ?? record?.status ?? "pending";
      return debugPdfTextSearchPage({
        sourceDocumentId: sourceId,
        originalPageIndex: pageIndex,
        query: parsePdfTextQuery(debugQuery),
        extractionStatus,
        ...(record ? { record } : {}),
        ...(occurrence ? { occurrence } : {}),
      });
    };
    const inspectTextIndex = () => {
      const counts: Record<PdfTextPageStatus, number> = {
        pending: 0,
        extracting: 0,
        ready: 0,
        empty: 0,
        failed: 0,
        cancelled: 0,
      };
      for (const item of uniquePages) {
        const record = cacheRef.current.get(item.sourcePageKey);
        const status = pageStatusRef.current.get(item.sourcePageKey) ?? record?.status ?? "pending";
        counts[status] += 1;
      }
      return {
        totalRequiredKeys: uniquePages.length,
        queuedKeys: counts.pending,
        extractingKeys: counts.extracting,
        readyKeys: counts.ready,
        emptyKeys: counts.empty,
        failedKeys: counts.failed,
        cancelledKeys: counts.cancelled,
      };
    };
    window.__PDF_SPACE_DEBUG__ = {
      ...window.__PDF_SPACE_DEBUG__,
      inspectTextPage,
      inspectTextIndex,
    };
  }, [cacheVersion, occurrences, query, uniquePages]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    markCurrentJobCancelled();
    setPaused(true);
    setProgress(calculateProgressRef.current("cancelled"));
  }, [markCurrentJobCancelled]);
  const resume = useCallback(() => {
    setPaused(false);
    setRunVersion((value) => value + 1);
  }, []);
  const submitShortQuery = useCallback(() => {
    setExplicitlySubmitted(true);
    setPaused(false);
    setRunVersion((value) => value + 1);
  }, []);
  const retryFailed = useCallback(() => {
    for (const item of uniquePages) {
      if (cacheRef.current.get(item.sourcePageKey)?.status === "failed") {
        cacheRef.current.delete(item.sourcePageKey);
        pageStatusRef.current.set(item.sourcePageKey, "pending");
      }
    }
    setCacheVersion((value) => value + 1);
    setPaused(false);
    setRunVersion((value) => value + 1);
  }, [uniquePages]);

  return {
    query,
    setQuery,
    scope,
    setScope,
    parsedQuery,
    queryIsSearchable,
    occurrences: scopedOccurrences,
    resolvedActiveDocumentId,
    results: searchState.results,
    totalMatches: searchState.totalMatches,
    progress,
    failedOccurrences,
    paused,
    cancel,
    resume,
    retryFailed,
    submitShortQuery,
  };
}
