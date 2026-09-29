import { performanceDiagnostics } from "../performance/performanceDiagnostics";
import { pdfWorkBudget } from "../pdf/pdfWorkBudget";

export type PdfTextQueueItem<T> = { key: string; value: T };

export async function runPdfTextExtractionQueue<T, R>({
  items,
  concurrency = 2,
  signal,
  extract,
  onSettled,
}: {
  items: readonly PdfTextQueueItem<T>[];
  concurrency?: number;
  signal?: AbortSignal;
  extract: (value: T, signal?: AbortSignal) => Promise<R>;
  onSettled: (item: PdfTextQueueItem<T>, result: PromiseSettledResult<R>) => void;
}): Promise<void> {
  const uniqueItems = [...new Map(items.map((item) => [item.key, item])).values()];
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(3, Math.floor(concurrency), uniqueItems.length));

  async function worker(): Promise<void> {
    while (!signal?.aborted) {
      const index = nextIndex++;
      const item = uniqueItems[index];
      if (!item) return;
      let extractionStarted = false;
      try {
        await pdfWorkBudget.waitForBackground(signal);
        if (signal?.aborted) return;
        extractionStarted = true;
        performanceDiagnostics.increment("activeTextExtractionTasks");
        const value = await extract(item.value, signal);
        onSettled(item, { status: "fulfilled", value });
      } catch (reason) {
        if (signal?.aborted) return;
        onSettled(item, { status: "rejected", reason });
      } finally {
        if (extractionStarted) {
          performanceDiagnostics.increment("activeTextExtractionTasks", -1);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
