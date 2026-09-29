import { useEffect, useMemo, useRef } from "react";
import { performanceDiagnostics } from "../lib/performance/performanceDiagnostics";
import { acquireWorkspacePdfDocument } from "../lib/pdf/workspacePdfDocumentLoader";
import { thumbnailResourceCache } from "../lib/pdf/thumbnailResourceCache";
import {
  createThumbnailRenderKey,
  ThumbnailVisibilityPriority,
  thumbnailQueue,
} from "../lib/pdf/thumbnailQueue";
import { normalizeRotation } from "../lib/workspace/pageOperations";
import { PageRotation, ThumbnailStatus } from "../types/workspace";
import type { RenderTask } from "../lib/pdf/pdfjs";

type UsePageThumbnailProps = {
  pageId: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: PageRotation;
  thumbnailStatus: ThumbnailStatus;
  isActiveDocument: boolean;
  onStatusChange: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string,
    expectedRotation?: PageRotation
  ) => boolean;
};

const TARGET_WIDTH = 180;
const OFFSCREEN_RELEASE_DELAY_MS = 20_000;

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
}

function getPriority(
  entry: IntersectionObserverEntry,
  isActiveDocument: boolean
): ThumbnailVisibilityPriority {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const visiblyIntersects =
    entry.boundingClientRect.bottom > 0 &&
    entry.boundingClientRect.top < viewportHeight;
  if (visiblyIntersects) return "visible";
  return isActiveDocument ? "active-document" : "near-viewport";
}

export function usePageThumbnail({
  pageId,
  sourceDocumentId,
  originalPageIndex,
  rotation,
  thumbnailStatus,
  isActiveDocument,
  onStatusChange,
}: UsePageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const renderKey = useMemo(
    () =>
      createThumbnailRenderKey({
        sourceDocumentId,
        originalPageIndex,
        rotation,
        targetWidth: TARGET_WIDTH,
      }),
    [originalPageIndex, rotation, sourceDocumentId]
  );

  useEffect(() => {
    performanceDiagnostics.increment("mountedPageThumbnails");
    return () => {
      performanceDiagnostics.increment("mountedPageThumbnails", -1);
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      const released = thumbnailResourceCache.releaseOwner(pageId);
      if (released.pending && released.remainingOwners === 0 && released.renderKey) {
        thumbnailQueue.cancelTasks([released.renderKey]);
      }
    };
  }, [pageId, renderKey]);

  useEffect(() => {
    if (pageId.startsWith("ghost:") || thumbnailStatus === "error") return;
    const element = containerRef.current;
    if (!element) return;

    const schedule = (priority: ThumbnailVisibilityPriority) => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
      thumbnailQueue.updatePriority(renderKey, priority);
      if (thumbnailStatus === "ready" || inFlightRef.current) return;
      inFlightRef.current = true;
      if (!onStatusChange(pageId, "rendering", undefined, undefined, rotation)) {
        inFlightRef.current = false;
        return;
      }

      void thumbnailResourceCache
        .acquire({
          renderKey,
          ownerId: pageId,
          createBlob: () =>
            new Promise<Blob>((resolve, reject) => {
              let renderTask: RenderTask | null = null;
              const enqueued = thumbnailQueue.enqueue({
                id: renderKey,
                pageId,
                priority,
                run: async ({ isCancelled }) => {
                  let lease;
                  let canvas: HTMLCanvasElement | null = null;
                  try {
                    lease = await acquireWorkspacePdfDocument(sourceDocumentId);
                    const page = await lease.document.getPage(originalPageIndex + 1);
                    if (isCancelled()) throw new DOMException("Cancelled", "AbortError");
                    const displayRotation = normalizeRotation((page.rotate ?? 0) + rotation);
                    const unscaledViewport = page.getViewport({
                      scale: 1,
                      rotation: displayRotation,
                    });
                    const scale = TARGET_WIDTH / unscaledViewport.width;
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    const viewport = page.getViewport({
                      scale: scale * dpr,
                      rotation: displayRotation,
                    });
                    canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext("2d");
                    if (!context) throw new Error("Could not initialize thumbnail canvas.");
                    renderTask = page.render({ canvas, canvasContext: context, viewport });
                    await renderTask.promise;
                    if (isCancelled()) throw new DOMException("Cancelled", "AbortError");
                    const blob = await canvasToBlob(canvas);
                    if (!blob) throw new Error("Failed to encode thumbnail.");
                    resolve(blob);
                  } catch (error) {
                    reject(error);
                    throw error;
                  } finally {
                    lease?.release();
                    if (canvas) {
                      canvas.width = 0;
                      canvas.height = 0;
                    }
                  }
                },
                onCancel: () => {
                  try {
                    renderTask?.cancel?.();
                  } catch {
                    // PDF.js cancellation is best effort.
                  }
                  reject(new DOMException("Cancelled", "AbortError"));
                },
              });
              if (!enqueued) {
                reject(new Error("A duplicate thumbnail task was already scheduled."));
              }
            }),
        })
        .then((url) => {
          if (!onStatusChange(pageId, "ready", url, undefined, rotation)) {
            thumbnailResourceCache.releaseOwner(pageId);
          }
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          onStatusChange(
            pageId,
            "error",
            undefined,
            error instanceof Error ? error.message : "Thumbnail render error",
            rotation
          );
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          schedule(getPriority(entry, isActiveDocument));
          return;
        }
        if (thumbnailStatus !== "ready" || releaseTimerRef.current !== null) return;
        releaseTimerRef.current = window.setTimeout(() => {
          releaseTimerRef.current = null;
          const released = thumbnailResourceCache.releaseOwner(pageId);
          if (released.pending && released.remainingOwners === 0 && released.renderKey) {
            thumbnailQueue.cancelTasks([released.renderKey]);
          }
          onStatusChange(pageId, "idle", undefined, undefined, rotation);
        }, OFFSCREEN_RELEASE_DELAY_MS);
      },
      {
        rootMargin: isActiveDocument ? "1000px" : "600px",
        threshold: 0.01,
      }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [
    isActiveDocument,
    onStatusChange,
    originalPageIndex,
    pageId,
    renderKey,
    rotation,
    sourceDocumentId,
    thumbnailStatus,
  ]);

  return { containerRef };
}
