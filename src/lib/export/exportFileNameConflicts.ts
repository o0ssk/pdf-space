import { normalizePdfOutputFileName } from "./exportFileNames";

function splitPdfFileName(fileName: string): { base: string; extension: string } {
  const normalized = normalizePdfOutputFileName(fileName);
  return {
    base: normalized.slice(0, -4),
    extension: normalized.slice(-4),
  };
}

export function resolveUniquePdfFileNames(
  fileNames: readonly string[]
): string[] {
  const used = new Set<string>();

  return fileNames.map((fileName) => {
    const { base, extension } = splitPdfFileName(fileName);
    let candidate = `${base}${extension}`;
    let suffix = 2;
    while (used.has(candidate.toLocaleLowerCase())) {
      candidate = `${base} (${suffix})${extension}`;
      suffix += 1;
    }
    used.add(candidate.toLocaleLowerCase());
    return candidate;
  });
}
