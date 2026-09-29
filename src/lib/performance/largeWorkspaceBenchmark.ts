import { createWorkspaceLogicalSnapshot } from "../history/workspaceSnapshots";
import {
  buildWorkspaceSearchIndex,
  searchWorkspace,
} from "../workspace-search/workspaceSearch";
import { initialWorkspaceState } from "../workspace/workspaceState";
import type { WorkspaceState } from "../workspace/workspaceState";
import { buildWorkspaceRuntimeIndexes } from "../workspace/workspaceRuntimeIndexes";

export const LARGE_WORKSPACE_BENCHMARK_PROFILES = [
  { name: "small", documents: 3, pages: 30, sources: 3 },
  { name: "medium", documents: 8, pages: 250, sources: 5 },
  { name: "large", documents: 15, pages: 800, sources: 10 },
] as const;

export type LargeWorkspaceBenchmarkProfile =
  (typeof LARGE_WORKSPACE_BENCHMARK_PROFILES)[number];

export function createLargeWorkspaceBenchmarkFixture(
  profile: LargeWorkspaceBenchmarkProfile
): WorkspaceState {
  const sourceDocuments = Object.fromEntries(
    Array.from({ length: profile.sources }, (_, sourceIndex) => {
      const id = `source-${sourceIndex}`;
      return [
        id,
        {
          id,
          name:
            sourceIndex % 2 === 0
              ? `مصدر-${sourceIndex}.pdf`
              : `source-${sourceIndex}.pdf`,
          size: 5_000_000 + sourceIndex,
          mimeType: "application/pdf",
          originalPageCount: Math.ceil(profile.pages / profile.sources),
          importedAt: 1,
        },
      ];
    })
  );
  let globalPageIndex = 0;
  const documents = Array.from(
    { length: profile.documents },
    (_, documentIndex) => {
      const populatedDocumentCount = Math.max(1, profile.documents - 1);
      const pageCount =
        documentIndex === profile.documents - 1
          ? 0
          : Math.floor(profile.pages / populatedDocumentCount) +
            (documentIndex < profile.pages % populatedDocumentCount ? 1 : 0);
      const id = `document-${documentIndex}`;
      const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
        const occurrenceIndex = globalPageIndex++;
        return {
          id: `page-${occurrenceIndex}`,
          documentId: id,
          sourceDocumentId: `source-${occurrenceIndex % profile.sources}`,
          originalPageIndex:
            occurrenceIndex % Math.ceil(profile.pages / profile.sources),
          pageNumber: pageIndex + 1,
          rotation: [0, 90, 180, 270][occurrenceIndex % 4] as 0 | 90 | 180 | 270,
          duplicatedFromPageId:
            occurrenceIndex > 0 && occurrenceIndex % 7 === 0
              ? `page-${occurrenceIndex - 1}`
              : undefined,
          thumbnailStatus: "idle" as const,
        };
      });
      return {
        id,
        name:
          documentIndex % 2 === 0
            ? `مستند ${documentIndex}`
            : `Document ${documentIndex}`,
        size: pageCount * 1_000,
        mimeType: "application/pdf",
        pageCount,
        color: "#00aaff",
        status: "ready" as const,
        pages,
      };
    }
  );

  return {
    ...initialWorkspaceState,
    documents,
    sourceDocuments,
    selectedDocumentId: documents[0]?.id ?? null,
  };
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

export type LargeWorkspaceBenchmarkResult = LargeWorkspaceBenchmarkProfile & {
  searchIndexMs: number;
  searchQueryMs: number;
  logicalSnapshotMs: number;
  indexedLookupsMs: number;
  logicalSnapshotBytes: number;
};

export function runLargeWorkspaceBenchmark(
  profile: LargeWorkspaceBenchmarkProfile,
  iterations = 31,
  now = () => performance.now()
): LargeWorkspaceBenchmarkResult {
  const workspace = createLargeWorkspaceBenchmarkFixture(profile);
  const indexRuns: number[] = [];
  const queryRuns: number[] = [];
  const snapshotRuns: number[] = [];
  const lookupRuns: number[] = [];
  let searchIndex = buildWorkspaceSearchIndex(
    workspace.documents,
    workspace.sourceDocuments
  );

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let startedAt = now();
    searchIndex = buildWorkspaceSearchIndex(
      workspace.documents,
      workspace.sourceDocuments
    );
    indexRuns.push(now() - startedAt);

    startedAt = now();
    searchWorkspace(searchIndex, "page 12");
    queryRuns.push(now() - startedAt);

    startedAt = now();
    createWorkspaceLogicalSnapshot(workspace);
    snapshotRuns.push(now() - startedAt);

    const runtimeIndexes = buildWorkspaceRuntimeIndexes(workspace.documents);
    startedAt = now();
    for (let lookupIndex = 0; lookupIndex < 2_000; lookupIndex += 1) {
      runtimeIndexes.pageById.get(
        `page-${(lookupIndex * 37) % profile.pages}`
      );
    }
    lookupRuns.push(now() - startedAt);
  }

  const snapshot = createWorkspaceLogicalSnapshot(workspace);
  return {
    ...profile,
    searchIndexMs: median(indexRuns),
    searchQueryMs: median(queryRuns),
    logicalSnapshotMs: median(snapshotRuns),
    indexedLookupsMs: median(lookupRuns),
    logicalSnapshotBytes: new TextEncoder().encode(JSON.stringify(snapshot)).byteLength,
  };
}
