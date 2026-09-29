import React, { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, FileText, History, Search, X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { PdfTextSearchResult, PdfTextViewerContext } from "../../lib/pdf-text/pdfTextTypes";
import {
  RecentWorkspaceNavigationItem,
  resolveRecentWorkspaceNavigation,
} from "../../lib/workspace-search/recentWorkspaceNavigation";
import {
  WorkspaceSearchDocumentItem,
  WorkspaceSearchIndex,
  WorkspaceSearchItem,
  WorkspaceSearchPageItem,
  searchWorkspace,
} from "../../lib/workspace-search/workspaceSearch";
import { WorkspaceDocument, WorkspaceSourceDocuments } from "../../types/workspace";
import { PdfTextSearchPanel, PdfTextSearchPanelHandle } from "./PdfTextSearchPanel";

export type WorkspaceSearchMode = "quick" | "text";

type WorkspaceSearchDialogProps = {
  isOpen: boolean;
  requestedMode: WorkspaceSearchMode;
  projectId: string;
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  activeDocumentId: string | null;
  index: WorkspaceSearchIndex;
  indexError: boolean;
  recent: readonly RecentWorkspaceNavigationItem[];
  shortcutLabel: string;
  textShortcutLabel: string;
  onClose: () => void;
  onNavigateDocument: (item: WorkspaceSearchDocumentItem) => void;
  onNavigatePage: (
    item: WorkspaceSearchPageItem,
    options?: { openInViewer?: boolean }
  ) => void;
  onNavigateTextResult: (
    result: PdfTextSearchResult,
    options: { openInViewer: boolean; viewerContext: PdfTextViewerContext }
  ) => void;
};

type ResultEntry = {
  key: string;
  section: "recent" | "documents" | "pages";
  item: WorkspaceSearchItem;
};

function itemIdentity(item: WorkspaceSearchItem): string {
  return item.type === "page" ? `page:${item.pageId}` : `document:${item.documentId}`;
}

function pageCountLabel(pageCount: number): string {
  return `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
}

function resultAriaLabel(item: WorkspaceSearchItem): string {
  if (item.type === "document") {
    return `${item.documentName}, ${pageCountLabel(item.pageCount)}, document ${item.documentIndex + 1}`;
  }
  return `${item.documentName}, current page ${item.currentPageNumber}, source ${
    item.sourceFileName ?? "source filename unavailable"
  }, original page ${item.originalPageNumber}${item.sourcePageCount ? ` of ${item.sourcePageCount}` : ""}`;
}

export const WorkspaceSearchDialog: React.FC<WorkspaceSearchDialogProps> = ({
  isOpen,
  requestedMode,
  projectId,
  documents,
  sourceDocuments,
  activeDocumentId,
  index,
  indexError,
  recent,
  shortcutLabel,
  textShortcutLabel,
  onClose,
  onNavigateDocument,
  onNavigatePage,
  onNavigateTextResult,
}) => {
  const { containerRef } = useFocusTrap({ isOpen, restoreFocus: false });
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const textPanelRef = useRef<PdfTextSearchPanelHandle | null>(null);
  const [mode, setMode] = useState<WorkspaceSearchMode>(requestedMode);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => searchWorkspace(index, query), [index, query]);
  const recentResults = useMemo(
    () => (results.query.mode === "empty" ? resolveRecentWorkspaceNavigation(recent, index) : []),
    [index, recent, results.query.mode]
  );
  const entries = useMemo<ResultEntry[]>(() => {
    if (results.query.mode === "empty") {
      return [
        ...recentResults.map((item) => ({ key: `recent:${itemIdentity(item)}`, section: "recent" as const, item })),
        ...results.documents.map((item) => ({ key: `documents:${itemIdentity(item)}`, section: "documents" as const, item })),
      ];
    }
    return [
      ...results.documents.map((item) => ({ key: `documents:${itemIdentity(item)}`, section: "documents" as const, item })),
      ...results.pages.map((item) => ({ key: `pages:${itemIdentity(item)}`, section: "pages" as const, item })),
    ];
  }, [recentResults, results.documents, results.pages, results.query.mode]);

  const focusModeInput = (targetMode: WorkspaceSearchMode) => {
    window.requestAnimationFrame(() => {
      if (targetMode === "quick") {
        quickInputRef.current?.focus();
        quickInputRef.current?.select();
      } else textPanelRef.current?.focusAndSelect();
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    setMode(requestedMode);
    focusModeInput(requestedMode);
  }, [isOpen, requestedMode]);
  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    setActiveIndex((current) => (entries.length ? Math.min(current, entries.length - 1) : 0));
  }, [entries.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key !== "k" && key !== "f") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const nextMode: WorkspaceSearchMode = key === "f" ? "text" : "quick";
      setMode(nextMode);
      focusModeInput(nextMode);
    };
    window.addEventListener("keydown", handleShortcut, true);
    return () => window.removeEventListener("keydown", handleShortcut, true);
  }, [isOpen, onClose]);

  const activateEntry = (entry: ResultEntry, openInViewer = false) => {
    if (entry.item.type === "document") onNavigateDocument(entry.item);
    else onNavigatePage(entry.item, { openInViewer });
  };
  const handleQuickKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!entries.length) return;
    if (event.key === "ArrowDown") setActiveIndex((value) => Math.min(entries.length - 1, value + 1));
    else if (event.key === "ArrowUp") setActiveIndex((value) => Math.max(0, value - 1));
    else if (event.key === "Home") setActiveIndex(0);
    else if (event.key === "End") setActiveIndex(entries.length - 1);
    else if (event.key === "Enter") {
      const entry = entries[activeIndex];
      if (entry) activateEntry(entry, event.ctrlKey || event.metaKey);
    }
    else return;
    event.preventDefault();
  };

  const activeEntry = entries[activeIndex];
  const totalCount = results.totalDocumentMatches + results.totalPageMatches;
  const hiddenCount = Math.max(0, totalCount - results.documents.length - results.pages.length);

  const renderRow = (entry: ResultEntry, indexInList: number) => {
    const item = entry.item;
    const active = indexInList === activeIndex;
    return (
      <button
        key={entry.key}
        id={`workspace-search-option-${indexInList}`}
        type="button"
        role="option"
        aria-selected={active}
        aria-label={resultAriaLabel(item)}
        onMouseEnter={() => setActiveIndex(indexInList)}
        onClick={() => activateEntry(entry)}
        className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright ${active ? "border-blue-bright/30 bg-blue-accent/15 text-primary-text" : "border-transparent text-secondary-text hover:border-white/5 hover:bg-white/5"}`}
      >
        <span className="h-8 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: item.documentColor }} aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span dir="auto" className="block truncate text-[12.5px] font-extrabold">
            {item.type === "document" ? item.documentName : `${item.documentName} · Page ${item.currentPageNumber}`}
          </span>
          <span dir="auto" className="mt-0.5 block truncate text-[10.5px] font-semibold text-muted-text">
            {item.type === "document"
              ? `${pageCountLabel(item.pageCount)} · Document ${item.documentIndex + 1}`
              : `${item.sourceFileName ?? "Source filename unavailable"} · Original page ${item.originalPageNumber}${item.sourcePageCount ? ` of ${item.sourcePageCount}` : ""}`}
          </span>
        </span>
        {item.type === "page" && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-text opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />}
      </button>
    );
  };

  let runningIndex = 0;
  const renderSection = (section: ResultEntry["section"], label: string, icon: React.ReactNode) => {
    const sectionEntries = entries.filter((entry) => entry.section === section);
    if (!sectionEntries.length) return null;
    const startIndex = runningIndex;
    runningIndex += sectionEntries.length;
    return (
      <section role="group" aria-labelledby={`workspace-search-${section}-heading`}>
        <h3 id={`workspace-search-${section}-heading`} className="mb-1.5 flex items-center gap-2 px-2 text-xs font-bold text-muted-text">{icon}{label}</h3>
        <div className="space-y-1">{sectionEntries.map((entry, indexInSection) => renderRow(entry, startIndex + indexInSection))}</div>
      </section>
    );
  };

  return (
    <div className={isOpen ? "studio-dialog-overlay fixed inset-0 z-[120] flex items-start justify-center p-0 sm:p-6 sm:pt-[8vh]" : "hidden"}>
      <section ref={containerRef} role="dialog" aria-modal="true" aria-labelledby="workspace-search-title" aria-describedby="workspace-search-description" className="command-surface flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 sm:h-auto sm:max-h-[min(780px,88dvh)] sm:max-w-[700px] sm:rounded-[18px] sm:border">
        <header className="border-b border-white/5 p-3 pb-0 sm:p-4 sm:pb-0">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div><h2 id="workspace-search-title" className="text-base font-semibold tracking-[-0.025em] text-primary-text">Search workspace</h2><p id="workspace-search-description" className="mt-1 text-xs text-muted-text">Navigate workspace metadata or search embedded PDF text.</p></div>
            <button type="button" onClick={onClose} aria-label="Close workspace search" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <div role="tablist" aria-label="Workspace search mode" className="grid grid-cols-2 gap-1 rounded-[11px] border border-border-main bg-main-bg p-1">
            {([["quick", "Quick Navigation", shortcutLabel], ["text", "PDF Text", textShortcutLabel]] as const).map(([value, label, hint]) => (
              <button key={value} id={`workspace-search-${value}-tab`} type="button" role="tab" aria-selected={mode === value} aria-controls={`workspace-search-${value}-panel`} onClick={() => { setMode(value); focusModeInput(value); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright ${mode === value ? "bg-blue-accent/15 text-blue-bright" : "text-muted-text hover:bg-white/5 hover:text-secondary-text"}`}>{label}<kbd className="hidden text-[9px] opacity-70 sm:inline">{hint}</kbd></button>
            ))}
          </div>
          {mode === "quick" && <div className="pb-3 pt-3 sm:pb-4"><label htmlFor="workspace-search-input" className="sr-only">Search documents, source files, or page numbers</label><div className="flex h-12 items-center gap-3 rounded-xl border border-blue-bright/25 bg-main-bg px-3 focus-within:border-blue-bright/50 focus-within:ring-2 focus-within:ring-blue-bright/15"><Search className="h-4 w-4 flex-shrink-0 text-blue-bright" aria-hidden="true" /><input ref={quickInputRef} id="workspace-search-input" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="workspace-search-results" aria-activedescendant={activeEntry ? `workspace-search-option-${activeIndex}` : undefined} value={query} dir="auto" onChange={(event) => setQuery(event.target.value)} onKeyDown={handleQuickKeyDown} placeholder="Search documents, source files, or page numbers…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-primary-text outline-none placeholder:text-muted-text/70" /><kbd className="hidden rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-muted-text sm:inline">{shortcutLabel}</kbd></div></div>}
        </header>

        {mode === "quick" && <div id="workspace-search-quick-panel" role="tabpanel" aria-labelledby="workspace-search-quick-tab" className="flex-1 overflow-y-auto overscroll-contain sm:max-h-[560px]"><div id="workspace-search-results" role="listbox" aria-label="Workspace search results" className="space-y-4 p-3 sm:p-4">
          {indexError ? <div role="status" className="px-4 py-12 text-center"><p className="text-[13px] font-extrabold text-primary-text">Search is temporarily unavailable.</p><p className="mt-1 text-[11px] text-muted-text">The workspace remains available.</p></div>
            : results.query.mode !== "empty" && !entries.length ? <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-muted-text/50" aria-hidden="true" /><p className="mt-3 text-[13px] font-extrabold text-primary-text">No results found</p><p className="mt-1 text-[11px] text-muted-text">Try a document name, source filename, or page number.</p></div>
            : <>{renderSection("recent", "Recent", <History className="h-3 w-3" aria-hidden="true" />)}{renderSection("documents", "Documents", <FileText className="h-3 w-3" aria-hidden="true" />)}{renderSection("pages", "Pages", <Search className="h-3 w-3" aria-hidden="true" />)}{hiddenCount > 0 && <p className="px-2 pb-1 text-[10.5px] font-semibold text-muted-text">{hiddenCount} more results match. Refine your search to narrow the list.</p>}</>}
        </div></div>}

        <div id="workspace-search-text-panel" role="tabpanel" aria-labelledby="workspace-search-text-tab" className={mode === "text" ? "flex min-h-0 flex-1" : "hidden"}>
          <PdfTextSearchPanel ref={textPanelRef} isActive={isOpen && mode === "text"} projectId={projectId} documents={documents} sourceDocuments={sourceDocuments} activeDocumentId={activeDocumentId} shortcutLabel={textShortcutLabel} onNavigateResult={onNavigateTextResult} />
        </div>

        {mode === "quick" && <footer className="flex items-center justify-between gap-3 border-t border-white/5 px-4 py-2.5 text-[9.5px] font-semibold text-muted-text"><span>↑↓ Navigate · Enter Go to</span><span className="hidden sm:inline">Ctrl/Cmd + Enter opens a page in the viewer</span></footer>}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{mode === "quick" ? (results.query.mode === "empty" ? `${recentResults.length} recent destinations and ${results.documents.length} documents available.` : `${totalCount} ${totalCount === 1 ? "result" : "results"} found.`) : "PDF text search mode."}</div>
      </section>
    </div>
  );
};
