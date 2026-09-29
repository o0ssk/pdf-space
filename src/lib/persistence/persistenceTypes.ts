import {
  PageRotation,
  WorkspaceSourceDocument,
} from "../../types/workspace";

export const PERSISTENCE_SCHEMA_VERSION = 1;
export const PROJECT_ENVELOPE_SCHEMA_VERSION = 1;
export const PROJECT_RECOVERY_RETENTION = 5;
export const PROJECT_SUMMARY_SCHEMA_VERSION = 1;
export const SOURCE_METADATA_SCHEMA_VERSION = 1;

export type PersistedWorkspacePage = {
  id: string;
  documentId: string;
  sourceDocumentId: string;
  originalPageIndex: number;
  rotation: PageRotation;
  duplicatedFromPageId?: string | undefined;
};

export type PersistedWorkspaceDocument = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  color: string;
  pages: PersistedWorkspacePage[];
};

export type PersistedSourceDocument = WorkspaceSourceDocument & {
  lastModified?: number | undefined;
};

export type PersistedWorkspaceProject = {
  schemaVersion: typeof PERSISTENCE_SCHEMA_VERSION;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  documents: PersistedWorkspaceDocument[];
  sourceDocuments: Record<string, PersistedSourceDocument>;
};

export type PersistedSourceFile = {
  sourceDocumentId: string;
  projectId: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  lastModified?: number | undefined;
  createdAt: number;
  sha256?: string | undefined;
};

export type PersistedSourceMetadata = {
  sourceDocumentId: string;
  name: string;
  mimeType: string;
  size: number;
  importedAt: string;
  pageCount?: number | undefined;
  sha256?: string | undefined;
  schemaVersion: typeof SOURCE_METADATA_SCHEMA_VERSION;
};

export type PersistedSourceReference = {
  sourceDocumentId: string;
  projectId: string;
};

export type PersistedProjectHealth =
  | "healthy"
  | "recovered"
  | "missing-sources"
  | "needs-attention"
  | "unrecoverable";

export type PersistedProjectSummary = {
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  currentRevision: number;
  schemaVersion: typeof PROJECT_SUMMARY_SCHEMA_VERSION;
  projectSchemaVersion: number;
  documentCount: number;
  pageCount: number;
  uniqueSourceCount: number;
  totalSourceBytes: number;
  health: PersistedProjectHealth;
  missingSourceCount: number;
  recoveredRevision?: number | undefined;
};

export type ProjectSummaryRepairReason =
  | "SUMMARY_MISSING"
  | "SUMMARY_INVALID"
  | "SUMMARY_REVISION_STALE"
  | "SOURCE_METADATA_MISSING"
  | "PROJECT_HEAD_MISSING"
  | "CURRENT_REVISION_MISSING"
  | "UNKNOWN";

export type PersistenceReadMetrics = {
  projectSummaryReads: number;
  projectHeadReads: number;
  projectRevisionReads: number;
  sourceMetadataReads: number;
  sourceBlobReads: number;
  sourceBlobBytesMaterialized: number;
};

export type PersistedProjectChecksum = {
  algorithm: "SHA-256";
  encoding: "base64url";
  digest: string;
};

export type PersistedProjectEnvelope = {
  format: "pdf-space-project";
  schemaVersion: typeof PROJECT_ENVELOPE_SCHEMA_VERSION;
  projectId: string;
  revision: number;
  createdAt: string;
  savedAt: string;
  checksum: PersistedProjectChecksum;
  project: PersistedWorkspaceProject;
};

export type PersistedProjectHead = {
  projectId: string;
  currentRevision: number;
  updatedAt: string;
  schemaVersion: typeof PROJECT_ENVELOPE_SCHEMA_VERSION;
  logicalChecksum: string;
  recoveryStatus?: "healthy" | "recovered" | "needs-attention" | undefined;
};

export type ProjectRecoveryReason =
  | "HEAD_MISSING"
  | "HEAD_REVISION_MISSING"
  | "CHECKSUM_MISMATCH"
  | "PROJECT_STRUCTURE_INVALID"
  | "UNSUPPORTED_SCHEMA"
  | "MIGRATION_FAILED"
  | "REVISION_READ_FAILED"
  | "SOURCE_RECORDS_MISSING"
  | "UNKNOWN";

export type SourceFileHealth =
  | { status: "healthy"; sourceDocumentId: string; size: number }
  | { status: "missing"; sourceDocumentId: string }
  | { status: "empty"; sourceDocumentId: string }
  | {
      status: "size-mismatch";
      sourceDocumentId: string;
      expectedSize?: number | undefined;
      actualSize: number;
    }
  | { status: "unreadable"; sourceDocumentId: string };

export type MissingSourceDependency = {
  sourceDocumentId: string;
  sourceName?: string | undefined;
  affectedDocumentIds: string[];
  affectedPageIds: string[];
  affectedPageCount: number;
};

export type ProjectSourceHealth = {
  status: "healthy" | "partial";
  sources: SourceFileHealth[];
  missingDependencies: MissingSourceDependency[];
};

export type ProjectLoadResult =
  | {
      status: "healthy";
      project: PersistedWorkspaceProject;
      revision: number;
      envelope: PersistedProjectEnvelope;
      sourceHealth: ProjectSourceHealth;
    }
  | {
      status: "recovered";
      project: PersistedWorkspaceProject;
      recoveredRevision: number;
      invalidHeadRevision?: number | undefined;
      reason: ProjectRecoveryReason;
      validFallbackCount: number;
      envelope: PersistedProjectEnvelope;
      sourceHealth: ProjectSourceHealth;
    }
  | {
      status: "unrecoverable";
      projectId: string;
      reasons: ProjectRecoveryReason[];
    };

export type ProjectCommitResult = {
  status: "committed" | "unchanged";
  revision: number;
  savedAt: number;
  checksum: string;
};

export type PdfSpaceSetting =
  | {
      key: "lastOpenedProjectId";
      value: string;
    }
  | {
      key: "projectSummaryMigrationVersion";
      value: number;
    };

export type LocalProjectStatus =
  | "ready"
  | "missing-source"
  | "recovered"
  | "needs-attention"
  | "damaged"
  | "unsupported-version";

export type LocalProjectListItem = {
  id: string;
  name: string;
  createdAt: number | null;
  updatedAt: number | null;
  documentCount: number;
  totalPageCount: number;
  sourceCount: number;
  approximateSourceBytes: number;
  schemaVersion: number | null;
  status: LocalProjectStatus;
  statusMessage?: string | undefined;
  currentRevision?: number | undefined;
  recoveryRevisionCount?: number | undefined;
};

export type PersistenceSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "unavailable"
  | "conflict";

export type PersistenceRevisionState = {
  projectRevision: number;
  savedRevision: number;
  savingRevision: number | null;
  status: PersistenceSaveStatus;
  lastSavedAt: number | null;
  errorMessage?: string | undefined;
};
