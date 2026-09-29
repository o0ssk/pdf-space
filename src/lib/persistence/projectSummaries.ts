import {
  LocalProjectListItem,
  PersistedProjectHealth,
  PersistedProjectSummary,
  PersistedSourceFile,
  PersistedSourceMetadata,
  PersistedWorkspaceProject,
  PROJECT_SUMMARY_SCHEMA_VERSION,
  SOURCE_METADATA_SCHEMA_VERSION,
} from "./persistenceTypes";

export type ProjectSummaryBuildInput = {
  project: PersistedWorkspaceProject;
  revision: number;
  sourceMetadataById: ReadonlyMap<string, PersistedSourceMetadata>;
  health?: PersistedProjectHealth;
  missingSourceIds?: ReadonlySet<string>;
  recoveredRevision?: number;
};

export type ProjectSummaryValidationResult =
  | { valid: true; summary: PersistedProjectSummary }
  | { valid: false; reason: string };

export type SourceMetadataValidationResult =
  | { valid: true; metadata: PersistedSourceMetadata }
  | { valid: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function toIsoTimestamp(value: number): string {
  return new Date(value).toISOString();
}

export function getCurrentProjectSourceIds(
  project: PersistedWorkspaceProject
): string[] {
  const ids = new Set<string>();
  for (const document of project.documents) {
    for (const page of document.pages) ids.add(page.sourceDocumentId);
  }
  return [...ids];
}

export function buildPersistedProjectSummary({
  project,
  revision,
  sourceMetadataById,
  health = "healthy",
  missingSourceIds = new Set<string>(),
  recoveredRevision,
}: ProjectSummaryBuildInput): PersistedProjectSummary {
  const sourceIds = getCurrentProjectSourceIds(project);
  let totalSourceBytes = 0;
  let missingSourceCount = 0;
  for (const sourceId of sourceIds) {
    const metadata = sourceMetadataById.get(sourceId);
    if (!metadata || missingSourceIds.has(sourceId)) {
      missingSourceCount += 1;
      continue;
    }
    totalSourceBytes += metadata.size;
  }
  const resolvedHealth =
    health === "healthy" && missingSourceCount > 0 ? "missing-sources" : health;
  return {
    projectId: project.id,
    name: project.name,
    createdAt: toIsoTimestamp(project.createdAt),
    updatedAt: toIsoTimestamp(project.updatedAt),
    currentRevision: revision,
    schemaVersion: PROJECT_SUMMARY_SCHEMA_VERSION,
    projectSchemaVersion: project.schemaVersion,
    documentCount: project.documents.length,
    pageCount: project.documents.reduce((sum, document) => sum + document.pages.length, 0),
    uniqueSourceCount: sourceIds.length,
    totalSourceBytes,
    health: resolvedHealth,
    missingSourceCount,
    ...(recoveredRevision === undefined ? {} : { recoveredRevision }),
  };
}

export function buildPersistedSourceMetadata(
  sourceFile: PersistedSourceFile,
  project?: PersistedWorkspaceProject
): PersistedSourceMetadata {
  const sourceDocument = project?.sourceDocuments[sourceFile.sourceDocumentId];
  return {
    sourceDocumentId: sourceFile.sourceDocumentId,
    name: sourceDocument?.name ?? sourceFile.name,
    mimeType: sourceDocument?.mimeType ?? sourceFile.type,
    size: sourceFile.blob instanceof Blob ? sourceFile.blob.size : sourceFile.size,
    importedAt: toIsoTimestamp(sourceDocument?.importedAt ?? sourceFile.createdAt),
    ...(sourceDocument?.originalPageCount === undefined
      ? {}
      : { pageCount: sourceDocument.originalPageCount }),
    ...(sourceFile.sha256 === undefined ? {} : { sha256: sourceFile.sha256 }),
    schemaVersion: SOURCE_METADATA_SCHEMA_VERSION,
  };
}

const PROJECT_HEALTH_VALUES = new Set<PersistedProjectHealth>([
  "healthy",
  "recovered",
  "missing-sources",
  "needs-attention",
  "unrecoverable",
]);

export function validatePersistedProjectSummary(
  value: unknown
): ProjectSummaryValidationResult {
  if (!isRecord(value)) return { valid: false, reason: "Summary is not an object." };
  if (typeof value.projectId !== "string" || !value.projectId) {
    return { valid: false, reason: "Project ID is invalid." };
  }
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 100) {
    return { valid: false, reason: "Project name is invalid." };
  }
  if (!isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt)) {
    return { valid: false, reason: "Project timestamps are invalid." };
  }
  if (value.schemaVersion !== PROJECT_SUMMARY_SCHEMA_VERSION) {
    return { valid: false, reason: "Project summary schema is unsupported." };
  }
  if (
    !isNonNegativeInteger(value.currentRevision) ||
    value.currentRevision < 1 ||
    !isNonNegativeInteger(value.projectSchemaVersion) ||
    !isNonNegativeInteger(value.documentCount) ||
    !isNonNegativeInteger(value.pageCount) ||
    !isNonNegativeInteger(value.uniqueSourceCount) ||
    !isNonNegativeInteger(value.totalSourceBytes) ||
    !isNonNegativeInteger(value.missingSourceCount)
  ) {
    return { valid: false, reason: "Project summary counts are invalid." };
  }
  if (!PROJECT_HEALTH_VALUES.has(value.health as PersistedProjectHealth)) {
    return { valid: false, reason: "Project health is invalid." };
  }
  if (value.missingSourceCount > value.uniqueSourceCount) {
    return { valid: false, reason: "Missing source count exceeds the source count." };
  }
  if (
    value.recoveredRevision !== undefined &&
    (!isNonNegativeInteger(value.recoveredRevision) || value.recoveredRevision < 1)
  ) {
    return { valid: false, reason: "Recovered revision is invalid." };
  }
  return { valid: true, summary: value as PersistedProjectSummary };
}

export function validatePersistedSourceMetadata(
  value: unknown
): SourceMetadataValidationResult {
  if (!isRecord(value)) return { valid: false, reason: "Source metadata is not an object." };
  if (typeof value.sourceDocumentId !== "string" || !value.sourceDocumentId) {
    return { valid: false, reason: "Source ID is invalid." };
  }
  if (typeof value.name !== "string" || !value.name) {
    return { valid: false, reason: "Source name is invalid." };
  }
  if (typeof value.mimeType !== "string" || !value.mimeType) {
    return { valid: false, reason: "Source MIME type is invalid." };
  }
  if (!isNonNegativeInteger(value.size) || !isIsoTimestamp(value.importedAt)) {
    return { valid: false, reason: "Source size or timestamp is invalid." };
  }
  if (
    value.pageCount !== undefined &&
    (!isNonNegativeInteger(value.pageCount) || value.pageCount < 1)
  ) {
    return { valid: false, reason: "Source page count is invalid." };
  }
  if (value.sha256 !== undefined && typeof value.sha256 !== "string") {
    return { valid: false, reason: "Source checksum metadata is invalid." };
  }
  if (value.schemaVersion !== SOURCE_METADATA_SCHEMA_VERSION) {
    return { valid: false, reason: "Source metadata schema is unsupported." };
  }
  return { valid: true, metadata: value as PersistedSourceMetadata };
}

export function mapSummaryToProjectListItem(
  summary: PersistedProjectSummary
): LocalProjectListItem {
  const createdAt = Date.parse(summary.createdAt);
  const updatedAt = Date.parse(summary.updatedAt);
  const status =
    summary.health === "healthy"
      ? "ready"
      : summary.health === "missing-sources"
        ? "missing-source"
        : summary.health === "unrecoverable"
          ? "damaged"
          : summary.health;
  const missingMessage = `${summary.missingSourceCount} locally stored PDF ${
    summary.missingSourceCount === 1 ? "source is" : "sources are"
  } unavailable.`;
  return {
    id: summary.projectId,
    name: summary.name,
    createdAt: Number.isFinite(createdAt) ? createdAt : null,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : null,
    documentCount: summary.documentCount,
    totalPageCount: summary.pageCount,
    sourceCount: summary.uniqueSourceCount,
    approximateSourceBytes: summary.totalSourceBytes,
    schemaVersion: summary.projectSchemaVersion,
    status,
    statusMessage:
      summary.missingSourceCount > 0
        ? missingMessage
        : summary.health === "recovered"
          ? "A verified earlier local revision is available."
          : summary.health === "needs-attention"
            ? "This project needs an integrity check before it can be opened."
            : summary.health === "unrecoverable"
              ? "This local project could not be recovered safely."
              : undefined,
    currentRevision: summary.currentRevision,
  };
}
