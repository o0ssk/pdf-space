import React from "react";
import { AlertTriangle } from "lucide-react";

export const UnsupportedBrowserState: React.FC<{ missing: readonly string[] }> = ({ missing }) => (
  <main className="flex min-h-dvh items-center justify-center bg-main-bg p-6 text-primary-text">
    <section role="alert" className="w-full max-w-lg rounded-2xl border border-amber-300/20 bg-panel-bg p-6 text-center shadow-dialog sm:p-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-balance text-xl font-extrabold">PDF Space cannot run fully in this browser</h1>
      <p className="mt-3 text-pretty text-[12px] leading-relaxed text-secondary-text">
        Local project storage or required PDF processing features are unavailable. Try a current version of a modern browser.
      </p>
      {missing.length > 0 && (
        <p className="mt-4 text-[10.5px] text-muted-text">Unavailable: {missing.join(", ")}.</p>
      )}
    </section>
  </main>
);

