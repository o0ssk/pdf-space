import { PdfExportError, throwIfExportCancelled } from "./exportErrors";
import { normalizePdfOutputFileName } from "./exportFileNames";
import { resolveUniquePdfFileNames } from "./exportFileNameConflicts";

export type ZipPdfEntry = {
  fileName: string;
  bytes: Uint8Array;
};

export type ZipExportProgress = {
  phase: "creating-zip";
  percent: number;
  currentFileName?: string | undefined;
};

export async function createPdfExportZip({
  entries,
  signal,
  onProgress,
}: {
  entries: readonly ZipPdfEntry[];
  signal?: AbortSignal | undefined;
  onProgress?: ((progress: ZipExportProgress) => void) | undefined;
}): Promise<Blob> {
  throwIfExportCancelled(signal);
  if (entries.length === 0) {
    throw new PdfExportError(
      "UNKNOWN",
      "A ZIP archive cannot be created without PDF entries."
    );
  }

  const { default: JSZip } = await import("jszip");
  throwIfExportCancelled(signal);
  const zip = new JSZip();
  const safeNames = resolveUniquePdfFileNames(
    entries.map((entry) => normalizePdfOutputFileName(entry.fileName))
  );
  for (let index = 0; index < entries.length; index += 1) {
    throwIfExportCancelled(signal);
    const entry = entries[index];
    const safeName = safeNames[index];
    if (!entry || !safeName) continue;
    zip.file(safeName, entry.bytes, {
      binary: true,
      compression: "STORE",
      createFolders: false,
    });
  }

  try {
    return await zip.generateAsync(
      {
        type: "blob",
        compression: "STORE",
        platform: "DOS",
      },
      (metadata) => {
        throwIfExportCancelled(signal);
        onProgress?.({
          phase: "creating-zip",
          percent: Math.max(0, Math.min(100, metadata.percent)),
          currentFileName: metadata.currentFile ?? undefined,
        });
      }
    );
  } catch (error) {
    if (error instanceof PdfExportError) throw error;
    throw new PdfExportError(
      "UNKNOWN",
      "The PDF ZIP archive could not be created.",
      undefined,
      { cause: error }
    );
  }
}
