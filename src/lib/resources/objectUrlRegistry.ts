import { performanceDiagnostics } from "../performance/performanceDiagnostics";

export type ObjectUrlOwner = "thumbnail" | "download" | "import-preview" | "other";

type ObjectUrlRecord = {
  owner: ObjectUrlOwner;
  creator: string;
};

export class ObjectUrlRegistry {
  private records = new Map<string, ObjectUrlRecord>();

  create(blob: Blob, owner: ObjectUrlOwner, creator: string): string {
    const url = URL.createObjectURL(blob);
    this.records.set(url, { owner, creator });
    performanceDiagnostics.set("activeObjectUrls", this.records.size);
    return url;
  }

  revoke(url: string): boolean {
    if (!this.records.has(url)) return false;
    this.records.delete(url);
    URL.revokeObjectURL(url);
    performanceDiagnostics.set("activeObjectUrls", this.records.size);
    return true;
  }

  clear(owner?: ObjectUrlOwner): void {
    for (const [url, record] of [...this.records]) {
      if (owner && record.owner !== owner) continue;
      this.revoke(url);
    }
  }

  snapshot(): { active: number; byOwner: Record<ObjectUrlOwner, number> } {
    const byOwner: Record<ObjectUrlOwner, number> = {
      thumbnail: 0,
      download: 0,
      "import-preview": 0,
      other: 0,
    };
    for (const record of this.records.values()) byOwner[record.owner] += 1;
    return { active: this.records.size, byOwner };
  }
}

export const objectUrlRegistry = new ObjectUrlRegistry();
