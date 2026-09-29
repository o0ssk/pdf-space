export type BrowserSupportResult = {
  supported: boolean;
  missing: string[];
};

export function getBrowserSupport(environment: typeof globalThis = globalThis): BrowserSupportResult {
  const candidate = environment as typeof globalThis & {
    indexedDB?: IDBFactory;
    crypto?: Crypto;
  };
  const missing: string[] = [];
  if (!candidate.indexedDB) missing.push("local project storage");
  if (!candidate.crypto?.subtle || typeof candidate.crypto.randomUUID !== "function") {
    missing.push("project integrity checks");
  }
  if (typeof candidate.Blob !== "function" || typeof candidate.File !== "function") {
    missing.push("local PDF processing");
  }
  return { supported: missing.length === 0, missing };
}

