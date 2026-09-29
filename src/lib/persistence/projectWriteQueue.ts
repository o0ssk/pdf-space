import { performanceDiagnostics } from "../performance/performanceDiagnostics";

const tails = new Map<string, Promise<void>>();

/** Serializes IndexedDB mutations per project without letting one rejection poison the queue. */
export function enqueueProjectWrite<T>(
  projectId: string,
  write: () => Promise<T>
): Promise<T> {
  const previous = tails.get(projectId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(async () => {
    performanceDiagnostics.increment("pendingAutosaveWrites");
    try {
      return await write();
    } finally {
      performanceDiagnostics.increment("pendingAutosaveWrites", -1);
    }
  });
  const tail = run.then(() => undefined, () => undefined).finally(() => {
    if (tails.get(projectId) === tail) tails.delete(projectId);
  });
  tails.set(projectId, tail);
  return run;
}

export function getPendingProjectWriteQueueCount(): number {
  return tails.size;
}
