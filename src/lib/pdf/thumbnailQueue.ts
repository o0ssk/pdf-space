import { performanceDiagnostics } from "../performance/performanceDiagnostics";

export type ThumbnailVisibilityPriority =
  | "visible"
  | "near-viewport"
  | "active-document"
  | "background"
  | "suspended";

export type ThumbnailTaskContext = {
  isCancelled: () => boolean;
};

export type ThumbnailTask = {
  id: string;
  pageId?: string | undefined;
  priority?: ThumbnailVisibilityPriority | undefined;
  run: (context: ThumbnailTaskContext) => Promise<void>;
  onCancel?: (() => void) | undefined;
};

type QueuedTask = ThumbnailTask & { sequence: number };
type ActiveRenderTask = { task: QueuedTask; cancelled: boolean };

const PRIORITY_WEIGHT: Record<ThumbnailVisibilityPriority, number> = {
  visible: 5,
  "near-viewport": 4,
  "active-document": 3,
  background: 2,
  suspended: 0,
};

export function createThumbnailRenderKey({
  sourceDocumentId,
  originalPageIndex,
  rotation,
  targetWidth,
}: {
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: number;
  targetWidth: number;
}): string {
  return `${sourceDocumentId.length}:${sourceDocumentId}:${originalPageIndex}:${rotation}:${targetWidth}`;
}

export class ThumbnailQueue {
  private queue: QueuedTask[] = [];
  private activeTasks = new Map<string, ActiveRenderTask>();
  private maxConcurrency = 3;
  private foregroundActive = false;
  private sequence = 0;

  private updateDiagnostics(): void {
    performanceDiagnostics.set("queuedThumbnailTasks", this.queue.length);
    performanceDiagnostics.set("activeThumbnailTasks", this.activeTasks.size);
  }

  setConcurrency(limit: number): void {
    this.maxConcurrency = Math.max(1, Math.min(4, Math.floor(limit)));
    this.processNext();
  }

  setForegroundActive(active: boolean): void {
    this.foregroundActive = active;
    this.processNext();
  }

  enqueue(task: ThumbnailTask): boolean {
    const queued = this.queue.find((candidate) => candidate.id === task.id);
    if (queued) {
      if (
        PRIORITY_WEIGHT[task.priority ?? "background"] >
        PRIORITY_WEIGHT[queued.priority ?? "background"]
      ) {
        queued.priority = task.priority;
        this.sortQueue();
      }
      return false;
    }
    if (this.activeTasks.has(task.id)) return false;
    this.queue.push({ ...task, sequence: this.sequence++ });
    this.sortQueue();
    this.updateDiagnostics();
    this.processNext();
    return true;
  }

  updatePriority(id: string, priority: ThumbnailVisibilityPriority): void {
    const task = this.queue.find((candidate) => candidate.id === id);
    if (!task) return;
    task.priority = priority;
    this.sortQueue();
  }

  private sortQueue(): void {
    this.queue.sort(
      (left, right) =>
        PRIORITY_WEIGHT[right.priority ?? "background"] -
          PRIORITY_WEIGHT[left.priority ?? "background"] ||
        left.sequence - right.sequence
    );
  }

  private processNext(): void {
    const concurrency = this.foregroundActive ? 1 : this.maxConcurrency;
    while (this.activeTasks.size < concurrency && this.queue.length > 0) {
      const taskIndex = this.queue.findIndex(
        (task) => task.priority !== "suspended"
      );
      if (taskIndex < 0) break;
      const [task] = this.queue.splice(taskIndex, 1);
      if (!task) break;
      const activeTask: ActiveRenderTask = { task, cancelled: false };
      this.activeTasks.set(task.id, activeTask);
      this.updateDiagnostics();
      void task
        .run({ isCancelled: () => activeTask.cancelled })
        .catch((error) => {
          if (!activeTask.cancelled && error?.name !== "AbortError") {
            if (import.meta.env.DEV) {
              console.error("Error executing a thumbnail task:", error);
            }
          }
        })
        .finally(() => {
          this.activeTasks.delete(task.id);
          this.updateDiagnostics();
          this.processNext();
        });
    }
    this.updateDiagnostics();
  }

  cancelTasks(taskIds: Iterable<string>): void {
    const ids = new Set(taskIds);
    this.cancelWhere((task) => ids.has(task.id));
  }

  cancelPages(pageIds: Iterable<string>): void {
    const ids = new Set(pageIds);
    this.cancelWhere((task) => ids.has(task.pageId ?? task.id));
  }

  private cancelWhere(predicate: (task: ThumbnailTask) => boolean): void {
    this.queue = this.queue.filter((task) => {
      if (!predicate(task)) return true;
      task.onCancel?.();
      return false;
    });
    for (const activeTask of this.activeTasks.values()) {
      if (!predicate(activeTask.task) || activeTask.cancelled) continue;
      activeTask.cancelled = true;
      activeTask.task.onCancel?.();
    }
    this.updateDiagnostics();
  }

  clear(): void {
    this.cancelWhere(() => true);
  }

  snapshot(): { queued: number; active: number; concurrency: number } {
    return {
      queued: this.queue.length,
      active: this.activeTasks.size,
      concurrency: this.foregroundActive ? 1 : this.maxConcurrency,
    };
  }
}

export const thumbnailQueue = new ThumbnailQueue();
