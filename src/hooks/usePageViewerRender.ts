import { useEffect, useRef, useState, useCallback } from "react";
import { acquireWorkspacePdfDocument } from "../lib/pdf/workspacePdfDocumentLoader";
import { thumbnailQueue } from "../lib/pdf/thumbnailQueue";
import { pdfWorkBudget } from "../lib/pdf/pdfWorkBudget";
import { normalizeRotation } from "../lib/workspace/pageOperations";
import type { RenderTask } from "../lib/pdf/pdfjs";

type UsePageViewerRenderProps = {
  documentId: string | null;
  pageNumber: number;
  zoom: number; // e.g. 100 for 100%
  zoomMode: "custom" | "fit-page" | "fit-width";
  rotation: number;
};

export function usePageViewerRender({
  documentId,
  pageNumber,
  zoom,
  zoomMode,
  rotation,
}: UsePageViewerRenderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // References to handle cancellation of active PDF.js jobs
  const renderTaskRef = useRef<RenderTask | null>(null);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!documentId) return;
    thumbnailQueue.setForegroundActive(true);
    const releaseForeground = pdfWorkBudget.acquireForeground();
    return () => {
      releaseForeground();
      thumbnailQueue.setForegroundActive(false);
    };
  }, [documentId]);

  useEffect(() => {
    if (!documentId) {
      setRendering(false);
      setError(null);
      return;
    }

    let isAborted = false;

    async function renderPage() {
      // 1. Cancel previous render task
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }

      setRendering(true);
      setError(null);

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        setRendering(false);
        return;
      }

      let lease;
      try {
        lease = await acquireWorkspacePdfDocument(documentId!);

        const page = await lease.document.getPage(pageNumber);
        if (isAborted) return;

        // Workspace rotation is a user-applied delta on top of the source page's
        // intrinsic PDF rotation.
        const displayRotation = normalizeRotation(
          (page.rotate ?? 0) + rotation
        );
        const unscaledViewport = page.getViewport({
          scale: 1,
          rotation: displayRotation,
        });

        // Compute container size
        const containerWidth = container.clientWidth || 800;
        const containerHeight = container.clientHeight || 600;

        // Deduct padding
        const padX = 32;
        const padY = 32;
        const availableW = Math.max(containerWidth - padX, 200);
        const availableH = Math.max(containerHeight - padY, 200);

        let finalScale = 1.0;

        if (zoomMode === "fit-page") {
          const scaleW = availableW / unscaledViewport.width;
          const scaleH = availableH / unscaledViewport.height;
          finalScale = Math.min(scaleW, scaleH);
        } else if (zoomMode === "fit-width") {
          finalScale = availableW / unscaledViewport.width;
        } else {
          // Custom zoom percentage
          finalScale = zoom / 100;
        }

        // Cap devicePixelRatio to 2 to protect device memory and performance
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({
          scale: finalScale * dpr,
          rotation: displayRotation,
        });

        // Set high-res canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Set screen CSS display dimensions
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to initialize canvas 2D rendering context.");
        }

        // Clear canvas before drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render PDF page inside canvas
        const renderContext = {
          canvas,
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!isAborted) {
          setRendering(false);
          setError(null);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "RenderingCancelledException") {
          // Expected when canceling active draw jobs during navigation
          return;
        }
        console.error("High-resolution rendering failed:", err);
        if (!isAborted) {
          setError(err instanceof Error ? err.message : "Failed to render high-resolution PDF page.");
          setRendering(false);
        }
      } finally {
        lease?.release();
      }
    }

    void renderPage();

    return () => {
      isAborted = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // PDF.js cancellation is best effort during unmount.
        }
        renderTaskRef.current = null;
      }
    };
  }, [documentId, pageNumber, zoom, zoomMode, rotation, retryTrigger]);

  // Use window resize listener to trigger a re-render when the screen size changes,
  // but only if we are in "fit-page" or "fit-width" modes. This completely
  // bypasses infinite feedback loops from scrollbar toggle events within the container.
  useEffect(() => {
    if (zoomMode === "custom") return;

    let resizeTimeout: NodeJS.Timeout | null = null;

    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          retry();
        });
      }, 100); // 100ms debouncing for performance during rapid resizing
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    };
  }, [zoomMode, retry]);

  // Instantly cleanup canvas memory on unmount
  useEffect(() => {
    const canvas = canvasRef.current;
    return () => {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, []);

  return {
    canvasRef,
    containerRef,
    rendering,
    error,
    retry,
  };
}
