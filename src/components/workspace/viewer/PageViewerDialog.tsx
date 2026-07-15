import React, { useState, useEffect } from "react";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  Loader2,
  Maximize,
  StretchHorizontal
} from "lucide-react";
import { WorkspaceDocument } from "../../../types/workspace";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { usePageViewerRender } from "../../../hooks/usePageViewerRender";

type PageViewerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  pageId: string | null;
  documentId: string | null;
  documents: WorkspaceDocument[];
  onPageChange: (pageId: string, documentId: string) => void;
};

export const PageViewerDialog: React.FC<PageViewerDialogProps> = ({
  isOpen,
  onClose,
  pageId,
  documentId,
  documents,
  onPageChange,
}) => {
  // Trap keyboard focus for accessibility
  const { containerRef } = useFocusTrap({ isOpen });

  // Zoom and Display Mode State
  const [zoom, setZoom] = useState(100);
  const [zoomMode, setZoomMode] = useState<"custom" | "fit-page" | "fit-width">("fit-page");

  // Lookup document and current page index
  const doc = documentId ? documents.find((d) => d.id === documentId) : null;
  const pages = doc?.pages || [];
  const currentPageIndex = pageId ? pages.findIndex((p) => p.id === pageId) : -1;
  const currentPage = currentPageIndex !== -1 ? pages[currentPageIndex] : null;

  // Active rendering hook
  const { 
    canvasRef, 
    containerRef: canvasContainerRef, 
    rendering, 
    error, 
    retry 
  } = usePageViewerRender({
    documentId: currentPage?.sourceDocumentId || documentId,
    pageNumber: currentPage ? currentPage.originalPageIndex + 1 : 1,
    zoom,
    zoomMode,
    rotation: currentPage?.rotation || 0,
  });

  // Reset zoom on document/page change to fit-page by default
  useEffect(() => {
    if (pageId) {
      setZoomMode("fit-page");
      setZoom(100);
    }
  }, [pageId]);

  // Lock background scrolling on mount and restore on unmount
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!isOpen || currentPageIndex === -1 || !doc) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.hasAttribute("contenteditable"))
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (currentPageIndex > 0) {
          e.preventDefault();
          const prevPage = pages[currentPageIndex - 1];
          onPageChange(prevPage.id, prevPage.documentId);
        }
      } else if (e.key === "ArrowRight") {
        if (currentPageIndex < pages.length - 1) {
          e.preventDefault();
          const nextPage = pages[currentPageIndex + 1];
          onPageChange(nextPage.id, nextPage.documentId);
        }
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoomMode("custom");
        setZoom((prev) => Math.min(prev + 25, 300));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoomMode("custom");
        setZoom((prev) => Math.max(prev - 25, 50));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoomMode("fit-page");
      } else if (e.key === "1") {
        e.preventDefault();
        setZoomMode("fit-width");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, currentPageIndex, pages, doc, onClose, onPageChange]);

  if (!isOpen || !currentPage || !doc) return null;

  const totalPageCount = pages.length;
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === totalPageCount - 1;

  const handlePrevPage = () => {
    if (!isFirstPage) {
      const prevPage = pages[currentPageIndex - 1];
      onPageChange(prevPage.id, prevPage.documentId);
    }
  };

  const handleNextPage = () => {
    if (!isLastPage) {
      const nextPage = pages[currentPageIndex + 1];
      onPageChange(nextPage.id, nextPage.documentId);
    }
  };

  const handleZoomIn = () => {
    setZoomMode("custom");
    setZoom((prev) => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoomMode("custom");
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  return (
    <div 
      className="fixed inset-0 bg-[#07080af3] backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`PDF Viewer - ${doc.name}`}
      ref={containerRef as any}
    >
      {/* Centered Modal Card Container */}
      <div className="relative bg-[#0b0d13] border border-white/10 md:rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden max-w-full max-h-full md:max-w-[95vw] md:max-h-[94vh] rounded-none border-none">
        
        {/* ========================================== */}
        {/* TOP TOOLBAR                                */}
        {/* ========================================== */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#0e111a] border-b border-white/5 select-none shrink-0">
          
          {/* Filename & Current Page Indicator */}
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 min-w-0">
            <h3 className="text-[12.5px] font-extrabold text-primary-text truncate max-w-[180px] sm:max-w-[300px] md:max-w-[400px]" title={doc.name}>
              {doc.name}
            </h3>
            <span className="hidden md:inline w-1 h-1 bg-white/20 rounded-full" />
            <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider">
              Page {currentPage.pageNumber} of {totalPageCount}
            </span>
          </div>

          {/* Desktop Zoom & Fit Controls */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={handleZoomOut}
              disabled={zoomMode === "custom" && zoom <= 50}
              title="Zoom Out (-)"
              aria-label="Zoom Out"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-text hover:text-primary-text border border-white/5 transition-all disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-muted-text cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <span className="text-[11px] font-extrabold text-secondary-text font-mono min-w-[48px] text-center">
              {zoomMode === "fit-page" ? "Fit Page" : zoomMode === "fit-width" ? "Fit Width" : `${zoom}%`}
            </span>

            <button
              onClick={handleZoomIn}
              disabled={zoomMode === "custom" && zoom >= 300}
              title="Zoom In (+)"
              aria-label="Zoom In"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-text hover:text-primary-text border border-white/5 transition-all disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:text-muted-text cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            <button
              onClick={() => setZoomMode("fit-page")}
              title="Fit entire page to screen (0)"
              aria-label="Fit Page"
              className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wide border transition-all cursor-pointer ${
                zoomMode === "fit-page"
                  ? "bg-blue-accent/20 border-blue-bright/30 text-blue-bright"
                  : "bg-white/5 border-white/5 text-muted-text hover:text-primary-text hover:bg-white/10"
              }`}
            >
              <Maximize className="w-3.5 h-3.5 inline mr-1" />
              Page
            </button>

            <button
              onClick={() => setZoomMode("fit-width")}
              title="Fit page width to screen (1)"
              aria-label="Fit Width"
              className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-extrabold uppercase tracking-wide border transition-all cursor-pointer ${
                zoomMode === "fit-width"
                  ? "bg-blue-accent/20 border-blue-bright/30 text-blue-bright"
                  : "bg-white/5 border-white/5 text-muted-text hover:text-primary-text hover:bg-white/10"
              }`}
            >
              <StretchHorizontal className="w-3.5 h-3.5 inline mr-1" />
              Width
            </button>
          </div>

          {/* Close Action Trigger */}
          <button
            onClick={onClose}
            aria-label="Close viewer"
            title="Close viewer (Escape)"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-muted-text border border-white/5 hover:border-red-500/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* ========================================== */}
        {/* CANVAS PREVIEW / STAGE AREA                */}
        {/* ========================================== */}
        <div 
          ref={canvasContainerRef as any}
          className="flex-grow w-full overflow-auto bg-[#07080a] relative flex items-start justify-center p-4 scrollbar-thin outline-none"
          tabIndex={0}
          aria-label="Page rendering canvas viewport"
        >
          {/* Centering element for PDF canvas with dynamic scroll sizes */}
          <div className="m-auto flex items-center justify-center relative min-h-full">
            <canvas 
              ref={canvasRef}
              className={`shadow-2xl rounded-md bg-[#0e111a] border border-white/5 transition-opacity duration-300 ${
                rendering ? "opacity-30" : "opacity-100"
              }`}
              aria-label={`High-resolution page render of Page ${currentPage.pageNumber}`}
            />
          </div>

          {/* Loading Overlay */}
          {rendering && (
            <div className="absolute inset-0 bg-[#07080a]/50 flex flex-col items-center justify-center gap-3 select-none pointer-events-none animate-fade-in">
              <Loader2 className="w-8 h-8 animate-spin text-blue-bright" />
              <p className="text-[12.5px] font-extrabold tracking-wide text-secondary-text">
                Rendering page…
              </p>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 bg-[#07080a]/95 flex items-center justify-center p-6 z-10 animate-fade-in">
              <div className="bg-[#0b0d13] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full text-center flex flex-col items-center gap-4 shadow-2xl">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div>
                  <h4 className="text-[14px] font-extrabold text-red-400">Unable to display page</h4>
                  <p className="text-[11.5px] text-muted-text leading-relaxed mt-2">
                    This page could not be rendered. The original PDF may contain unsupported or damaged content.
                  </p>
                </div>
                <div className="flex gap-2.5 w-full mt-2">
                  <button
                    type="button"
                    onClick={retry}
                    className="flex-grow py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-primary-text text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-grow py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[12px] font-bold transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* MOBILE CONTROLS DRAWER / EXPANDED FOOTER   */}
        {/* ========================================== */}
        {/* Shown only on smaller devices for mobile zoom */}
        <div className="flex sm:hidden flex-wrap items-center justify-center gap-2 py-2 px-4 bg-[#0e111a] border-t border-b border-white/5 select-none shrink-0">
          <button
            onClick={handleZoomOut}
            disabled={zoomMode === "custom" && zoom <= 50}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted-text border border-white/5 disabled:opacity-40 cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] font-bold text-secondary-text font-mono min-w-[65px] text-center">
            {zoomMode === "fit-page" ? "Fit Page" : zoomMode === "fit-width" ? "Fit Width" : `${zoom}%`}
          </span>

          <button
            onClick={handleZoomIn}
            disabled={zoomMode === "custom" && zoom >= 300}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted-text border border-white/5 disabled:opacity-40 cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoomMode("fit-page")}
            className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border transition-all cursor-pointer ${
              zoomMode === "fit-page"
                ? "bg-blue-accent/20 border-blue-bright/30 text-blue-bright"
                : "bg-white/5 border-white/5 text-muted-text"
            }`}
          >
            Fit Page
          </button>

          <button
            onClick={() => setZoomMode("fit-width")}
            className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase border transition-all cursor-pointer ${
              zoomMode === "fit-width"
                ? "bg-blue-accent/20 border-blue-bright/30 text-blue-bright"
                : "bg-white/5 border-white/5 text-muted-text"
            }`}
          >
            Fit Width
          </button>
        </div>

        {/* ========================================== */}
        {/* BOTTOM NAVIGATION BAR                      */}
        {/* ========================================== */}
        <footer className="flex items-center justify-between px-4 py-3 bg-[#0e111a] border-t border-white/5 select-none shrink-0">
          
          {/* Previous Page Trigger */}
          <button
            onClick={handlePrevPage}
            disabled={isFirstPage}
            aria-label="Previous page"
            title="Previous page (Arrow Left)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-muted-text hover:text-primary-text text-[12px] font-extrabold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Quick Page Indicator for mobile */}
          <div className="text-[11px] font-extrabold text-secondary-text font-mono">
            {currentPage.pageNumber} / {totalPageCount}
          </div>

          {/* Next Page Trigger */}
          <button
            onClick={handleNextPage}
            disabled={isLastPage}
            aria-label="Next page"
            title="Next page (Arrow Right)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-muted-text hover:text-primary-text text-[12px] font-extrabold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>

      </div>
    </div>
  );
};
