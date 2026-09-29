import React, { useCallback } from "react";
import {
  AlertCircle,
  FilePlus2,
  FileText,
  FolderOpen,
  GripVertical,
  Loader2,
  Plus,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "../ui/Toast";
import { WorkspaceDocument } from "../../types/workspace";
import { WorkspaceDocumentNameValidation } from "../../lib/workspace/documentOperations";
import { DocumentNameEditor } from "./DocumentNameEditor";
import { DocumentActionsMenu } from "./DocumentActionsMenu";

type DocumentsSidebarProps = {
  documents?: WorkspaceDocument[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (id: string) => void;
  onDeleteDocument?: (id: string) => void;
  onDuplicateDocument?: (id: string) => void;
  onAddPDFs?: () => void;
  onNewDocument?: () => void;
  onRenameDocument?: (
    id: string,
    name: string
  ) => WorkspaceDocumentNameValidation;
  editingDocumentId?: string | null;
  onStartRename?: (id: string) => void;
  onStopRename?: () => void;
  documentActionsDisabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
};

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
  onSelectDocument?: ((id: string) => void) | undefined;
  onDeleteDocument?: ((id: string) => void) | undefined;
  onDuplicateDocument?: ((id: string) => void) | undefined;
  onRenameDocument?: ((
    id: string,
    name: string
  ) => WorkspaceDocumentNameValidation) | undefined;
  isRenaming: boolean;
  onStartRename?: ((id: string) => void) | undefined;
  onStopRename?: (() => void) | undefined;
  canDelete: boolean;
  actionsDisabled: boolean;
};

const SidebarDocRow: React.FC<SidebarDocRowProps> = ({
  doc,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onRenameDocument,
  isRenaming,
  onStartRename,
  onStopRename,
  canDelete,
  actionsDisabled,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `workspace-document:${doc.id}`,
    data: { type: "document", documentId: doc.id },
  });
  const { setNodeRef: setPageDropNodeRef, isOver } = useDroppable({
    id: `sidebar-document:${doc.id}`,
    data: { type: "sidebar-container", containerId: doc.id },
  });
  const setNodeRef = useCallback(
    (node: HTMLLIElement | null) => {
      setSortableNodeRef(node);
      setPageDropNodeRef(node);
    },
    [setPageDropNodeRef, setSortableNodeRef]
  );
  const selectAndScroll = () => {
    onSelectDocument?.(doc.id);
    document
      .getElementById(`document-group-${doc.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group/row flex w-full items-center gap-1 rounded-xl border transition-[opacity,border-color,background-color,box-shadow] duration-200 ${
        isDragging
          ? "border-blue-bright/30 opacity-35"
          : isOver
            ? "border-blue-bright/50 bg-blue-accent/10"
            : "border-transparent"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title={`Move ${doc.name} document`}
        aria-label={`Move ${doc.name} document`}
        className="flex h-11 w-11 flex-shrink-0 touch-none items-center justify-center rounded-lg text-muted-text opacity-70 hover:bg-white/5 hover:text-blue-bright focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright active:cursor-grabbing lg:opacity-0 lg:group-hover/row:opacity-100 lg:group-focus-within/row:opacity-100"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div
        className={`flex min-w-0 flex-grow items-center gap-2 rounded-xl border p-2 transition-colors ${
          selectedDocumentId === doc.id
            ? "border-blue-bright/30 bg-blue-accent/10 text-primary-text"
            : "border-transparent bg-transparent text-secondary-text hover:bg-white/5"
        }`}
      >
        <button
          type="button"
          onClick={selectAndScroll}
          title={`View "${doc.name}"`}
          aria-label={`View ${doc.name}${selectedDocumentId === doc.id ? ", active document" : ""}`}
          aria-current={selectedDocumentId === doc.id ? "true" : undefined}
          className="flex flex-shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
            style={{ backgroundColor: doc.color }}
            aria-hidden="true"
          />
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-text" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-grow truncate text-xs">
          {onRenameDocument ? (
            <DocumentNameEditor
              document={doc}
              isEditing={isRenaming}
              onStartEditing={() => onStartRename?.(doc.id)}
              onStopEditing={() => onStopRename?.()}
              onRename={onRenameDocument}
              variant="sidebar"
            />
          ) : (
            <p className="truncate font-bold text-primary-text" title={doc.name}>
              {doc.name}
            </p>
          )}
          <button
            type="button"
            onClick={selectAndScroll}
            className="mt-0.5 flex items-center gap-1 rounded text-[11px] font-bold text-muted-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            {doc.status === "loading" && (
              <span className="flex items-center gap-1 text-blue-bright">
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" />
                Reading PDF…
              </span>
            )}
            {doc.status === "error" && (
              <span className="text-red-400">Error loading</span>
            )}
            {doc.status === "ready" && (
              <>
                <span>{doc.pageCount} page{doc.pageCount !== 1 ? "s" : ""}</span>
                {doc.size > 0 && (
                  <>
                    <span className="text-white/10">•</span>
                    <span>{formatBytes(doc.size)}</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      <DocumentActionsMenu
        document={doc}
        canDelete={canDelete}
        actionsDisabled={actionsDisabled}
        onRename={() => onStartRename?.(doc.id)}
        onDuplicate={() => onDuplicateDocument?.(doc.id)}
        onDelete={() => onDeleteDocument?.(doc.id)}
        surface="sidebar"
      />
    </li>
  );
};

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  documents = [],
  selectedDocumentId = null,
  onSelectDocument,
  onDeleteDocument,
  onDuplicateDocument,
  onAddPDFs,
  onNewDocument,
  onRenameDocument,
  editingDocumentId = null,
  onStartRename,
  onStopRename,
  documentActionsDisabled = false,
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
      className="flex h-full w-full select-none flex-col border-r studio-divider bg-panel-bg"
      aria-label="Documents Sidebar"
    >
      <div className="flex items-center justify-between border-b studio-divider bg-panel-elevated/20 px-4 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13.5px] font-semibold tracking-[-0.02em] text-primary-text">Documents</h2>
          <span
            className="status-badge text-[10px]"
            aria-label={`${documents.length} documents loaded`}
          >
            {documents.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewDocument}
            title="New Document"
            aria-label="New Document"
            className="rounded-lg p-1 text-muted-text transition-colors hover:bg-white/5 hover:text-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleAddPDFs}
            title="Add PDF documents"
            aria-label="Add PDF documents"
            className="rounded-lg p-1 text-muted-text transition-colors hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="border-b border-white/5 bg-panel-elevated/5 p-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onNewDocument}
            className="studio-interactive flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-blue-accent px-3 py-2 text-xs font-semibold text-white hover:bg-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Document</span>
          </button>
          <button
            type="button"
            onClick={handleAddPDFs}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-border-main bg-transparent px-3 py-2 text-xs font-medium text-muted-text transition-all hover:border-border-strong hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add PDFs</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-grow flex-col justify-start gap-3 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-text">
            <Loader2 className="h-5 w-5 animate-spin text-blue-bright" aria-hidden="true" />
            <span className="text-[11px] font-medium">Loading documents...</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[11px] leading-relaxed text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && documents.length > 0 && (
          <SortableContext
            items={documents.map((document) => `workspace-document:${document.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex w-full flex-col gap-1" role="list">
              {documents.map((doc) => (
                <SidebarDocRow
                  key={doc.id}
                  doc={doc}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={onSelectDocument}
                  onDeleteDocument={onDeleteDocument}
                  onDuplicateDocument={onDuplicateDocument}
                  onRenameDocument={onRenameDocument}
                  isRenaming={editingDocumentId === doc.id}
                  onStartRename={onStartRename}
                  onStopRename={onStopRename}
                  canDelete={documents.length > 1}
                  actionsDisabled={
                    documentActionsDisabled || doc.status === "loading"
                  }
                />
              ))}
            </ul>
          </SortableContext>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <div className="my-auto flex flex-col items-center justify-center px-2 py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text/75">
              <FolderOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mb-1 text-[12.5px] font-bold tracking-wide text-primary-text">No documents yet</h3>
            <p className="max-w-[180px] text-[11px] leading-relaxed text-muted-text">
              Create an empty document or add PDFs to begin organizing pages.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};
