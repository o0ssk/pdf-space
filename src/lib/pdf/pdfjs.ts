import * as pdfjsLib from "pdfjs-dist";

// Set the worker source pointing to the local node_modules entry
// resolved as a bundle asset URL in Vite.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export { pdfjsLib };
export type PDFDocumentProxy = any; // use loose typing for robustness across different version type definitions
export type PDFPageProxy = any;
