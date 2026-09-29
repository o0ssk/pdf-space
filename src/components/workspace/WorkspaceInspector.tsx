import React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  CheckCircle2,
  Eye,
  FileText,
  Files,
  Layout,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import {
  WorkspaceDocument,
  WorkspacePage,
  WorkspaceSelectionState,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import {
  PageOperationActionHandlers,
  PageOperationActions,
} from "./PageOperationActions";
import {
  motionDurations,
  motionEasings,
  reducedMotionTransition,
} from "../../lib/motion/motionSystem";

type InspectorProps = {
  documents: WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  selectedDocumentId: string | null;
  selection: WorkspaceSelectionState;
  selectedPages: WorkspacePage[];
  onClearSelection: () => void;
  onSelectAllInContainer: (containerId: string) => void;
  onOpenPageViewer?: (pageId: string, documentId: string) => void;
  operationHandlers: PageOperationActionHandlers;
};

type InspectorMetricRowProps = {
  label: string;
  children: React.ReactNode;
};

const InspectorMetricRow: React.FC<InspectorMetricRowProps> = ({
  label,
  children,
}) => (
  <div className="inspector-property-row">
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
);

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const WorkspaceInspector: React.FC<InspectorProps> = ({
  documents = [],
  sourceDocuments,
  selectedDocumentId = null,
  selection,
  selectedPages,
  onClearSelection,
  onSelectAllInContainer,
  onOpenPageViewer,
  operationHandlers,
}) => {
  const reduceMotion = useReducedMotion();
  const totalDocuments = documents.length;
  const totalPages = documents.reduce(
    (sum, document) => sum + (document.pageCount || 0),
    0
  );
  const selectedCount = selectedPages.length;
  const reorderedCount = documents.reduce(
    (sum, document) =>
      sum +
      document.pages.filter(
        (page, index) =>
          page.documentId !== page.sourceDocumentId ||
          index !== page.originalPageIndex
      ).length,
    0
  );
  const rotatedCount = documents.reduce(
    (sum, document) =>
      sum + document.pages.filter((page) => page.rotation !== 0).length,
    0
  );
  const duplicatedCount = documents.reduce(
    (sum, document) =>
      sum +
      document.pages.filter((page) => Boolean(page.duplicatedFromPageId)).length,
    0
  );
  const selectedPage = selectedCount === 1 ? selectedPages[0] : null;
  const parentDoc = selectedPage
    ? documents.find((document) => document.id === selectedPage.documentId) ??
      null
    : null;
  const sourceDoc = selectedPage
    ? sourceDocuments[selectedPage.sourceDocumentId]
    : null;
  const selectedDoc = selectedDocumentId
    ? documents.find((document) => document.id === selectedDocumentId) ?? null
    : null;
  const activeDocument = selection.activeContainerId
    ? documents.find(
        (document) => document.id === selection.activeContainerId
      ) ?? null
    : null;
  const activePage = selection.activePageId
    ? documents
        .flatMap((document) => document.pages)
        .find((page) => page.id === selection.activePageId) ?? null
    : null;
  const selectedCountsByDocument = documents
    .map((document) => ({
      document,
      count: selectedPages.filter(
        (page) => page.documentId === document.id
      ).length,
    }))
    .filter(({ count }) => count > 0);
  const duplicatedFromPage = selectedPage?.duplicatedFromPageId
    ? documents
        .flatMap((document) => document.pages)
        .find((page) => page.id === selectedPage.duplicatedFromPageId)
    : null;
  const isSelectedPageLandscape =
    selectedPage?.rotation === 90 || selectedPage?.rotation === 270;
  const inspectorStateKey =
    selectedCount > 1
      ? `multi:${selectedCount}:${activePage?.id ?? "none"}`
      : selectedPage && parentDoc
        ? `page:${selectedPage.id}`
        : selectedDoc
          ? `document:${selectedDoc.id}`
          : "empty";
  const stateMotion = reduceMotion
    ? reducedMotionTransition
    : {
        duration: motionDurations.quick,
        ease: motionEasings.enter,
      };

  return (
    <aside
      className="flex h-full w-full select-none flex-col border-l studio-divider bg-panel-bg"
      aria-label="Workspace Inspector"
    >
      <div className="border-b studio-divider bg-panel-elevated/20 px-4 py-4">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.02em] text-primary-text">
          Inspector
        </h2>
      </div>

      <div className="flex min-h-0 flex-grow flex-col gap-6 overflow-y-auto p-4">
        <section className="flex flex-col gap-3" aria-labelledby="inspector-selection-heading">
          <h3
            id="inspector-selection-heading"
            className="px-0.5 text-xs font-semibold text-secondary-text"
          >
            Selection
          </h3>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={inspectorStateKey}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduceMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: -3 }
              }
              transition={stateMotion}
            >
              {selectedCount > 1 ? (
                <div
                  className="inspector-selection-surface"
                  data-inspector-state="multi-selection"
                >
                  <div className="flex items-start gap-3">
                    <span className="spatial-mark h-9 w-9">
                      <ListChecks className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-primary-text">
                        {selectedCount} pages selected
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-text">
                        Across {selectedCountsByDocument.length}{" "}
                        {selectedCountsByDocument.length === 1
                          ? "document"
                          : "documents"}
                      </p>
                    </div>
                  </div>

                  <div className="inspector-selection-breakdown">
                    {selectedCountsByDocument.map(({ document, count }) => (
                      <div key={document.id}>
                        <span title={document.name}>{document.name}</span>
                        <strong>
                          {count} {count === 1 ? "page" : "pages"}
                        </strong>
                      </div>
                    ))}
                  </div>

                  {activePage && (
                    <div className="inspector-active-page">
                      <span>Active page</span>
                      <strong className="studio-number">
                        {String(activePage.pageNumber).padStart(2, "0")}
                      </strong>
                    </div>
                  )}

                  <div className="inspector-command-stack">
                    <PageOperationActions
                      {...operationHandlers}
                      onClearSelection={onClearSelection}
                      selectedCount={selectedCount}
                      variant="inspector"
                    />
                  </div>
                </div>
              ) : selectedPage && parentDoc ? (
                <div
                  className="inspector-selection-surface"
                  data-inspector-state="single-page"
                >
                  <div
                    className={`inspector-page-preview ${
                      isSelectedPageLandscape ? "is-landscape" : ""
                    }`}
                  >
                    <div
                      className={`paper-plane inspector-preview-paper ${
                        isSelectedPageLandscape
                          ? "aspect-[1.41/1]"
                          : "aspect-[1/1.41]"
                      }`}
                    >
                      {selectedPage.thumbnailStatus === "ready" &&
                      selectedPage.thumbnailUrl ? (
                        <img
                          src={selectedPage.thumbnailUrl}
                          alt={`Selected page ${selectedPage.pageNumber} preview`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-contain"
                        />
                      ) : selectedPage.thumbnailStatus === "error" ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-red-400">
                          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                          <span className="text-[10px] font-semibold">
                            Preview unavailable
                          </span>
                        </div>
                      ) : (
                        <div className="paper-skeleton" aria-hidden="true">
                          <span className="paper-skeleton-rule paper-skeleton-rule-strong" />
                          <span className="paper-skeleton-rule" />
                          <span className="paper-skeleton-rule" />
                          <span className="paper-skeleton-rule paper-skeleton-rule-short" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="inspector-page-identity">
                    <p className="studio-number">
                      Page {String(selectedPage.pageNumber).padStart(2, "0")}
                    </p>
                    <strong>{parentDoc.name}</strong>
                    <span>
                      <bdi dir="auto">{sourceDoc?.name || parentDoc.name}</bdi>
                      {" · "}Original page{" "}
                      {String(selectedPage.originalPageIndex + 1).padStart(
                        2,
                        "0"
                      )}
                    </span>
                  </div>

                  <div className="inspector-property-list">
                    <InspectorMetricRow label="Current position">
                      <span className="studio-number">
                        {selectedPage.pageNumber}
                      </span>
                    </InspectorMetricRow>
                    <InspectorMetricRow label="Rotation">
                      {selectedPage.rotation}°
                    </InspectorMetricRow>
                    <InspectorMetricRow label="Duplicate">
                      {selectedPage.duplicatedFromPageId
                        ? duplicatedFromPage
                          ? `From page ${duplicatedFromPage.pageNumber}`
                          : "Yes"
                        : "No"}
                    </InspectorMetricRow>
                    <InspectorMetricRow label="Preview">
                      {selectedPage.thumbnailStatus === "ready" ? (
                        <span className="inline-flex items-center gap-1 text-success-green">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ready
                        </span>
                      ) : selectedPage.thumbnailStatus === "error" ? (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          Unavailable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-bright">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Preparing
                        </span>
                      )}
                    </InspectorMetricRow>
                  </div>

                  <div className="inspector-command-stack">
                    <PageOperationActions
                      {...operationHandlers}
                      selectedCount={selectedCount}
                      variant="inspector"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onOpenPageViewer?.(
                        selectedPage.id,
                        selectedPage.documentId
                      )
                    }
                    className="studio-interactive flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-blue-bright/28 bg-blue-accent/[0.14] px-3 py-2 text-[12px] font-semibold text-blue-bright hover:bg-blue-accent/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Open Page
                  </button>

                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="studio-interactive flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent px-3 py-2 text-[11.5px] font-semibold text-muted-text hover:bg-white/5 hover:text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear selection
                  </button>
                </div>
              ) : selectedDoc ? (
                <div
                  className="inspector-selection-surface"
                  data-inspector-state="document"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 h-9 w-0.5 flex-shrink-0 rounded-sm"
                      style={{ backgroundColor: selectedDoc.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-grow">
                      <p
                        className="truncate text-[13px] font-semibold text-primary-text"
                        title={selectedDoc.name}
                      >
                        {selectedDoc.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-text">
                        Current document
                      </p>
                    </div>
                  </div>

                  <div className="inspector-property-list">
                    <InspectorMetricRow label="Source size">
                      {formatBytes(selectedDoc.size)}
                    </InspectorMetricRow>
                    <InspectorMetricRow label="Pages">
                      {selectedDoc.pageCount}
                    </InspectorMetricRow>
                    <InspectorMetricRow label="Import">
                      {selectedDoc.status === "ready" ? (
                        <span className="inline-flex items-center gap-1 text-success-green">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ready
                        </span>
                      ) : selectedDoc.status === "loading" ? (
                        <span className="inline-flex items-center gap-1 text-blue-bright">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Reading
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          Error
                        </span>
                      )}
                    </InspectorMetricRow>
                  </div>

                  {selectedDoc.status === "error" &&
                    selectedDoc.errorMessage && (
                      <p className="rounded-[8px] border border-red-500/10 bg-red-500/5 p-2 text-[11px] font-medium text-red-400">
                        {selectedDoc.errorMessage}
                      </p>
                    )}
                </div>
              ) : (
                <div
                  className="inspector-empty-selection"
                  data-inspector-state="empty"
                >
                  <strong>Nothing selected</strong>
                  <p>
                    Select a page or document to inspect its identity and
                    editing controls.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {activeDocument?.status === "ready" &&
            activeDocument.pages.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectAllInContainer(activeDocument.id)}
                className="studio-interactive min-h-11 w-full cursor-pointer rounded-[9px] border border-blue-bright/14 bg-blue-bright/[0.035] px-3 py-2 text-[11.5px] font-semibold text-blue-bright hover:border-blue-bright/28 hover:bg-blue-bright/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Select all pages in this document
              </button>
            )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="workspace-summary-heading">
          <h3
            id="workspace-summary-heading"
            className="px-0.5 text-xs font-semibold text-secondary-text"
          >
            Workspace summary
          </h3>
          <div className="inspector-summary-list">
            <InspectorMetricRow label="Documents">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {totalDocuments}
              </span>
            </InspectorMetricRow>
            <InspectorMetricRow label="Total pages">
              <span className="inline-flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {totalPages}
              </span>
            </InspectorMetricRow>
            <InspectorMetricRow label="Selected">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {selectedCount}
              </span>
            </InspectorMetricRow>
            <InspectorMetricRow label="Reordered">
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {reorderedCount}
              </span>
            </InspectorMetricRow>
            <InspectorMetricRow label="Rotated">
              <span className="inline-flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {rotatedCount}
              </span>
            </InspectorMetricRow>
            <InspectorMetricRow label="Duplicated">
              <span className="inline-flex items-center gap-1.5">
                <Files className="h-3.5 w-3.5 text-muted-text" aria-hidden="true" />
                {duplicatedCount}
              </span>
            </InspectorMetricRow>
          </div>
        </section>
      </div>
    </aside>
  );
};
