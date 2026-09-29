import {
  PERSISTENCE_SCHEMA_VERSION,
  PersistedWorkspaceProject,
} from "./persistenceTypes";
import { PersistenceError } from "./persistenceErrors";

type LegacyProjectV0 = Omit<
  PersistedWorkspaceProject,
  "schemaVersion" | "updatedAt"
> & {
  schemaVersion?: 0;
  updatedAt?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function migratePersistedWorkspaceProject(
  input: unknown
): PersistedWorkspaceProject {
  if (!isRecord(input)) {
    throw new PersistenceError("corrupt", "The local project record is invalid.");
  }

  const version = input.schemaVersion;
  if (typeof version === "number" && version > PERSISTENCE_SCHEMA_VERSION) {
    throw new PersistenceError(
      "newer-schema",
      "This project was created by a newer version of PDF Space and cannot be opened safely here."
    );
  }

  if (version === PERSISTENCE_SCHEMA_VERSION) {
    return structuredClone(input) as PersistedWorkspaceProject;
  }

  if (version === undefined || version === 0) {
    const legacy = structuredClone(input) as LegacyProjectV0;
    return {
      ...legacy,
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      updatedAt: legacy.updatedAt ?? legacy.createdAt,
    };
  }

  throw new PersistenceError(
    "corrupt",
    `Unsupported local project schema version: ${String(version)}.`
  );
}
