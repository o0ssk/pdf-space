class OriginalSourceBlobRegistry {
  private readonly blobs = new Map<string, Blob>();

  register(sourceDocumentId: string, blob: Blob): void {
    this.blobs.set(sourceDocumentId, blob);
  }

  get(sourceDocumentId: string): Blob | undefined {
    return this.blobs.get(sourceDocumentId);
  }

  unregister(sourceDocumentId: string): void {
    this.blobs.delete(sourceDocumentId);
  }

  clear(): void {
    this.blobs.clear();
  }
}

export const originalSourceBlobRegistry = new OriginalSourceBlobRegistry();
