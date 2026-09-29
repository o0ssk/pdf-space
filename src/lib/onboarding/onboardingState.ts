export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = "pdf-space:onboarding";
export const ONBOARDING_STATE_EVENT = "pdf-space:onboarding-change";

export type OnboardingState = {
  version: number;
  hasSeenProjectsIntroduction: boolean;
  hasSeenWorkspaceIntroduction: boolean;
  hasSeenPageOrganizationHint: boolean;
  hasSeenExportHint: boolean;
  completedAt?: string;
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: ONBOARDING_VERSION,
  hasSeenProjectsIntroduction: false,
  hasSeenWorkspaceIntroduction: false,
  hasSeenPageOrganizationHint: false,
  hasSeenExportHint: false,
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isCurrentOnboardingState(value: unknown): value is OnboardingState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<OnboardingState>;
  return (
    state.version === ONBOARDING_VERSION &&
    typeof state.hasSeenProjectsIntroduction === "boolean" &&
    typeof state.hasSeenWorkspaceIntroduction === "boolean" &&
    typeof state.hasSeenPageOrganizationHint === "boolean" &&
    typeof state.hasSeenExportHint === "boolean" &&
    (state.completedAt === undefined || typeof state.completedAt === "string")
  );
}

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readOnboardingState(
  storage: StorageLike | null = browserStorage()
): OnboardingState {
  if (!storage) return { ...DEFAULT_ONBOARDING_STATE };
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ONBOARDING_STATE };
    const parsed: unknown = JSON.parse(raw);
    return isCurrentOnboardingState(parsed)
      ? { ...parsed }
      : { ...DEFAULT_ONBOARDING_STATE };
  } catch {
    return { ...DEFAULT_ONBOARDING_STATE };
  }
}

function announceOnboardingChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ONBOARDING_STATE_EVENT));
  }
}

export function writeOnboardingState(
  state: OnboardingState,
  storage: StorageLike | null = browserStorage()
): OnboardingState {
  const next = isCurrentOnboardingState(state)
    ? { ...state }
    : { ...DEFAULT_ONBOARDING_STATE };
  if (storage) {
    try {
      storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Onboarding is presentational. Storage denial must never block PDF work.
    }
  }
  announceOnboardingChange();
  return next;
}

export function updateOnboardingState(
  updates: Partial<Omit<OnboardingState, "version">>,
  storage: StorageLike | null = browserStorage()
): OnboardingState {
  return writeOnboardingState(
    { ...readOnboardingState(storage), ...updates, version: ONBOARDING_VERSION },
    storage
  );
}

export function replayOnboarding(
  storage: StorageLike | null = browserStorage()
): OnboardingState {
  if (storage) {
    try {
      storage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // The in-memory default below still lets Help replay in this session.
    }
  }
  announceOnboardingChange();
  return { ...DEFAULT_ONBOARDING_STATE };
}

