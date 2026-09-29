import { PersistenceReadMetrics, PersistedSourceFile } from "./persistenceTypes";

const initialMetrics = (): PersistenceReadMetrics => ({
  projectSummaryReads: 0,
  projectHeadReads: 0,
  projectRevisionReads: 0,
  sourceMetadataReads: 0,
  sourceBlobReads: 0,
  sourceBlobBytesMaterialized: 0,
});

let metrics = initialMetrics();

export function recordPersistenceRead(
  key: Exclude<keyof PersistenceReadMetrics, "sourceBlobBytesMaterialized">,
  count = 1
): void {
  if (!import.meta.env.DEV) return;
  metrics[key] += count;
}

export function recordSourceBlobRead(record: PersistedSourceFile | undefined): void {
  if (!import.meta.env.DEV) return;
  metrics.sourceBlobReads += 1;
  if (record?.blob instanceof Blob) metrics.sourceBlobBytesMaterialized += record.blob.size;
}

export function getPersistenceReadMetrics(): PersistenceReadMetrics {
  return { ...metrics };
}

export function resetPersistenceReadMetrics(): void {
  metrics = initialMetrics();
}
