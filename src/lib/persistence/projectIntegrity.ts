export type ProjectValidationIssue = {
  code:
    | "PROJECT_ID_MISSING"
    | "PROJECT_NAME_INVALID"
    | "NO_DOCUMENTS"
    | "DUPLICATE_DOCUMENT_ID"
    | "DUPLICATE_PAGE_ID"
    | "DOCUMENT_NAME_INVALID"
    | "SOURCE_ID_MISSING"
    | "PAGE_INDEX_INVALID"
    | "ROTATION_INVALID"
    | "DUPLICATE_REFERENCE_INVALID"
    | "RUNTIME_FIELD_PRESENT"
    | "UNSUPPORTED_SCHEMA"
    | "UNKNOWN";
  severity: "error" | "warning";
  path?: string | undefined;
  message: string;
};

export type ProjectValidationResult = {
  valid: boolean;
  issues: ProjectValidationIssue[];
};

const ROTATIONS = new Set([0, 90, 180, 270]);
const RUNTIME_FIELDS = new Set([
  "thumbnailStatus",
  "thumbnailUrl",
  "errorMessage",
  "pageNumber",
  "pageCount",
  "status",
  "viewerOpen",
  "viewerPageId",
  "viewerDocumentId",
  "selection",
]);
const MAX_DOCUMENTS = 10_000;
const MAX_PAGES = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(
  issues: ProjectValidationIssue[],
  code: ProjectValidationIssue["code"],
  message: string,
  path?: string,
  severity: ProjectValidationIssue["severity"] = "error"
) {
  issues.push({ code, severity, path, message });
}

function findRuntimeFields(
  value: unknown,
  path: string,
  issues: ProjectValidationIssue[]
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => findRuntimeFields(item, `${path}[${index}]`, issues));
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (RUNTIME_FIELDS.has(key)) {
      push(
        issues,
        "RUNTIME_FIELD_PRESENT",
        "Runtime-only workspace state cannot be persisted.",
        `${path}.${key}`
      );
    }
    findRuntimeFields(child, `${path}.${key}`, issues);
  }
}

export function validatePersistedWorkspaceProjectStructure(
  input: unknown,
  options: { allowInitialEmpty?: boolean } = {}
): ProjectValidationResult {
  const issues: ProjectValidationIssue[] = [];
  if (!isRecord(input)) {
    push(issues, "UNKNOWN", "The project payload is not an object.", "$project");
    return { valid: false, issues };
  }
  if (input.schemaVersion !== 1) {
    push(
      issues,
      "UNSUPPORTED_SCHEMA",
      "The project schema is not supported by this version of PDF Space.",
      "$project.schemaVersion"
    );
  }
  if (typeof input.id !== "string" || !input.id.trim()) {
    push(issues, "PROJECT_ID_MISSING", "The project ID is missing.", "$project.id");
  }
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 100
  ) {
    push(
      issues,
      "PROJECT_NAME_INVALID",
      "The project name must contain 1 to 100 characters.",
      "$project.name"
    );
  }
  if (!Array.isArray(input.documents)) {
    push(issues, "NO_DOCUMENTS", "The project document list is invalid.", "$project.documents");
    return { valid: false, issues };
  }
  if (input.documents.length === 0 && !options.allowInitialEmpty) {
    push(issues, "NO_DOCUMENTS", "The project contains no document groups.", "$project.documents");
  }
  if (input.documents.length > MAX_DOCUMENTS) {
    push(issues, "UNKNOWN", "The project contains too many document groups to open safely.", "$project.documents");
  }
  if (!isRecord(input.sourceDocuments)) {
    push(issues, "SOURCE_ID_MISSING", "The source metadata collection is invalid.", "$project.sourceDocuments");
  }

  const documentIds = new Set<string>();
  const pageIds = new Set<string>();
  const duplicateReferences: Array<{ value: string; path: string; pageId: string }> = [];
  let pageCount = 0;
  input.documents.forEach((document, documentIndex) => {
    const path = `$project.documents[${documentIndex}]`;
    if (!isRecord(document)) {
      push(issues, "UNKNOWN", "A document group is invalid.", path);
      return;
    }
    if (typeof document.id !== "string" || !document.id.trim()) {
      push(issues, "DUPLICATE_DOCUMENT_ID", "A document ID is missing.", `${path}.id`);
    } else if (documentIds.has(document.id)) {
      push(issues, "DUPLICATE_DOCUMENT_ID", "Document IDs must be unique.", `${path}.id`);
    } else documentIds.add(document.id);
    if (
      typeof document.name !== "string" ||
      !document.name.trim() ||
      document.name.trim().length > 100
    ) {
      push(issues, "DOCUMENT_NAME_INVALID", "Document names must contain 1 to 100 characters.", `${path}.name`);
    }
    if (!Array.isArray(document.pages)) {
      push(issues, "UNKNOWN", "A document page list is invalid.", `${path}.pages`);
      return;
    }
    pageCount += document.pages.length;
    document.pages.forEach((page, pageIndex) => {
      const pagePath = `${path}.pages[${pageIndex}]`;
      if (!isRecord(page)) {
        push(issues, "UNKNOWN", "A page record is invalid.", pagePath);
        return;
      }
      if (typeof page.id !== "string" || !page.id.trim()) {
        push(issues, "DUPLICATE_PAGE_ID", "A page ID is missing.", `${pagePath}.id`);
      } else if (pageIds.has(page.id)) {
        push(issues, "DUPLICATE_PAGE_ID", "Page IDs must be unique.", `${pagePath}.id`);
      } else pageIds.add(page.id);
      if (page.documentId !== document.id) {
        push(issues, "DUPLICATE_PAGE_ID", "A page must belong to exactly one document group.", `${pagePath}.documentId`);
      }
      if (
        typeof page.sourceDocumentId !== "string" ||
        !page.sourceDocumentId.trim() ||
        !isRecord(input.sourceDocuments) ||
        !isRecord(input.sourceDocuments[page.sourceDocumentId])
      ) {
        push(issues, "SOURCE_ID_MISSING", "A page references missing source metadata.", `${pagePath}.sourceDocumentId`);
      }
      if (!Number.isInteger(page.originalPageIndex) || Number(page.originalPageIndex) < 0) {
        push(issues, "PAGE_INDEX_INVALID", "Original page indices must be non-negative integers.", `${pagePath}.originalPageIndex`);
      }
      if (!ROTATIONS.has(page.rotation as number)) {
        push(issues, "ROTATION_INVALID", "Page rotation must be 0, 90, 180, or 270.", `${pagePath}.rotation`);
      }
      if (page.duplicatedFromPageId !== undefined) {
        if (
          typeof page.duplicatedFromPageId !== "string" ||
          !page.duplicatedFromPageId ||
          page.duplicatedFromPageId === page.id
        ) {
          push(issues, "DUPLICATE_REFERENCE_INVALID", "A duplicate page cannot reference itself or an empty ID.", `${pagePath}.duplicatedFromPageId`);
        } else {
          duplicateReferences.push({
            value: page.duplicatedFromPageId,
            path: `${pagePath}.duplicatedFromPageId`,
            pageId: String(page.id),
          });
        }
      }
    });
  });
  if (pageCount > MAX_PAGES) {
    push(issues, "UNKNOWN", "The project contains too many pages to open safely.", "$project.documents");
  }
  for (const reference of duplicateReferences) {
    if (!pageIds.has(reference.value)) {
      push(
        issues,
        "DUPLICATE_REFERENCE_INVALID",
        `Page ${reference.pageId} refers to a duplicate source page that is no longer present.`,
        reference.path,
        "warning"
      );
    }
  }
  findRuntimeFields(input, "$project", issues);
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
  };
}
