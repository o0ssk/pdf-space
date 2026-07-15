import { useEffect, useRef } from "react";
import { pdfDocumentRegistry } from "../lib/pdf/pdfDocumentRegistry";
import { thumbnailQueue } from "../lib/pdf/thumbnailQueue";
import { thumbnailUrlManager } from "../lib/pdf/thumbnailUrls";
import { ThumbnailStatus } from "../types/workspace";

type UsePageThumbnailProps = {
  pageId: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  thumbnailStatus: ThumbnailStatus;
  onStatusChange: (
    pageId: string,
    status: ThumbnailStatus,
    url?: string,
    errorMessage?: string
  ) => boolean;
};

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.8);
  });
}

export function usePageThumbnail({
  pageId,
  sourceDocumentId,
  originalPageIndex,
  thumbnailStatus,
  onStatusChange,
}: UsePageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isQueued = useRef(false);

  useEffect(() => {
    // Only idle, non-ghost pages need lazy rendering.
    if (pageId.startsWith("ghost:") || thumbnailStatus !== "idle" || isQueued.current) {
      return;
    }

    const currentEl = containerRef.current;
    if (!currentEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          isQueued.current = true;
          observer.disconnect();

          if (!onStatusChange(pageId, "rendering")) {
            isQueued.current = false;
            return;
          }

          // Enqueue the rendering task with PDF.js
          thumbnailQueue.enqueue({
            id: pageId,
            run: async ({ isCancelled }) => {
              let canvas: HTMLCanvasElement | null = null;

              try {
                const pdfDoc = pdfDocumentRegistry.get(sourceDocumentId);
                if (!pdfDoc) {
                  throw new Error("Document PDF proxy has been unmounted.");
                }

                const realPageNumber = originalPageIndex + 1;
                const page = await pdfDoc.getPage(realPageNumber);
                if (isCancelled()) return;
                if (!page) {
                  throw new Error(`Could not fetch page ${realPageNumber}.`);
                }

                // Calculate thumbnail width based on standard 180px desktop size
                const targetWidth = 180;
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = targetWidth / unscaledViewport.width;
                const dpr = window.devicePixelRatio || 1;
                const viewport = page.getViewport({ scale: scale * dpr });

                // Create offscreen canvas
                canvas = document.createElement("canvas");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  throw new Error("Could not initialize 2D canvas context.");
                }

                // Render page contents
                await page.render({
                  canvasContext: ctx,
                  viewport: viewport,
                }).promise;
                if (isCancelled()) return;

                const blob = await canvasToBlob(canvas);
                if (isCancelled()) return;

                if (!blob) {
                  onStatusChange(
                    pageId,
                    "error",
                    undefined,
                    "Failed to encode thumbnail."
                  );
                  return;
                }

                const url = URL.createObjectURL(blob);
                thumbnailUrlManager.register(pageId, url);

                if (!onStatusChange(pageId, "ready", url)) {
                  thumbnailUrlManager.revoke(pageId);
                }
              } catch (err: any) {
                if (isCancelled()) return;
                console.error(`Rendering failed for doc ${sourceDocumentId} page ${originalPageIndex + 1}:`, err);
                onStatusChange(
                  pageId,
                  "error",
                  undefined,
                  err.message || "Thumbnail render error"
                );
              } finally {
                if (canvas) {
                  canvas.width = 0;
                  canvas.height = 0;
                }
              }
            },
            onCancel: () => {
              isQueued.current = false;
            },
          });
        }
      },
      {
        rootMargin: "500px", // Pre-render pages within 500px of scrolling viewport
        threshold: 0.01,
      }
    );

    observer.observe(currentEl);

    return () => {
      observer.disconnect();
    };
  }, [pageId, sourceDocumentId, originalPageIndex, thumbnailStatus, onStatusChange]);

  return { containerRef };
}
