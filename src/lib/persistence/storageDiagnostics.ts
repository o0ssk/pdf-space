export type StoragePressureEstimate = {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  additionalBytes: number;
  low: boolean;
};

export async function estimateStoragePressure(
  additionalBytes: number
): Promise<StoragePressureEstimate> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { supported: false, usage: null, quota: null, additionalBytes, low: false };
  }
  try {
    const estimate = await navigator.storage.estimate();
    const usage = typeof estimate.usage === "number" ? estimate.usage : null;
    const quota = typeof estimate.quota === "number" ? estimate.quota : null;
    const available = usage !== null && quota !== null ? Math.max(0, quota - usage) : null;
    return {
      supported: true,
      usage,
      quota,
      additionalBytes,
      low:
        available !== null &&
        additionalBytes > 0 &&
        (available < additionalBytes * 1.25 || usage! / quota! >= 0.9),
    };
  } catch {
    return { supported: false, usage: null, quota: null, additionalBytes, low: false };
  }
}
