import React, { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { WorkspaceDocument } from "../../types/workspace";
import { WorkspaceDocumentNameValidation } from "../../lib/workspace/documentOperations";

type DocumentNameEditorProps = {
  document: WorkspaceDocument;
  isEditing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onRename: (
    documentId: string,
    name: string
  ) => WorkspaceDocumentNameValidation;
  variant: "sidebar" | "header";
};

export const DocumentNameEditor: React.FC<DocumentNameEditorProps> = ({
  document,
  isEditing,
  onStartEditing,
  onStopEditing,
  onRename,
  variant,
}) => {
  const [draft, setDraft] = useState(document.name);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasEditingRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(document.name);
      setError(null);
      if (wasEditingRef.current) {
        window.setTimeout(() => triggerRef.current?.focus(), 0);
      }
      wasEditingRef.current = false;
      return;
    }

    wasEditingRef.current = true;
    cancelledRef.current = false;
    setDraft(document.name);
    setError(null);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [document.name, isEditing]);

  const save = (closeOnInvalid: boolean) => {
    const result = onRename(document.id, draft);
    if (result.valid) {
      setDraft(result.name);
      setError(null);
      onStopEditing();
      return;
    }
    if (closeOnInvalid) {
      setDraft(document.name);
      setError(null);
      onStopEditing();
      return;
    }
    setError(result.error);
  };

  if (isEditing) {
    return (
      <span
        className={`min-w-0 ${
          variant === "sidebar" ? "flex-grow" : "inline-flex flex-col"
        }`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={200}
          dir="auto"
          aria-label={`Rename ${document.name}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `document-name-error-${document.id}-${variant}` : undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              save(false);
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelledRef.current = true;
              setDraft(document.name);
              setError(null);
              onStopEditing();
            }
          }}
          onBlur={() => {
            if (cancelledRef.current) return;
            save(true);
          }}
          className={`min-w-0 rounded-lg border border-blue-bright/50 bg-[#080a0f] text-primary-text font-bold outline-none ring-2 ring-blue-bright/15 ${
            variant === "sidebar"
              ? "w-full px-2 py-1 text-[11.5px]"
              : "w-full max-w-[min(60vw,520px)] px-2.5 py-1 text-[14px] sm:text-[15px]"
          }`}
        />
        {error && (
          <span
            id={`document-name-error-${document.id}-${variant}`}
            role="alert"
            className="mt-1 text-[10px] font-semibold normal-case tracking-normal text-red-400"
          >
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="group/name inline-flex min-w-0 items-center gap-1.5">
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStartEditing();
        }}
        title={document.name}
        aria-label={`Rename ${document.name}`}
        className={`min-w-0 truncate text-left font-extrabold text-primary-text hover:text-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright ${
          variant === "sidebar"
            ? "text-[11.5px]"
            : "text-[14px] sm:text-[15px] tracking-tight"
        }`}
      >
        {document.name}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onStartEditing();
        }}
        title={`Rename ${document.name}`}
        aria-label={`Rename ${document.name}`}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-text opacity-70 transition-colors hover:bg-white/5 hover:text-blue-bright focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright lg:opacity-0 lg:group-hover/name:opacity-100 lg:group-focus-within/name:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
};
