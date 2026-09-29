import { canonicalStringify } from "./canonicalJson";
import {
  PersistedProjectEnvelope,
  PersistedWorkspaceProject,
  PROJECT_ENVELOPE_SCHEMA_VERSION,
} from "./persistenceTypes";

export type PersistedProjectChecksumInput = Omit<
  PersistedProjectEnvelope,
  "checksum"
>;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export async function createPersistedProjectChecksum(
  input: PersistedProjectChecksumInput
): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalStringify(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}

export async function createProjectLogicalChecksum(
  project: PersistedWorkspaceProject
): Promise<string> {
  const { updatedAt: _updatedAt, ...logicalProject } = project;
  void _updatedAt;
  const bytes = new TextEncoder().encode(canonicalStringify(logicalProject));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}

export async function verifyPersistedProjectChecksum(
  envelope: PersistedProjectEnvelope
): Promise<boolean> {
  if (
    envelope.checksum?.algorithm !== "SHA-256" ||
    envelope.checksum.encoding !== "base64url"
  ) {
    return false;
  }
  const { checksum: _checksum, ...input } = envelope;
  void _checksum;
  return (await createPersistedProjectChecksum(input)) === envelope.checksum.digest;
}

export async function createPersistedProjectEnvelope({
  project,
  revision,
  savedAt = Date.now(),
}: {
  project: PersistedWorkspaceProject;
  revision: number;
  savedAt?: number;
}): Promise<PersistedProjectEnvelope> {
  const input: PersistedProjectChecksumInput = {
    format: "pdf-space-project",
    schemaVersion: PROJECT_ENVELOPE_SCHEMA_VERSION,
    projectId: project.id,
    revision,
    createdAt: new Date(project.createdAt).toISOString(),
    savedAt: new Date(savedAt).toISOString(),
    project,
  };
  return {
    ...input,
    checksum: {
      algorithm: "SHA-256",
      encoding: "base64url",
      digest: await createPersistedProjectChecksum(input),
    },
  };
}
