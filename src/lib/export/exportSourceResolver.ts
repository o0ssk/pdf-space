import { originalSourceBlobRegistry } from "../pdf/originalSourceBlobRegistry";
import { loadSourceFile } from "../persistence/pdfSpaceDatabase";
import { PdfExportError, asPdfExportError } from "./exportErrors";
import { ExportSourceResolver } from "./exportTypes";

export type LocalSourceAvailabilityStatus =
  | "ready"
  | "missing"
  | "empty"
  | "invalid";

export async function checkLocalExportSourceAvailability(
  sourceDocumentIds: readonly string[]
): Promise<Map<string, LocalSourceAvailabilityStatus>> {
  const availability = new Map<string, LocalSourceAvailabilityStatus>();
  for (const sourceDocumentId of new Set(sourceDocumentIds)) {
    const inMemoryBlob = originalSourceBlobRegistry.get(sourceDocumentId);
    if (inMemoryBlob) {
      availability.set(
        sourceDocumentId,
        inMemoryBlob instanceof Blob
          ? inMemoryBlob.size > 0
            ? "ready"
            : "empty"
          : "invalid"
      );
      continue;
    }
    try {
      const storedSource = await loadSourceFile(sourceDocumentId);
      if (!storedSource) {
        availability.set(sourceDocumentId, "missing");
      } else if (!(storedSource.blob instanceof Blob)) {
        availability.set(sourceDocumentId, "invalid");
      } else {
        availability.set(
          sourceDocumentId,
          storedSource.blob.size > 0 ? "ready" : "empty"
        );
      }
    } catch {
      availability.set(sourceDocumentId, "invalid");
    }
  }
  return availability;
}

export function createLocalExportSourceResolver(): ExportSourceResolver {
  return async (sourceDocumentId: string) => {
    const inMemoryBlob = originalSourceBlobRegistry.get(sourceDocumentId);
    if (inMemoryBlob) {
      return {
        sourceDocumentId,
        blob: inMemoryBlob,
        origin: "memory",
      };
    }

    try {
      const storedSource = await loadSourceFile(sourceDocumentId);
      if (!storedSource) {
        throw new PdfExportError(
          "SOURCE_FILE_MISSING",
          "The original PDF source for one or more pages is unavailable.",
          { sourceDocumentId }
        );
      }
      return {
        sourceDocumentId,
        blob: storedSource.blob,
        origin: "indexeddb",
      };
    } catch (error) {
      throw asPdfExportError(
        error,
        "SOURCE_LOAD_FAILED",
        "The original PDF source could not be loaded from local storage.",
        { sourceDocumentId }
      );
    }
  };
}
