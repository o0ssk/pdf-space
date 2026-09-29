import React from "react";
import { FilePlus2, ShieldCheck } from "lucide-react";

type EmptyWorkspaceProps = {
  onAddPDFs: () => void;
};

export const EmptyWorkspaceState: React.FC<EmptyWorkspaceProps> = ({ onAddPDFs }) => (
  <section
    aria-labelledby="empty-workspace-title"
    className="studio-surface studio-surface-raised relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center overflow-hidden p-8 text-center sm:p-12"
  >
    <span className="spatial-mark flex size-12 items-center justify-center">
      <FilePlus2 className="size-5" aria-hidden="true" />
    </span>
    <h1 id="empty-workspace-title" className="mt-6 text-balance text-2xl font-semibold tracking-[-0.04em] text-primary-text sm:text-3xl">
      Bring the first source into the space.
    </h1>
    <p className="mt-2 max-w-md text-pretty text-[12.5px] leading-relaxed text-secondary-text">
      Add one or more PDF files to begin organizing pages.
    </p>
    <button
      type="button"
      onClick={onAddPDFs}
      className="studio-interactive mt-6 flex min-h-11 items-center justify-center gap-2 rounded-[11px] bg-blue-accent px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(49,95,236,0.22)] hover:bg-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
    >
      <FilePlus2 className="size-4" aria-hidden="true" />
      Add PDF Files
    </button>
    <p className="mt-4 text-pretty text-xs leading-5 text-muted-text">
      You can add more files later, or drop PDF files anywhere in the workspace.
    </p>
    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-muted-text">
      <ShieldCheck className="size-3.5 text-blue-bright" aria-hidden="true" />
      Files are processed locally and are not uploaded by PDF Space.
    </p>
  </section>
);
