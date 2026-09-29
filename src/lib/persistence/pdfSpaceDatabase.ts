import { DBSchema, IDBPDatabase, openDB } from "idb";
import {
  LocalProjectListItem,
  PdfSpaceSetting,
  PersistedProjectEnvelope,
  PersistedProjectHead,
  PersistedProjectHealth,
  PersistedProjectSummary,
  PersistedSourceFile,
  PersistedSourceMetadata,
  PersistedSourceReference,
  PersistedWorkspaceProject,
  ProjectCommitResult,
  ProjectLoadResult,
  ProjectRecoveryReason,
  ProjectSourceHealth,
  PROJECT_ENVELOPE_SCHEMA_VERSION,
  PROJECT_RECOVERY_RETENTION,
} from "./persistenceTypes";
import { normalizePersistenceError, PersistenceError } from "./persistenceErrors";
import {
  createDuplicateProjectName,
  normalizeProjectName,
  remapDuplicatedProject,
} from "../projects/projectManagement";
import {
  getRequiredSourceDocumentIds,
  validatePersistedWorkspaceProject,
} from "./workspaceSerializer";
import { validatePersistedWorkspaceProjectStructure } from "./projectIntegrity";
import {
  createPersistedProjectEnvelope,
  createProjectLogicalChecksum,
  verifyPersistedProjectChecksum,
} from "./projectChecksum";
import { publishLocalProjectEvent } from "./projectEvents";
import { triggerPersistenceFault } from "./persistenceFaults";
import {
  buildPersistedProjectSummary,
  buildPersistedSourceMetadata,
  getCurrentProjectSourceIds,
  mapSummaryToProjectListItem,
  validatePersistedProjectSummary,
  validatePersistedSourceMetadata,
} from "./projectSummaries";
import {
  recordPersistenceRead,
  recordSourceBlobRead,
} from "./persistenceReadMetrics";

export const DATABASE_NAME = "pdf-space";
export const DATABASE_VERSION = 3;

interface PdfSpaceDatabaseSchema extends DBSchema {
  projects: {
    key: string;
    value: PersistedWorkspaceProject;
    indexes: { "by-updated-at": number };
  };
  projectHeads: {
    key: string;
    value: PersistedProjectHead;
    indexes: { "by-updated-at": string };
  };
  projectRevisions: {
    key: [string, number];
    value: PersistedProjectEnvelope;
    indexes: { "by-project-id": string; "by-saved-at": string };
  };
  sourceFiles: {
    key: string;
    value: PersistedSourceFile;
    indexes: { "by-project-id": string };
  };
  sourceMetadata: {
    key: string;
    value: PersistedSourceMetadata;
  };
  sourceReferences: {
    key: [string, string];
    value: PersistedSourceReference;
    indexes: { "by-project-id": string; "by-source-id": string };
  };
  projectSummaries: {
    key: string;
    value: PersistedProjectSummary;
    indexes: { "by-updated-at": string };
  };
  settings: {
    key: PdfSpaceSetting["key"];
    value: PdfSpaceSetting;
  };
}

let databasePromise: Promise<IDBPDatabase<PdfSpaceDatabaseSchema>> | null = null;

export function getPdfSpaceDatabase() {
  if (!databasePromise) {
    databasePromise = openDB<PdfSpaceDatabaseSchema>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const projects = database.createObjectStore("projects", { keyPath: "id" });
          projects.createIndex("by-updated-at", "updatedAt");
          const sourceFiles = database.createObjectStore("sourceFiles", {
            keyPath: "sourceDocumentId",
          });
          sourceFiles.createIndex("by-project-id", "projectId");
          database.createObjectStore("settings", { keyPath: "key" });
        }
        if (oldVersion < 2) {
          const heads = database.createObjectStore("projectHeads", {
            keyPath: "projectId",
          });
          heads.createIndex("by-updated-at", "updatedAt");
          const revisions = database.createObjectStore("projectRevisions", {
            keyPath: ["projectId", "revision"],
          });
          revisions.createIndex("by-project-id", "projectId");
          revisions.createIndex("by-saved-at", "savedAt");
        }
        if (oldVersion < 3) {
          const summaries = database.createObjectStore("projectSummaries", {
            keyPath: "projectId",
          });
          summaries.createIndex("by-updated-at", "updatedAt");
          database.createObjectStore("sourceMetadata", {
            keyPath: "sourceDocumentId",
          });
          const references = database.createObjectStore("sourceReferences", {
            keyPath: ["sourceDocumentId", "projectId"],
          });
          references.createIndex("by-project-id", "projectId");
          references.createIndex("by-source-id", "sourceDocumentId");
        }
      },
      blocked() {
        databasePromise = null;
      },
      terminated() {
        databasePromise = null;
      },
    }).catch((error) => {
      databasePromise = null;
      throw normalizePersistenceError(error);
    });
  }
  return databasePromise;
}

async function withProjectLock<T>(projectId: string, task: () => Promise<T>): Promise<T> {
  const lockManager = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!lockManager?.request) return task();
  return lockManager.request(`pdf-space:${projectId}`, { mode: "exclusive" }, task);
}

function assertProjectValid(project: PersistedWorkspaceProject): PersistedWorkspaceProject {
  const migrated = validatePersistedWorkspaceProject(project);
  const result = validatePersistedWorkspaceProjectStructure(migrated, {
    allowInitialEmpty:
      migrated.documents.length === 0 &&
      Object.keys(migrated.sourceDocuments).length === 0,
  });
  if (!result.valid) {
    throw new PersistenceError(
      "validation",
      result.issues.find((issue) => issue.severity === "error")?.message ??
        "The project structure failed validation.",
      { code: "VALIDATION_FAILED" }
    );
  }
  return migrated;
}

async function readSourceBlobRecord(
  database: IDBPDatabase<PdfSpaceDatabaseSchema>,
  sourceDocumentId: string
): Promise<PersistedSourceFile | undefined> {
  const record = await database.get("sourceFiles", sourceDocumentId);
  recordSourceBlobRead(record);
  return record;
}

async function readSourceMetadataRecord(
  database: IDBPDatabase<PdfSpaceDatabaseSchema>,
  sourceDocumentId: string
): Promise<PersistedSourceMetadata | undefined> {
  const record = await database.get("sourceMetadata", sourceDocumentId);
  recordPersistenceRead("sourceMetadataReads");
  return record;
}

async function prepareSourceMetadataForProject(
  database: IDBPDatabase<PdfSpaceDatabaseSchema>,
  project: PersistedWorkspaceProject,
  sourceFiles: readonly PersistedSourceFile[]
): Promise<{
  metadataById: Map<string, PersistedSourceMetadata>;
  metadataToWrite: PersistedSourceMetadata[];
}> {
  const pendingById = new Map(
    sourceFiles.map((sourceFile) => [sourceFile.sourceDocumentId, sourceFile])
  );
  const metadataById = new Map<string, PersistedSourceMetadata>();
  const metadataToWrite = new Map<string, PersistedSourceMetadata>();
  for (const sourceDocumentId of getCurrentProjectSourceIds(project)) {
    try {
      const pending = pendingById.get(sourceDocumentId);
      if (pending) {
        const metadata = buildPersistedSourceMetadata(pending, project);
        metadataById.set(sourceDocumentId, metadata);
        metadataToWrite.set(sourceDocumentId, metadata);
        continue;
      }
      const stored = await readSourceMetadataRecord(database, sourceDocumentId);
      const validation = validatePersistedSourceMetadata(stored);
      if (validation.valid) {
        metadataById.set(sourceDocumentId, validation.metadata);
        continue;
      }
      const sourceFile = await readSourceBlobRecord(database, sourceDocumentId);
      if (!sourceFile || !(sourceFile.blob instanceof Blob)) continue;
      const metadata = buildPersistedSourceMetadata(sourceFile, project);
      metadataById.set(sourceDocumentId, metadata);
      metadataToWrite.set(sourceDocumentId, metadata);
    } catch {
      // One malformed source remains missing without blocking other summaries.
    }
  }
  return { metadataById, metadataToWrite: [...metadataToWrite.values()] };
}

async function pruneProjectRevisions(projectId: string): Promise<void> {
  try {
    triggerPersistenceFault("during-pruning");
    const database = await getPdfSpaceDatabase();
    const transaction = database.transaction("projectRevisions", "readwrite");
    const store = transaction.objectStore("projectRevisions");
    const revisions = await store.index("by-project-id").getAll(projectId);
    recordPersistenceRead("projectRevisionReads", revisions.length);
    revisions.sort((left, right) => right.revision - left.revision);
    for (const revision of revisions.slice(PROJECT_RECOVERY_RETENTION)) {
      await store.delete([projectId, revision.revision]);
    }
    await transaction.done;
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Recovery revision pruning was skipped:", error);
  }
}

export async function saveProjectTransaction({
  project,
  sourceFiles,
  baseRevision,
  recoveryStatus = "healthy",
}: {
  project: PersistedWorkspaceProject;
  sourceFiles: readonly PersistedSourceFile[];
  baseRevision?: number | null;
  recoveryStatus?: PersistedProjectHead["recoveryStatus"];
}): Promise<ProjectCommitResult> {
  const validatedProject = assertProjectValid(project);
  const logicalChecksum = await createProjectLogicalChecksum(validatedProject);
  return withProjectLock(project.id, async () => {
    try {
      const database = await getPdfSpaceDatabase();
      const observedHead = await database.get("projectHeads", project.id);
      recordPersistenceRead("projectHeadReads");
      if (
        baseRevision !== undefined &&
        (observedHead?.currentRevision ?? null) !== baseRevision
      ) {
        throw new PersistenceError(
          "conflict",
          "This project changed in another tab before the save completed.",
          { code: "REVISION_CONFLICT" }
        );
      }
      if (
        baseRevision !== undefined &&
        observedHead?.logicalChecksum === logicalChecksum &&
        sourceFiles.length === 0
      ) {
        return {
          status: "unchanged",
          revision: observedHead.currentRevision,
          savedAt: Date.parse(observedHead.updatedAt),
          checksum: logicalChecksum,
        };
      }
      const existingRevisions = await database.getAllFromIndex(
        "projectRevisions",
        "by-project-id",
        project.id
      );
      recordPersistenceRead("projectRevisionReads", existingRevisions.length);
      const revision = Math.max(
        observedHead?.currentRevision ?? 0,
        ...existingRevisions.map((item) => item.revision),
        0
      ) + 1;
      const savedAt = validatedProject.updatedAt;
      const envelope = await createPersistedProjectEnvelope({
        project: validatedProject,
        revision,
        savedAt,
      });
      const head: PersistedProjectHead = {
        projectId: project.id,
        currentRevision: revision,
        updatedAt: envelope.savedAt,
        schemaVersion: PROJECT_ENVELOPE_SCHEMA_VERSION,
        logicalChecksum,
        recoveryStatus,
      };
      const { metadataById, metadataToWrite } =
        await prepareSourceMetadataForProject(database, validatedProject, sourceFiles);
      const summaryHealth: PersistedProjectHealth =
        recoveryStatus === "recovered"
          ? "recovered"
          : recoveryStatus === "needs-attention"
            ? "needs-attention"
            : "healthy";
      const summary = buildPersistedProjectSummary({
        project: validatedProject,
        revision,
        sourceMetadataById: metadataById,
        health: summaryHealth,
      });
      const transaction = database.transaction(
        [
          "projects",
          "projectHeads",
          "projectRevisions",
          "projectSummaries",
          "sourceFiles",
          "sourceMetadata",
          "sourceReferences",
          "settings",
        ],
        "readwrite"
      );
      try {
        triggerPersistenceFault("before-revision-write");
        await transaction.objectStore("projectRevisions").add(envelope);
        triggerPersistenceFault("after-revision-write");
        for (const sourceFile of sourceFiles) {
          if (
            !(sourceFile.blob instanceof Blob) ||
            sourceFile.blob.size === 0 ||
            sourceFile.size !== sourceFile.blob.size
          ) {
            throw new PersistenceError(
              "source-unavailable",
              "An original PDF source could not be stored safely.",
              { code: "SOURCE_WRITE_FAILED" }
            );
          }
          await transaction.objectStore("sourceFiles").put(sourceFile);
        }
        for (const metadata of metadataToWrite) {
          await transaction.objectStore("sourceMetadata").put(metadata);
        }
        const referenceStore = transaction.objectStore("sourceReferences");
        for (const key of await referenceStore.index("by-project-id").getAllKeys(project.id)) {
          await referenceStore.delete(key);
        }
        for (const sourceDocumentId of getRequiredSourceDocumentIds(validatedProject)) {
          await referenceStore.put({ sourceDocumentId, projectId: project.id });
        }
        triggerPersistenceFault("before-head-update");
        await transaction.objectStore("projectHeads").put(head);
        triggerPersistenceFault("before-summary-write");
        await transaction.objectStore("projectSummaries").put(summary);
        await transaction.objectStore("projects").put(validatedProject);
        await transaction.objectStore("settings").put({
          key: "lastOpenedProjectId",
          value: project.id,
        });
        triggerPersistenceFault("after-head-update");
        triggerPersistenceFault("before-transaction-complete");
        await transaction.done;
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          // The transaction may already have aborted itself.
        }
        await transaction.done.catch(() => undefined);
        throw error;
      }
      publishLocalProjectEvent({
        type: "project-committed",
        projectId: project.id,
        revision,
        savedAt: envelope.savedAt,
      });
      void pruneProjectRevisions(project.id);
      return { status: "committed", revision, savedAt, checksum: logicalChecksum };
    } catch (error) {
      throw normalizePersistenceError(error);
    }
  });
}

async function validateEnvelope(
  envelope: PersistedProjectEnvelope | undefined
): Promise<{ valid: true; project: PersistedWorkspaceProject } | { valid: false; reason: ProjectRecoveryReason }> {
  if (!envelope) return { valid: false, reason: "HEAD_REVISION_MISSING" };
  if (
    envelope.format !== "pdf-space-project" ||
    envelope.schemaVersion !== PROJECT_ENVELOPE_SCHEMA_VERSION ||
    envelope.projectId !== envelope.project?.id ||
    !Number.isInteger(envelope.revision) ||
    envelope.revision < 1
  ) {
    return { valid: false, reason: "UNSUPPORTED_SCHEMA" };
  }
  try {
    if (!(await verifyPersistedProjectChecksum(envelope))) {
      return { valid: false, reason: "CHECKSUM_MISMATCH" };
    }
  } catch {
    return { valid: false, reason: "CHECKSUM_MISMATCH" };
  }
  try {
    return { valid: true, project: assertProjectValid(envelope.project) };
  } catch (error) {
    return {
      valid: false,
      reason:
        error instanceof PersistenceError && error.kind === "newer-schema"
          ? "UNSUPPORTED_SCHEMA"
          : "PROJECT_STRUCTURE_INVALID",
    };
  }
}

export async function checkProjectSourceHealth(
  project: PersistedWorkspaceProject
): Promise<ProjectSourceHealth> {
  const database = await getPdfSpaceDatabase();
  const sourceIds = getRequiredSourceDocumentIds(project);
  const sources = await Promise.all(
    sourceIds.map(async (sourceDocumentId) => {
      const expectedSize = project.sourceDocuments[sourceDocumentId]?.size;
      try {
        const record = await readSourceBlobRecord(database, sourceDocumentId);
        if (!record) return { status: "missing" as const, sourceDocumentId };
        if (!(record.blob instanceof Blob)) {
          return { status: "unreadable" as const, sourceDocumentId };
        }
        if (record.blob.size === 0) return { status: "empty" as const, sourceDocumentId };
        if (
          (typeof expectedSize === "number" && record.blob.size !== expectedSize) ||
          record.size !== record.blob.size
        ) {
          return {
            status: "size-mismatch" as const,
            sourceDocumentId,
            expectedSize,
            actualSize: record.blob.size,
          };
        }
        return { status: "healthy" as const, sourceDocumentId, size: record.blob.size };
      } catch {
        return { status: "unreadable" as const, sourceDocumentId };
      }
    })
  );
  const unavailable = new Set(
    sources.filter((source) => source.status !== "healthy").map((source) => source.sourceDocumentId)
  );
  const missingDependencies = [...unavailable].map((sourceDocumentId) => {
    const pages = project.documents.flatMap((document) =>
      document.pages
        .filter((page) => page.sourceDocumentId === sourceDocumentId)
        .map((page) => ({ documentId: document.id, pageId: page.id }))
    );
    return {
      sourceDocumentId,
      sourceName: project.sourceDocuments[sourceDocumentId]?.name,
      affectedDocumentIds: [...new Set(pages.map((page) => page.documentId))],
      affectedPageIds: pages.map((page) => page.pageId),
      affectedPageCount: pages.length,
    };
  });
  return {
    status: unavailable.size === 0 ? "healthy" : "partial",
    sources,
    missingDependencies,
  };
}

async function migrateLegacyProject(projectId: string): Promise<boolean> {
  const database = await getPdfSpaceDatabase();
  const existingHead = await database.get("projectHeads", projectId);
  recordPersistenceRead("projectHeadReads");
  if (existingHead) return false;
  const revisions = await database.getAllFromIndex("projectRevisions", "by-project-id", projectId);
  recordPersistenceRead("projectRevisionReads", revisions.length);
  if (revisions.length > 0) return false;
  const legacy = await database.get("projects", projectId);
  if (!legacy) return false;
  const project = assertProjectValid(legacy);
  try {
    await saveProjectTransaction({ project, sourceFiles: [], baseRevision: null });
    return true;
  } catch (error) {
    if (error instanceof PersistenceError && error.kind === "conflict") {
      // Another Strict Mode initialization or tab completed the same migration.
      return false;
    }
    throw error;
  }
}

export async function loadProjectWithRecovery(projectId: string): Promise<ProjectLoadResult> {
  try {
    await migrateLegacyProject(projectId);
    const database = await getPdfSpaceDatabase();
    const head = await database.get("projectHeads", projectId);
    recordPersistenceRead("projectHeadReads");
    const revisions = await database.getAllFromIndex("projectRevisions", "by-project-id", projectId);
    recordPersistenceRead("projectRevisionReads", revisions.length);
    revisions.sort((left, right) => right.revision - left.revision);
    if (head) {
      const current = revisions.find((item) => item.revision === head.currentRevision);
      const currentValidation = await validateEnvelope(current);
      if (currentValidation.valid && current) {
        const sourceHealth = await checkProjectSourceHealth(currentValidation.project);
        await updateProjectSummaryAfterHealth({
          project: currentValidation.project,
          head,
          sourceHealth,
          health: sourceHealth.status === "partial" ? "missing-sources" : "healthy",
        });
        return {
          status: "healthy",
          project: currentValidation.project,
          revision: current.revision,
          envelope: current,
          sourceHealth,
        };
      }
      const invalidHeadReason: ProjectRecoveryReason =
        currentValidation.valid === false
          ? currentValidation.reason
          : "HEAD_REVISION_MISSING";
      for (const candidate of revisions) {
        if (candidate.revision === head.currentRevision) continue;
        const validation = await validateEnvelope(candidate);
        if (validation.valid) {
          const sourceHealth = await checkProjectSourceHealth(validation.project);
          await database.put("projectHeads", { ...head, recoveryStatus: "recovered" });
          await updateProjectSummaryAfterHealth({
            project: validation.project,
            head: { ...head, recoveryStatus: "recovered" },
            sourceHealth,
            health: "recovered",
            recoveredRevision: candidate.revision,
          });
          return {
            status: "recovered",
            project: validation.project,
            recoveredRevision: candidate.revision,
            invalidHeadRevision: head.currentRevision,
            reason: invalidHeadReason,
            validFallbackCount: 1,
            envelope: candidate,
            sourceHealth,
          };
        }
      }
      return { status: "unrecoverable", projectId, reasons: [invalidHeadReason] };
    }
    for (const candidate of revisions) {
      const validation = await validateEnvelope(candidate);
      if (validation.valid) {
        const sourceHealth = await checkProjectSourceHealth(validation.project);
        await updateProjectSummaryAfterHealth({
          project: validation.project,
          head: null,
          sourceHealth,
          health: "recovered",
          recoveredRevision: candidate.revision,
        });
        return {
          status: "recovered",
          project: validation.project,
          recoveredRevision: candidate.revision,
          reason: "HEAD_MISSING",
          validFallbackCount: 1,
          envelope: candidate,
          sourceHealth,
        };
      }
    }
    return {
      status: "unrecoverable",
      projectId,
      reasons: revisions.length > 0 ? ["PROJECT_STRUCTURE_INVALID"] : ["HEAD_MISSING"],
    };
  } catch (error) {
    const normalized = normalizePersistenceError(error);
    if (normalized.kind === "not-found") {
      return { status: "unrecoverable", projectId, reasons: ["HEAD_MISSING"] };
    }
    throw normalized;
  }
}

export async function recommitRecoveredProject({
  project,
  invalidHeadRevision,
}: {
  project: PersistedWorkspaceProject;
  invalidHeadRevision: number | null;
}): Promise<ProjectCommitResult> {
  return saveProjectTransaction({
    project: { ...project, updatedAt: Date.now() },
    sourceFiles: [],
    baseRevision: invalidHeadRevision,
    recoveryStatus: "healthy",
  });
}

export async function loadProject(projectId: string): Promise<PersistedWorkspaceProject | null> {
  const result = await loadProjectWithRecovery(projectId);
  return result.status === "unrecoverable" ? null : result.project;
}

export async function loadSourceFile(sourceDocumentId: string): Promise<PersistedSourceFile | null> {
  try {
    return (await readSourceBlobRecord(await getPdfSpaceDatabase(), sourceDocumentId)) ?? null;
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function getLastOpenedProjectId(): Promise<string | null> {
  try {
    const setting = await (await getPdfSpaceDatabase()).get("settings", "lastOpenedProjectId");
    return setting?.key === "lastOpenedProjectId" ? setting.value : null;
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function setLastOpenedProjectId(projectId: string): Promise<void> {
  try {
    await (await getPdfSpaceDatabase()).put("settings", { key: "lastOpenedProjectId", value: projectId });
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function projectExists(projectId: string): Promise<boolean> {
  const database = await getPdfSpaceDatabase();
  const head = await database.get("projectHeads", projectId);
  recordPersistenceRead("projectHeadReads");
  return Boolean(head || (await database.get("projects", projectId)));
}

async function persistRepairedSummary({
  summary,
  project,
  metadata,
  expectedHeadRevision,
}: {
  summary: PersistedProjectSummary;
  project: PersistedWorkspaceProject;
  metadata: readonly PersistedSourceMetadata[];
  expectedHeadRevision: number | null;
}): Promise<void> {
  const database = await getPdfSpaceDatabase();
  const transaction = database.transaction(
    ["projectHeads", "projectSummaries", "sourceMetadata", "sourceReferences"],
    "readwrite"
  );
  const head = await transaction.objectStore("projectHeads").get(project.id);
  if ((head?.currentRevision ?? null) !== expectedHeadRevision) {
    transaction.abort();
    await transaction.done.catch(() => undefined);
    throw new PersistenceError("conflict", "The project changed while its summary was being repaired.");
  }
  for (const item of metadata) {
    await transaction.objectStore("sourceMetadata").put(item);
  }
  const referenceStore = transaction.objectStore("sourceReferences");
  for (const key of await referenceStore.index("by-project-id").getAllKeys(project.id)) {
    await referenceStore.delete(key);
  }
  for (const sourceDocumentId of getRequiredSourceDocumentIds(project)) {
    await referenceStore.put({ sourceDocumentId, projectId: project.id });
  }
  await transaction.objectStore("projectSummaries").put(summary);
  await transaction.done;
}

async function updateProjectSummaryAfterHealth({
  project,
  head,
  sourceHealth,
  health,
  recoveredRevision,
}: {
  project: PersistedWorkspaceProject;
  head: PersistedProjectHead | null;
  sourceHealth: ProjectSourceHealth;
  health: PersistedProjectHealth;
  recoveredRevision?: number;
}): Promise<void> {
  try {
    const database = await getPdfSpaceDatabase();
    const prepared = await prepareSourceMetadataForProject(database, project, []);
    const missingSourceIds = new Set(
      sourceHealth.sources
        .filter((source) => source.status !== "healthy")
        .map((source) => source.sourceDocumentId)
    );
    const summary = buildPersistedProjectSummary({
      project,
      revision: head?.currentRevision ?? recoveredRevision ?? 1,
      sourceMetadataById: prepared.metadataById,
      health,
      missingSourceIds,
      ...(recoveredRevision === undefined ? {} : { recoveredRevision }),
    });
    await persistRepairedSummary({
      summary,
      project,
      metadata: prepared.metadataToWrite,
      expectedHeadRevision: head?.currentRevision ?? null,
    });
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Project summary health update was skipped:", error);
  }
}

async function repairProjectSummary(
  projectId: string,
  knownHead?: PersistedProjectHead
): Promise<LocalProjectListItem | null> {
  const database = await getPdfSpaceDatabase();
  const head = knownHead ?? await database.get("projectHeads", projectId);
  if (!knownHead) recordPersistenceRead("projectHeadReads");
  let project: PersistedWorkspaceProject;
  let summaryHealth: PersistedProjectHealth =
    head?.recoveryStatus === "recovered"
      ? "recovered"
      : head?.recoveryStatus === "needs-attention"
        ? "needs-attention"
        : "healthy";
  let recoveredRevision: number | undefined;
  let summaryRevision = head?.currentRevision ?? 0;

  if (head) {
    const envelope = await database.get("projectRevisions", [projectId, head.currentRevision]);
    recordPersistenceRead("projectRevisionReads");
    const validation = await validateEnvelope(envelope);
    if (validation.valid) {
      project = validation.project;
    } else {
      const recovered = await loadProjectWithRecovery(projectId);
      if (recovered.status === "unrecoverable") return null;
      project = recovered.project;
      summaryHealth = recovered.status === "recovered" ? "recovered" : "healthy";
      recoveredRevision =
        recovered.status === "recovered" ? recovered.recoveredRevision : undefined;
    }
  } else {
    const recovered = await loadProjectWithRecovery(projectId);
    if (recovered.status === "unrecoverable") return null;
    project = recovered.project;
    summaryHealth = recovered.status === "recovered" ? "recovered" : "healthy";
    recoveredRevision =
      recovered.status === "recovered" ? recovered.recoveredRevision : undefined;
    summaryRevision =
      recovered.status === "healthy" ? recovered.revision : recovered.recoveredRevision;
  }

  const prepared = await prepareSourceMetadataForProject(database, project, []);
  const missingSourceIds = new Set(
    getCurrentProjectSourceIds(project).filter(
      (sourceDocumentId) => !prepared.metadataById.has(sourceDocumentId)
    )
  );
  const summary = buildPersistedProjectSummary({
    project,
    revision: summaryRevision,
    sourceMetadataById: prepared.metadataById,
    health: summaryHealth,
    missingSourceIds,
    ...(recoveredRevision === undefined ? {} : { recoveredRevision }),
  });
  await persistRepairedSummary({
    summary,
    project,
    metadata: prepared.metadataToWrite,
    expectedHeadRevision: head?.currentRevision ?? null,
  });
  return mapSummaryToProjectListItem(summary);
}

async function migrateLegacyProjectsWithoutHeads(
  knownHeadIds: ReadonlySet<string>
): Promise<{
  migrated: boolean;
  damagedProjectIds: string[];
}> {
  const database = await getPdfSpaceDatabase();
  let migrated = false;
  const damagedProjectIds: string[] = [];
  let afterProjectId: string | undefined;
  while (true) {
    const cursor = await database
      .transaction("projects", "readonly")
      .objectStore("projects")
      .openKeyCursor(
        afterProjectId === undefined
          ? undefined
          : IDBKeyRange.lowerBound(afterProjectId, true)
      );
    if (!cursor) break;
    const projectId = cursor.primaryKey;
    afterProjectId = projectId;
    if (!knownHeadIds.has(projectId)) {
      try {
        migrated = (await migrateLegacyProject(projectId)) || migrated;
      } catch {
        damagedProjectIds.push(projectId);
        const timestamp = new Date().toISOString();
        await database.put("projectSummaries", {
          projectId,
          name: "Project unavailable",
          createdAt: timestamp,
          updatedAt: timestamp,
          currentRevision: 1,
          schemaVersion: 1,
          projectSchemaVersion: 1,
          documentCount: 0,
          pageCount: 0,
          uniqueSourceCount: 0,
          totalSourceBytes: 0,
          health: "unrecoverable",
          missingSourceCount: 0,
        });
      }
    }
  }
  await database.put("settings", {
    key: "projectSummaryMigrationVersion",
    value: DATABASE_VERSION,
  });
  return { migrated, damagedProjectIds };
}

export async function readLocalProjectListItem(
  projectId: string
): Promise<LocalProjectListItem | null> {
  try {
    const database = await getPdfSpaceDatabase();
    const [rawSummary, head] = await Promise.all([
      database.get("projectSummaries", projectId),
      database.get("projectHeads", projectId),
    ]);
    recordPersistenceRead("projectSummaryReads");
    recordPersistenceRead("projectHeadReads");
    const validation = validatePersistedProjectSummary(rawSummary);
    if (
      validation.valid &&
      head &&
      validation.summary.currentRevision === head.currentRevision &&
      (head.recoveryStatus !== "recovered" || validation.summary.health === "recovered") &&
      (head.recoveryStatus !== "needs-attention" || validation.summary.health === "needs-attention")
    ) {
      return mapSummaryToProjectListItem(validation.summary);
    }
    if (!head && !(await database.get("projects", projectId))) return null;
    return repairProjectSummary(projectId, head);
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function listLocalProjects(
  onItem?: (item: LocalProjectListItem) => void
): Promise<LocalProjectListItem[]> {
  try {
    const database = await getPdfSpaceDatabase();
    let [rawSummaries, heads] = await Promise.all([
      database.getAll("projectSummaries"),
      database.getAll("projectHeads"),
    ]);
    recordPersistenceRead("projectSummaryReads", rawSummaries.length);
    recordPersistenceRead("projectHeadReads", heads.length);
    const migrationSetting = await database.get(
      "settings",
      "projectSummaryMigrationVersion"
    );
    const legacyMigration =
      migrationSetting?.value === DATABASE_VERSION
        ? { migrated: false, damagedProjectIds: [] }
        : await migrateLegacyProjectsWithoutHeads(
            new Set(heads.map((head) => head.projectId))
          );
    if (legacyMigration.migrated) {
      [rawSummaries, heads] = await Promise.all([
        database.getAll("projectSummaries"),
        database.getAll("projectHeads"),
      ]);
      recordPersistenceRead("projectSummaryReads", rawSummaries.length);
      recordPersistenceRead("projectHeadReads", heads.length);
    }

    const rawByProjectId = new Map<string, unknown>();
    const damagedItems: LocalProjectListItem[] = legacyMigration.damagedProjectIds.map(
      (projectId) => ({
        id: projectId,
        name: "Project unavailable",
        createdAt: null,
        updatedAt: null,
        documentCount: 0,
        totalPageCount: 0,
        sourceCount: 0,
        approximateSourceBytes: 0,
        schemaVersion: null,
        status: "damaged",
        statusMessage: "This local project record could not be read safely.",
      })
    );
    for (const rawSummary of rawSummaries) {
      const rawProjectId =
        typeof rawSummary === "object" && rawSummary !== null &&
        typeof (rawSummary as { projectId?: unknown }).projectId === "string"
          ? (rawSummary as { projectId: string }).projectId
          : null;
      if (rawProjectId) rawByProjectId.set(rawProjectId, rawSummary);
      else {
        damagedItems.push({
          id: "unavailable-project",
          name: "Project unavailable",
          createdAt: null,
          updatedAt: null,
          documentCount: 0,
          totalPageCount: 0,
          sourceCount: 0,
          approximateSourceBytes: 0,
          schemaVersion: null,
          status: "damaged",
          statusMessage: "This project summary needs repair.",
        });
      }
    }

    const items: LocalProjectListItem[] = [];
    const addItem = (item: LocalProjectListItem) => {
      items.push(item);
      onItem?.(item);
    };
    const headIds = new Set(heads.map((head) => head.projectId));
    for (const head of heads) {
      const validation = validatePersistedProjectSummary(rawByProjectId.get(head.projectId));
      if (
        validation.valid &&
        validation.summary.currentRevision === head.currentRevision &&
        (head.recoveryStatus !== "recovered" || validation.summary.health === "recovered") &&
        (head.recoveryStatus !== "needs-attention" || validation.summary.health === "needs-attention")
      ) {
        addItem(mapSummaryToProjectListItem(validation.summary));
        continue;
      }
      const repaired = await repairProjectSummary(head.projectId, head);
      if (repaired) addItem(repaired);
      else {
        const prior = validation.valid ? mapSummaryToProjectListItem(validation.summary) : null;
        addItem(prior
          ? {
              ...prior,
              status: "damaged",
              statusMessage: "This local project could not be recovered safely.",
            }
          : {
              id: head.projectId,
              name: "Project unavailable",
              createdAt: null,
              updatedAt: Date.parse(head.updatedAt) || null,
              documentCount: 0,
              totalPageCount: 0,
              sourceCount: 0,
              approximateSourceBytes: 0,
              schemaVersion: null,
              status: "damaged",
              statusMessage: "This local project could not be recovered safely.",
              currentRevision: head.currentRevision,
            });
      }
    }
    for (const [projectId, rawSummary] of rawByProjectId) {
      if (headIds.has(projectId)) continue;
      const validation = validatePersistedProjectSummary(rawSummary);
      if (validation.valid && validation.summary.health === "unrecoverable") {
        addItem(mapSummaryToProjectListItem(validation.summary));
        continue;
      }
      const repaired = await repairProjectSummary(projectId);
      if (repaired) addItem(repaired);
    }
    for (const damagedItem of damagedItems) onItem?.(damagedItem);
    return [...items, ...damagedItems];
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function getLocalStorageSummary(): Promise<{
  projectCount: number;
  sourceFileCount: number;
  recoveryRevisionCount: number;
  estimatedSourceBytes: number;
  missingSourceCount: number;
}> {
  try {
    const database = await getPdfSpaceDatabase();
    const transaction = database.transaction(
      ["projectSummaries", "sourceMetadata", "projectRevisions"],
      "readonly"
    );
    const [summaries, sourceMetadata, recoveryRevisionCount] = await Promise.all([
      transaction.objectStore("projectSummaries").getAll(),
      transaction.objectStore("sourceMetadata").getAll(),
      transaction.objectStore("projectRevisions").count(),
    ]);
    recordPersistenceRead("projectSummaryReads", summaries.length);
    recordPersistenceRead("sourceMetadataReads", sourceMetadata.length);
    await transaction.done;
    return {
      projectCount: summaries.length,
      sourceFileCount: sourceMetadata.length,
      recoveryRevisionCount,
      estimatedSourceBytes: sourceMetadata.reduce(
        (sum, metadata) => sum + metadata.size,
        0
      ),
      missingSourceCount: summaries.reduce(
        (sum, summary) => sum + summary.missingSourceCount,
        0
      ),
    };
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function createLocalProject({
  projectId,
  name = "Untitled Workspace",
  timestamp = Date.now(),
}: {
  projectId: string;
  name?: string;
  timestamp?: number;
}): Promise<PersistedWorkspaceProject> {
  const initialDocumentId = `document-${crypto.randomUUID()}`;
  const project: PersistedWorkspaceProject = {
    schemaVersion: 1,
    id: projectId,
    name,
    createdAt: timestamp,
    updatedAt: timestamp,
    documents: [
      {
        id: initialDocumentId,
        name: "Untitled Document",
        size: 0,
        mimeType: "application/pdf",
        color: "#00f5ff",
        pages: [],
      },
    ],
    sourceDocuments: {},
  };
  await saveProjectTransaction({ project, sourceFiles: [], baseRevision: null });
  publishLocalProjectEvent({ type: "project-created", projectId });
  return project;
}

export async function renameLocalProject(
  projectId: string,
  name: string,
  timestamp = Date.now()
): Promise<PersistedWorkspaceProject> {
  const result = await loadProjectWithRecovery(projectId);
  if (result.status === "unrecoverable") throw new PersistenceError("not-found", "The local project could not be found.");
  const renamed = { ...result.project, name: normalizeProjectName(name), updatedAt: timestamp };
  const baseRevision = result.status === "healthy" ? result.revision : result.invalidHeadRevision ?? null;
  await saveProjectTransaction({ project: renamed, sourceFiles: [], baseRevision });
  publishLocalProjectEvent({ type: "project-renamed", projectId, name: renamed.name });
  return renamed;
}

export async function duplicateLocalProject(
  projectId: string,
  options?: {
    newProjectId?: string;
    timestamp?: number;
    generateId?: (kind: "document" | "page" | "source", originalId: string) => string;
  }
): Promise<PersistedWorkspaceProject> {
  try {
    const loaded = await loadProjectWithRecovery(projectId);
    if (loaded.status === "unrecoverable") throw new PersistenceError("not-found", "The local project could not be found.");
    const database = await getPdfSpaceDatabase();
    const summaries = await database.getAll("projectSummaries");
    recordPersistenceRead("projectSummaryReads", summaries.length);
    const requiredSourceIds = getRequiredSourceDocumentIds(loaded.project);
    const availableSourceIds: string[] = [];
    for (const sourceDocumentId of requiredSourceIds) {
      const source = await readSourceBlobRecord(database, sourceDocumentId);
      if (source?.blob instanceof Blob && source.blob.size > 0) {
        availableSourceIds.push(sourceDocumentId);
      }
    }
    const timestamp = options?.timestamp ?? Date.now();
    const newProjectId = options?.newProjectId ?? `project-${crypto.randomUUID()}`;
    const duplicated = remapDuplicatedProject({
      sourceProject: loaded.project,
      availableSourceIds,
      newProjectId,
      newProjectName: createDuplicateProjectName(
        loaded.project.name,
        summaries.map((summary) => summary.name)
      ),
      timestamp,
      generateId: options?.generateId ?? ((kind) => `${kind}-${crypto.randomUUID()}`),
    });
    await saveProjectTransaction({
      project: duplicated.project,
      sourceFiles: [],
      baseRevision: null,
    });
    publishLocalProjectEvent({ type: "project-created", projectId: duplicated.project.id });
    return duplicated.project;
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function deleteLocalProject(projectId: string): Promise<void> {
  try {
    const database = await getPdfSpaceDatabase();
    const transaction = database.transaction(
      [
        "projects",
        "projectHeads",
        "projectRevisions",
        "projectSummaries",
        "sourceFiles",
        "sourceMetadata",
        "sourceReferences",
        "settings",
      ],
      "readwrite"
    );
    const sourceStore = transaction.objectStore("sourceFiles");
    const referenceStore = transaction.objectStore("sourceReferences");
    const projectReferences = await referenceStore.index("by-project-id").getAll(projectId);
    const legacyOwnedSourceIds = await sourceStore.index("by-project-id").getAllKeys(projectId);
    const affectedSourceIds = new Set([
      ...projectReferences.map((reference) => reference.sourceDocumentId),
      ...legacyOwnedSourceIds,
    ]);
    for (const reference of projectReferences) {
      await referenceStore.delete([reference.sourceDocumentId, projectId]);
    }
    for (const sourceDocumentId of affectedSourceIds) {
      if ((await referenceStore.index("by-source-id").count(sourceDocumentId)) === 0) {
        await sourceStore.delete(sourceDocumentId);
        await transaction.objectStore("sourceMetadata").delete(sourceDocumentId);
      }
    }
    const revisionStore = transaction.objectStore("projectRevisions");
    for (const revisionKey of await revisionStore.index("by-project-id").getAllKeys(projectId)) {
      await revisionStore.delete(revisionKey);
    }
    await transaction.objectStore("projectHeads").delete(projectId);
    await transaction.objectStore("projectSummaries").delete(projectId);
    await transaction.objectStore("projects").delete(projectId);
    const settings = transaction.objectStore("settings");
    if ((await settings.get("lastOpenedProjectId"))?.value === projectId) {
      await settings.delete("lastOpenedProjectId");
    }
    await transaction.done;
    publishLocalProjectEvent({ type: "project-deleted", projectId });
  } catch (error) {
    throw normalizePersistenceError(error);
  }
}

export async function listProjectRevisions(projectId: string): Promise<PersistedProjectEnvelope[]> {
  const revisions = await (await getPdfSpaceDatabase()).getAllFromIndex("projectRevisions", "by-project-id", projectId);
  recordPersistenceRead("projectRevisionReads", revisions.length);
  return revisions.sort((left, right) => right.revision - left.revision);
}

export async function corruptRevisionForTest(projectId: string, revision: number): Promise<void> {
  if (!import.meta.env.DEV) return;
  const database = await getPdfSpaceDatabase();
  const envelope = await database.get("projectRevisions", [projectId, revision]);
  recordPersistenceRead("projectRevisionReads");
  if (!envelope) throw new Error("Revision not found.");
  await database.put("projectRevisions", {
    ...envelope,
    project: { ...envelope.project, name: `${envelope.project.name} (corrupt)` },
  });
}

export async function clearPdfSpaceDatabaseForTests(): Promise<void> {
  const database = await getPdfSpaceDatabase();
  database.close();
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Database deletion was blocked."));
  });
}
