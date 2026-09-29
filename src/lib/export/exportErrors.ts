export type PdfExportErrorCode =
  | "DOCUMENT_NOT_FOUND"
  | "EMPTY_DOCUMENT"
  | "SOURCE_METADATA_MISSING"
  | "SOURCE_FILE_MISSING"
  | "SOURCE_FILE_INVALID"
  | "SOURCE_READ_FAILED"
  | "SOURCE_ENCRYPTED_OR_UNSUPPORTED"
  | "SOURCE_LOAD_FAILED"
  | "PAGE_INDEX_OUT_OF_RANGE"
  | "PAGE_COPY_FAILED"
  | "PDF_SAVE_FAILED"
  | "EXPORT_CANCELLED"
  | "UNKNOWN";

export type PdfExportErrorDetails = {
  documentId?: string | undefined;
  documentName?: string | undefined;
  pageId?: string | undefined;
  sourceDocumentId?: string | undefined;
  sourceDocumentName?: string | undefined;
  sourceNumber?: number | undefined;
  totalSources?: number | undefined;
  sourceOrigin?: "memory" | "indexeddb" | "test" | undefined;
  blobSize?: number | undefined;
  blobType?: string | undefined;
  affectedDocumentIds?: string[] | undefined;
  affectedDocumentNames?: string[] | undefined;
  originalPageIndex?: number | undefined;
};

export class PdfExportError extends Error {
  readonly code: PdfExportErrorCode;
  readonly details: PdfExportErrorDetails | undefined;

  constructor(
    code: PdfExportErrorCode,
    message: string,
    details?: PdfExportErrorDetails,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "PdfExportError";
    this.code = code;
    this.details = details;
  }
}

export function asPdfExportError(
  error: unknown,
  fallbackCode: PdfExportErrorCode = "UNKNOWN",
  fallbackMessage = "The PDF export could not be completed.",
  details?: PdfExportErrorDetails
): PdfExportError {
  if (error instanceof PdfExportError) return error;
  return new PdfExportError(fallbackCode, fallbackMessage, details, {
    cause: error,
  });
}

export function throwIfExportCancelled(
  signal: AbortSignal | undefined,
  details?: PdfExportErrorDetails
): void {
  if (!signal?.aborted) return;
  throw new PdfExportError(
    "EXPORT_CANCELLED",
    "The PDF export was cancelled.",
    details,
    { cause: signal.reason }
  );
}
