import React, {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, FileArchive } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { usePdfExportJob } from "../../hooks/usePdfExportJob";
import {
  createExportDocumentSelections,
  ExportDocumentSelection,
  setAllExportDocumentSelections,
  toggleExportDocumentSelection,
  updateExportDocumentFileName,
} from "../../lib/export/exportDialogModel";
import { normalizePdfOutputFileName } from "../../lib/export/exportFileNames";
import { calculateExportMemoryPreflight } from "../../lib/export/exportMemoryPreflight";
import {
  checkLocalExportSourceAvailability,
  createLocalExportSourceResolver,
} from "../../lib/export/exportSourceResolver";
import { originalSourceBlobRegistry } from "../../lib/pdf/originalSourceBlobRegistry";
import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import { ExportDialogFooter } from "./ExportDialogFooter";
import { ExportDialogHeader } from "./ExportDialogHeader";
import { ExportDocumentCard } from "./ExportDocumentCard";
import { ExportProgressPanel } from "./ExportProgressPanel";
import { ExportResultPanel } from "./ExportResultPanel";

type ExportDialogProps = {
  isOpen: boolean;
  projectId: string;
  projectName: string;
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  preselectedDocumentId?: string | null;
  onClose: () => void;
};

function createSelections(
  documents: readonly WorkspaceDocument[],
  sourceDocuments: WorkspaceSourceDocuments,
  preselectedDocumentId?: string | null,
  availableSourceIds?: ReadonlySet<string>
) {
  return createExportDocumentSelections({
    documents,
    sourceDocuments,
    ...(preselectedDocumentId !== undefined ? { preselectedDocumentId } : {}),
    hasSourceBlob: (sourceId) =>
      availableSourceIds
        ? availableSourceIds.has(sourceId)
        : Boolean(originalSourceBlobRegistry.get(sourceId)),
  });
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  projectId,
  projectName,
  documents,
  sourceDocuments,
  preselectedDocumentId,
  onClose,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [selections, setSelections] = useState<ExportDocumentSelection[]>([]);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const wasOpenRef = useRef(false);
  const { containerRef } = useFocusTrap<HTMLFormElement>({
    isOpen: isOpen && !cancelConfirmationOpen,
    restoreFocus: false,
  });
  const { containerRef: cancelContainerRef } = useFocusTrap<HTMLDivElement>({
    isOpen: isOpen && cancelConfirmationOpen,
    restoreFocus: false,
  });
  const resolveSourceBytes = useMemo(
    () => createLocalExportSourceResolver(),
    []
  );
  const job = usePdfExportJob({
    projectId,
    projectName,
    documents,
    sourceDocuments,
    resolveSourceBytes,
  });
  const resetExportJob = job.reset;
  const startExportJob = job.start;

  const resetConfiguration = useCallback(() => {
    setSelections(
      createSelections(
        documents,
        sourceDocuments,
        preselectedDocumentId
      )
    );
  }, [documents, preselectedDocumentId, sourceDocuments]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (isOpen && !wasOpen) {
      resetConfiguration();
      return;
    }
    if (!isOpen && wasOpen) {
      resetExportJob();
      setCancelConfirmationOpen(false);
    }
  }, [isOpen, resetConfiguration, resetExportJob]);

  useEffect(() => {
    if (!isOpen || job.isActive) return;
    let cancelled = false;
    const sourceIds: string[] = [
      ...new Set<string>(
        documents.flatMap((document) =>
          document.pages.map((page) => page.sourceDocumentId)
        )
      ),
    ];
    void checkLocalExportSourceAvailability(sourceIds).then((availability) => {
      if (cancelled) return;
      const readySourceIds = new Set(
        [...availability.entries()]
          .filter(([, status]) => status === "ready")
          .map(([sourceId]) => sourceId)
      );
      setSelections(
        createSelections(
          documents,
          sourceDocuments,
          preselectedDocumentId,
          readySourceIds
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [
    documents,
    isOpen,
    job.isActive,
    preselectedDocumentId,
    sourceDocuments,
  ]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const returnTarget = document.activeElement as HTMLElement | null;
    return () => {
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [isOpen]);

  const requestClose = useCallback(() => {
    if (job.isActive) {
      setCancelConfirmationOpen(true);
      return;
    }
    onClose();
  }, [job.isActive, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (cancelConfirmationOpen) {
        setCancelConfirmationOpen(false);
      } else {
        requestClose();
      }
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [cancelConfirmationOpen, isOpen, requestClose]);

  const readySelections = selections.filter(
    (selection) => selection.status === "ready"
  );
  const selectedSelections = readySelections.filter(
    (selection) => selection.selected
  );
  const hasInvalidName = selectedSelections.some(
    (selection) => Boolean(selection.validationError)
  );
  const canExport =
    selectedSelections.length > 0 && !hasInvalidName && !job.isActive;
  const allReadySelected =
    readySelections.length > 0 &&
    selectedSelections.length === readySelections.length;
  const exportPreflight = useMemo(
    () =>
      calculateExportMemoryPreflight({
        documents,
        sourceDocuments,
        selectedDocumentIds: new Set(
          selectedSelections.map((selection) => selection.documentId)
        ),
      }),
    [documents, selectedSelections, sourceDocuments]
  );

  const startExport = useCallback(
    async (documentIds?: ReadonlySet<string>) => {
      const chosen = selections.filter(
        (selection) =>
          selection.status === "ready" &&
          selection.selected &&
          (!documentIds || documentIds.has(selection.documentId))
      );
      if (chosen.length === 0) return;
      await startExportJob({
        configurations: chosen.map((selection) => ({
          documentId: selection.documentId,
          fileName: normalizePdfOutputFileName(selection.resolvedFileName),
        })),
      });
    },
    [selections, startExportJob]
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canExport) void startExport();
  };

  const retryFailed = () => {
    const failedIds = new Set(
      job.result?.failed.map((failure) => failure.documentId) ?? []
    );
    if (failedIds.size > 0) void startExport(failedIds);
  };

  const exportAgain = () => {
    job.reset();
    resetConfiguration();
  };

  const confirmCancel = () => {
    job.cancel();
    setCancelConfirmationOpen(false);
  };

  if (!isOpen) return null;

  const showResult =
    !job.isActive &&
    (job.phase === "complete" ||
      job.phase === "failed" ||
      job.phase === "cancelled");
  const failedCount = job.result?.failed.length ?? 0;
  const activeSelection =
    selectedSelections[
      Math.min(
        job.progress.documentIndex,
        Math.max(0, selectedSelections.length - 1)
      )
    ];

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="studio-dialog-overlay fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <motion.form
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        aria-describedby="export-dialog-description"
        aria-busy={job.isActive}
        initial={
          shouldReduceMotion
            ? false
            : { opacity: 0, y: 14, scale: 0.985 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="command-surface relative flex h-[100dvh] max-h-[100dvh] w-full max-w-[720px] flex-col overflow-hidden rounded-none border-x-0 border-b-0 sm:h-auto sm:max-h-[min(790px,calc(100dvh-48px))] sm:rounded-[18px] sm:border"
        onSubmit={handleSubmit}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
          aria-hidden="true"
        />

        <ExportDialogHeader onClose={requestClose} />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {job.isActive ? (
            <ExportProgressPanel
              phase={job.phase}
              value={job.progress.value}
              label={job.progress.label}
              {...(activeSelection?.resolvedFileName
                ? { currentOutputName: activeSelection.resolvedFileName }
                : {})}
              documentIndex={job.progress.documentIndex}
              documentCount={job.progress.documentCount}
              completedPages={job.progress.completedPages}
              totalPages={job.progress.totalPages}
            />
          ) : showResult ? (
            <ExportResultPanel phase={job.phase} result={job.result} />
          ) : (
            <section aria-labelledby="export-documents-title">
              <div className="mb-3.5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      id="export-documents-title"
                      className="text-[14px] font-semibold text-primary-text"
                    >
                      Documents
                    </h3>
                    <span className="rounded-lg border border-border-main bg-panel-elevated/55 px-2 py-1 text-[10px] font-bold tabular-nums text-secondary-text">
                      {selectedSelections.length} of {readySelections.length}{" "}
                      selected
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-muted-text">
                    Select the groups to export and confirm their filenames.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {!allReadySelected && readySelections.length > 0 && (
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-blue-bright transition-colors hover:bg-blue-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                      onClick={() =>
                        setSelections((current) =>
                          setAllExportDocumentSelections(current, true)
                        )
                      }
                    >
                      Select all
                    </button>
                  )}
                  {selectedSelections.length > 0 && (
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-text transition-colors hover:bg-white/5 hover:text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                      onClick={() =>
                        setSelections((current) =>
                          setAllExportDocumentSelections(current, false)
                        )
                      }
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 sm:max-h-[430px] sm:overflow-y-auto sm:pr-1">
                {selections.map((selection) => (
                  <ExportDocumentCard
                    key={selection.documentId}
                    selection={selection}
                    onToggle={() =>
                      setSelections((current) =>
                        toggleExportDocumentSelection(
                          current,
                          selection.documentId
                        )
                      )
                    }
                    onFileNameChange={(fileName) =>
                      setSelections((current) =>
                        updateExportDocumentFileName(
                          current,
                          selection.documentId,
                          fileName
                        )
                      )
                    }
                  />
                ))}
              </div>

              {selectedSelections.length > 1 && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-blue-bright/15 bg-blue-accent/[0.055] px-3.5 py-3 text-[11.5px] leading-5 text-secondary-text">
                  <FileArchive
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-bright"
                    aria-hidden="true"
                  />
                  <p>
                    Multiple PDFs will be downloaded together in one ZIP file.
                  </p>
                </div>
              )}
              {exportPreflight.isLarge && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] px-3.5 py-3 text-[11.5px] leading-5 text-secondary-text">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  <p>
                    Large export: {exportPreflight.pageCount} pages across {exportPreflight.uniqueSourceCount} source PDFs. Keep this tab open; PDF Space will process documents sequentially and release temporary data after download.
                  </p>
                </div>
              )}
            </section>
          )}
        </main>

        <ExportDialogFooter
          isActive={job.isActive}
          showResult={showResult}
          selectedCount={selectedSelections.length}
          canExport={canExport}
          failedCount={failedCount}
          onCancelExport={() => setCancelConfirmationOpen(true)}
          onClose={onClose}
          onRetryFailed={retryFailed}
          onExportAgain={exportAgain}
        />
      </motion.form>

      {cancelConfirmationOpen && (
        <div className="studio-dialog-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <section
            ref={cancelContainerRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-export-title"
            aria-describedby="cancel-export-description"
            tabIndex={-1}
            className="command-surface w-full max-w-md overflow-hidden"
          >
            <div className="flex items-start gap-3.5 border-b border-border-main px-5 py-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.07] text-amber-300">
                <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div>
                <h3
                  id="cancel-export-title"
                  className="text-[15px] font-semibold text-primary-text"
                >
                  Cancel this export?
                </h3>
                <p
                  id="cancel-export-description"
                  className="mt-1.5 text-[11.5px] leading-5 text-muted-text"
                >
                  Processing will stop at the next safe checkpoint. No
                  additional download will be created.
                </p>
              </div>
            </div>
            <footer className="flex flex-col-reverse gap-2 bg-[#050a14]/70 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelConfirmationOpen(false)}
                className="min-h-10 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 text-[12px] font-semibold text-secondary-text transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Continue export
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="min-h-10 rounded-xl border border-pdf-red/20 bg-pdf-red px-4 text-[12px] font-semibold text-white transition-colors hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Cancel export
              </button>
            </footer>
          </section>
        </div>
      )}
    </motion.div>
  );
};

export default ExportDialog;
