import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThumbnailUrlManager } from "./thumbnailUrls";

describe("ThumbnailUrlManager", () => {
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const revokeObjectUrl = vi.fn();

  beforeEach(() => {
    revokeObjectUrl.mockClear();
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  });

  it("registers one URL per stable page ID and revokes replacements", () => {
    const manager = new ThumbnailUrlManager();
    manager.register("page-a", "blob:first");
    manager.register("page-a", "blob:second");

    expect(manager.get("page-a")).toBe("blob:second");
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:first");
  });

  it("revokes selected pages and all remaining URLs", () => {
    const manager = new ThumbnailUrlManager();
    manager.register("page-a", "blob:a");
    manager.register("page-b", "blob:b");
    manager.register("page-c", "blob:c");

    manager.revokeMany(["page-a", "page-b"]);
    manager.clear();

    expect(revokeObjectUrl.mock.calls.flat()).toEqual([
      "blob:a",
      "blob:b",
      "blob:c",
    ]);
  });
});
