import * as pdfjsLib from "pdfjs-dist";
import type {
  PDFDocumentProxy as PdfJsDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

// Set the worker source pointing to the local node_modules entry
// resolved as a bundle asset URL in Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export { pdfjsLib };
export type PDFDocumentProxy = PdfJsDocumentProxy & {
  destroy?: () => Promise<void> | void;
};
export type { PDFPageProxy, RenderTask };
