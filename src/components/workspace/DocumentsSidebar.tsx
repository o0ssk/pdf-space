import React from "react";
import { FileText, Plus, FolderOpen, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "../ui/Toast";
import { WorkspaceDocument } from "../../types/workspace";
import { useDroppable } from "@dnd-kit/core";

type DocumentsSidebarProps = {
  documents?: WorkspaceDocument[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (id: string) => void;
  onRemoveDocument?: (id: string) => void;
  onAddPDFs?: () => void;
  isLoading?: boolean;
  error?: string | null;
};

// Formats file sizes into human-readable labels
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

type SidebarDocRowProps = {
  doc: WorkspaceDocument;
  selectedDocumentId: string | null;
  onSelectDocument?: (id: string) => void;
  onRemoveDocument?: (id: string) => void;
};

const SidebarDocRow: React.FC<SidebarDocRowProps> = ({
  doc,
  selectedDocumentId,
  onSelectDocument,
  onRemoveDocument,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-document:${doc.id}`,
    data: {
      type: "sidebar-document",
      documentId: doc.id,
    },
  });

  return (
    <li
      ref={setNodeRef}
      className={`group/row flex items-center gap-1.5 w-full rounded-xl transition-all duration-200 border ${
        isOver
          ? "bg-blue-bright/10 border-blue-bright/50 shadow-[0_0_12px_rgba(0,245,255,0.15)] scale-[1.02]"
          : "border-transparent"
      }`}
    >
      <button
        onClick={() => {
          onSelectDocument?.(doc.id);
          // Smoothly scroll the target document group into center view
          const el = document.getElementById(`document-group-${doc.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        title={`View "${doc.name}"`}
        className={`flex-grow text-left p-2 rounded-xl flex items-center gap-2.5 border transition-all min-w-0 ${
          selectedDocumentId === doc.id
            ? "bg-blue-accent/10 border-blue-bright/30 text-primary-text"
            : "bg-transparent border-transparent text-secondary-text hover:bg-white/5"
        } cursor-pointer`}
      >
        <div 
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" 
          style={{ backgroundColor: doc.color }} 
        />
        <FileText className="w-4 h-4 text-muted-text flex-shrink-0" />
        
        <div className="flex-grow truncate text-[11.5px] min-w-0">
          <p className="font-bold truncate text-primary-text" title={doc.name}>{doc.name}</p>
          <div className="flex items-center gap-1 text-[9.5px] text-muted-text mt-0.5 font-bold uppercase tracking-wider">
            {doc.status === "loading" && (
              <span className="text-blue-bright flex items-center gap-1 animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-bright" /> Reading PDF…
              </span>
            )}
            {doc.status === "error" && (
              <span className="text-red-400">Error loading</span>
            )}
            {doc.status === "ready" && (
              <>
                <span>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                <span className="text-white/10">•</span>
                <span>{formatBytes(doc.size)}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Inline Remove Button */}
      <button
        onClick={() => onRemoveDocument?.(doc.id)}
        title={`Remove ${doc.name}`}
        aria-label={`Remove document "${doc.name}"`}
        className="p-1.5 rounded-lg opacity-0 group-hover/row:opacity-100 focus/row:opacity-100 hover:bg-red-500/10 text-muted-text hover:text-red-400 transition-all cursor-pointer flex-shrink-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  documents = [],
  selectedDocumentId = null,
  onSelectDocument,
  onRemoveDocument,
  onAddPDFs,
  isLoading = false,
  error = null,
}) => {
  const { showToast } = useToast();

  const handleAddPDFs = () => {
    if (onAddPDFs) {
      onAddPDFs();
    } else {
      showToast(
        "PDF import",
        "PDF file import is currently unavailable.",
        "info"
      );
    }
  };

  return (
    <aside 
      className="w-full h-full bg-panel-bg flex flex-col select-none border-r border-border-main"
      aria-label="Documents Sidebar"
    >
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-white/5 bg-panel-elevated/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-bold text-primary-text tracking-wide">Documents</h2>
          <span 
            className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-extrabold text-secondary-text"
            aria-label={`${documents.length} documents loaded`}
          >
            {documents.length}
          </span>
        </div>
        
        <button
          onClick={handleAddPDFs}
          title="Add PDF documents"
          aria-label="Add PDF documents"
          className="p-1 rounded-lg hover:bg-white/5 text-muted-text hover:text-primary-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <Plus className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>
      </div>

      {/* Primary Action Panel */}
      <div className="p-3 border-b border-white/5 bg-panel-elevated/5">
        <button
          onClick={handleAddPDFs}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-transparent border border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 text-[12.5px] font-medium text-muted-text hover:text-primary-text transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-muted-text" aria-hidden="true" focusable="false" />
          <span>Add PDFs</span>
        </button>
      </div>

      {/* List Container / Empty State */}
      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 min-h-0 justify-start">
        {/* Loading placeholder state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-text">
            <Loader2 className="w-5 h-5 animate-spin text-blue-bright" aria-hidden="true" />
            <span className="text-[11px] font-medium">Loading documents...</span>
          </div>
        )}

        {/* Error placeholder state */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex gap-2 items-start text-[11px] leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Document List */}
        {!isLoading && !error && documents.length > 0 && (
          <ul className="flex flex-col gap-1 w-full" role="list">
            {documents.map((doc) => (
              <SidebarDocRow
                key={doc.id}
                doc={doc}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={onSelectDocument}
                onRemoveDocument={onRemoveDocument}
              />
            ))}
          </ul>
        )}

        {/* Static Professional Empty State */}
        {!isLoading && !error && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center px-2 py-8 my-auto select-none">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-3 text-muted-text/75">
              <FolderOpen className="w-5 h-5" aria-hidden="true" focusable="false" />
            </div>
            <h3 className="text-[12.5px] font-bold text-primary-text tracking-wide mb-1">No documents yet</h3>
            <p className="text-[11px] text-muted-text leading-relaxed max-w-[180px]">
              Add PDF files to create document groups inside your workspace.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
