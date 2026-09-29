const DOWNLOAD_URL_REVOKE_DELAY_MS = 1_000;

export function downloadBlob({
  blob,
  fileName,
}: {
  blob: Blob;
  fileName: string;
}): void {
  const url = objectUrlRegistry.create(blob, "download", fileName);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => {
      objectUrlRegistry.revoke(url);
    }, DOWNLOAD_URL_REVOKE_DELAY_MS);
  }
}
import { objectUrlRegistry } from "../resources/objectUrlRegistry";
