import React, { useMemo, useRef, useState } from "react";
import { EmptyWorkspaceState } from "./EmptyWorkspaceState";
import { DocumentGroup } from "./DocumentGroup";
import { PdfDropOverlay } from "./PdfDropOverlay";
import {
  PageSelectionModifiers,
  WorkspaceDocument,
  WorkspaceSelectionState,
  ThumbnailStatus,
  PageRotation,
  ProjectedPageDrop,
} from "../../types/workspace";
import { isExternalFileDrag } from "../../lib/dragDrop";
import { WorkspaceDocumentNameValidation } from "../../lib/workspace/documentOperations";

type WorkspaceCanvasProps = {
  documents: WorkspaceDocument[];
  onDeleteDocument: (id: string) => void;
  onDuplicateDocument: (id: string) => void;
  documentActionsDisabled: boolean;
  onUpdatePageThumbnail: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string,
    expectedRotation?: PageRotation
  ) => boolean;
  importFiles: (files: FileList | File[]) => void;
  onTriggerFilePicker: () => void;
  selection: WorkspaceSelectionState;
  viewerPageId: string | null;
  onSelectPage: (
    pageId: string,
    documentId: string,
    modifiers?: PageSelectionModifiers
  ) => void;
  onOpenPageViewer: (pageId: string, documentId: string) => void;
  onExportDocument: (documentId: string) => void;
  onClearPageSelection: () => void;
  activeDragPageId: string | null;
  projectedTarget: ProjectedPageDrop | null;
  selectionToolbar?: React.ReactNode;
  showToolbarLane?: boolean;
  reserveMobileActionSpace?: boolean;
  onRenameDocument: (
    id: string,
    name: string
  ) => WorkspaceDocumentNameValidation;
  editingDocumentId: string | null;
  onStartRename: (id: string) => void;
  onStopRename: () => void;
  registerDocumentElement: (
    documentId: string,
    element: HTMLElement | null
  ) => void;
  registerPageElement: (pageId: string, element: HTMLElement | null) => void;
  highlightedDocumentId: string | null;
  highlightedPageId: string | null;
  activeDocumentId: string | null;
};

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  documents,
  onDeleteDocument,
  onDuplicateDocument,
  documentActionsDisabled,
  onUpdatePageThumbnail,
  importFiles,
  onTriggerFilePicker,
  selection,
  viewerPageId,
  onSelectPage,
  onOpenPageViewer,
  onExportDocument,
  onClearPageSelection,
  activeDragPageId,
  projectedTarget,
  selectionToolbar,
  showToolbarLane = false,
  reserveMobileActionSpace = false,
  onRenameDocument,
  editingDocumentId,
  onStartRename,
  onStopRename,
  registerDocumentElement,
  registerPageElement,
  highlightedDocumentId,
  highlightedPageId,
  activeDocumentId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const selectedByDocumentRef = useRef(new Map<string, readonly string[]>());

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (activeDragPageId) {
      return;
    }
    if (!isExternalFileDrag(e.dataTransfer)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (activeDragPageId) {
      return;
    }
    if (!isExternalFileDrag(e.dataTransfer)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (activeDragPageId) {
      return;
    }
    if (!isExternalFileDrag(e.dataTransfer)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (activeDragPageId) {
      return;
    }
    if (!isExternalFileDrag(e.dataTransfer)) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      importFiles(e.dataTransfer.files);
    }
  };

  const isWorkspaceEmpty = documents.every((document) => document.pages.length === 0);
  const activePage = useMemo(
    () =>
      activeDragPageId
        ? documents
            .flatMap((document) => document.pages)
            .find((page) => page.id === activeDragPageId) ?? null
        : null,
    [activeDragPageId, documents]
  );
  const selectedPageIdSet = useMemo(
    () => new Set(selection.selectedPageIds),
    [selection.selectedPageIds]
  );
  const selectedPageIdsByDocument = useMemo(() => {
    const next = new Map<string, readonly string[]>();
    for (const document of documents) {
      const selectedIds = document.pages
        .filter((page) => selectedPageIdSet.has(page.id))
        .map((page) => page.id);
      const previousIds = selectedByDocumentRef.current.get(document.id);
      const unchanged =
        previousIds?.length === selectedIds.length &&
        selectedIds.every((id, index) => id === previousIds[index]);
      next.set(document.id, unchanged ? previousIds : selectedIds);
    }
    selectedByDocumentRef.current = next;
    return next;
  }, [documents, selectedPageIdSet]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLElement>) => {
    if (
      event.target !== event.currentTarget ||
      activeDragPageId ||
      event.clientX >= event.currentTarget.getBoundingClientRect().right - 2
    ) {
      return;
    }
    onClearPageSelection();
  };

  return (
    <main 
      id="workspace-canvas"
      className="relative h-full flex-grow select-none overflow-y-auto bg-main-bg p-4 focus:outline-none sm:p-7 lg:p-9"
      aria-label="Workspace central canvas"
      tabIndex={-1}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      {/* 1. Subtle Dotted Visual Canvas Grid */}
      <div className="app-grid-bg absolute inset-0 opacity-50 pointer-events-none" aria-hidden="true" />

      {/* 3. Drag and Drop Overlay */}
      <PdfDropOverlay isDragging={isDragging} />

      {/* 4. Canvas Contents (Empty state vs Document groups) */}
      {isWorkspaceEmpty && (
        <div className="relative z-10 mx-auto mb-8 w-full max-w-[1280px] pt-2 sm:pt-6">
          <EmptyWorkspaceState onAddPDFs={onTriggerFilePicker} />
        </div>
      )}
      {documents.length > 0 && (
        <div
          className={`relative z-10 mx-auto flex w-full max-w-[1280px] flex-col gap-8 py-2 ${
            reserveMobileActionSpace ? "pb-32" : ""
          }`}
        >
          {showToolbarLane && (
            <div className="h-14 sticky top-2 z-30 pointer-events-none flex items-start justify-center">
              <div className="max-w-full pointer-events-auto">
                {selectionToolbar}
              </div>
            </div>
          )}
          {documents.map((doc) => {
            const groupProjection =
              projectedTarget &&
              (projectedTarget.sourceContainerId === doc.id ||
                projectedTarget.targetContainerId === doc.id)
                ? projectedTarget
                : null;

            return (
              <DocumentGroup
                key={doc.id}
                document={doc}
                onDeleteDocument={onDeleteDocument}
                onDuplicateDocument={onDuplicateDocument}
                canDeleteDocument={documents.length > 1}
                documentActionsDisabled={documentActionsDisabled}
                onUpdatePageThumbnail={onUpdatePageThumbnail}
                selectedPageIds={selectedPageIdsByDocument.get(doc.id) ?? []}
                activeSelectedPageId={
                  doc.pages.some((page) => page.id === selection.activePageId)
                    ? selection.activePageId
                    : null
                }
                viewerPageId={
                  doc.pages.some((page) => page.id === viewerPageId)
                    ? viewerPageId
                    : null
                }
                onSelectPage={onSelectPage}
                onOpenPageViewer={onOpenPageViewer}
                onExportDocument={onExportDocument}
                activeDragPageId={activeDragPageId}
                projectedTarget={groupProjection}
                activePage={activePage}
                onRenameDocument={onRenameDocument}
                isRenaming={editingDocumentId === doc.id}
                onStartRename={onStartRename}
                onStopRename={onStopRename}
                registerDocumentElement={registerDocumentElement}
                registerPageElement={registerPageElement}
                highlightedDocumentId={highlightedDocumentId}
                highlightedPageId={highlightedPageId}
                isActiveDocument={doc.id === activeDocumentId}
              />
            );
          })}
        </div>
      )}
    </main>
  );
};
