import { useCallback, useEffect, useState } from "react";
import {
  ONBOARDING_STATE_EVENT,
  OnboardingState,
  readOnboardingState,
  replayOnboarding,
  updateOnboardingState,
} from "../lib/onboarding/onboardingState";

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>(readOnboardingState);

  useEffect(() => {
    const refresh = () => setState(readOnboardingState());
    window.addEventListener(ONBOARDING_STATE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ONBOARDING_STATE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = useCallback(
    (updates: Partial<Omit<OnboardingState, "version">>) => {
      const next = updateOnboardingState(updates);
      setState(next);
      return next;
    },
    []
  );

  const replay = useCallback(() => {
    const next = replayOnboarding();
    setState(next);
    return next;
  }, []);

  return { onboardingState: state, updateOnboarding: update, replayOnboarding: replay };
}

