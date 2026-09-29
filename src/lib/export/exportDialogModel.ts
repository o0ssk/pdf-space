import {
  WorkspaceDocument,
  WorkspaceSourceDocuments,
} from "../../types/workspace";
import {
  createSuggestedPdfFileName,
  validatePdfOutputFileName,
} from "./exportFileNames";
import { resolveUniquePdfFileNames } from "./exportFileNameConflicts";

export type ExportDocumentSelectionStatus =
  | "ready"
  | "empty"
  | "unavailable"
  | "exporting"
  | "exported"
  | "failed"
  | "skipped";

export type ExportDocumentSelection = {
  documentId: string;
  documentName: string;
  color: string;
  pageCount: number;
  selected: boolean;
  fileName: string;
  resolvedFileName: string;
  status: ExportDocumentSelectionStatus;
  disabledReason?: string | undefined;
  validationError?: string | undefined;
};

export function isDocumentSourceAvailable({
  document,
  sourceDocuments,
  hasSourceBlob,
}: {
  document: WorkspaceDocument;
  sourceDocuments: WorkspaceSourceDocuments;
  hasSourceBlob: (sourceDocumentId: string) => boolean;
}): boolean {
  const sourceIds = new Set(
    document.pages.map((page) => page.sourceDocumentId)
  );
  return [...sourceIds].every(
    (sourceId) => Boolean(sourceDocuments[sourceId]) && hasSourceBlob(sourceId)
  );
}

export function resolveExportDocumentSelections(
  selections: readonly ExportDocumentSelection[]
): ExportDocumentSelection[] {
  const normalizedSelectedNames = selections
    .filter((selection) => selection.selected && selection.status === "ready")
    .map((selection) => {
      const validation = validatePdfOutputFileName(selection.fileName);
      return validation.valid
        ? validation.fileName
        : createSuggestedPdfFileName(selection.documentName);
    });
  const uniqueNames = resolveUniquePdfFileNames(normalizedSelectedNames);
  let selectedIndex = 0;

  return selections.map((selection) => {
    const validation = validatePdfOutputFileName(selection.fileName);
    const isSelectedReady =
      selection.selected && selection.status === "ready";
    const resolvedFileName = isSelectedReady
      ? uniqueNames[selectedIndex++] ?? createSuggestedPdfFileName(selection.documentName)
      : validation.valid
        ? validation.fileName
        : createSuggestedPdfFileName(selection.documentName);
    return {
      ...selection,
      resolvedFileName,
      validationError:
        validation.valid === false ? validation.error : undefined,
    };
  });
}

export function createExportDocumentSelections({
  documents,
  sourceDocuments,
  hasSourceBlob,
  preselectedDocumentId,
}: {
  documents: readonly WorkspaceDocument[];
  sourceDocuments: WorkspaceSourceDocuments;
  hasSourceBlob: (sourceDocumentId: string) => boolean;
  preselectedDocumentId?: string | null;
}): ExportDocumentSelection[] {
  const selections = documents.map((document) => {
    const empty = document.status === "ready" && document.pages.length === 0;
    const available =
      document.status === "ready" &&
      !empty &&
      isDocumentSourceAvailable({
        document,
        sourceDocuments,
        hasSourceBlob,
      });
    const status: ExportDocumentSelectionStatus = empty
      ? "empty"
      : available
        ? "ready"
        : "unavailable";
    const shouldSelect = available &&
      (preselectedDocumentId
        ? document.id === preselectedDocumentId
        : true);
    const fileName = createSuggestedPdfFileName(document.name);

    return {
      documentId: document.id,
      documentName: document.name,
      color: document.color,
      pageCount: document.pages.length,
      selected: shouldSelect,
      fileName,
      resolvedFileName: fileName,
      status,
      disabledReason:
        status === "empty"
          ? "Nothing to export"
          : status === "unavailable"
            ? "One or more original PDF sources are unavailable"
            : undefined,
    };
  });
  return resolveExportDocumentSelections(selections);
}

export function toggleExportDocumentSelection(
  selections: readonly ExportDocumentSelection[],
  documentId: string
): ExportDocumentSelection[] {
  return resolveExportDocumentSelections(
    selections.map((selection) =>
      selection.documentId === documentId && selection.status === "ready"
        ? { ...selection, selected: !selection.selected }
        : selection
    )
  );
}

export function setAllExportDocumentSelections(
  selections: readonly ExportDocumentSelection[],
  selected: boolean
): ExportDocumentSelection[] {
  return resolveExportDocumentSelections(
    selections.map((selection) =>
      selection.status === "ready"
        ? { ...selection, selected }
        : selection
    )
  );
}

export function updateExportDocumentFileName(
  selections: readonly ExportDocumentSelection[],
  documentId: string,
  fileName: string
): ExportDocumentSelection[] {
  return resolveExportDocumentSelections(
    selections.map((selection) =>
      selection.documentId === documentId
        ? { ...selection, fileName }
        : selection
    )
  );
}
