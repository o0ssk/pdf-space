# PDF Space — Project Context and Engineering Handoff

Last updated: 2026-07-15

Read this document and inspect the current code before every development task. The repository is the final source of truth.

## 1. Product definition

PDF Space is a local-first, multi-document PDF workspace. It is not a generic merger or simple viewer.

The product is intended to:

- Open several PDF files in one workspace.
- Show real PDF pages visually.
- Reorder pages within editable groups.
- Move and later copy pages between groups.
- Build new document structures from several immutable sources.
- Export normal PDFs later.
- Export and restore versioned Smart PDFs later.

Original imported PDFs remain immutable. Workspace edits are represented as project state and will only be materialized during export.

## 2. Approved visual direction — locked

- Dark cosmic workspace.
- Deep navy and near-black surfaces.
- Electric blue and violet accents.
- Restrained glow and motion.
- Large oval orbital composition on the landing page.
- Professional document-workspace layout rather than a generic SaaS dashboard.

Do not redesign the landing page, workspace layout, colors, typography, page cards, Inspector, viewer, or orbital composition unless explicitly requested.

## 3. Current stack

- React 19.
- TypeScript 5.8.
- Vite 6.
- Tailwind CSS 4.
- Motion 12.
- Lucide React.
- React Router 7.
- PDF.js through `pdfjs-dist`.
- dnd-kit core, sortable, and utilities.
- Vitest 3.

There is no Redux/Zustand store, backend, database, authentication SDK, persistence layer, or PDF export library.

## 4. Routes

- `/` — approved marketing landing page.
- `/workspace` — functional local PDF workspace.

## 5. Current functionality

- Multiple PDF selection from one shared file input.
- Native operating-system PDF drop on the central canvas.
- Unsupported, empty, damaged, and protected-file handling.
- Local PDF.js parsing and page counting.
- One editable document group per imported PDF.
- Lazy real-page thumbnail rendering with bounded concurrency.
- Single-page selection and Inspector properties.
- Full-page source-aware viewer.
- Zoom, fit-page, fit-width, and previous/next navigation.
- dnd-kit same-group page reordering.
- dnd-kit cross-group single-page movement.
- Empty-group targets, compact DragOverlay, and translucent projected ghost.
- Canonical insertion slots shared by projection and final commit.

Undo, Save, and Export controls remain disabled because those phases are not implemented.

## 6. Stabilized data architecture

### Editable groups

`WorkspaceDocument` represents a current editable group. Its `pages` array is the workspace order and its page count changes as pages move.

### Immutable source metadata

`WorkspaceSourceDocument` represents the imported PDF source independently from editable groups:

```ts
type WorkspaceSourceDocument = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  originalPageCount: number;
  importedAt: number;
};
```

Workspace state stores `sourceDocuments` separately from `documents`. Source metadata remains available after the original editable group is removed when pages elsewhere still reference that source. It is pruned only when neither an editable source group nor a page reference remains.

### Page identity

```ts
type WorkspacePage = {
  id: string;
  documentId: string;       // current editable container
  sourceDocumentId: string; // immutable PDF source
  originalPageIndex: number;
  pageNumber: number;       // current position in the editable group
  rotation: 0 | 90 | 180 | 270;
  thumbnailStatus: ThumbnailStatus;
  thumbnailUrl?: string;
  errorMessage?: string;
};
```

Never change `sourceDocumentId` or `originalPageIndex` during a move. Thumbnails, the viewer, and future export must use those immutable source fields.

## 7. Stabilized resource lifecycles

### Thumbnail URLs

- `usePageThumbnail` creates the only thumbnail object URLs.
- Every created URL is registered with `thumbnailUrlManager` by stable page ID before it enters React state.
- Replacements revoke the previous owned URL.
- Document removal cancels page jobs first.
- Removed-page URLs are revoked in a post-commit effect, after the page is no longer displayed.
- Rejected ready updates revoke the new URL immediately.
- Workspace unmount clears every remaining URL.

### Thumbnail render safety

- Thumbnail state changes use `UPDATE_PAGE_BY_ID`.
- The reducer searches every editable group for the stable page ID.
- A render finishing after a move updates the page in its new group.
- A missing-page update returns the existing state and never recreates a page.
- Queued and active jobs have cancellation state.
- Cancelled work cannot commit ready/error state or create a retained URL.
- Canvas-to-Blob encoding is awaited, so concurrency and cancellation cover the full job.

### PDF.js source proxies

- `pdfDocumentRegistry` is keyed by immutable source ID.
- Removing an editable group gathers every immutable source used by its pages.
- Cleanup runs after the group removal is committed.
- A proxy is retained while any remaining page has the matching `sourceDocumentId`.
- The proxy is destroyed after its final page reference disappears.
- Registry removal is idempotent and deletes ownership before destruction.
- Failed or abandoned imports unregister their proxy.
- Workspace unmount destroys all remaining proxies.

## 8. Drag/drop architecture

Internal page movement uses dnd-kit only. Native browser drag events are reserved for operating-system file import.

Drag state uses container terminology:

```ts
type ProjectedPageDrop = {
  activePageId: string;
  sourceContainerId: string;
  targetContainerId: string;
  insertionSlot: number;
  overPageId?: string;
  placement: "before" | "after" | "start" | "end" | "empty";
};
```

Rules:

- `sourceContainerId` is the editable group the drag started in.
- `targetContainerId` is the editable destination group.
- `WorkspacePage.sourceDocumentId` remains the immutable PDF source.
- Same-group projection removes the active page before calculating a slot.
- The projected ghost carries the canonical insertion slot.
- `onDragEnd` commits that slot and does not recalculate it.
- Real page arrays change only on drop.

Do not add native draggable page cards or a second internal drag system.

## 9. State and test structure

- `src/lib/workspace/workspaceState.ts` contains the pure reducer and source/page helpers.
- `src/hooks/useWorkspace.ts` owns React orchestration, imports, resource cleanup, and toasts.
- `src/types/workspace.ts` contains project types and insertion-slot helpers.
- Vitest covers movement, slots, source references, page-ID updates, URL ownership, and queue cancellation.

The former `lint` script was removed because it only duplicated TypeScript checking. Do not claim ESLint coverage unless a real configuration is added later.

## 10. Verification baseline

Verified on 2026-07-15:

```bash
npm ci
npm run test
npm run typecheck
npm run build
```

Results:

- Clean install passed; npm reported zero vulnerabilities.
- 4 Vitest files and 23 tests passed.
- TypeScript passed.
- Production build passed.
- Production-preview smoke checks for `/` and `/workspace` passed.
- No browser-console warnings or errors occurred in those smoke checks.

The Vite main chunk remains over 500 kB after minification. This is a future performance task, not a stabilization blocker.

## 11. Manual verification status

The complete two-real-PDF drag/drop and lifecycle matrix remains unverified. The in-app browser controller could not attach local files through the native file picker.

Before Phase 4A, manually perform every unchecked item in `TESTING.md`, especially ghost/commit equality, wrapped rows, mixed-source groups, movement/removal during rendering, source-name retention, viewer correctness, cancellation, and external-file import isolation.

Do not claim those tests passed until they are actually executed.

## 12. Current limitations

Not implemented:

- Multi-page selection.
- Delete, duplicate, rotation editing, or copy.
- Undo/Redo command history.
- Project persistence, IndexedDB, autosave, or recent projects.
- Normal PDF export or `pdf-lib`.
- Smart PDF Manifest or Smart Restore.
- Authentication, backend, database, or cloud sync.
- OCR, text editing, drawing, annotations, signatures, forms, compression, or watermarks.

## 13. Roadmap

1. Complete the outstanding real-PDF drag/drop stabilization matrix.
2. Multi-page selection foundation.
3. Delete, duplicate, rotate, move-to, and copy-to.
4. Undo/Redo.
5. Local persistence and recent projects.
6. Normal PDF export.
7. Smart PDF Manifest.
8. Smart Restore.
9. Projects dashboard.
10. Authentication and optional cloud sync.
11. Performance/code-splitting polish.

Do not begin Phase 4A until the manual drag/drop baseline is confirmed.

## 14. Key files

- `src/types/workspace.ts` — project types and insertion-slot helpers.
- `src/lib/workspace/workspaceState.ts` — pure reducer, page-ID updates, movement, and source references.
- `src/hooks/useWorkspace.ts` — imports and runtime resource orchestration.
- `src/hooks/usePageThumbnail.ts` — lazy, cancellation-safe thumbnail rendering.
- `src/lib/pdf/thumbnailQueue.ts` — bounded queue and cancellation state.
- `src/lib/pdf/thumbnailUrls.ts` — object URL ownership.
- `src/lib/pdf/pdfDocumentRegistry.ts` — immutable source proxy registry.
- `src/components/workspace/WorkspaceShell.tsx` — dnd-kit orchestration.
- `src/components/workspace/DocumentGroup.tsx` — group grid and projected ghost placement.
- `src/components/workspace/PageThumbnail.tsx` — sortable page card.
- `src/components/workspace/WorkspaceInspector.tsx` — current group and immutable source metadata.
- `src/components/workspace/viewer/PageViewerDialog.tsx` — source-aware page viewer.

## 15. Engineering rules

For every task:

1. Read this file and inspect current code.
2. Define the exact phase scope.
3. Implement only that scope.
4. Preserve immutable source identity.
5. Keep runtime PDF.js objects and Blob URLs outside durable project data.
6. Run relevant automated tests, typecheck, and build.
7. Perform real-PDF manual tests when interactions change.
8. Update `PROJECT_CONTEXT.md`, `ROADMAP.md`, `README.md`, and `TESTING.md`.
9. Report only tests actually performed.
10. Preserve the locked visual design and accessibility behavior.
