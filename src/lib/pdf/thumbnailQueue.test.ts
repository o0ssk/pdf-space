import { describe, expect, it, vi } from "vitest";
import { ThumbnailQueue } from "./thumbnailQueue";

describe("ThumbnailQueue cancellation", () => {
  it("marks an active job cancelled and suppresses completion work", async () => {
    const queue = new ThumbnailQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const onCancel = vi.fn();
    const completed = vi.fn();

    queue.enqueue({
      id: "page-a",
      onCancel,
      run: async ({ isCancelled }) => {
        await gate;
        if (!isCancelled()) completed();
      },
    });

    queue.cancelPages(["page-a"]);
    release();
    await gate;
    await Promise.resolve();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(completed).not.toHaveBeenCalled();
  });
});
