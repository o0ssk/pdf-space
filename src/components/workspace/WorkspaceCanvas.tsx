import React, { useState, useRef } from "react";
import { EmptyWorkspaceState } from "./EmptyWorkspaceState";
import { DocumentGroup } from "./DocumentGroup";
import { PdfDropOverlay } from "./PdfDropOverlay";
import { WorkspaceDocument, ThumbnailStatus, ProjectedPageDrop } from "../../types/workspace";
import { isExternalFileDrag } from "../../lib/dragDrop";

type WorkspaceCanvasProps = {
  documents: WorkspaceDocument[];
  onRemoveDocument: (id: string) => void;
  onUpdatePageThumbnail: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string
  ) => boolean;
  importFiles: (files: FileList | File[]) => void;
  onBackToHome?: () => void;
  onTriggerFilePicker: () => void;
  selectedPageId: string | null;
  onSelectPage: (pageId: string, documentId: string) => void;
  onOpenPageViewer: (pageId: string, documentId: string) => void;
  onClearPageSelection: () => void;
  activeDragPageId: string | null;
  projectedTarget: ProjectedPageDrop | null;
};

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  documents,
  onRemoveDocument,
  onUpdatePageThumbnail,
  importFiles,
  onBackToHome,
  onTriggerFilePicker,
  selectedPageId,
  onSelectPage,
  onOpenPageViewer,
  onClearPageSelection,
  activeDragPageId,
  projectedTarget,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

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

  const isEmpty = documents.length === 0;

  return (
    <main 
      id="workspace-canvas"
      className={`flex-grow h-full bg-[#0a0c10] overflow-y-auto relative p-4 sm:p-8 select-none focus:outline-none transition-all duration-300 ${
        isEmpty ? "flex items-center justify-center" : "block"
      }`}
      aria-label="Workspace central canvas"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Subtle Dotted Visual Canvas Grid */}
      <div 
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
        aria-hidden="true"
      />

      {/* 2. Soft Blue Radial Central Ambient Glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-accent/3 blur-[140px] pointer-events-none"
        aria-hidden="true"
      />

      {/* 3. Drag and Drop Overlay */}
      <PdfDropOverlay isDragging={isDragging} />

      {/* 4. Canvas Contents (Empty state vs Document groups) */}
      {isEmpty ? (
        <EmptyWorkspaceState onBackToHome={onBackToHome} onAddPDFs={onTriggerFilePicker} />
      ) : (
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 relative z-10 py-2">
          {documents.map((doc) => (
            <DocumentGroup
              key={doc.id}
              document={doc}
              onRemove={onRemoveDocument}
              onUpdatePageThumbnail={onUpdatePageThumbnail}
              selectedPageId={selectedPageId}
              onSelectPage={onSelectPage}
              onOpenPageViewer={onOpenPageViewer}
              onClearPageSelection={onClearPageSelection}
              activeDragPageId={activeDragPageId}
              projectedTarget={projectedTarget}
              allDocuments={documents}
            />
          ))}
        </div>
      )}
    </main>
  );
};
