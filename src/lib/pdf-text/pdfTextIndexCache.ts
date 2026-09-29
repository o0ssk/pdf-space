import { performanceDiagnostics } from "../performance/performanceDiagnostics";
import {
  ExtractedPdfPageText,
  PDF_TEXT_INDEX_VERSION,
  SourcePageKey,
} from "./pdfTextTypes";

export const PDF_TEXT_CACHE_MAX_ENTRIES = 600;
export const PDF_TEXT_CACHE_MAX_CHARACTERS = 8_000_000;

export interface PdfTextIndexCache {
  get(key: SourcePageKey): ExtractedPdfPageText | undefined;
  set(key: SourcePageKey, value: ExtractedPdfPageText): void;
  delete(key: SourcePageKey): void;
  clear(): void;
  values(): IterableIterator<ExtractedPdfPageText>;
  setProtectedKeys(keys: Iterable<SourcePageKey>): void;
  stats(): { entries: number; characters: number };
}

export function createPdfTextIndexCache({
  maxEntries = PDF_TEXT_CACHE_MAX_ENTRIES,
  maxCharacters = PDF_TEXT_CACHE_MAX_CHARACTERS,
}: { maxEntries?: number; maxCharacters?: number } = {}): PdfTextIndexCache {
  const entries = new Map<SourcePageKey, ExtractedPdfPageText>();
  let characters = 0;
  let protectedKeys = new Set<SourcePageKey>();

  const updateDiagnostics = () => {
    performanceDiagnostics.set("indexedTextSourcePages", entries.size);
    performanceDiagnostics.set("textIndexCharacters", characters);
  };
  const remove = (key: SourcePageKey) => {
    const entry = entries.get(key);
    if (!entry) return;
    entries.delete(key);
    characters = Math.max(0, characters - entry.characterCount);
  };
  const evict = () => {
    while (entries.size > maxEntries || characters > maxCharacters) {
      const victim = [...entries.keys()].find((key) => !protectedKeys.has(key));
      if (!victim) break;
      remove(victim);
    }
    updateDiagnostics();
  };
  const valid = (entry: ExtractedPdfPageText | undefined) =>
    entry?.indexVersion === PDF_TEXT_INDEX_VERSION;

  return {
    get: (key) => {
      const entry = entries.get(key);
      if (!valid(entry)) {
        remove(key);
        updateDiagnostics();
        return undefined;
      }
      // Map insertion order doubles as an inexpensive LRU list.
      entries.delete(key);
      entries.set(key, entry!);
      return entry;
    },
    set: (key, value) => {
      remove(key);
      entries.set(key, value);
      characters += Math.max(0, value.characterCount);
      evict();
    },
    delete: (key) => {
      remove(key);
      updateDiagnostics();
    },
    clear: () => {
      entries.clear();
      protectedKeys.clear();
      characters = 0;
      updateDiagnostics();
    },
    values: function* () {
      for (const [key, entry] of [...entries]) {
        if (!valid(entry)) {
          remove(key);
          continue;
        }
        yield entry;
      }
      updateDiagnostics();
    },
    setProtectedKeys: (keys) => {
      protectedKeys = new Set(keys);
      evict();
    },
    stats: () => ({ entries: entries.size, characters }),
  };
}
