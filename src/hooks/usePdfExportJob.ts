import { useCallback, useRef, useState } from "react";
import {
  aggregatePdfExportProgress,
  AggregatedExportProgress,
  ExportUiPhase,
} from "../lib/export/exportProgress";
import {
  executePdfExportJob,
  ExportJobDocumentConfig,
  ExportJobResult,
} from "../lib/export/exportJob";
import { asPdfExportError } from "../lib/export/exportErrors";
import {
  createExportableDocument,
  ExportSourceResolver,
} from "../lib/export/exportTypes";
import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../types/workspace";

const initialProgress: AggregatedExportProgress = {
  phase: "idle",
  documentIndex: 0,
  documentCount: 0,
  completedPages: 0,
  totalPages: 0,
  value: 0,
  label: "Ready to export",
};

export type PdfExportJobRequest = {
  configurations: readonly ExportJobDocumentConfig[];
};

function isCancellation(error: unknown): boolean {
  return asPdfExportError(error).code === "EXPORT_CANCELLED";
}

export function usePdfExportJob({
  projectId,
  projectName,
  documents,
  sourceDocuments,
  resolveSourceBytes,
}: {
  projectId: string;
  projectName: string;
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  resolveSourceBytes: ExportSourceResolver;
}) {
  const [phase, setPhase] = useState<ExportUiPhase>("idle");
  const [progress, setProgress] =
    useState<AggregatedExportProgress>(initialProgress);
  const [result, setResult] = useState<ExportJobResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeJobRef = useRef(false);
  const progressValueRef = useRef(0);

  const start = useCallback(
    async ({ configurations }: PdfExportJobRequest) => {
      if (activeJobRef.current) return false;
      activeJobRef.current = true;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setResult(null);
      setPhase("planning");
      setProgress(initialProgress);
      progressValueRef.current = 0;

      try {
        const selectedDocuments = configurations
          .map((configuration) =>
            documents.find(
              (document) => document.id === configuration.documentId
            )
          )
          .filter(
            (document): document is WorkspaceDocument => Boolean(document)
          );
        const pageCounts = selectedDocuments.map(
          (document) => document.pages.length
        );
        const nextResult = await executePdfExportJob({
          projectId,
          projectName,
          documents: selectedDocuments.map((document) =>
            createExportableDocument(document, sourceDocuments)
          ),
          configurations,
          resolveSourceBytes,
          signal: controller.signal,
          onPdfProgress: (engineProgress) => {
            const aggregated = aggregatePdfExportProgress({
              progress: engineProgress,
              selectedPageCounts: pageCounts,
              previousValue: progressValueRef.current,
            });
            progressValueRef.current = aggregated.value;
            setPhase(aggregated.phase);
            setProgress(aggregated);
          },
          onZipProgress: (zipProgress) => {
            const value = Math.max(
              progressValueRef.current,
              85 + Math.round(zipProgress.percent * 0.14)
            );
            progressValueRef.current = value;
            setPhase("creating-zip");
            setProgress({
              phase: "creating-zip",
              documentIndex: pageCounts.length,
              documentCount: pageCounts.length,
              completedPages: pageCounts.reduce(
                (sum, count) => sum + count,
                0
              ),
              totalPages: pageCounts.reduce(
                (sum, count) => sum + count,
                0
              ),
              value,
              label: "Packaging successful PDFs into a ZIP archive…",
            });
          },
          onDownloading: () => {
            progressValueRef.current = 100;
            setPhase("downloading");
            setProgress((current) => ({
              ...current,
              phase: "downloading",
              value: 100,
              label: "Starting browser download…",
            }));
          },
        });
        setResult(nextResult);
        const nextPhase =
          nextResult.successful.length > 0
            ? "complete"
            : nextResult.failed.length > 0
              ? "failed"
              : "complete";
        setPhase(nextPhase);
        setProgress((current) => ({
          ...current,
          phase: nextPhase,
          value: nextResult.successful.length > 0 ? 100 : current.value,
          label:
            nextResult.successful.length > 0
              ? "Download ready"
              : "Export could not be completed",
        }));
        return true;
      } catch (error) {
        if (isCancellation(error)) {
          setPhase("cancelled");
          setProgress((current) => ({
            ...current,
            phase: "cancelled",
            label: "Export cancelled",
          }));
        } else {
          const exportError = asPdfExportError(error);
          if (import.meta.env.DEV) {
            console.error("Unable to complete export job", exportError);
          }
          setPhase("failed");
          setProgress((current) => ({
            ...current,
            phase: "failed",
            label: "Export could not be completed",
          }));
        }
        return false;
      } finally {
        activeJobRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [
      documents,
      projectId,
      projectName,
      resolveSourceBytes,
      sourceDocuments,
    ]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort("User cancelled PDF export.");
  }, []);

  const reset = useCallback(() => {
    if (activeJobRef.current) return;
    setPhase("idle");
    setProgress(initialProgress);
    setResult(null);
    progressValueRef.current = 0;
  }, []);

  return {
    phase,
    progress,
    result,
    isActive:
      phase === "planning" ||
      phase === "loading-sources" ||
      phase === "copying-pages" ||
      phase === "saving-pdfs" ||
      phase === "creating-zip" ||
      phase === "downloading",
    start,
    cancel,
    reset,
  };
}
