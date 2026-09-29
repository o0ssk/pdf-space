import React, { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { validateProjectName } from "../../lib/projects/projectManagement";

type RenameProjectDialogProps = {
  isOpen: boolean;
  currentName: string;
  busy: boolean;
  onCancel: () => void;
  onRename: (name: string) => void;
};

export const RenameProjectDialog: React.FC<RenameProjectDialogProps> = ({
  isOpen,
  currentName,
  busy,
  onCancel,
  onRename,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(currentName);
  const nameValidation = validateProjectName(name);
  const validation =
    nameValidation.valid === false ? nameValidation.error : "";

  useEffect(() => {
    if (!isOpen) return;
    setName(currentName);
    window.setTimeout(() => inputRef.current?.select(), 0);
  }, [currentName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [busy, isOpen, onCancel]);

  if (!isOpen) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validation || busy) return;
    onRename(nameValidation.valid ? nameValidation.name : name);
  };

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <form
        ref={containerRef as React.RefObject<HTMLFormElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-project-title"
        onSubmit={submit}
        className="command-surface w-full max-w-md overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-blue-bright/20 bg-blue-accent/10 text-blue-bright">
              <Pencil className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="rename-project-title" className="text-[14px] font-extrabold">
                Rename project
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-text">
                Project names are local labels and do not need to be unique.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close rename dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text hover:bg-white/10 hover:text-primary-text disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="p-5">
          <label htmlFor="project-name" className="text-[11px] font-extrabold text-secondary-text">
            Project name
          </label>
          <input
            ref={inputRef}
            id="project-name"
            value={name}
            maxLength={101}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(validation)}
            aria-describedby="project-name-help"
            className="mt-2 min-h-11 w-full rounded-xl border border-border-main bg-main-bg px-3 text-sm text-primary-text outline-none placeholder:text-muted-text focus:border-blue-bright/60 focus:ring-2 focus:ring-blue-bright/20"
          />
          <p
            id="project-name-help"
            role={validation ? "alert" : undefined}
            className={`mt-2 text-[10.5px] ${
              validation ? "text-red-300" : "text-muted-text"
            }`}
          >
            {validation || `${name.trim().length} of 100 characters`}
          </p>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-white/5 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-[12px] font-extrabold text-secondary-text hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={Boolean(validation) || busy}
            aria-busy={busy}
            className="min-h-11 rounded-xl bg-blue-accent px-4 text-[12px] font-extrabold text-white hover:bg-blue-bright disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            {busy ? "Renaming…" : "Rename"}
          </button>
        </footer>
      </form>
    </div>
  );
};

type DeleteProjectDialogProps = {
  isOpen: boolean;
  projectName: string;
  busy: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  isOpen,
  projectName,
  busy,
  onCancel,
  onDelete,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [busy, isOpen, onCancel]);
  if (!isOpen) return null;

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
      <section
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        aria-describedby="delete-project-description"
        tabIndex={-1}
        className="command-surface w-full max-w-md overflow-hidden border-red-500/20"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="delete-project-title" className="text-[14px] font-extrabold">
                Delete local project?
              </h2>
              <p id="delete-project-description" className="mt-1.5 text-[11.5px] leading-relaxed text-muted-text">
                “{projectName}” and its locally stored PDF sources will be
                removed from this browser.
                <br />
                <span className="font-bold text-red-300">
                  This action cannot be undone.
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close delete project dialog"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text hover:bg-white/10 hover:text-primary-text disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <footer className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-[12px] font-extrabold text-secondary-text hover:bg-white/10 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            aria-busy={busy}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[12px] font-extrabold text-white hover:bg-red-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {busy ? "Deleting…" : "Delete Project"}
          </button>
        </footer>
      </section>
    </div>
  );
};
