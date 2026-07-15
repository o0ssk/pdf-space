export class ThumbnailUrlManager {
  private urls = new Map<string, string>();

  /**
   * Registers an Object URL for a specific page thumbnail.
   */
  register(pageId: string, url: string) {
    if (this.urls.get(pageId) === url) return;
    this.revoke(pageId);
    this.urls.set(pageId, url);
  }

  /**
   * Gets the registered Object URL for a page thumbnail.
   */
  get(pageId: string): string | undefined {
    return this.urls.get(pageId);
  }

  /**
   * Revokes the Object URL of a page thumbnail to free memory.
   */
  revoke(pageId: string) {
    const url = this.urls.get(pageId);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Error revoking Object URL for page ${pageId}:`, err);
      }
      this.urls.delete(pageId);
    }
  }

  /** Revokes Object URLs owned by the supplied stable page IDs. */
  revokeMany(pageIds: Iterable<string>) {
    for (const pageId of pageIds) {
      this.revoke(pageId);
    }
  }

  /**
   * Cleans up all registered Object URLs in the workspace.
   */
  clear() {
    for (const url of Array.from(this.urls.values())) {
      try {
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error revoking Object URL during clear:", err);
      }
    }
    this.urls.clear();
  }
}

export const thumbnailUrlManager = new ThumbnailUrlManager();
