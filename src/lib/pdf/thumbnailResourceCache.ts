import { performanceDiagnostics } from "../performance/performanceDiagnostics";
import { objectUrlRegistry } from "../resources/objectUrlRegistry";

type PendingThumbnailEntry = {
  status: "pending";
  owners: Set<string>;
  promise: Promise<string>;
  lastUsed: number;
  generation: number;
};

type ReadyThumbnailEntry = {
  status: "ready";
  owners: Set<string>;
  url: string;
  byteSize: number;
  lastUsed: number;
  generation: number;
};

type ThumbnailEntry = PendingThumbnailEntry | ReadyThumbnailEntry;

export type ThumbnailReleaseResult = {
  renderKey?: string;
  remainingOwners: number;
  pending: boolean;
};

export class ThumbnailResourceCache {
  private entries = new Map<string, ThumbnailEntry>();
  private ownerToKey = new Map<string, string>();
  private generation = 0;

  constructor(
    private maxEntries = 96,
    private maxBytes = 32 * 1024 * 1024
  ) {}

  private updateDiagnostics(): void {
    let bytes = 0;
    for (const entry of this.entries.values()) {
      if (entry.status === "ready") bytes += entry.byteSize;
    }
    performanceDiagnostics.set("cachedThumbnailEntries", this.entries.size);
    performanceDiagnostics.set("cachedThumbnailBytes", bytes);
  }

  private attachOwner(renderKey: string, ownerId: string, entry: ThumbnailEntry): void {
    const previousKey = this.ownerToKey.get(ownerId);
    if (previousKey && previousKey !== renderKey) this.releaseOwner(ownerId);
    entry.owners.add(ownerId);
    entry.lastUsed = Date.now();
    this.ownerToKey.set(ownerId, renderKey);
  }

  async acquire({
    renderKey,
    ownerId,
    createBlob,
  }: {
    renderKey: string;
    ownerId: string;
    createBlob: () => Promise<Blob>;
  }): Promise<string> {
    const existing = this.entries.get(renderKey);
    if (existing) {
      this.attachOwner(renderKey, ownerId, existing);
      return existing.status === "ready" ? existing.url : existing.promise;
    }

    const generation = this.generation;
    const owners = new Set([ownerId]);
    this.ownerToKey.set(ownerId, renderKey);
    const promise = createBlob()
      .then((blob) => {
        const current = this.entries.get(renderKey);
        if (
          generation !== this.generation ||
          !current ||
          current.status !== "pending"
        ) {
          throw new DOMException("Thumbnail request was cancelled.", "AbortError");
        }
        const url = objectUrlRegistry.create(blob, "thumbnail", renderKey);
        const ready: ReadyThumbnailEntry = {
          status: "ready",
          owners: current.owners,
          url,
          byteSize: blob.size,
          lastUsed: Date.now(),
          generation,
        };
        this.entries.set(renderKey, ready);
        this.evictUnused();
        this.updateDiagnostics();
        return url;
      })
      .catch((error) => {
        const current = this.entries.get(renderKey);
        if (current?.status === "pending" && current.generation === generation) {
          this.entries.delete(renderKey);
          for (const owner of current.owners) {
            if (this.ownerToKey.get(owner) === renderKey) this.ownerToKey.delete(owner);
          }
        }
        this.updateDiagnostics();
        throw error;
      });
    this.entries.set(renderKey, {
      status: "pending",
      owners,
      promise,
      lastUsed: Date.now(),
      generation,
    });
    this.updateDiagnostics();
    return promise;
  }

  getForOwner(ownerId: string): string | undefined {
    const key = this.ownerToKey.get(ownerId);
    const entry = key ? this.entries.get(key) : undefined;
    if (!entry || entry.status !== "ready") return undefined;
    entry.lastUsed = Date.now();
    return entry.url;
  }

  releaseOwner(ownerId: string): ThumbnailReleaseResult {
    const renderKey = this.ownerToKey.get(ownerId);
    if (!renderKey) return { remainingOwners: 0, pending: false };
    this.ownerToKey.delete(ownerId);
    const entry = this.entries.get(renderKey);
    if (!entry) return { renderKey, remainingOwners: 0, pending: false };
    entry.owners.delete(ownerId);
    entry.lastUsed = Date.now();
    const result = {
      renderKey,
      remainingOwners: entry.owners.size,
      pending: entry.status === "pending",
    };
    this.evictUnused();
    this.updateDiagnostics();
    return result;
  }

  releaseMany(ownerIds: Iterable<string>): void {
    for (const ownerId of ownerIds) this.releaseOwner(ownerId);
  }

  private evictUnused(): void {
    const readyEntries = [...this.entries.entries()].filter(
      (entry): entry is [string, ReadyThumbnailEntry] => entry[1].status === "ready"
    );
    let byteSize = readyEntries.reduce((total, [, entry]) => total + entry.byteSize, 0);
    const candidates = readyEntries
      .filter(([, entry]) => entry.owners.size === 0)
      .sort((left, right) => left[1].lastUsed - right[1].lastUsed);
    while (
      candidates.length > 0 &&
      (this.entries.size > this.maxEntries || byteSize > this.maxBytes)
    ) {
      const [key, entry] = candidates.shift()!;
      if (this.entries.get(key) !== entry) continue;
      this.entries.delete(key);
      byteSize -= entry.byteSize;
      objectUrlRegistry.revoke(entry.url);
    }
  }

  clear(): void {
    this.generation += 1;
    for (const entry of this.entries.values()) {
      if (entry.status === "ready") objectUrlRegistry.revoke(entry.url);
    }
    this.entries.clear();
    this.ownerToKey.clear();
    this.updateDiagnostics();
  }

  snapshot(): { entries: number; ready: number; pending: number; owners: number; bytes: number } {
    let ready = 0;
    let pending = 0;
    let bytes = 0;
    for (const entry of this.entries.values()) {
      if (entry.status === "ready") {
        ready += 1;
        bytes += entry.byteSize;
      } else pending += 1;
    }
    return {
      entries: this.entries.size,
      ready,
      pending,
      owners: this.ownerToKey.size,
      bytes,
    };
  }
}

export const thumbnailResourceCache = new ThumbnailResourceCache();
