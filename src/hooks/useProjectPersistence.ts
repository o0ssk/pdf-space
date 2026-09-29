import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useToast } from "../components/ui/Toast";
import { originalSourceBlobRegistry } from "../lib/pdf/originalSourceBlobRegistry";
import {
  loadProjectWithRecovery,
  loadSourceFile,
  recommitRecoveredProject,
  renameLocalProject,
  saveProjectTransaction,
  setLastOpenedProjectId,
} from "../lib/persistence/pdfSpaceDatabase";
import {
  getPersistenceErrorCopy,
  normalizePersistenceError,
  PersistenceError,
} from "../lib/persistence/persistenceErrors";
import {
  initialPersistenceRevisionState,
  persistenceRevisionReducer,
} from "../lib/persistence/persistenceState";
import {
  PersistedSourceFile,
  PersistenceSaveStatus,
} from "../lib/persistence/persistenceTypes";
import {
  deserializeWorkspaceProject,
  getRequiredSourceDocumentIds,
  markUnavailableSources,
  serializeWorkspaceProject,
  validatePersistedWorkspaceProject,
} from "../lib/persistence/workspaceSerializer";
import { WorkspaceState } from "../lib/workspace/workspaceState";
import { subscribeToLocalProjectEvents } from "../lib/persistence/projectEvents";
import { PROJECT_SESSION_ID } from "../lib/persistence/projectEvents";
import { enqueueProjectWrite } from "../lib/persistence/projectWriteQueue";
import { remapDuplicatedProject } from "../lib/projects/projectManagement";

const AUTOSAVE_DELAY_MS = 800;

export type ProjectOpeningState =
  | { status: "loading"; message: string; progress?: string }
  | { status: "ready" }
  | { status: "error"; title: string; description: string };

export type ProjectRecoveryInfo = {
  recoveredRevision: number;
  invalidHeadRevision: number | null;
  reason: string;
  savedAt: string;
  validFallbackCount: number;
  missingSourceCount: number;
};

export type MissingSourceNotice = {
  name: string;
  affectedPageCount: number;
  affectedDocumentCount: number;
};

type UseProjectPersistenceOptions = {
  projectId: string;
  projectName: string;
  isNewProject: boolean;
  workspace: WorkspaceState;
  logicalRevision: number;
  restoreWorkspace: (workspace: WorkspaceState) => void;
  onProjectNameRestored?: (name: string) => void;
};

export function useProjectPersistence({
  projectId,
  projectName,
  isNewProject,
  workspace,
  logicalRevision,
  restoreWorkspace,
  onProjectNameRestored,
}: UseProjectPersistenceOptions) {
  const { showToast } = useToast();
  const [openingState, setOpeningState] = useState<ProjectOpeningState>({
    status: "loading",
    message: "Opening your workspace…",
  });
  const [revisionState, revisionDispatch] = useReducer(
    persistenceRevisionReducer,
    initialPersistenceRevisionState
  );
  const [retryToken, setRetryToken] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<ProjectRecoveryInfo | null>(null);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const [missingSources, setMissingSources] = useState<MissingSourceNotice[]>([]);
  const pendingSourceFilesRef = useRef(new Map<string, PersistedSourceFile>());
  const workspaceRef = useRef(workspace);
  const projectNameRef = useRef(projectName);
  const revisionRef = useRef(logicalRevision);
  const savedRevisionRef = useRef(0);
  const createdAtRef = useRef(Date.now());
  const initializedRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveLoopRef = useRef<Promise<boolean> | null>(null);
  const requestedRevisionRef = useRef(0);
  const forceSaveRef = useRef(false);
  const lastErrorToastRef = useRef<string | null>(null);
  const renamingRef = useRef(false);
  const sessionGenerationRef = useRef(0);
  const automaticRetryPausedRef = useRef(false);
  const persistedRevisionRef = useRef<number | null>(null);
  const recoveredProjectRef = useRef<ReturnType<typeof validatePersistedWorkspaceProject> | null>(null);

  workspaceRef.current = workspace;
  projectNameRef.current = projectName;
  revisionRef.current = logicalRevision;

  const registerSourceFile = useCallback((sourceFile: PersistedSourceFile) => {
    pendingSourceFilesRef.current.set(
      sourceFile.sourceDocumentId,
      sourceFile
    );
  }, []);

  const performSaveLoop = useCallback(async (): Promise<boolean> => {
    let allSucceeded = true;
    const sessionGeneration = sessionGenerationRef.current;

    while (
      initializedRef.current &&
      sessionGeneration === sessionGenerationRef.current
    ) {
      const attemptRevision = revisionRef.current;
      const pendingSourceFiles = [
        ...pendingSourceFilesRef.current.values(),
      ];
      const shouldSave =
        forceSaveRef.current ||
        attemptRevision > savedRevisionRef.current ||
        pendingSourceFiles.length > 0;
      if (!shouldSave) break;

      forceSaveRef.current = false;
      requestedRevisionRef.current = Math.max(
        requestedRevisionRef.current,
        attemptRevision
      );
      revisionDispatch({
        type: "SAVE_STARTED",
        revision: attemptRevision,
      });

      const savedAt = Date.now();
      const project = serializeWorkspaceProject({
        id: projectId,
        name: projectNameRef.current,
        createdAt: createdAtRef.current,
        updatedAt: savedAt,
        workspace: workspaceRef.current,
      });

      try {
        const commit = await enqueueProjectWrite(projectId, () =>
          saveProjectTransaction({
            project,
            sourceFiles: pendingSourceFiles,
            baseRevision: persistedRevisionRef.current,
          })
        );
        if (sessionGeneration !== sessionGenerationRef.current) return false;
        for (const sourceFile of pendingSourceFiles) {
          pendingSourceFilesRef.current.delete(
            sourceFile.sourceDocumentId
          );
        }
        savedRevisionRef.current = Math.max(
          savedRevisionRef.current,
          attemptRevision
        );
        persistedRevisionRef.current = commit.revision;
        setRecoveryInfo(null);
        recoveredProjectRef.current = null;
        setConflictRevision(null);
        revisionDispatch({
          type: "SAVE_SUCCEEDED",
          revision: attemptRevision,
          savedAt,
        });
        lastErrorToastRef.current = null;
      } catch (error) {
        allSucceeded = false;
        const persistenceError = normalizePersistenceError(error);
        if (
          persistenceError.kind === "quota" ||
          persistenceError.kind === "unavailable" ||
          persistenceError.kind === "conflict"
        ) {
          automaticRetryPausedRef.current = true;
        }
        revisionDispatch({
          type:
            persistenceError.kind === "unavailable"
              ? "UNAVAILABLE"
              : persistenceError.kind === "conflict"
                ? "CONFLICT"
              : "SAVE_FAILED",
          revision: attemptRevision,
          message: persistenceError.message,
        });
        const copy = getPersistenceErrorCopy(persistenceError);
        if (lastErrorToastRef.current !== copy.title) {
          showToast(copy.title, copy.description, "warning");
          lastErrorToastRef.current = copy.title;
        }
        break;
      }

      if (
        revisionRef.current <= savedRevisionRef.current &&
        pendingSourceFilesRef.current.size === 0 &&
        !forceSaveRef.current
      ) {
        break;
      }
    }

    return allSucceeded;
  }, [projectId, showToast]);

  const requestSave = useCallback(
    (force = false): Promise<boolean> => {
      if (automaticRetryPausedRef.current && !force) {
        return Promise.resolve(false);
      }
      if (force) automaticRetryPausedRef.current = false;
      requestedRevisionRef.current = Math.max(
        requestedRevisionRef.current,
        revisionRef.current
      );
      forceSaveRef.current = forceSaveRef.current || force;
      if (!saveLoopRef.current) {
        saveLoopRef.current = performSaveLoop().finally(() => {
          saveLoopRef.current = null;
          if (
            initializedRef.current &&
            !automaticRetryPausedRef.current &&
            (revisionRef.current > savedRevisionRef.current ||
              pendingSourceFilesRef.current.size > 0 ||
              forceSaveRef.current)
          ) {
            queueMicrotask(() => {
              void requestSave();
            });
          }
        });
      }
      return saveLoopRef.current;
    },
    [performSaveLoop]
  );

  const saveNow = useCallback(async () => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const succeeded = await requestSave(true);
    if (succeeded) {
      showToast(
        "Project saved locally",
        "The latest project state is stored in this browser.",
        "success"
      );
    }
    return succeeded;
  }, [requestSave, showToast]);

  const renameProject = useCallback(
    async (name: string): Promise<boolean> => {
      if (renamingRef.current) return false;
      renamingRef.current = true;
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      setIsRenaming(true);
      const revision = revisionRef.current;
      revisionDispatch({ type: "DIRTY", revision });
      try {
        const pendingSaveSucceeded = await requestSave();
        if (!pendingSaveSucceeded) {
          showToast(
            "Unable to rename project",
            "PDF Space could not save the new project name locally. Try again.",
            "warning"
          );
          return false;
        }
        revisionDispatch({ type: "SAVE_STARTED", revision });
        const renamedProject = await renameLocalProject(projectId, name);
        const renamedLoad = await loadProjectWithRecovery(projectId);
        if (renamedLoad.status === "healthy") {
          persistedRevisionRef.current = renamedLoad.revision;
        }
        projectNameRef.current = renamedProject.name;
        onProjectNameRestored?.(renamedProject.name);
        revisionDispatch({
          type: "SAVE_SUCCEEDED",
          revision,
          savedAt: renamedProject.updatedAt,
        });
        lastErrorToastRef.current = null;
        return true;
      } catch (error) {
        const persistenceError = normalizePersistenceError(error);
        revisionDispatch({
          type: "SAVE_FAILED",
          revision,
          message: persistenceError.message,
        });
        showToast(
          "Unable to rename project",
          "PDF Space could not save the new project name locally. Try again.",
          "warning"
        );
        return false;
      } finally {
        renamingRef.current = false;
        setIsRenaming(false);
      }
    },
    [
      onProjectNameRestored,
      projectId,
      requestSave,
      showToast,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    const sessionGeneration = ++sessionGenerationRef.current;
    initializedRef.current = false;
    setOpeningState({
      status: "loading",
      message: "Opening your workspace…",
    });
    automaticRetryPausedRef.current = false;
    setMissingSources([]);

    const initialize = async () => {
      try {
        if (isNewProject) {
          createdAtRef.current = Date.now();
          const project = serializeWorkspaceProject({
            id: projectId,
            name: projectNameRef.current,
            createdAt: createdAtRef.current,
            updatedAt: createdAtRef.current,
            workspace: workspaceRef.current,
          });
          const commit = await enqueueProjectWrite(projectId, () =>
            saveProjectTransaction({
              project,
              sourceFiles: [],
              baseRevision: persistedRevisionRef.current,
            })
          );
          if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
          initializedRef.current = true;
          persistedRevisionRef.current = commit.revision;
          savedRevisionRef.current = revisionRef.current;
          revisionDispatch({
            type: "RESTORED",
            revision: revisionRef.current,
            savedAt: project.updatedAt,
          });
          setOpeningState({ status: "ready" });
          return;
        }

        const loadResult = await loadProjectWithRecovery(projectId);
        if (loadResult.status === "unrecoverable") {
          throw new PersistenceError(
            "corrupt",
            "PDF Space could not find a valid local revision for this project."
          );
        }
        const persistedProject = validatePersistedWorkspaceProject(loadResult.project);
        setMissingSources(
          loadResult.sourceHealth.missingDependencies.map((dependency) => ({
            name: dependency.sourceName ?? "Original PDF",
            affectedPageCount: dependency.affectedPageCount,
            affectedDocumentCount: dependency.affectedDocumentIds.length,
          }))
        );
        persistedRevisionRef.current =
          loadResult.status === "healthy"
            ? loadResult.revision
            : loadResult.invalidHeadRevision ?? null;
        if (loadResult.status === "recovered") {
          recoveredProjectRef.current = persistedProject;
          setRecoveryInfo({
            recoveredRevision: loadResult.recoveredRevision,
            invalidHeadRevision: loadResult.invalidHeadRevision ?? null,
            reason: loadResult.reason,
            savedAt: loadResult.envelope.savedAt,
            validFallbackCount: loadResult.validFallbackCount,
            missingSourceCount: loadResult.sourceHealth.missingDependencies.length,
          });
        } else {
          recoveredProjectRef.current = null;
          setRecoveryInfo(null);
        }
        onProjectNameRestored?.(persistedProject.name);
        await setLastOpenedProjectId(projectId);
        createdAtRef.current = persistedProject.createdAt;
        const { workspace: restoredWorkspace } =
          deserializeWorkspaceProject(persistedProject);
        const sourceIds = getRequiredSourceDocumentIds(persistedProject);
        const unavailableSourceIds = new Set<string>();

        for (let index = 0; index < sourceIds.length; index++) {
          if (cancelled) return;
          const sourceId = sourceIds[index];
          if (!sourceId) continue;
          const sourceMetadata = persistedProject.sourceDocuments[sourceId];
          setOpeningState({
            status: "loading",
            message: "Opening your workspace…",
            progress: `Loading PDF sources ${index + 1} of ${
              sourceIds.length
            }`,
          });

          try {
            if (!sourceMetadata) {
              throw new PersistenceError(
                "source-unavailable",
                `Missing PDF metadata for source ${sourceId}.`
              );
            }
            const sourceFile = await loadSourceFile(sourceId);
            if (!sourceFile) {
              throw new PersistenceError(
                "source-unavailable",
                `Missing stored PDF source ${sourceId}.`
              );
            }
            originalSourceBlobRegistry.register(sourceId, sourceFile.blob);
            if (
              sourceFile.blob.size === 0 ||
              sourceFile.size !== sourceMetadata.size
            ) {
              throw new PersistenceError(
                "source-unavailable",
                `Stored PDF source ${sourceId} does not match its metadata.`
              );
            }
            const hasInvalidPageIndex = persistedProject.documents.some(
              (document) =>
                document.pages.some(
                  (page) =>
                    page.sourceDocumentId === sourceId &&
                    page.originalPageIndex >= sourceMetadata.originalPageCount
                )
            );
            if (hasInvalidPageIndex) {
              throw new PersistenceError(
                "source-unavailable",
                `Stored PDF source ${sourceId} has an invalid page reference.`
              );
            }
          } catch (sourceError) {
            if (import.meta.env.DEV) {
              console.error("Unable to restore a PDF source:", sourceError);
            }
            unavailableSourceIds.add(sourceId);
          }
        }

        if (cancelled || sessionGeneration !== sessionGenerationRef.current) return;
        restoreWorkspace(
          markUnavailableSources(restoredWorkspace, unavailableSourceIds)
        );
        initializedRef.current = true;
        savedRevisionRef.current = 0;
        revisionDispatch({
          type: "RESTORED",
          revision: 0,
          savedAt: persistedProject.updatedAt,
        });
        setOpeningState({ status: "ready" });
        if (unavailableSourceIds.size > 0) {
          showToast(
            "PDF source unavailable",
            "Some original PDF data could not be restored from local storage. Unaffected documents remain available.",
            "warning"
          );
        } else if (loadResult.status === "recovered") {
          showToast(
            "Project recovered",
            "PDF Space restored the latest valid local revision because the most recent save could not be verified.",
            "info"
          );
        } else {
          showToast(
            "Project restored",
            "Your locally saved workspace has been reopened.",
            "info"
          );
        }
      } catch (error) {
        const persistenceError = normalizePersistenceError(error);
        if (import.meta.env.DEV) {
          console.error("Unable to open persisted project:", persistenceError);
        }
        if (cancelled) return;

        if (isNewProject) {
          initializedRef.current = true;
          revisionDispatch({
            type:
              persistenceError.kind === "unavailable"
                ? "UNAVAILABLE"
                : "SAVE_FAILED",
            revision: revisionRef.current,
            message: persistenceError.message,
          });
          setOpeningState({ status: "ready" });
          const copy = getPersistenceErrorCopy(persistenceError);
          showToast(copy.title, copy.description, "warning");
          return;
        }

        setOpeningState({
          status: "error",
          title:
            persistenceError.kind === "newer-schema"
              ? "Project version unsupported"
              : persistenceError.kind === "not-found"
                ? "Local project not found"
                : "Unable to open project",
          description: persistenceError.message,
        });
      }
    };

    void initialize();
    return () => {
      cancelled = true;
      initializedRef.current = false;
      if (sessionGenerationRef.current === sessionGeneration) {
        sessionGenerationRef.current += 1;
      }
    };
  }, [
    isNewProject,
    projectId,
    onProjectNameRestored,
    restoreWorkspace,
    retryToken,
    showToast,
  ]);

  useEffect(
    () =>
      subscribeToLocalProjectEvents((event) => {
        if (
          event.type === "project-renamed" &&
          event.projectId === projectId
        ) {
          onProjectNameRestored?.(event.name);
        }
        if (
          event.type === "project-committed" &&
          event.projectId === projectId &&
          event.sessionId !== PROJECT_SESSION_ID &&
          persistedRevisionRef.current !== null &&
          event.revision > persistedRevisionRef.current
        ) {
          setConflictRevision(event.revision);
          revisionDispatch({
            type: "CONFLICT",
            revision: revisionRef.current,
            message: "A newer local revision was saved in another tab.",
          });
        }
      }),
    [onProjectNameRestored, projectId]
  );

  useEffect(() => {
    if (!initializedRef.current) return;
    if (logicalRevision <= savedRevisionRef.current) return;

    revisionDispatch({ type: "DIRTY", revision: logicalRevision });
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    if (automaticRetryPausedRef.current) return;
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      void requestSave();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [logicalRevision, requestSave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        revisionRef.current > savedRevisionRef.current
      ) {
        void requestSave();
      }
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (
        revisionRef.current <= savedRevisionRef.current &&
        revisionState.status !== "saving" &&
        revisionState.status !== "error" &&
        revisionState.status !== "unavailable"
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [requestSave, revisionState.status]);

  const retryOpening = useCallback(() => {
    setRetryToken((value) => value + 1);
  }, []);

  const keepRecoveredVersion = useCallback(async (): Promise<boolean> => {
    const project = recoveredProjectRef.current;
    if (!project || !recoveryInfo) return true;
    revisionDispatch({ type: "SAVE_STARTED", revision: revisionRef.current });
    try {
      const commit = await enqueueProjectWrite(projectId, () =>
        recommitRecoveredProject({
          project,
          invalidHeadRevision: recoveryInfo.invalidHeadRevision,
        })
      );
      persistedRevisionRef.current = commit.revision;
      savedRevisionRef.current = revisionRef.current;
      recoveredProjectRef.current = null;
      setRecoveryInfo(null);
      revisionDispatch({
        type: "SAVE_SUCCEEDED",
        revision: revisionRef.current,
        savedAt: commit.savedAt,
      });
      showToast("Recovered version kept", "This verified revision is now the current local project.", "success");
      return true;
    } catch (error) {
      const persistenceError = normalizePersistenceError(error);
      revisionDispatch({
        type: persistenceError.kind === "conflict" ? "CONFLICT" : "SAVE_FAILED",
        revision: revisionRef.current,
        message: persistenceError.message,
      });
      return false;
    }
  }, [projectId, recoveryInfo, showToast]);

  const reloadLatestVersion = useCallback(() => {
    setConflictRevision(null);
    setRetryToken((value) => value + 1);
  }, []);

  const duplicateEditingCopy = useCallback(async (): Promise<string | null> => {
    const timestamp = Date.now();
    const sourceProject = serializeWorkspaceProject({
      id: projectId,
      name: projectNameRef.current,
      createdAt: createdAtRef.current,
      updatedAt: timestamp,
      workspace: workspaceRef.current,
    });
    try {
      const sourceFiles = (
        await Promise.all(
          getRequiredSourceDocumentIds(sourceProject).map((sourceId) =>
            loadSourceFile(sourceId)
          )
        )
      ).filter((source): source is PersistedSourceFile => source !== null);
      const newProjectId = `project-${crypto.randomUUID()}`;
      const duplicated = remapDuplicatedProject({
        sourceProject,
        availableSourceIds: sourceFiles.map((source) => source.sourceDocumentId),
        newProjectId,
        newProjectName: `${projectNameRef.current} — Editing Copy`,
        timestamp,
        generateId: (kind) => `${kind}-${crypto.randomUUID()}`,
      });
      await enqueueProjectWrite(newProjectId, () =>
        saveProjectTransaction({
          project: duplicated.project,
          sourceFiles: [],
          baseRevision: null,
        })
      );
      return newProjectId;
    } catch (error) {
      const persistenceError = normalizePersistenceError(error);
      const copy = getPersistenceErrorCopy(persistenceError);
      showToast(copy.title, copy.description, "warning");
      return null;
    }
  }, [projectId, showToast]);

  const saveStatus: PersistenceSaveStatus = revisionState.status;
  const isSaveBusy = saveStatus === "saving" || isRenaming;
  const canSave =
    openingState.status === "ready" &&
    !isSaveBusy;

  return {
    openingState,
    saveStatus,
    lastSavedAt: revisionState.lastSavedAt,
    saveErrorMessage: revisionState.errorMessage,
    recoveryInfo,
    conflictRevision,
    missingSources,
    canSave,
    isSaveBusy,
    isRenaming,
    registerSourceFile,
    saveNow,
    renameProject,
    flushPendingSave: () => requestSave(),
    retryOpening,
    keepRecoveredVersion,
    reloadLatestVersion,
    duplicateEditingCopy,
    dismissMissingSources: () => setMissingSources([]),
  };
}
