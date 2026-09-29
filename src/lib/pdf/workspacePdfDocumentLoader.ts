import { originalSourceBlobRegistry } from "./originalSourceBlobRegistry";
import {
  pdfDocumentRegistry,
  PdfDocumentLease,
} from "./pdfDocumentRegistry";

/**
 * Acquires a shared PDF.js document, parsing the source blob only on first use.
 * Restored workspaces can therefore paint their shell before hundreds of pages
 * are parsed, while concurrent thumbnail/viewer/search callers share one load.
 */
export async function acquireWorkspacePdfDocument(
  sourceDocumentId: string
): Promise<PdfDocumentLease> {
  return pdfDocumentRegistry.acquireOrLoad(sourceDocumentId, async () => {
    const blob = originalSourceBlobRegistry.get(sourceDocumentId);
    if (!blob || blob.size === 0) {
      throw new Error("The original PDF source is unavailable.");
    }
    const data = await blob.arrayBuffer();
    const { pdfjsLib } = await import("./pdfjs");
    return pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  });
}
