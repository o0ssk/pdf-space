import { useEffect, useRef } from "react";

type UseFocusTrapProps = {
  isOpen: boolean;
};

export function useFocusTrap({ isOpen }: UseFocusTrapProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableSelectors = [
      "a[href]",
      "area[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "button:not([disabled])",
      "iframe",
      "object",
      "embed",
      "[tabindex]:not([tabindex='-1'])",
      "[contenteditable]",
    ].join(",");

    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)) as HTMLElement[];
    };

    // Store the element that was focused before opening the dialog
    const previousActiveElement = document.activeElement as HTMLElement | null;

    // Focus the first element inside the trap or the container itself
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Focus the close button or first button. We can look for close button or first element.
      // Let's focus the container or first element to restore focus nicely.
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const elements = getFocusableElements();
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if focus is on first, move to last
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: if focus is on last, move to first
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Restore focus on close
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        setTimeout(() => {
          previousActiveElement.focus();
        }, 50);
      }
    };
  }, [isOpen]);

  return { containerRef };
}
