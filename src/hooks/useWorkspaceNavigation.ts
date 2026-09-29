import { useCallback, useEffect, useRef, useState } from "react";
import { createWorkspaceElementRegistry } from "../lib/workspace-search/workspaceElementRegistry";

type UseWorkspaceNavigationOptions = {
  onSelectDocument: (documentId: string) => void;
  onSelectPage: (pageId: string, documentId: string) => void;
  onOpenPageViewer: (pageId: string, documentId: string) => void;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useWorkspaceNavigation({
  onSelectDocument,
  onSelectPage,
  onOpenPageViewer,
}: UseWorkspaceNavigationOptions) {
  const documentRegistryRef = useRef(createWorkspaceElementRegistry<HTMLElement>());
  const pageRegistryRef = useRef(createWorkspaceElementRegistry<HTMLElement>());
  const pendingFramesRef = useRef<number[]>([]);
  const documentHighlightTimerRef = useRef<number | null>(null);
  const pageHighlightTimerRef = useRef<number | null>(null);
  const [highlightedDocumentId, setHighlightedDocumentId] = useState<string | null>(
    null
  );
  const [highlightedPageId, setHighlightedPageId] = useState<string | null>(null);

  const registerDocumentElement = useCallback(
    (documentId: string, element: HTMLElement | null) => {
      documentRegistryRef.current.register(documentId, element);
    },
    []
  );
  const registerPageElement = useCallback(
    (pageId: string, element: HTMLElement | null) => {
      pageRegistryRef.current.register(pageId, element);
    },
    []
  );

  const scheduleAfterLayout = useCallback((callback: () => void) => {
    const first = window.requestAnimationFrame(() => {
      const second = window.requestAnimationFrame(callback);
      pendingFramesRef.current.push(second);
    });
    pendingFramesRef.current.push(first);
  }, []);

  const highlightDocument = useCallback((documentId: string) => {
    if (documentHighlightTimerRef.current !== null) {
      window.clearTimeout(documentHighlightTimerRef.current);
    }
    setHighlightedDocumentId(documentId);
    documentHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedDocumentId((current) =>
        current === documentId ? null : current
      );
    }, 1800);
  }, []);

  const highlightPage = useCallback((pageId: string) => {
    if (pageHighlightTimerRef.current !== null) {
      window.clearTimeout(pageHighlightTimerRef.current);
    }
    setHighlightedPageId(pageId);
    pageHighlightTimerRef.current = window.setTimeout(() => {
      setHighlightedPageId((current) => (current === pageId ? null : current));
    }, 1800);
  }, []);

  const requestDocumentNavigation = useCallback(
    (documentId: string) => {
      onSelectDocument(documentId);
      scheduleAfterLayout(() => {
        const element = documentRegistryRef.current.get(documentId);
        if (!element?.isConnected) return;
        element.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
        element.focus({ preventScroll: true });
        highlightDocument(documentId);
      });
    },
    [highlightDocument, onSelectDocument, scheduleAfterLayout]
  );

  const requestPageNavigation = useCallback(
    ({
      documentId,
      pageId,
      openInViewer = false,
    }: {
      documentId: string;
      pageId: string;
      openInViewer?: boolean;
    }) => {
      onSelectPage(pageId, documentId);
      if (openInViewer) {
        onOpenPageViewer(pageId, documentId);
        return;
      }
      scheduleAfterLayout(() => {
        const element = pageRegistryRef.current.get(pageId);
        if (!element?.isConnected) return;
        element.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "center",
          inline: "nearest",
        });
        const primaryAction = element.querySelector<HTMLElement>(
          "[data-page-primary-action]"
        );
        (primaryAction ?? element).focus({ preventScroll: true });
        highlightPage(pageId);
      });
    },
    [highlightPage, onOpenPageViewer, onSelectPage, scheduleAfterLayout]
  );

  useEffect(
    () => () => {
      for (const frame of pendingFramesRef.current) {
        window.cancelAnimationFrame(frame);
      }
      if (documentHighlightTimerRef.current !== null) {
        window.clearTimeout(documentHighlightTimerRef.current);
      }
      if (pageHighlightTimerRef.current !== null) {
        window.clearTimeout(pageHighlightTimerRef.current);
      }
      documentRegistryRef.current.clear();
      pageRegistryRef.current.clear();
    },
    []
  );

  return {
    registerDocumentElement,
    registerPageElement,
    requestDocumentNavigation,
    requestPageNavigation,
    highlightedDocumentId,
    highlightedPageId,
  };
}
