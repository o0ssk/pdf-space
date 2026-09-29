import React from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw } from "lucide-react";
import { ProjectOpeningState as OpeningState } from "../../hooks/useProjectPersistence";

type ProjectOpeningStateProps = {
  state: OpeningState;
  onRetry: () => void;
  onNewWorkspace: () => void;
};

export const ProjectOpeningState: React.FC<ProjectOpeningStateProps> = ({
  state,
  onRetry,
  onNewWorkspace,
}) => {
  if (state.status === "ready") return null;

  return (
    <main className="min-h-screen bg-[#07080a] text-primary-text flex items-center justify-center p-6">
      <section
        role={state.status === "loading" ? "status" : "alert"}
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-border-main bg-panel-bg p-6 sm:p-8 shadow-2xl text-center"
      >
        <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-blue-accent/10 border border-blue-bright/20 flex items-center justify-center">
          {state.status === "loading" ? (
            <Loader2
              className="w-5 h-5 text-blue-bright animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
          )}
        </div>

        <h1 className="text-[17px] font-extrabold">
          {state.status === "loading" ? state.message : state.title}
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-secondary-text">
          {state.status === "loading"
            ? state.progress ?? "Preparing your local project."
            : state.description}
        </p>

        {state.status === "error" && (
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 px-4 rounded-xl bg-blue-accent text-white text-[12px] font-extrabold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={onNewWorkspace}
              className="min-h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-secondary-text text-[12px] font-extrabold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Start new workspace
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
