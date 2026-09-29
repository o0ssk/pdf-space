import {
  WorkspaceAction,
  WorkspaceState,
  initialWorkspaceState,
  pruneSourceDocuments,
  workspaceReducer,
} from "../workspace/workspaceState";
import {
  WorkspaceLogicalSnapshot,
  WorkspaceSelectionSnapshot,
  areWorkspaceLogicalSnapshotsEqual,
  createWorkspaceLogicalSnapshot,
  createWorkspaceSelectionSnapshot,
  reconcileWorkspaceFromSnapshot,
} from "./workspaceSnapshots";

export const WORKSPACE_HISTORY_LIMIT = 50;
export const WORKSPACE_HISTORY_BYTE_LIMIT = 12 * 1024 * 1024;

export type WorkspaceHistoryEntry = {
  id: string;
  label: string;
  timestamp: number;
  before: WorkspaceLogicalSnapshot;
  after: WorkspaceLogicalSnapshot;
  selectionBefore: WorkspaceSelectionSnapshot;
  selectionAfter: WorkspaceSelectionSnapshot;
};

export function estimateWorkspaceHistoryEntryBytes(
  entry: WorkspaceHistoryEntry
): number {
  return new Blob([JSON.stringify(entry)]).size;
}

export function estimateWorkspaceHistoryBytes(
  history: Pick<WorkspaceHistoryState, "past" | "future">
): number {
  return [...history.past, ...history.future].reduce(
    (total, entry) => total + estimateWorkspaceHistoryEntryBytes(entry),
    0
  );
}

function trimHistoryEntries(
  entries: WorkspaceHistoryEntry[],
  limit: number
): WorkspaceHistoryEntry[] {
  const retained = entries.slice(-limit);
  let bytes = retained.reduce(
    (total, entry) => total + estimateWorkspaceHistoryEntryBytes(entry),
    0
  );
  while (retained.length > 1 && bytes > WORKSPACE_HISTORY_BYTE_LIMIT) {
    bytes -= estimateWorkspaceHistoryEntryBytes(retained.shift()!);
  }
  return retained;
}

export type WorkspaceHistoryState = {
  past: WorkspaceHistoryEntry[];
  future: WorkspaceHistoryEntry[];
  limit: number;
};

export type WorkspaceStoreState = {
  workspace: WorkspaceState;
  history: WorkspaceHistoryState;
  historyError: string | null;
  logicalRevision: number;
};

export type CommitWorkspaceOperationAction = {
  type: "COMMIT_WORKSPACE_OPERATION";
  payload: {
    action: WorkspaceAction;
    id: string;
    label: string;
    timestamp: number;
  };
};

export type WorkspaceStoreAction =
  | WorkspaceAction
  | CommitWorkspaceOperationAction
  | { type: "RESTORE_PERSISTED_WORKSPACE"; payload: { workspace: WorkspaceState } }
  | { type: "UNDO_WORKSPACE" }
  | { type: "REDO_WORKSPACE" }
  | { type: "CLEAR_HISTORY_ERROR" };

export const emptyWorkspaceHistory: WorkspaceHistoryState = {
  past: [],
  future: [],
  limit: WORKSPACE_HISTORY_LIMIT,
};

export const initialWorkspaceStoreState: WorkspaceStoreState = {
  workspace: initialWorkspaceState,
  history: emptyWorkspaceHistory,
  historyError: null,
  logicalRevision: 0,
};

function isLogicalPersistenceMutation(action: WorkspaceAction): boolean {
  return (
    action.type === "ADD_DOCUMENT_SUCCESS" ||
    action.type === "REMOVE_DOCUMENT" ||
    action.type === "CLEAR_WORKSPACE"
  );
}

function isHistoryBoundary(action: WorkspaceAction): boolean {
  return (
    action.type === "ADD_DOCUMENT_PENDING" ||
    action.type === "ADD_DOCUMENT_SUCCESS" ||
    action.type === "ADD_DOCUMENT_ERROR" ||
    action.type === "REMOVE_DOCUMENT" ||
    action.type === "CLEAR_WORKSPACE"
  );
}

function restoreHistoryEntry(
  state: WorkspaceStoreState,
  entry: WorkspaceHistoryEntry,
  direction: "undo" | "redo"
): WorkspaceStoreState {
  const targetSnapshot = direction === "undo" ? entry.before : entry.after;
  const targetSelection =
    direction === "undo" ? entry.selectionBefore : entry.selectionAfter;
  const workspace = reconcileWorkspaceFromSnapshot(
    state.workspace,
    targetSnapshot,
    targetSelection
  );

  if (!workspace) {
    return {
      ...state,
      historyError: `Unable to ${direction} "${entry.label}".`,
    };
  }

  if (direction === "undo") {
    const history = {
      ...state.history,
      past: state.history.past.slice(0, -1),
      future: [...state.history.future, entry],
    };
    return {
      workspace: retainHistorySourceMetadata(workspace, history),
      history,
      historyError: null,
      logicalRevision: state.logicalRevision + 1,
    };
  }

  const history = {
    ...state.history,
    past: trimHistoryEntries([...state.history.past, entry], state.history.limit),
    future: state.history.future.slice(0, -1),
  };
  return {
    workspace: retainHistorySourceMetadata(workspace, history),
    history,
    historyError: null,
    logicalRevision: state.logicalRevision + 1,
  };
}

export function workspaceStoreReducer(
  state: WorkspaceStoreState,
  action: WorkspaceStoreAction
): WorkspaceStoreState {
  switch (action.type) {
    case "COMMIT_WORKSPACE_OPERATION": {
      const before = createWorkspaceLogicalSnapshot(state.workspace);
      const selectionBefore = createWorkspaceSelectionSnapshot(
        state.workspace
      );
      const workspace = workspaceReducer(
        state.workspace,
        action.payload.action
      );
      const after = createWorkspaceLogicalSnapshot(workspace);

      if (areWorkspaceLogicalSnapshotsEqual(before, after)) {
        return state;
      }

      const provisionalEntry: WorkspaceHistoryEntry = {
        id: action.payload.id,
        label: action.payload.label,
        timestamp: action.payload.timestamp,
        before,
        after,
        selectionBefore,
        selectionAfter: createWorkspaceSelectionSnapshot(workspace),
      };
      const provisionalHistory = {
        ...state.history,
        past: trimHistoryEntries(
          [...state.history.past, provisionalEntry],
          state.history.limit
        ),
        future: [],
      };
      const retainedWorkspace = retainHistorySourceMetadata(
        workspace,
        provisionalHistory
      );
      const entry: WorkspaceHistoryEntry = {
        ...provisionalEntry,
        after: createWorkspaceLogicalSnapshot(retainedWorkspace),
      };

      return {
        workspace: retainedWorkspace,
        history: {
          ...provisionalHistory,
          past: [
            ...provisionalHistory.past.slice(0, -1),
            entry,
          ],
          future: [],
        },
        historyError: null,
        logicalRevision: state.logicalRevision + 1,
      };
    }

    case "RESTORE_PERSISTED_WORKSPACE":
      return {
        workspace: action.payload.workspace,
        history: { ...state.history, past: [], future: [] },
        historyError: null,
        logicalRevision: 0,
      };

    case "UNDO_WORKSPACE": {
      const entry = state.history.past[state.history.past.length - 1];
      return entry ? restoreHistoryEntry(state, entry, "undo") : state;
    }

    case "REDO_WORKSPACE": {
      const entry = state.history.future[state.history.future.length - 1];
      return entry ? restoreHistoryEntry(state, entry, "redo") : state;
    }

    case "CLEAR_HISTORY_ERROR":
      return state.historyError ? { ...state, historyError: null } : state;

    default: {
      const workspaceAction = action;
      const reducedWorkspace = workspaceReducer(
        state.workspace,
        workspaceAction
      );
      if (reducedWorkspace === state.workspace) return state;
      const boundary = isHistoryBoundary(workspaceAction);
      const history = boundary
        ? { ...state.history, past: [], future: [] }
        : state.history;
      const workspace = boundary
        ? {
            ...reducedWorkspace,
            sourceDocuments: pruneSourceDocuments(
              reducedWorkspace.sourceDocuments,
              reducedWorkspace.documents
            ),
          }
        : retainHistorySourceMetadata(reducedWorkspace, history);

      return {
        workspace,
        history,
        historyError: null,
        logicalRevision: isLogicalPersistenceMutation(workspaceAction)
          ? state.logicalRevision + 1
          : state.logicalRevision,
      };
    }
  }
}

function addSnapshotSourceIds(
  sourceIds: Set<string>,
  snapshot: WorkspaceLogicalSnapshot
) {
  for (const document of snapshot.documents) {
    for (const page of document.pages) {
      sourceIds.add(page.sourceDocumentId);
    }
  }
}

export function getRetainedSourceDocumentIds(
  workspace: WorkspaceState,
  history: WorkspaceHistoryState
): Set<string> {
  const sourceIds = new Set<string>();

  for (const document of workspace.documents) {
    for (const page of document.pages) {
      sourceIds.add(page.sourceDocumentId);
    }
  }

  for (const entry of [...history.past, ...history.future]) {
    addSnapshotSourceIds(sourceIds, entry.before);
    addSnapshotSourceIds(sourceIds, entry.after);
  }

  return sourceIds;
}

function retainHistorySourceMetadata(
  workspace: WorkspaceState,
  history: WorkspaceHistoryState
): WorkspaceState {
  const retainedSourceIds = getRetainedSourceDocumentIds(workspace, history);
  const sourceDocuments = pruneSourceDocuments(
    workspace.sourceDocuments,
    workspace.documents
  );
  const sourceMetadataById = new Map(
    Object.entries(sourceDocuments)
  );

  for (const entry of [...history.past, ...history.future]) {
    for (const snapshot of [entry.before, entry.after]) {
      for (const [sourceId, sourceDocument] of Object.entries(
        snapshot.sourceDocuments
      )) {
        if (!sourceMetadataById.has(sourceId)) {
          sourceMetadataById.set(sourceId, sourceDocument);
        }
      }
    }
  }

  const retainedEntries = [...sourceMetadataById].filter(([sourceId]) =>
    retainedSourceIds.has(sourceId) ||
    sourceId in sourceDocuments
  );
  const retainedSourceDocuments = Object.fromEntries(retainedEntries);

  const currentSourceIds = Object.keys(workspace.sourceDocuments);
  const nextSourceIds = Object.keys(retainedSourceDocuments);
  const unchanged =
    currentSourceIds.length === nextSourceIds.length &&
    currentSourceIds.every(
      (sourceId) =>
        workspace.sourceDocuments[sourceId] ===
        retainedSourceDocuments[sourceId]
    );

  return unchanged
    ? workspace
    : {
        ...workspace,
        sourceDocuments: retainedSourceDocuments,
      };
}

export function getNextUndoEntry(
  history: WorkspaceHistoryState
): WorkspaceHistoryEntry | null {
  return history.past[history.past.length - 1] ?? null;
}

export function getNextRedoEntry(
  history: WorkspaceHistoryState
): WorkspaceHistoryEntry | null {
  return history.future[history.future.length - 1] ?? null;
}
