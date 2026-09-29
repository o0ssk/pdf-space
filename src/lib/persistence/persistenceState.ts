import { PersistenceRevisionState } from "./persistenceTypes";

export type PersistenceRevisionAction =
  | { type: "RESTORED"; revision: number; savedAt: number }
  | { type: "DIRTY"; revision: number }
  | { type: "SAVE_STARTED"; revision: number }
  | { type: "SAVE_SUCCEEDED"; revision: number; savedAt: number }
  | { type: "SAVE_FAILED"; revision: number; message: string }
  | { type: "CONFLICT"; revision: number; message: string }
  | { type: "UNAVAILABLE"; revision: number; message: string };

export const initialPersistenceRevisionState: PersistenceRevisionState = {
  projectRevision: 0,
  savedRevision: 0,
  savingRevision: null,
  status: "idle",
  lastSavedAt: null,
};

export function persistenceRevisionReducer(
  state: PersistenceRevisionState,
  action: PersistenceRevisionAction
): PersistenceRevisionState {
  switch (action.type) {
    case "RESTORED":
      return {
        projectRevision: action.revision,
        savedRevision: action.revision,
        savingRevision: null,
        status: "saved",
        lastSavedAt: action.savedAt,
      };
    case "DIRTY":
      return {
        ...state,
        projectRevision: Math.max(state.projectRevision, action.revision),
        status: state.savingRevision === null ? "dirty" : "saving",
      };
    case "SAVE_STARTED":
      return {
        ...state,
        savingRevision: action.revision,
        status: "saving",
        errorMessage: undefined,
      };
    case "SAVE_SUCCEEDED": {
      const savedRevision = Math.max(state.savedRevision, action.revision);
      return {
        ...state,
        savedRevision,
        savingRevision: null,
        status:
          savedRevision >= state.projectRevision ? "saved" : "dirty",
        lastSavedAt: action.savedAt,
        errorMessage: undefined,
      };
    }
    case "SAVE_FAILED":
      return {
        ...state,
        projectRevision: Math.max(state.projectRevision, action.revision),
        savingRevision: null,
        status: "error",
        errorMessage: action.message,
      };
    case "UNAVAILABLE":
      return {
        ...state,
        projectRevision: Math.max(state.projectRevision, action.revision),
        savingRevision: null,
        status: "unavailable",
        errorMessage: action.message,
      };
    case "CONFLICT":
      return {
        ...state,
        projectRevision: Math.max(state.projectRevision, action.revision),
        savingRevision: null,
        status: "conflict",
        errorMessage: action.message,
      };
    default:
      return state;
  }
}
