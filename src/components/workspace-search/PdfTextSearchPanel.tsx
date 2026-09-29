import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AlertCircle, ExternalLink, FileSearch, Pause, Play, RefreshCw } from "lucide-react";
import { usePdfTextSearch } from "../../hooks/usePdfTextSearch";
import { PdfTextSearchResult, PdfTextViewerContext } from "../../lib/pdf-text/pdfTextTypes";
import { detectTextDirection } from "../../lib/pdf-text/textDirection";
import { WorkspaceDocument, WorkspaceSourceDocuments } from "../../types/workspace";
import { PdfTextSearchSnippet } from "./PdfTextSearchSnippet";

export type PdfTextSearchPanelHandle = {
  focusAndSelect: () => void;
};

type PdfTextSearchPanelProps = {
  isActive: boolean;
  projectId: string;
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  activeDocumentId: string | null;
  shortcutLabel: string;
  onNavigateResult: (
    result: PdfTextSearchResult,
    options: { openInViewer: boolean; viewerContext: PdfTextViewerContext }
  ) => void;
};

function resultLabel(result: PdfTextSearchResult): string {
  return `${result.documentName}, current page ${result.currentPageNumber}, source ${
    result.sourceFileName ?? "filename unavailable"
  }, original page ${result.originalPageNumber}, ${result.matchCount} text ${
    result.matchCount === 1 ? "match" : "matches"
  }.`;
}

export const PdfTextSearchPanel = forwardRef<
  PdfTextSearchPanelHandle,
  PdfTextSearchPanelProps
>(function PdfTextSearchPanel(
  {
    isActive,
    projectId,
    documents,
    sourceDocuments,
    activeDocumentId,
    shortcutLabel,
    onNavigateResult,
  },
  forwardedRef
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const search = usePdfTextSearch({
    projectId,
    documents,
    sourceDocuments,
    activeDocumentId,
    isActive,
  });

  useImperativeHandle(forwardedRef, () => ({
    focusAndSelect: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
  }));

  useEffect(() => {
    if (isActive) inputRef.current?.focus();
  }, [isActive]);

  useEffect(() => {
    if (search.results.length === 0) {
      setActivePageId(null);
      return;
    }
    setActivePageId((current) =>
      current && search.results.some((result) => result.pageId === current)
        ? current
        : search.results[0]?.pageId ?? null
    );
  }, [search.results]);

  const activeIndex = Math.max(
    0,
    search.results.findIndex((result) => result.pageId === activePageId)
  );
  const viewerContext = useMemo<PdfTextViewerContext>(
    () => ({
      query: search.query,
      results: search.results.map(({ pageId, documentId, matchCount }) => ({
        pageId,
        documentId,
        matchCount,
      })),
    }),
    [search.query, search.results]
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, PdfTextSearchResult[]>();
    for (const result of search.results) {
      const current = grouped.get(result.documentId) ?? [];
      current.push(result);
      grouped.set(result.documentId, current);
    }
    return [...grouped.values()];
  }, [search.results]);

  const activate = (result: PdfTextSearchResult, openInViewer = false) => {
    onNavigateResult(result, { openInViewer, viewerContext });
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && search.results.length === 0) {
      search.submitShortQuery();
      return;
    }
    if (search.results.length === 0) return;
    let nextIndex = activeIndex;
    if (event.key === "ArrowDown") nextIndex = Math.min(search.results.length - 1, activeIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, activeIndex - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = search.results.length - 1;
    else if (event.key === "Enter") {
      event.preventDefault();
      const activeResult = search.results[activeIndex];
      if (activeResult) activate(activeResult, event.ctrlKey || event.metaKey);
      return;
    } else return;
    event.preventDefault();
    setActivePageId(search.results[nextIndex]?.pageId ?? null);
  };

  const completed = search.progress.completedSourcePages;
  const total = search.progress.totalSourcePages;
  const indexing = search.progress.status === "indexing";
  const activeScopeDocument = documents.find(
    (document) => document.id === search.resolvedActiveDocumentId
  );
  const scopedDocumentCount = new Set(search.occurrences.map((item) => item.documentId)).size;
  const scopeSummary =
    search.scope === "current-document"
      ? `Searching ${search.occurrences.length} page ${
          search.occurrences.length === 1 ? "occurrence" : "occurrences"
        } in ${activeScopeDocument?.name ?? "the current document"}`
      : `Searching ${search.occurrences.length} page ${
          search.occurrences.length === 1 ? "occurrence" : "occurrences"
        } across ${scopedDocumentCount} ${scopedDocumentCount === 1 ? "document" : "documents"}`;
  const summary = indexing
    ? `${search.totalMatches} matching ${search.totalMatches === 1 ? "page" : "pages"} found so far.`
    : `${search.totalMatches} matching ${search.totalMatches === 1 ? "page" : "pages"}.`;

  return (
    <div className={isActive ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
      <div className="sticky top-0 z-10 space-y-3 border-b border-border-main bg-panel-elevated p-3 sm:p-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-bold text-muted-text">
            Search scope
          </legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="PDF text search scope">
            {([
              ["current-document", "Current document"],
              ["workspace", "All documents"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={search.scope === value}
                onClick={() => search.setScope(value)}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-xl border px-3 text-[11px] font-bold transition-colors ${
                  search.scope === value
                    ? "border-blue-bright/35 bg-blue-accent/15 text-blue-bright"
                    : "border-white/10 bg-white/[0.03] text-secondary-text hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor="pdf-text-search-input" className="sr-only">
          Search text inside PDFs
        </label>
        <div className="flex h-12 items-center gap-3 rounded-xl border border-blue-bright/25 bg-main-bg px-3 focus-within:border-blue-bright/50 focus-within:ring-2 focus-within:ring-blue-bright/15">
          <FileSearch className="h-4 w-4 flex-shrink-0 text-blue-bright" aria-hidden="true" />
          <input
            ref={inputRef}
            id="pdf-text-search-input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="pdf-text-search-results"
            aria-activedescendant={activePageId ? `pdf-text-result-${activePageId}` : undefined}
            value={search.query}
            dir={detectTextDirection(search.query)}
            style={{ textAlign: "start" }}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search text inside PDFs…"
            className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-primary-text outline-none placeholder:text-muted-text/70"
          />
          <kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-muted-text sm:inline">
            {shortcutLabel}
          </kbd>
        </div>

        {search.query && !search.queryIsSearchable && (
          <p className="text-[10.5px] font-semibold text-muted-text">
            Type at least 2 characters to search PDF text. Press Enter to submit a one-character word.
          </p>
        )}

        {search.queryIsSearchable && (
          <p dir="auto" className="text-[10.5px] font-semibold text-muted-text">
            {scopeSummary}
          </p>
        )}

        {total > 0 && search.queryIsSearchable && (
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3" role="status">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold text-secondary-text">
                  {indexing && search.progress.currentSourceFileName
                    ? `Indexing ${search.progress.currentSourceFileName} · original page ${search.progress.currentOriginalPageNumber}`
                    : search.progress.status === "paused"
                      ? "Indexing paused"
                      : "PDF text index"}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-text">
                  {completed} of {total} unique PDF pages · {summary}
                </p>
              </div>
              {indexing ? (
                <button type="button" onClick={search.cancel} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-bold text-secondary-text hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright">
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Cancel indexing
                </button>
              ) : search.paused && completed < total ? (
                <button type="button" onClick={search.resume} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-bright/25 bg-blue-accent/10 px-2.5 text-[10px] font-bold text-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright">
                  <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume indexing
                </button>
              ) : null}
            </div>
            <div
              role="progressbar"
              aria-label="PDF text indexing progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={completed}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"
            >
              <div className="h-full rounded-full bg-blue-bright transition-[width]" style={{ width: `${total ? (completed / total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      <div id="pdf-text-search-results" role="listbox" aria-label="PDF text search results" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {!search.query ? (
          <div className="px-4 py-12 text-center">
            <FileSearch className="mx-auto h-7 w-7 text-muted-text/50" aria-hidden="true" />
            <p className="mt-3 text-[13px] font-extrabold text-primary-text">Search embedded PDF text</p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted-text">Text extraction starts on demand and stays only in this browser session.</p>
          </div>
        ) : search.queryIsSearchable && search.results.length === 0 && indexing ? (
          <div className="px-4 py-12 text-center" role="status">
            <p className="text-[13px] font-extrabold text-primary-text">
              No matches found in indexed pages yet
            </p>
            <p className="mt-1 text-[11px] text-muted-text">
              Indexing {completed} of {total} unique PDF pages…
            </p>
          </div>
        ) : search.queryIsSearchable && search.results.length === 0 && search.paused && completed < total ? (
          <div className="px-4 py-12 text-center" role="status">
            <p className="text-[13px] font-extrabold text-primary-text">
              No matches found in indexed pages yet
            </p>
            <p className="mt-1 text-[11px] text-muted-text">
              Indexing is paused at {completed} of {total} unique PDF pages.
            </p>
          </div>
        ) : search.queryIsSearchable && search.results.length === 0 && search.progress.failedPages > 0 ? (
          <div className="px-4 py-12 text-center" role="alert">
            <p className="text-[13px] font-extrabold text-primary-text">
              {search.progress.failedPages === total
                ? "Page could not be searched"
                : "No matches found in searchable pages"}
            </p>
            <p className="mt-1 text-[11px] text-muted-text">
              Retry the failed {search.progress.failedPages === 1 ? "page" : "pages"} to complete this search.
            </p>
          </div>
        ) : search.queryIsSearchable && search.results.length === 0 && search.progress.emptyPages === total && total > 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-extrabold text-primary-text">No searchable text</p>
            <p className="mt-1 text-[11px] text-muted-text">
              These pages contain no usable embedded PDF text. OCR is not included.
            </p>
          </div>
        ) : search.queryIsSearchable && search.results.length === 0 && !indexing ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] font-extrabold text-primary-text">No text matches found</p>
            <p className="mt-1 text-[11px] text-muted-text">Try another word or phrase, or change the search scope.</p>
          </div>
        ) : (
          groups.map((results) => {
            const firstResult = results[0];
            if (!firstResult) return null;
            return (
            <section key={firstResult.documentId} aria-labelledby={`pdf-text-group-${firstResult.documentId}`}>
              <h3 id={`pdf-text-group-${firstResult.documentId}`} className="mb-2 flex items-center justify-between gap-3 px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-text">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span dir="ltr" className="flex-shrink-0">PDF</span>
                  <bdi dir="auto" className="block truncate normal-case tracking-normal">
                    {firstResult.documentName}
                  </bdi>
                </span>
                <span dir="ltr" className="flex-shrink-0">
                  {results.length} matching {results.length === 1 ? "page" : "pages"}
                </span>
              </h3>
              <div className="space-y-1.5">
                {results.map((result) => {
                  const active = result.pageId === activePageId;
                  return (
                    <button
                      key={result.pageId}
                      id={`pdf-text-result-${result.pageId}`}
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-label={resultLabel(result)}
                      onMouseEnter={() => setActivePageId(result.pageId)}
                      onClick={() => activate(result)}
                      className={`group w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright ${active ? "border-blue-bright/30 bg-blue-accent/15" : "border-transparent bg-white/[0.025] hover:border-white/10 hover:bg-white/5"}`}
                    >
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 h-8 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: result.documentColor }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[12px] font-extrabold text-primary-text">Page {result.currentPageNumber}</span>
                            <span className="text-[9.5px] font-bold text-muted-text">{result.matchCount} {result.matchCount === 1 ? "match" : "matches"}</span>
                          </span>
                          <PdfTextSearchSnippet {...result.snippet} />
                          <span dir="ltr" className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[9.5px] font-semibold text-muted-text">
                            <bdi dir="auto" className="block min-w-0 truncate">
                              {result.sourceFileName ?? "Source filename unavailable"}
                            </bdi>
                            <span aria-hidden="true" className="flex-shrink-0">·</span>
                            <span dir="ltr" className="flex-shrink-0">
                              Original page {result.originalPageNumber}{result.sourcePageCount ? ` of ${result.sourcePageCount}` : ""}
                            </span>
                          </span>
                        </span>
                        <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-text opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            );
          })
        )}

        {search.progress.emptyPages > 0 && (
          <div className="flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3 text-[10.5px] leading-relaxed text-muted-text" role="note">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-200/70" aria-hidden="true" />
            <span>{search.progress.emptyPages} {search.progress.emptyPages === 1 ? "page contains" : "pages contain"} no searchable text. Image-only or scanned pages require OCR, which is not included.</span>
          </div>
        )}
        {search.progress.failedPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] p-3" role="alert">
            <span className="text-[10.5px] text-muted-text">
              {search.progress.failedPages === 1 ? "Page could not be searched" : "Some PDF pages could not be searched"}
              {search.failedOccurrences[0]
                ? ` — ${search.failedOccurrences[0].sourceFileName ?? "source PDF"}, original page ${search.failedOccurrences[0].originalPageNumber}.`
                : "."}
            </span>
            <button type="button" onClick={search.retryFailed} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[10px] font-bold text-secondary-text hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry failed pages
            </button>
          </div>
        )}
        {search.totalMatches > search.results.length && (
          <p className="px-2 text-[10.5px] font-semibold text-muted-text">{search.totalMatches - search.results.length} additional matching pages are not rendered. Refine the query to narrow results.</p>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {summary} {indexing ? `Indexing ${completed} of ${total} unique PDF pages.` : ""}
      </div>
    </div>
  );
});
