export class PdfWorkBudget {
  private foregroundConsumers = 0;
  private listeners = new Set<() => void>();

  acquireForeground(): () => void {
    this.foregroundConsumers += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.foregroundConsumers = Math.max(0, this.foregroundConsumers - 1);
      if (this.foregroundConsumers === 0) {
        for (const listener of [...this.listeners]) listener();
      }
    };
  }

  async waitForBackground(signal?: AbortSignal): Promise<void> {
    if (this.foregroundConsumers === 0) return;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        this.listeners.delete(resume);
        signal?.removeEventListener("abort", abort);
      };
      const resume = () => {
        cleanup();
        resolve();
      };
      const abort = () => {
        cleanup();
        reject(new DOMException("Cancelled", "AbortError"));
      };
      this.listeners.add(resume);
      signal?.addEventListener("abort", abort, { once: true });
    });
  }

  isForegroundActive(): boolean {
    return this.foregroundConsumers > 0;
  }
}

export const pdfWorkBudget = new PdfWorkBudget();
