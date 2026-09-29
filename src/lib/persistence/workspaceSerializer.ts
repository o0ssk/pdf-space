import {
  WorkspaceDocument,
  WorkspacePage,
} from "../../types/workspace";
import {
  WorkspaceState,
  initialWorkspaceState,
} from "../workspace/workspaceState";
import { emptyWorkspaceSelection } from "../selection/pageSelection";
import { PersistenceError } from "./persistenceErrors";
import {
  PERSISTENCE_SCHEMA_VERSION,
  PersistedSourceDocument,
  PersistedWorkspaceDocument,
  PersistedWorkspacePage,
  PersistedWorkspaceProject,
} from "./persistenceTypes";
import { migratePersistedWorkspaceProject } from "./workspaceMigrations";

const VALID_ROTATIONS = new Set([0, 90, 180, 270]);

function serializePage(page: WorkspacePage): PersistedWorkspacePage {
  const persisted: PersistedWorkspacePage = {
    id: page.id,
    documentId: page.documentId,
    sourceDocumentId: page.sourceDocumentId,
    originalPageIndex: page.originalPageIndex,
    rotation: page.rotation,
  };
  if (page.duplicatedFromPageId !== undefined) {
    persisted.duplicatedFromPageId = page.duplicatedFromPageId;
  }
  return persisted;
}

function serializeDocument(
  document: WorkspaceDocument
): PersistedWorkspaceDocument {
  return {
    id: document.id,
    name: document.name,
    size: document.size,
    mimeType: document.mimeType,
    color: document.color,
    pages: document.pages.map(serializePage),
  };
}

export function getRequiredSourceDocumentIds(
  project: Pick<PersistedWorkspaceProject, "documents" | "sourceDocuments">
): string[] {
  const ids = new Set(Object.keys(project.sourceDocuments));
  for (const document of project.documents) {
    for (const page of document.pages) ids.add(page.sourceDocumentId);
  }
  return [...ids];
}

export function serializeWorkspaceProject({
  id,
  name,
  createdAt,
  updatedAt,
  workspace,
}: {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  workspace: WorkspaceState;
}): PersistedWorkspaceProject {
  const documents = workspace.documents
    .filter((document) => document.status === "ready")
    .map(serializeDocument);
  const requiredSourceIds = new Set<string>();
  for (const document of documents) {
    if (document.id in workspace.sourceDocuments) {
      requiredSourceIds.add(document.id);
    }
    for (const page of document.pages) {
      requiredSourceIds.add(page.sourceDocumentId);
    }
  }

  const sourceDocuments: Record<string, PersistedSourceDocument> = {};
  for (const sourceId of requiredSourceIds) {
    const sourceDocument = workspace.sourceDocuments[sourceId];
    if (sourceDocument) sourceDocuments[sourceId] = { ...sourceDocument };
  }

  return {
    schemaVersion: PERSISTENCE_SCHEMA_VERSION,
    id,
    name,
    createdAt,
    updatedAt,
    documents,
    sourceDocuments,
  };
}

function validateTimestamp(value: unknown, field: string): asserts value is number {
  if (!Number.isFinite(value) || Number(value) <= 0) {
    throw new PersistenceError("corrupt", `Invalid ${field}.`);
  }
}

export function validatePersistedWorkspaceProject(
  input: unknown
): PersistedWorkspaceProject {
  const project = migratePersistedWorkspaceProject(input);
  if (
    project.schemaVersion !== PERSISTENCE_SCHEMA_VERSION ||
    typeof project.id !== "string" ||
    !project.id ||
    typeof project.name !== "string" ||
    !Array.isArray(project.documents) ||
    typeof project.sourceDocuments !== "object" ||
    project.sourceDocuments === null
  ) {
    throw new PersistenceError("corrupt", "The local project record is incomplete.");
  }
  validateTimestamp(project.createdAt, "createdAt");
  validateTimestamp(project.updatedAt, "updatedAt");

  const documentIds = new Set<string>();
  const pageIds = new Set<string>();
  for (const document of project.documents) {
    if (
      !document ||
      typeof document.id !== "string" ||
      !document.id ||
      documentIds.has(document.id) ||
      typeof document.name !== "string" ||
      typeof document.size !== "number" ||
      typeof document.mimeType !== "string" ||
      typeof document.color !== "string" ||
      !Array.isArray(document.pages)
    ) {
      throw new PersistenceError("corrupt", "A persisted document is invalid.");
    }
    documentIds.add(document.id);

    for (const page of document.pages) {
      if (
        !page ||
        typeof page.id !== "string" ||
        !page.id ||
        pageIds.has(page.id) ||
        page.documentId !== document.id ||
        typeof page.sourceDocumentId !== "string" ||
        !project.sourceDocuments[page.sourceDocumentId] ||
        !Number.isInteger(page.originalPageIndex) ||
        page.originalPageIndex < 0 ||
        !VALID_ROTATIONS.has(page.rotation)
      ) {
        throw new PersistenceError("corrupt", "A persisted page is invalid.");
      }
      pageIds.add(page.id);
    }
  }

  for (const [sourceId, source] of Object.entries(project.sourceDocuments)) {
    if (
      !source ||
      source.id !== sourceId ||
      typeof source.name !== "string" ||
      typeof source.size !== "number" ||
      typeof source.mimeType !== "string" ||
      !Number.isInteger(source.originalPageCount) ||
      source.originalPageCount < 0 ||
      !Number.isFinite(source.importedAt)
    ) {
      throw new PersistenceError("corrupt", "Persisted PDF source metadata is invalid.");
    }
  }

  return project;
}

function deserializePage(
  page: PersistedWorkspacePage,
  pageNumber: number
): WorkspacePage {
  return {
    ...page,
    pageNumber,
    thumbnailStatus: "idle",
  };
}

export function deserializeWorkspaceProject(
  input: unknown
): {
  project: PersistedWorkspaceProject;
  workspace: WorkspaceState;
} {
  const project = validatePersistedWorkspaceProject(input);
  const documents: WorkspaceDocument[] = project.documents.map((document) => ({
    id: document.id,
    name: document.name,
    size: document.size,
    mimeType: document.mimeType,
    pageCount: document.pages.length,
    color: document.color,
    status: "ready",
    pages: document.pages.map((page, index) =>
      deserializePage(page, index + 1)
    ),
  }));

  return {
    project,
    workspace: {
      ...initialWorkspaceState,
      documents,
      sourceDocuments: structuredClone(
        project.sourceDocuments
      ),
      selectedDocumentId: documents[0]?.id ?? null,
      selection: { ...emptyWorkspaceSelection },
    },
  };
}

export function markUnavailableSources(
  workspace: WorkspaceState,
  unavailableSourceIds: ReadonlySet<string>
): WorkspaceState {
  if (unavailableSourceIds.size === 0) return workspace;

  return {
    ...workspace,
    documents: workspace.documents.map((document) => ({
      ...document,
      pages: document.pages.map((page) =>
        unavailableSourceIds.has(page.sourceDocumentId)
          ? {
              ...page,
              thumbnailStatus: "error",
              errorMessage:
                "The original PDF data for this source could not be restored from local storage.",
            }
          : page
      ),
    })),
  };
}
