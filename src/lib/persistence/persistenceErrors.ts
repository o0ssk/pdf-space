export type PersistenceErrorKind =
  | "quota"
  | "unavailable"
  | "not-found"
  | "newer-schema"
  | "corrupt"
  | "source-unavailable"
  | "conflict"
  | "validation"
  | "checksum"
  | "migration"
  | "transaction-aborted"
  | "unknown";

export type PersistenceErrorCode =
  | "QUOTA_EXCEEDED"
  | "INDEXEDDB_UNAVAILABLE"
  | "TRANSACTION_ABORTED"
  | "REVISION_CONFLICT"
  | "CHECKSUM_FAILED"
  | "VALIDATION_FAILED"
  | "SCHEMA_MIGRATION_FAILED"
  | "SOURCE_WRITE_FAILED"
  | "PROJECT_WRITE_FAILED"
  | "PROJECT_READ_FAILED"
  | "UNKNOWN";

export class PersistenceError extends Error {
  constructor(
    public readonly kind: PersistenceErrorKind,
    message: string,
    options?: ErrorOptions & { code?: PersistenceErrorCode }
  ) {
    super(message, options);
    this.name = "PersistenceError";
    this.code = options?.code ?? "UNKNOWN";
  }

  readonly code: PersistenceErrorCode;
}

export function normalizePersistenceError(error: unknown): PersistenceError {
  if (error instanceof PersistenceError) return error;

  if (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  ) {
    return new PersistenceError(
      "quota",
      "PDF Space could not save this project because browser storage is full.",
      { cause: error, code: "QUOTA_EXCEEDED" }
    );
  }

  if (
    error instanceof DOMException &&
    (error.name === "InvalidStateError" ||
      error.name === "SecurityError" ||
      error.name === "UnknownError")
  ) {
    return new PersistenceError(
      "unavailable",
      "Local saving is unavailable in this browser session.",
      { cause: error, code: "INDEXEDDB_UNAVAILABLE" }
    );
  }

  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TransactionInactiveError")
  ) {
    return new PersistenceError(
      "transaction-aborted",
      "The local save transaction was interrupted before it completed.",
      { cause: error, code: "TRANSACTION_ABORTED" }
    );
  }

  return new PersistenceError(
    "unknown",
    error instanceof Error ? error.message : "An unknown local save error occurred.",
    { cause: error, code: "UNKNOWN" }
  );
}

export function getPersistenceErrorCopy(error: PersistenceError): {
  title: string;
  description: string;
} {
  if (error.kind === "quota") {
    return {
      title: "Not enough browser storage",
      description:
        "PDF Space could not save this project locally. Remove unused local projects or free browser storage, then try again.",
    };
  }

  if (error.kind === "unavailable") {
    return {
      title: "Local saving unavailable",
      description:
        "Local saving is unavailable in this browser session. Keep this tab open to avoid losing your work.",
    };
  }

  if (error.kind === "conflict") {
    return {
      title: "This project changed in another tab",
      description:
        "A newer local revision was saved elsewhere. Reload the latest version or keep this work as a separate project.",
    };
  }

  if (error.kind === "validation" || error.kind === "checksum") {
    return {
      title: "Project integrity check failed",
      description:
        "PDF Space kept your current work in this tab but did not replace the last valid local revision.",
    };
  }

  return {
    title: "Local save failed",
    description:
      "PDF Space could not save the latest changes locally. Your workspace remains available in this tab.",
  };
}
