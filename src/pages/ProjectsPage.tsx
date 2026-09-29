import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Database,
  FilePlus2,
  FolderOpen,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProjectCard } from "../components/projects/ProjectCard";
import {
  DeleteProjectDialog,
  RenameProjectDialog,
} from "../components/projects/ProjectDialogs";
import { useToast } from "../components/ui/Toast";
import {
  createLocalProject,
  deleteLocalProject,
  duplicateLocalProject,
  getLastOpenedProjectId,
  getLocalStorageSummary,
  listLocalProjects,
  readLocalProjectListItem,
  renameLocalProject,
  setLastOpenedProjectId,
} from "../lib/persistence/pdfSpaceDatabase";
import {
  LocalProjectEvent,
  subscribeToLocalProjectEvents,
} from "../lib/persistence/projectEvents";
import { LocalProjectListItem } from "../lib/persistence/persistenceTypes";
import {
  formatBytes,
  formatProjectCount,
  ProjectSortOption,
  searchProjects,
  sortProjects,
} from "../lib/projects/projectManagement";
import { useOnboardingState } from "../hooks/useOnboardingState";
import { SpatialMark } from "../components/ui/StudioPrimitives";
import { motionDurations, motionEasings } from "../lib/motion/motionSystem";

type BrowserStorageEstimate = {
  usage: number | null;
  quota: number | null;
};

type LocalStorageSummary = {
  projectCount: number;
  sourceFileCount: number;
  recoveryRevisionCount: number;
  estimatedSourceBytes: number;
  missingSourceCount: number;
};

const SORT_OPTIONS: Array<{ value: ProjectSortOption; label: string }> = [
  { value: "updated-desc", label: "Last modified — newest first" },
  { value: "updated-asc", label: "Last modified — oldest first" },
  { value: "name-asc", label: "Name — A to Z" },
  { value: "name-desc", label: "Name — Z to A" },
  { value: "size-desc", label: "Largest project" },
  { value: "size-asc", label: "Smallest project" },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { onboardingState, updateOnboarding } = useOnboardingState();
  const reduceMotion = useReducedMotion();
  const currentProjectId =
    (location.state as { currentProjectId?: string } | null)
      ?.currentProjectId ?? null;
  const [projects, setProjects] = useState<LocalProjectListItem[]>([]);
  const [lastOpenedProjectId, setLastOpenedProjectIdState] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortOption, setSortOption] =
    useState<ProjectSortOption>("updated-desc");
  const [creating, setCreating] = useState(false);
  const [busyProject, setBusyProject] = useState<{
    id: string;
    action: "duplicate" | "delete" | "rename";
  } | null>(null);
  const [renameTarget, setRenameTarget] =
    useState<LocalProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LocalProjectListItem | null>(null);
  const [highlightedProjectId, setHighlightedProjectId] =
    useState<string | null>(null);
  const [browserStorage, setBrowserStorage] =
    useState<BrowserStorageEstimate>({ usage: null, quota: null });
  const [localStorageSummary, setLocalStorageSummary] =
    useState<LocalStorageSummary>({
      projectCount: 0,
      sourceFileCount: 0,
      recoveryRevisionCount: 0,
      estimatedSourceBytes: 0,
      missingSourceCount: 0,
    });
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const loadProjects = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
      setProjects([]);
    }
    try {
      const [loadedProjects, lastOpened, storageSummary] = await Promise.all([
        listLocalProjects((project) => {
          setProjects((current) => [
            ...current.filter((item) => item.id !== project.id),
            project,
          ]);
          setLoading(false);
        }),
        getLastOpenedProjectId(),
        getLocalStorageSummary(),
      ]);
      setProjects(loadedProjects);
      setLastOpenedProjectIdState(lastOpened);
      setLocalStorageSummary(storageSummary);
      setLoadError(null);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Unable to load local projects:", error);
      setLoadError(
        "PDF Space could not read the local project library in this browser."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects(true);
    if (navigator.storage?.estimate) {
      void navigator.storage
        .estimate()
        .then((estimate) =>
          setBrowserStorage({
            usage:
              typeof estimate.usage === "number" ? estimate.usage : null,
            quota:
              typeof estimate.quota === "number" ? estimate.quota : null,
          })
        )
        .catch(() => undefined);
    }
  }, [loadProjects]);

  useEffect(() => {
    const refresh = () => void loadProjects();
    const refreshAffectedProject = async (event: LocalProjectEvent) => {
      if (event.type === "project-deleted") {
        setProjects((current) => current.filter((project) => project.id !== event.projectId));
      } else {
        const project = await readLocalProjectListItem(event.projectId);
        setProjects((current) => {
          const withoutCurrent = current.filter((item) => item.id !== event.projectId);
          return project ? [...withoutCurrent, project] : withoutCurrent;
        });
      }
      setLocalStorageSummary(await getLocalStorageSummary());
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    const unsubscribe = subscribeToLocalProjectEvents((event) => {
      void refreshAffectedProject(event).catch(() => refresh());
    });
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubscribe();
    };
  }, [loadProjects]);

  const visibleProjects = useMemo(
    () => sortProjects(searchProjects(projects, query), sortOption),
    [projects, query, sortOption]
  );
  const knownProjectBytes = localStorageSummary.estimatedSourceBytes;

  const createWorkspace = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    const projectId = `project-${crypto.randomUUID()}`;
    try {
      await createLocalProject({ projectId });
      updateOnboarding({ hasSeenProjectsIntroduction: true });
      void navigate(`/workspace/${projectId}`);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Unable to create workspace:", error);
      showToast(
        "Unable to create workspace",
        "PDF Space could not create this project in local browser storage.",
        "warning"
      );
      setCreating(false);
    }
  }, [creating, navigate, showToast, updateOnboarding]);

  const openProject = useCallback(
    async (project: LocalProjectListItem) => {
      try {
        await setLastOpenedProjectId(project.id);
        void navigate(`/workspace/${project.id}`);
      } catch (error) {
        if (import.meta.env.DEV) console.error("Unable to open local project:", error);
        showToast(
          "Unable to open project",
          "PDF Space could not update the local project state.",
          "warning"
        );
      }
    },
    [navigate, showToast]
  );

  const renameProject = useCallback(
    async (name: string) => {
      if (!renameTarget) return;
      setBusyProject({ id: renameTarget.id, action: "rename" });
      try {
        await renameLocalProject(renameTarget.id, name);
        setRenameTarget(null);
        await loadProjects();
        showToast(
          "Project renamed",
          "The local project name was updated.",
          "success"
        );
      } catch (error) {
        if (import.meta.env.DEV) console.error("Unable to rename project:", error);
        showToast(
          "Unable to rename project",
          "PDF Space could not update this local project name.",
          "warning"
        );
      } finally {
        setBusyProject(null);
      }
    },
    [loadProjects, renameTarget, showToast]
  );

  const duplicateProject = useCallback(
    async (project: LocalProjectListItem) => {
      if (busyProject) return;
      setBusyProject({ id: project.id, action: "duplicate" });
      try {
        const duplicated = await duplicateLocalProject(project.id);
        await loadProjects();
        setHighlightedProjectId(duplicated.id);
        window.setTimeout(() => setHighlightedProjectId(null), 2500);
        showToast(
          "Project duplicated",
          "A complete independent local copy is now available.",
          "success"
        );
      } catch (error) {
        if (import.meta.env.DEV) console.error("Unable to duplicate project:", error);
        showToast(
          "Unable to duplicate project",
          "PDF Space could not create a complete local copy of this project.",
          "warning"
        );
      } finally {
        setBusyProject(null);
      }
    },
    [busyProject, loadProjects, showToast]
  );

  const deleteProject = useCallback(async () => {
    if (!deleteTarget) return;
    setBusyProject({ id: deleteTarget.id, action: "delete" });
    try {
      await deleteLocalProject(deleteTarget.id);
      setDeleteTarget(null);
      await loadProjects();
      showToast(
        "Local project deleted",
        "The project and its owned PDF sources were removed from this browser.",
        "info"
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error("Unable to delete local project:", error);
      showToast(
        "Unable to delete project",
        "The project remains in local storage. Try again.",
        "warning"
      );
    } finally {
      setBusyProject(null);
    }
  }, [deleteTarget, loadProjects, showToast]);

  const countLabel = formatProjectCount(
    visibleProjects.length,
    projects.length,
    Boolean(query.trim())
  );

  return (
    <div className="spatial-field min-h-dvh text-primary-text">
      <a href="#projects-main" className="sr-only z-[120] rounded-md bg-blue-accent px-4 py-3 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to projects</a>
      <header className="sticky top-0 z-40 border-b studio-divider bg-main-bg/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              aria-label="Return to landing page"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3">
              <SpatialMark compact />
              <div>
                <p className="text-sm font-semibold tracking-[-0.025em]">PDF Space</p>
                <p className="text-[11px] text-muted-text">
                  Project library
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void createWorkspace()}
            disabled={creating}
            aria-busy={creating}
            className="studio-interactive flex min-h-11 items-center gap-2 rounded-[11px] bg-blue-accent px-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(49,95,236,0.24)] hover:bg-blue-bright disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            )}
            <span>New Workspace</span>
          </button>
        </div>
      </header>

      <motion.main id="projects-main" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: motionDurations.deliberate, ease: motionEasings.enter }} className="mx-auto w-full max-w-[1480px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="studio-eyebrow mb-4">Local document archive</p>
              <h1 className="text-4xl font-[650] tracking-[-0.055em] sm:text-6xl">
                Projects, held in this browser.
              </h1>
              <p className="mt-3 text-sm leading-6 text-secondary-text">
                {countLabel}. Your PDFs and project data stay in this browser.
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,auto)] lg:w-auto">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-text" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects"
                  aria-label="Search projects by name"
                className="min-h-11 w-full rounded-[11px] border border-border-main bg-panel-bg pl-10 pr-10 text-sm text-primary-text outline-none placeholder:text-muted-text focus:border-blue-bright/60 focus:ring-2 focus:ring-blue-bright/20 lg:w-72"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear project search"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <select
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as ProjectSortOption)
                }
                aria-label="Sort projects"
                className="min-h-11 rounded-xl border border-border-main bg-panel-bg px-3 text-sm font-bold text-secondary-text outline-none focus:border-blue-bright/60 focus:ring-2 focus:ring-blue-bright/20"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {projects.length > 0 && !onboardingState.hasSeenProjectsIntroduction && (
            <aside className="flex flex-col gap-3 rounded-2xl border border-blue-bright/20 bg-blue-accent/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-primary-text">Create a workspace for each PDF project</p>
                <p className="mt-1 text-pretty text-sm text-muted-text">Use New Workspace to organize a new set of PDFs. Existing projects remain unchanged.</p>
              </div>
              <button
                type="button"
                onClick={() => updateOnboarding({ hasSeenProjectsIntroduction: true })}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border-main bg-panel-elevated px-4 text-sm font-extrabold text-secondary-text hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                <Check className="size-4" aria-hidden="true" />
                Got it
              </button>
            </aside>
          )}

          <aside className="grid gap-6 border-y studio-divider py-7 sm:grid-cols-2 lg:grid-cols-[0.8fr_1fr_1.35fr]">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold text-muted-text">
                <Database className="h-4 w-4 text-blue-bright" aria-hidden="true" />
                PDF Space projects
              </p>
              <p className="studio-number mt-2 text-xl font-semibold text-primary-text">
                Approximately {formatBytes(knownProjectBytes)}
              </p>
              <p className="mt-1 text-xs text-muted-text">
                {localStorageSummary.sourceFileCount} source files · {localStorageSummary.recoveryRevisionCount} recovery revisions
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-text">
                Browser storage estimate
              </p>
              <p className="mt-2 text-sm font-bold text-secondary-text">
                {browserStorage.usage !== null && browserStorage.quota !== null
                  ? `${formatBytes(browserStorage.usage)} used of an estimated ${formatBytes(browserStorage.quota)}`
                  : "Storage estimate unavailable in this browser."}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-text sm:col-span-2 lg:col-span-1">
              Local projects are stored in this browser. Delete projects you no
              longer need to free space. Clearing browser storage may remove
              local projects. The browser estimate may include other site data.
            </p>
          </aside>
        </section>

        <section aria-label="Local projects" className="mt-7">
          {loading ? (
            <div role="status" className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-border-main bg-panel-bg/55 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-bright motion-reduce:animate-none" aria-hidden="true" />
              <p className="mt-4 text-[13px] font-extrabold">
                Loading local projects…
              </p>
            </div>
          ) : loadError ? (
            <div role="alert" className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6 text-center">
              <p className="text-[15px] font-extrabold">Unable to load projects</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-text">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => void loadProjects(true)}
                className="mt-5 min-h-11 rounded-xl bg-blue-accent px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Retry
              </button>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-panel-bg/45 p-6 text-center sm:p-8">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-bright/20 bg-blue-accent/10 text-blue-bright">
                <FolderOpen className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-extrabold">
                Your PDF workspaces
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-text">
                Organize PDF files, move pages between documents, and export
                clean PDFs — all inside your browser.
              </p>
              <button
                type="button"
                onClick={() => void createWorkspace()}
                disabled={creating}
                className="mt-5 min-h-11 rounded-xl bg-blue-accent px-5 text-sm font-extrabold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                {creating ? "Creating workspace…" : "New Workspace"}
              </button>
              <p className="mt-4 text-pretty text-xs leading-5 text-muted-text">
                Your files are processed locally and are not uploaded by PDF Space.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowHowItWorks((visible) => !visible);
                  updateOnboarding({ hasSeenProjectsIntroduction: true });
                }}
                aria-expanded={showHowItWorks}
                className="mt-3 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-blue-bright hover:bg-blue-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                <BookOpen className="size-4" aria-hidden="true" />
                How PDF Space works
              </button>
              {showHowItWorks && (
                <ol className="mt-3 grid w-full max-w-2xl gap-2 text-left sm:grid-cols-3">
                  {["Add your PDFs", "Organize documents and pages", "Export standard PDFs"].map((step, index) => (
                    <li key={step} className="rounded-xl border border-border-main bg-panel-elevated p-3 text-sm font-bold text-secondary-text">
                      <span className="mr-2 text-blue-bright">{index + 1}.</span>{step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-border-main bg-panel-bg/45 p-6 text-center">
              <h2 className="text-lg font-extrabold">
                No matching projects
              </h2>
              <p className="mt-2 text-sm text-muted-text">
                Try a different project name.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-5 min-h-11 rounded-xl border border-border-main bg-panel-elevated px-4 text-sm font-extrabold text-secondary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
              {visibleProjects.map((project) => (
                <div key={project.id} className="min-w-0 xl:col-span-6 [&:nth-child(3n)]:xl:col-span-5 [&:nth-child(4n)]:xl:col-span-7">
                <ProjectCard
                  project={project}
                  indicator={
                    project.id === currentProjectId
                      ? "Current"
                      : project.id === lastOpenedProjectId
                        ? "Last opened"
                        : undefined
                  }
                  busyAction={
                    busyProject?.id === project.id
                      ? busyProject.action
                      : undefined
                  }
                  highlighted={highlightedProjectId === project.id}
                  onOpen={() => void openProject(project)}
                  onRename={() => setRenameTarget(project)}
                  onDuplicate={() => void duplicateProject(project)}
                  onDelete={() => setDeleteTarget(project)}
                  onRetry={() => void loadProjects(true)}
                />
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.main>

      <RenameProjectDialog
        isOpen={Boolean(renameTarget)}
        currentName={renameTarget?.name ?? ""}
        busy={busyProject?.action === "rename"}
        onCancel={() => setRenameTarget(null)}
        onRename={(name) => void renameProject(name)}
      />
      <DeleteProjectDialog
        isOpen={Boolean(deleteTarget)}
        projectName={deleteTarget?.name ?? ""}
        busy={busyProject?.action === "delete"}
        onCancel={() => setDeleteTarget(null)}
        onDelete={() => void deleteProject()}
      />
    </div>
  );
};
