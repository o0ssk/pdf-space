import { PDFDocumentProxy } from "./pdfjs";

class PdfDocumentRegistry {
  private registry = new Map<string, PDFDocumentProxy>();

  /**
   * Registers a loaded PDF document proxy with its immutable source ID.
   */
  register(sourceDocumentId: string, pdfDoc: PDFDocumentProxy) {
    this.unregister(sourceDocumentId);
    this.registry.set(sourceDocumentId, pdfDoc);
  }

  /**
   * Retrieves a loaded PDF document proxy by its workspace document ID.
   */
  get(sourceDocumentId: string): PDFDocumentProxy | undefined {
    return this.registry.get(sourceDocumentId);
  }

  /**
   * Unregisters and destroys a PDF document proxy to release browser resources.
   */
  unregister(sourceDocumentId: string) {
    const pdfDoc = this.registry.get(sourceDocumentId);
    if (pdfDoc) {
      // Delete ownership first so repeated cleanup cannot destroy twice.
      this.registry.delete(sourceDocumentId);
      try {
        if (typeof pdfDoc.destroy === "function") {
          void Promise.resolve(pdfDoc.destroy()).catch((error) => {
            console.error(
              `Error destroying PDF document proxy for ${sourceDocumentId}:`,
              error
            );
          });
        } else if (typeof pdfDoc.cleanup === "function") {
          pdfDoc.cleanup();
        }
      } catch (err) {
        console.error(`Error destroying PDF document proxy for ${sourceDocumentId}:`, err);
      }
    }
  }

  /**
   * Clears the entire registry and destroys all active PDF document proxies.
   */
  clear() {
    for (const id of Array.from(this.registry.keys())) {
      this.unregister(id);
    }
    this.registry.clear();
  }
}

export const pdfDocumentRegistry = new PdfDocumentRegistry();
