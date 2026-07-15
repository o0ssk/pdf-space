import React from "react";
import { Info, FileText, Layout, RefreshCw, Zap, ShieldAlert, CheckCircle2, Loader2, Eye, Move } from "lucide-react";
import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import { useToast } from "../ui/Toast";

type InspectorProps = {
  documents: WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  selectedDocumentId: string | null;
  selectedPageId: string | null;
  onOpenPageViewer?: (pageId: string, documentId: string) => void;
  onMovePage?: (pageId: string, sourceContainerId: string, targetContainerId: string, targetIndex: number) => void;
};

// Formats file sizes into human-readable labels
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export const WorkspaceInspector: React.FC<InspectorProps> = ({
  documents = [],
  sourceDocuments,
  selectedDocumentId = null,
  selectedPageId = null,
  onOpenPageViewer,
  onMovePage,
}) => {
  const { showToast } = useToast();
  const totalDocuments = documents.length;
  const totalPages = documents.reduce((sum, doc) => sum + (doc.pageCount || 0), 0);

  // Derive selection counts
  const selectedCount = selectedPageId ? 1 : 0;

  // Calculate reorderedCount dynamically
  const reorderedCount = documents.reduce((sum, doc) => {
    return sum + doc.pages.reduce((pSum, page, idx) => {
      const isReordered = page.documentId !== page.sourceDocumentId || idx !== page.originalPageIndex;
      return pSum + (isReordered ? 1 : 0);
    }, 0);
  }, 0);

  // Look up selected page if one is selected
  const selectedPage = selectedPageId
    ? documents.flatMap((doc) => doc.pages).find((p) => p.id === selectedPageId)
    : null;

  const parentDoc = selectedPage
    ? documents.find((doc) => doc.id === selectedPage.documentId)
    : null;

  const sourceDoc = selectedPage
    ? sourceDocuments[selectedPage.sourceDocumentId]
    : null;

  // Look up selected document properties if one is selected (as fallback)
  const selectedDoc = selectedDocumentId
    ? documents.find((doc) => doc.id === selectedDocumentId)
    : null;

  return (
    <aside 
      className="w-full h-full bg-panel-bg flex flex-col select-none border-l border-border-main"
      aria-label="Workspace Inspector"
    >
      {/* Inspector Header */}
      <div className="px-4 py-3.5 border-b border-white/5 bg-panel-elevated/20">
        <h2 className="text-[13.5px] font-bold text-primary-text tracking-wide">Inspector</h2>
      </div>

      {/* Main Panel Content Scroll Area */}
      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-5 min-h-0">
        
        {/* Selection/Properties Section */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold text-secondary-text uppercase tracking-wider px-1">
            Properties
          </h3>

          {selectedPage && parentDoc ? (
            /* Selected Page Properties State */
            <div className="bg-panel-elevated/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-3.5">
              
              {/* Heading */}
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-extrabold text-blue-bright uppercase tracking-wider">
                  Selected Page
                </span>
                <span className="text-[10.5px] bg-blue-bright/10 text-blue-bright px-2 py-0.5 rounded-full font-bold">
                  P. {selectedPage.pageNumber}
                </span>
              </div>

              {/* Compact Preview Area */}
              <div className="w-full aspect-[1/1.2] rounded-lg bg-panel-bg/60 border border-white/5 overflow-hidden flex items-center justify-center relative shadow-inner">
                {selectedPage.thumbnailStatus === "ready" && selectedPage.thumbnailUrl ? (
                  <img
                    src={selectedPage.thumbnailUrl}
                    alt={`Selected page ${selectedPage.pageNumber} preview`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2"
                  />
                ) : selectedPage.thumbnailStatus === "rendering" ? (
                  <div className="flex flex-col items-center gap-1.5 text-muted-text/60">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-bright" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Rendering preview</span>
                  </div>
                ) : selectedPage.thumbnailStatus === "error" ? (
                  <div className="flex flex-col items-center p-3 text-center gap-1 text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Preview failed</span>
                  </div>
                ) : (
                  <div className="text-[9px] font-bold text-muted-text/30 uppercase tracking-wider">
                    Queueing
                  </div>
                )}
              </div>

              {/* Read-Only Meta Information */}
              <div className="flex flex-col gap-2 text-[12px] border-t border-white/5 pt-2">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-text flex-shrink-0">Source Document</span>
                  <span className="font-bold text-secondary-text truncate text-right max-w-[150px]" title={sourceDoc?.name || parentDoc.name}>
                    {sourceDoc?.name || parentDoc.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Current Group</span>
                  <span className="font-bold text-secondary-text truncate text-right max-w-[150px]" title={parentDoc.name}>
                    {parentDoc.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Current Position</span>
                  <span className="font-bold text-secondary-text font-mono">
                    {selectedPage.pageNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Original Page</span>
                  <span className="font-bold text-secondary-text font-mono">
                    {selectedPage.originalPageIndex + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Rotation</span>
                  <span className="font-bold text-secondary-text">{selectedPage.rotation}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Render Status</span>
                  <span className="font-bold flex items-center gap-1">
                    {selectedPage.thumbnailStatus === "ready" ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : selectedPage.thumbnailStatus === "rendering" ? (
                      <span className="text-blue-bright flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...
                      </span>
                    ) : (
                      <span className="text-muted-text flex items-center gap-1">
                        Queueing
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Keyboard Accessible Move To Control */}
              <div className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                <label 
                  htmlFor="inspector-move-to-select" 
                  className="text-[10.5px] font-extrabold text-muted-text uppercase tracking-wider"
                >
                  Move page to...
                </label>
                <select
                  id="inspector-move-to-select"
                  value={parentDoc.id}
                  onChange={(e) => {
                    const targetDocId = e.target.value;
                    if (targetDocId !== parentDoc.id) {
                      const targetDoc = documents.find((d) => d.id === targetDocId);
                      if (targetDoc) {
                        onMovePage?.(selectedPage.id, parentDoc.id, targetDocId, targetDoc.pages.length);
                        // Show a silent toast notification on completion
                        showToast("Page moved", `Page moved to ${targetDoc.name}`, "info");
                      }
                    }
                  }}
                  className="w-full bg-[#121620] hover:bg-[#161b29] border border-white/10 rounded-xl px-3 py-2 text-[12px] text-primary-text font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright transition-all cursor-pointer"
                >
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id} disabled={doc.status !== "ready"}>
                      {doc.name} {doc.id === parentDoc.id ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button to Open Full-Page Viewer */}
              <button
                type="button"
                onClick={() => onOpenPageViewer?.(selectedPage.id, selectedPage.documentId)}
                className="w-full mt-1.5 py-2 px-3 rounded-xl bg-blue-bright hover:bg-blue-bright/90 text-[#07080a] text-[12.5px] font-extrabold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg focus-visible:ring-blue-bright"
              >
                <Eye className="w-4 h-4" />
                Open Page
              </button>

            </div>
          ) : selectedDoc ? (
            /* Selected Document properties (as fallback when no page is selected) */
            <div className="bg-panel-elevated/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-3">
              {/* Document Header details */}
              <div className="flex items-start gap-2.5 min-w-0">
                <div 
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" 
                  style={{ backgroundColor: selectedDoc.color }} 
                />
                <div className="min-w-0 flex-grow">
                  <p className="text-[12.5px] font-extrabold text-primary-text truncate" title={selectedDoc.name}>
                    {selectedDoc.name}
                  </p>
                  <p className="text-[10px] text-muted-text mt-0.5">Active selection</p>
                </div>
              </div>

              <div className="w-full h-px bg-white/5" />

              {/* Document specific details */}
              <div className="flex flex-col gap-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">File Size</span>
                  <span className="font-bold text-secondary-text">{formatBytes(selectedDoc.size)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Page Count</span>
                  <span className="font-bold text-secondary-text">{selectedDoc.pageCount} pages</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-text">Import Status</span>
                  <span className="font-bold flex items-center gap-1">
                    {selectedDoc.status === "ready" && (
                      <span className="text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    )}
                    {selectedDoc.status === "loading" && (
                      <span className="text-blue-bright flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reading...
                      </span>
                    )}
                    {selectedDoc.status === "error" && (
                      <span className="text-red-400 flex items-center gap-1" title={selectedDoc.errorMessage}>
                        <ShieldAlert className="w-3.5 h-3.5" /> Error
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {selectedDoc.status === "error" && selectedDoc.errorMessage && (
                <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-[11px] text-red-400 font-medium">
                  {selectedDoc.errorMessage}
                </div>
              )}
            </div>
          ) : (
            /* Zero Selection Indicator State */
            <div className="p-3.5 rounded-xl border border-dashed border-white/10 bg-white/5/20 text-center flex flex-col items-center justify-center py-6">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider mb-1">
                Nothing selected
              </span>
              <p className="text-[11px] text-muted-text leading-relaxed max-w-[200px]">
                Select a page or a document row to inspect detailed properties here.
              </p>
            </div>
          )}
        </div>

        {/* Project Summary Section */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold text-secondary-text uppercase tracking-wider px-1">
            Workspace Summary
          </h3>
          
          <div className="bg-panel-elevated/40 border border-white/5 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-text flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-text/80" aria-hidden="true" />
                Documents
              </span>
              <span className="font-extrabold text-primary-text">{totalDocuments}</span>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-text flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-muted-text/80" aria-hidden="true" />
                Total Pages
              </span>
              <span className="font-extrabold text-primary-text">{totalPages}</span>
            </div>

            <div className="w-full h-px bg-white/5" />

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-text flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-muted-text/80" aria-hidden="true" />
                Selected Pages
              </span>
              <span className="font-extrabold text-primary-text">{selectedCount}</span>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-text flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-muted-text/80" aria-hidden="true" />
                Reordered Pages
              </span>
              <span className="font-extrabold text-primary-text">{reorderedCount}</span>
            </div>
          </div>
        </div>

        {/* Smart Restore Information Card */}
        <div className="flex flex-col gap-2">
          <h3 className="text-[11.5px] font-bold text-secondary-text uppercase tracking-wider px-1">
            Smart Restore
          </h3>
          
          <div className="bg-blue-accent/5 border border-blue-bright/10 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-start gap-2 text-[11.5px] font-bold text-blue-bright">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>Smart Restore Info</span>
            </div>
            
            <p className="text-[11px] text-muted-text leading-relaxed">
              Smart Restore becomes available after a project is exported as a Smart PDF.
            </p>

            <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between text-[10px]">
              <span className="font-bold text-secondary-text">Status:</span>
              <span className="font-extrabold text-muted-text uppercase tracking-wider">
                Not available yet
              </span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
};
