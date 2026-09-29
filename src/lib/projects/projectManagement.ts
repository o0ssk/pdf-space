import {
  LocalProjectListItem,
  PersistedSourceFile,
  PersistedWorkspaceProject,
} from "../persistence/persistenceTypes";
import { PersistenceError } from "../persistence/persistenceErrors";
import {
  getRequiredSourceDocumentIds,
  validatePersistedWorkspaceProject,
} from "../persistence/workspaceSerializer";

export type ProjectSortOption =
  | "updated-desc"
  | "updated-asc"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";

export type DuplicateIdKind = "document" | "page" | "source";

export type DuplicatedProjectData = {
  project: PersistedWorkspaceProject;
  sharedSourceIds: string[];
};

export type ProjectNameValidation =
  | { valid: true; name: string }
  | { valid: false; error: string };

export function validateProjectName(name: string): ProjectNameValidation {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return { valid: false, error: "Project name cannot be empty." };
  }
  if (normalizedName.length > 100) {
    return {
      valid: false,
      error: "Project name must be 100 characters or fewer.",
    };
  }
  return { valid: true, name: normalizedName };
}

export function normalizeProjectName(name: string): string {
  const validation = validateProjectName(name);
  if (validation.valid === false) throw new Error(validation.error);
  return validation.name;
}

function readableRecordField(
  record: unknown,
  field: string
): unknown {
  return typeof record === "object" && record !== null
    ? (record as Record<string, unknown>)[field]
    : undefined;
}

function validTimestampOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function createProjectListItem(
  record: unknown,
  ownedSourceFiles: readonly PersistedSourceFile[]
): LocalProjectListItem {
  const rawId = readableRecordField(record, "id");
  const id =
    typeof rawId === "string" && rawId
      ? rawId
      : "unavailable-project";
  const rawName = readableRecordField(record, "name");
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName
      : "Project unavailable";
  const approximateSourceBytes = ownedSourceFiles.reduce(
    (sum, source) =>
      sum +
      (Number.isFinite(source.blob?.size)
        ? source.blob.size
        : Number.isFinite(source.size)
          ? source.size
          : 0),
    0
  );

  try {
    const project = validatePersistedWorkspaceProject(record);
    const ownedSourceIds = new Set(
      ownedSourceFiles
        .filter(
          (source) =>
            source.blob instanceof Blob &&
            source.blob.size > 0 &&
            source.blob.size === source.size &&
            source.blob.size === project.sourceDocuments[source.sourceDocumentId]?.size
        )
        .map((source) => source.sourceDocumentId)
    );
    const missingSources = getRequiredSourceDocumentIds(project).filter(
      (sourceId) => !ownedSourceIds.has(sourceId)
    );

    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      documentCount: project.documents.length,
      totalPageCount: project.documents.reduce(
        (sum, document) => sum + document.pages.length,
        0
      ),
      sourceCount: Object.keys(project.sourceDocuments).length,
      approximateSourceBytes,
      schemaVersion: project.schemaVersion,
      status: missingSources.length > 0 ? "missing-source" : "ready",
      statusMessage:
        missingSources.length > 0
          ? `${missingSources.length} locally stored PDF ${
              missingSources.length === 1 ? "source is" : "sources are"
            } unavailable.`
          : undefined,
    };
  } catch (error) {
    const persistenceError =
      error instanceof PersistenceError ? error : null;
    return {
      id,
      name,
      createdAt: validTimestampOrNull(
        readableRecordField(record, "createdAt")
      ),
      updatedAt: validTimestampOrNull(
        readableRecordField(record, "updatedAt")
      ),
      documentCount: 0,
      totalPageCount: 0,
      sourceCount: 0,
      approximateSourceBytes,
      schemaVersion:
        typeof readableRecordField(record, "schemaVersion") === "number"
          ? (readableRecordField(record, "schemaVersion") as number)
          : null,
      status:
        persistenceError?.kind === "newer-schema"
          ? "unsupported-version"
          : "damaged",
      statusMessage:
        persistenceError?.kind === "newer-schema"
          ? persistenceError.message
          : "This local project record could not be read safely.",
    };
  }
}

export function searchProjects(
  projects: readonly LocalProjectListItem[],
  query: string
): LocalProjectListItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [...projects];
  return projects.filter((project) =>
    project.name.toLocaleLowerCase().includes(normalizedQuery)
  );
}

function compareName(
  left: LocalProjectListItem,
  right: LocalProjectListItem
): number {
  return (
    left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
      numeric: true,
    }) || left.id.localeCompare(right.id)
  );
}

export function sortProjects(
  projects: readonly LocalProjectListItem[],
  option: ProjectSortOption
): LocalProjectListItem[] {
  return projects
    .map((project, index) => ({ project, index }))
    .sort((left, right) => {
      const a = left.project;
      const b = right.project;
      let result = 0;
      switch (option) {
        case "updated-asc":
          result = (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
          break;
        case "name-asc":
          result = compareName(a, b);
          break;
        case "name-desc":
          result = compareName(b, a);
          break;
        case "size-desc":
          result = b.approximateSourceBytes - a.approximateSourceBytes;
          break;
        case "size-asc":
          result = a.approximateSourceBytes - b.approximateSourceBytes;
          break;
        case "updated-desc":
        default:
          result = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
          break;
      }
      return result || compareName(a, b) || left.index - right.index;
    })
    .map(({ project }) => project);
}

export function createDuplicateProjectName(
  sourceName: string,
  existingNames: readonly string[]
): string {
  const names = new Set(existingNames);
  const first = `${sourceName} — Copy`;
  if (!names.has(first)) return first;
  let suffix = 2;
  while (names.has(`${first} ${suffix}`)) suffix += 1;
  return `${first} ${suffix}`;
}

export function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** unitIndex;
  const digits = unitIndex === 0 || amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
  return `${amount.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatProjectModifiedDate(
  timestamp: number | null,
  now = Date.now(),
  locale?: string
): string {
  if (
    timestamp === null ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return "Modified date unavailable";
  }
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Modified date unavailable";
  const differenceMs = timestamp - now;
  const absoluteMs = Math.abs(differenceMs);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absoluteMs < 60_000) return "Modified just now";
  if (absoluteMs < 3_600_000) {
    return `Modified ${relative.format(
      Math.round(differenceMs / 60_000),
      "minute"
    )}`;
  }
  if (absoluteMs < 86_400_000) {
    return `Modified ${relative.format(
      Math.round(differenceMs / 3_600_000),
      "hour"
    )}`;
  }
  if (absoluteMs < 172_800_000) {
    return `Modified ${relative.format(
      Math.round(differenceMs / 86_400_000),
      "day"
    )}`;
  }
  return `Modified ${new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)}`;
}

export function formatProjectCount(
  visibleCount: number,
  totalCount = visibleCount,
  filtered = false
): string {
  const noun = totalCount === 1 ? "project" : "projects";
  return filtered
    ? `${visibleCount} of ${totalCount} ${noun}`
    : `${totalCount} local ${noun}`;
}

export function remapDuplicatedProject({
  sourceProject,
  availableSourceIds,
  newProjectId,
  newProjectName,
  timestamp,
  generateId,
}: {
  sourceProject: PersistedWorkspaceProject;
  availableSourceIds: readonly string[];
  newProjectId: string;
  newProjectName: string;
  timestamp: number;
  generateId: (kind: DuplicateIdKind, originalId: string) => string;
}): DuplicatedProjectData {
  const project = validatePersistedWorkspaceProject(sourceProject);
  const documentIds = new Map(
    project.documents.map((document) => [
      document.id,
      generateId("document", document.id),
    ])
  );
  const pageIds = new Map(
    project.documents.flatMap((document) =>
      document.pages.map((page) => [
        page.id,
        generateId("page", page.id),
      ] as const)
    )
  );

  const available = new Set(availableSourceIds);
  for (const sourceId of Object.keys(project.sourceDocuments)) {
    if (!available.has(sourceId)) {
      throw new PersistenceError(
        "source-unavailable",
        `The original PDF data for source ${sourceId} is unavailable.`
      );
    }
  }

  return {
    project: {
      ...project,
      id: newProjectId,
      name: newProjectName,
      createdAt: timestamp,
      updatedAt: timestamp,
      documents: project.documents.map((document) => {
        const newDocumentId = documentIds.get(document.id)!;
        return {
          ...document,
          id: newDocumentId,
          pages: document.pages.map((page) => {
            const { duplicatedFromPageId: _duplicate, ...pageWithoutDuplicate } = page;
            void _duplicate;
            const remappedDuplicate = page.duplicatedFromPageId
              ? pageIds.get(page.duplicatedFromPageId)
              : undefined;
            return {
              ...pageWithoutDuplicate,
              id: pageIds.get(page.id)!,
              documentId: newDocumentId,
              sourceDocumentId: page.sourceDocumentId,
              ...(remappedDuplicate
                ? { duplicatedFromPageId: remappedDuplicate }
                : {}),
            };
          }),
        };
      }),
      sourceDocuments: Object.fromEntries(
        Object.entries(project.sourceDocuments).map(([sourceId, source]) => [
          sourceId,
          { ...source },
        ])
      ),
    },
    sharedSourceIds: Object.keys(project.sourceDocuments),
  };
}
