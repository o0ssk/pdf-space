import { performanceDiagnostics } from "../performance/performanceDiagnostics";
import { PDFDocumentProxy } from "./pdfjs";

type RegistryEntry = {
  document: PDFDocumentProxy;
  leaseCount: number;
  registered: boolean;
  destroyed: boolean;
};

export type PdfDocumentLease = {
  document: PDFDocumentProxy;
  release(): void;
};

export class PdfDocumentRegistry {
  private registry = new Map<string, RegistryEntry>();
  private loading = new Map<string, Promise<PDFDocumentProxy>>();
  private orphanedEntries = new Set<RegistryEntry>();
  private activeLeaseCount = 0;
  private generation = 0;
  private readonly maxCachedDocuments = 6;

  private updateDiagnostics(): void {
    performanceDiagnostics.set(
      "loadedPdfJsDocuments",
      this.registry.size + this.orphanedEntries.size
    );
    performanceDiagnostics.set("activePdfDocumentLeases", this.activeLeaseCount);
  }

  private destroyEntry(entry: RegistryEntry): void {
    if (entry.destroyed || entry.leaseCount > 0 || entry.registered) return;
    entry.destroyed = true;
    this.orphanedEntries.delete(entry);
    try {
      if (typeof entry.document.destroy === "function") {
        void Promise.resolve(entry.document.destroy()).catch((error) => {
          if (import.meta.env.DEV) {
            console.error("Error destroying a PDF document proxy:", error);
          }
        });
      } else if (typeof entry.document.cleanup === "function") {
        void entry.document.cleanup();
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error destroying a PDF document proxy:", error);
      }
    }
    this.updateDiagnostics();
  }

  register(sourceDocumentId: string, pdfDocument: PDFDocumentProxy): void {
    const current = this.registry.get(sourceDocumentId);
    if (current?.document === pdfDocument) return;
    if (current) {
      current.registered = false;
      this.registry.delete(sourceDocumentId);
      this.orphanedEntries.add(current);
      this.destroyEntry(current);
    }
    this.registry.set(sourceDocumentId, {
      document: pdfDocument,
      leaseCount: 0,
      registered: true,
      destroyed: false,
    });
    this.evictIdleDocuments(sourceDocumentId);
    this.updateDiagnostics();
  }

  private evictIdleDocuments(protectedSourceId?: string): void {
    if (this.registry.size <= this.maxCachedDocuments) return;
    for (const [sourceDocumentId, entry] of [...this.registry]) {
      if (this.registry.size <= this.maxCachedDocuments) break;
      if (sourceDocumentId === protectedSourceId || entry.leaseCount > 0) continue;
      this.registry.delete(sourceDocumentId);
      entry.registered = false;
      this.orphanedEntries.add(entry);
      this.destroyEntry(entry);
    }
  }

  get(sourceDocumentId: string): PDFDocumentProxy | undefined {
    return this.registry.get(sourceDocumentId)?.document;
  }

  acquire(sourceDocumentId: string): PdfDocumentLease | undefined {
    const entry = this.registry.get(sourceDocumentId);
    if (!entry || entry.destroyed) return undefined;
    entry.leaseCount += 1;
    this.activeLeaseCount += 1;
    this.updateDiagnostics();
    let released = false;
    return {
      document: entry.document,
      release: () => {
        if (released) return;
        released = true;
        entry.leaseCount = Math.max(0, entry.leaseCount - 1);
        this.activeLeaseCount = Math.max(0, this.activeLeaseCount - 1);
        this.destroyEntry(entry);
        this.evictIdleDocuments();
        this.updateDiagnostics();
      },
    };
  }

  async acquireOrLoad(
    sourceDocumentId: string,
    loader: () => Promise<PDFDocumentProxy>
  ): Promise<PdfDocumentLease> {
    const existing = this.acquire(sourceDocumentId);
    if (existing) return existing;
    let loadingPromise = this.loading.get(sourceDocumentId);
    if (!loadingPromise) {
      const generation = this.generation;
      loadingPromise = loader()
        .then((pdfDocument) => {
          if (generation !== this.generation) {
            void Promise.resolve(pdfDocument.destroy?.()).catch(() => undefined);
            throw new DOMException("PDF load was superseded.", "AbortError");
          }
          this.register(sourceDocumentId, pdfDocument);
          return pdfDocument;
        })
        .finally(() => {
          if (this.loading.get(sourceDocumentId) === loadingPromise) {
            this.loading.delete(sourceDocumentId);
          }
        });
      this.loading.set(sourceDocumentId, loadingPromise);
    }
    await loadingPromise;
    const lease = this.acquire(sourceDocumentId);
    if (!lease) {
      throw new Error(`PDF document ${sourceDocumentId} was released before acquisition.`);
    }
    return lease;
  }

  unregister(sourceDocumentId: string): void {
    const entry = this.registry.get(sourceDocumentId);
    if (!entry) return;
    this.registry.delete(sourceDocumentId);
    entry.registered = false;
    this.orphanedEntries.add(entry);
    this.destroyEntry(entry);
    this.updateDiagnostics();
  }

  clear(): void {
    this.generation += 1;
    for (const sourceDocumentId of [...this.registry.keys()]) {
      this.unregister(sourceDocumentId);
    }
    this.loading.clear();
    this.updateDiagnostics();
  }

  snapshot(): { loadedDocuments: number; activeLeases: number; pendingLoads: number } {
    return {
      loadedDocuments: this.registry.size + this.orphanedEntries.size,
      activeLeases: this.activeLeaseCount,
      pendingLoads: this.loading.size,
    };
  }
}

export const pdfDocumentRegistry = new PdfDocumentRegistry();
