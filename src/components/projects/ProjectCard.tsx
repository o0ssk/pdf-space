import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Copy,
  Database,
  FileStack,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { LocalProjectListItem } from "../../lib/persistence/persistenceTypes";
import {
  formatBytes,
  formatProjectModifiedDate,
} from "../../lib/projects/projectManagement";
import { SpatialMark, StatusBadge } from "../ui/StudioPrimitives";

type ProjectCardProps = {
  project: LocalProjectListItem;
  indicator?: "Current" | "Last opened" | undefined;
  busyAction?: "duplicate" | "delete" | "rename" | undefined;
  highlighted?: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRetry: () => void;
};

const STATUS_COPY = {
  "missing-source": {
    label: "Missing PDF source",
    description: "One or more locally stored PDF sources are unavailable.",
  },
  damaged: {
    label: "Project unavailable",
    description: "This local project record could not be read safely.",
  },
  "unsupported-version": {
    label: "Newer project version",
    description:
      "This project was created by a newer version of PDF Space and cannot be opened safely here.",
  },
  recovered: {
    label: "Recovered revision available",
    description: "A verified earlier local revision can be opened safely.",
  },
  "needs-attention": {
    label: "Project needs attention",
    description: "This project needs a local integrity check.",
  },
} as const;

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  indicator,
  busyAction,
  highlighted = false,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onRetry,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isReadyOrRecoverable =
    project.status === "ready" ||
    project.status === "missing-source" ||
    project.status === "recovered";
  const statusCopy =
    project.status === "ready" ? null : STATUS_COPY[project.status];

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const modifiedLabel = formatProjectModifiedDate(project.updatedAt);
  const absoluteDate =
    project.updatedAt === null
      ? "Modified date unavailable"
      : Number.isFinite(new Date(project.updatedAt).getTime())
        ? new Intl.DateTimeFormat(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(project.updatedAt))
        : "Modified date unavailable";

  return (
    <article
      aria-label={`${project.name}, ${project.documentCount} ${
        project.documentCount === 1 ? "document" : "documents"
      }, ${project.totalPageCount} ${
        project.totalPageCount === 1 ? "page" : "pages"
      }, ${modifiedLabel.toLocaleLowerCase()}.`}
      className={`studio-surface studio-surface-raised group relative min-h-[310px] min-w-0 overflow-visible p-5 transition-[border-color,background-color,transform] duration-200 active:scale-[0.995] ${
        highlighted
          ? "border-blue-bright/70 bg-blue-accent/[0.08]"
          : project.status === "ready" || project.status === "recovered"
            ? "border-border-main hover:border-border-strong"
            : "border-amber-400/25"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <SpatialMark />

        <div className="flex items-center gap-2">
          {indicator && (
            <StatusBadge tone="active">
              {indicator}
            </StatusBadge>
          )}
          <div ref={menuRef} className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-label={`Project actions for ${project.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={Boolean(busyAction)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-muted-text transition-colors enabled:hover:bg-white/10 enabled:hover:text-primary-text disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="command-surface absolute right-0 top-12 z-30 w-44 p-1.5"
              >
                {(project.status === "ready" || project.status === "recovered") && (
                  <>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onRename();
                      }}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[11.5px] font-bold text-secondary-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Rename
                    </button>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDuplicate();
                      }}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[11.5px] font-bold text-secondary-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Duplicate
                    </button>
                  </>
                )}
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[11.5px] font-bold text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {project.status === "ready" || project.status === "recovered"
                    ? "Delete"
                    : "Delete local record"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <h2
          className="truncate text-xl font-semibold tracking-[-0.035em] text-primary-text"
          title={project.name}
        >
          {project.name}
        </h2>
        <p
          className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-text"
          title={absoluteDate}
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {modifiedLabel}
        </p>
      </div>

      {statusCopy && (
        <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {statusCopy.label}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-text">
            {project.statusMessage ?? statusCopy.description}
          </p>
        </div>
      )}
      {isReadyOrRecoverable && (
        <div className="mt-5 grid grid-cols-2 border-y studio-divider py-4">
          <div className="border-r border-border-main pr-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-text">
              <FileStack className="h-3.5 w-3.5" aria-hidden="true" />
              Contents
            </p>
            <p className="studio-number mt-1.5 text-sm font-semibold text-secondary-text">
              {project.documentCount}{" "}
              {project.documentCount === 1 ? "document" : "documents"} ·{" "}
              {project.totalPageCount}{" "}
              {project.totalPageCount === 1 ? "page" : "pages"}
            </p>
          </div>
          <div className="pl-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-muted-text">
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              Local size
            </p>
            <p className="studio-number mt-1.5 text-sm font-semibold text-secondary-text">
              {formatBytes(project.approximateSourceBytes)} ·{" "}
              {project.sourceCount}{" "}
              {project.sourceCount === 1 ? "source" : "sources"}
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        {isReadyOrRecoverable ? (
          <button
            type="button"
            onClick={onOpen}
            disabled={Boolean(busyAction)}
            className="studio-interactive min-h-11 rounded-[11px] bg-blue-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-bright disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            Open
          </button>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[11.5px] font-extrabold text-secondary-text hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        )}
        {busyAction === "duplicate" && (
          <span role="status" className="text-[10.5px] font-bold text-blue-bright">
            Duplicating locally…
          </span>
        )}
        {busyAction === "delete" && (
          <span role="status" className="text-[10.5px] font-bold text-red-300">
            Deleting…
          </span>
        )}
      </div>
    </article>
  );
};
