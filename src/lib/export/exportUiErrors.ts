import { PdfExportError } from "./exportErrors";

export type ExportUiError = {
  title: string;
  description: string;
  recoverable: boolean;
  sourceDocumentName?: string;
  sourceNumber?: number;
  totalSources?: number;
  affectedDocumentIds?: string[];
  affectedDocumentNames?: string[];
};

export function mapPdfExportErrorToUi(
  error: PdfExportError
): ExportUiError {
  switch (error.code) {
    case "SOURCE_METADATA_MISSING":
    case "SOURCE_FILE_MISSING":
      return {
        title: "Original PDF source unavailable",
        description:
          "One or more pages depend on a PDF that is no longer available locally.",
        recoverable: true,
      };
    case "PAGE_INDEX_OUT_OF_RANGE":
      return {
        title: "A page could not be exported",
        description: "The saved source page reference is invalid.",
        recoverable: false,
      };
    case "SOURCE_FILE_INVALID":
    case "SOURCE_READ_FAILED":
    case "SOURCE_ENCRYPTED_OR_UNSUPPORTED":
    case "SOURCE_LOAD_FAILED":
    case "PAGE_COPY_FAILED":
      return {
        title: "This PDF could not be processed",
        description:
          "The source may be encrypted, damaged, or use an unsupported PDF structure.",
        recoverable: true,
      };
    case "EMPTY_DOCUMENT":
      return {
        title: "Nothing to export",
        description: "This document group does not contain any pages.",
        recoverable: false,
      };
    case "EXPORT_CANCELLED":
      return {
        title: "Export cancelled",
        description:
          "The export stopped at the next safe cancellation checkpoint.",
        recoverable: true,
      };
    default:
      return {
        title: "Export could not be completed",
        description:
          "Try exporting fewer documents at once or close other browser tabs.",
        recoverable: true,
      };
  }
}
