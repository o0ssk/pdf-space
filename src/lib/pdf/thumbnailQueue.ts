export type ThumbnailTaskContext = {
  isCancelled: () => boolean;
};

type RenderTask = {
  id: string;
  run: (context: ThumbnailTaskContext) => Promise<void>;
  onCancel?: () => void;
};

type ActiveRenderTask = {
  task: RenderTask;
  cancelled: boolean;
};

export class ThumbnailQueue {
  private queue: RenderTask[] = [];
  private activeTasks = new Map<string, ActiveRenderTask>();
  private maxConcurrency = 3;

  setConcurrency(limit: number) {
    this.maxConcurrency = Math.max(1, limit);
    this.processNext();
  }

  enqueue(task: RenderTask) {
    if (
      this.queue.some((candidate) => candidate.id === task.id) ||
      this.activeTasks.has(task.id)
    ) {
      return;
    }

    this.queue.push(task);
    this.processNext();
  }

  private processNext() {
    while (
      this.activeTasks.size < this.maxConcurrency &&
      this.queue.length > 0
    ) {
      const task = this.queue.shift();
      if (!task) return;

      const activeTask: ActiveRenderTask = { task, cancelled: false };
      this.activeTasks.set(task.id, activeTask);

      void task
        .run({ isCancelled: () => activeTask.cancelled })
        .catch((error) => {
          if (!activeTask.cancelled) {
            console.error(
              `Error executing rendering task for page ${task.id}:`,
              error
            );
          }
        })
        .finally(() => {
          this.activeTasks.delete(task.id);
          this.processNext();
        });
    }
  }

  cancelPages(pageIds: Iterable<string>) {
    const ids = new Set(pageIds);

    this.queue = this.queue.filter((task) => {
      if (!ids.has(task.id)) return true;
      task.onCancel?.();
      return false;
    });

    for (const [pageId, activeTask] of this.activeTasks) {
      if (!ids.has(pageId) || activeTask.cancelled) continue;
      activeTask.cancelled = true;
      activeTask.task.onCancel?.();
    }
  }

  clear() {
    for (const task of this.queue) {
      task.onCancel?.();
    }
    this.queue = [];

    for (const activeTask of this.activeTasks.values()) {
      if (!activeTask.cancelled) {
        activeTask.cancelled = true;
        activeTask.task.onCancel?.();
      }
    }
  }
}

export const thumbnailQueue = new ThumbnailQueue();
