export type PersistenceFaultPoint =
  | "before-revision-write"
  | "after-revision-write"
  | "before-head-update"
  | "before-summary-write"
  | "after-head-update"
  | "before-transaction-complete"
  | "during-pruning";

let activeFault: PersistenceFaultPoint | null = null;

export function setPersistenceFaultInjection(
  faultPoint: PersistenceFaultPoint | null
): void {
  if (!import.meta.env.DEV && faultPoint !== null) return;
  activeFault = faultPoint;
}

export function triggerPersistenceFault(point: PersistenceFaultPoint): void {
  if (activeFault !== point) return;
  throw new DOMException(`Injected persistence fault: ${point}`, "AbortError");
}
