# PDF Space Roadmap

## Current checkpoint

### Foundation Stabilization — implemented and automatically verified

Completed on 2026-07-15:

- Thumbnail object URL registration, replacement, removal, and unmount ownership.
- Cancellation-safe thumbnail completion.
- Page-ID-based thumbnail state updates across page movement.
- Independent immutable source metadata.
- Source-reference-based PDF.js proxy cleanup.
- Drag container terminology (`sourceContainerId` / `targetContainerId`).
- Pure movement and insertion-slot helpers.
- Vitest setup and 23 focused unit tests.
- Accurate README, testing guide, and engineering handoff.
- Clean install, tests, typecheck, build, and route smoke verification.

### Drag/drop manual validation — still open

Before Phase 4A, manually validate with at least two real PDFs:

- Projected ghost equals the committed position.
- Same-group forward, backward, beginning, middle, end, wrapped-row, and adjacent no-op movement.
- Cross-group beginning, middle, end, empty group, mixed-source group, and source-group-empty cases.
- Move/remove operations while thumbnails render.
- Original source metadata and viewer rendering after moves/removals.
- External PDF file drop remains isolated from internal page dragging.

Automated browser control could not attach local PDF files through the native picker during this phase, so this checkpoint is not marked manually verified.

## Next phases

1. Multi-page selection and contextual selection UI.
2. Delete, duplicate, rotate, move-to, and copy-to operations.
3. Undo/Redo command history.
4. IndexedDB persistence, autosave, and recent local projects.
5. Normal PDF export using `pdf-lib`.
6. Versioned Smart PDF Manifest.
7. Smart Restore.
8. Projects dashboard.
9. Authentication, backend, and optional cloud sync.
10. Performance polish, including route/code splitting and the current Vite bundle-size warning.

## Deferred product areas

- Text editing inside PDF pages.
- OCR.
- Annotations and drawing.
- Signatures.
- Form editing.
- Compression and watermarking.
