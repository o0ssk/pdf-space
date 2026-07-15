# PDF Space — Smart PDF Workspace

PDF Space is a local-first, multi-document PDF workspace for organizing pages visually across several PDFs while keeping every imported source file immutable.

The current application is a transient in-memory editor foundation. It can import and render real PDFs, view pages, reorder pages inside a group, and move a page between groups. Persistence, export, and Smart Restore are planned but not implemented.

## Current functionality

### Landing page (`/`)

- Approved dark cosmic visual direction.
- Responsive navigation and mobile menu.
- Product, local-first, and Smart Restore concept sections.
- Calls to action route into the workspace.

### Workspace (`/workspace`)

- Responsive Documents, Canvas, and Inspector layout.
- Multiple local PDF import through one shared file picker.
- Native operating-system PDF drop on the canvas.
- PDF validation and PDF.js parsing in the browser.
- Real page counts and lazy real-page thumbnails.
- Bounded thumbnail rendering queue.
- Single-page selection and source-aware Inspector details.
- Full-page PDF viewer with previous/next, zoom, fit-page, and fit-width.
- dnd-kit same-document page reordering.
- dnd-kit cross-document single-page movement.
- Empty-group drop targets.
- Canonical insertion-slot projection with a translucent ghost.
- Original `sourceDocumentId` and `originalPageIndex` preserved through moves.

## Stabilized architecture

- `WorkspaceDocument` is an editable page group.
- `WorkspaceSourceDocument` is immutable metadata for an imported PDF source.
- `WorkspacePage.documentId` identifies the current editable group.
- `WorkspacePage.sourceDocumentId` identifies the immutable PDF source.
- PDF rendering always uses `sourceDocumentId` plus `originalPageIndex`.
- Thumbnail state updates locate pages globally by stable page ID, so a render can finish after a move safely.
- Every thumbnail object URL is registered before it enters React state and is revoked after its page leaves the rendered workspace.
- PDF.js proxies are retained while any workspace page references their source and destroyed after the final reference disappears.
- Drag state uses `sourceContainerId` and `targetContainerId`; these names are intentionally distinct from immutable PDF source identity.

## Technology stack

- React 19
- TypeScript 5.8
- Vite 6
- Tailwind CSS 4
- Motion 12
- React Router 7
- PDF.js through `pdfjs-dist`
- dnd-kit
- Vitest 3

There is no backend, database, authentication SDK, persistence library, or PDF export library.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port 3000 |
| `npm run test` | Run the focused Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run build` | Create the production build in `dist` |
| `npm run preview` | Preview the production build |
| `npm run clean` | Remove `dist` |

The previous `lint` script was removed because it only repeated `tsc --noEmit`; no real ESLint configuration is currently claimed.

## Local development

```bash
npm ci
npm run test
npm run typecheck
npm run dev
```

Open `http://127.0.0.1:3000/workspace`.

## Not implemented

- Multi-page selection.
- Page deletion.
- Page duplication.
- Page rotation editing.
- Page copying.
- Undo and Redo.
- IndexedDB persistence or autosave.
- Recent-project management.
- Normal PDF export.
- Smart PDF Manifest or Smart Restore.
- Authentication, backend, or cloud sync.
- OCR, text editing, annotations, signatures, forms, compression, or watermarks.

## Verification status

On 2026-07-15:

- `npm ci` passed with zero reported vulnerabilities.
- `npm run test` passed: 4 files, 23 tests.
- `npm run typecheck` passed.
- `npm run build` passed.
- Production-preview smoke checks for `/` and `/workspace` passed with no browser-console warnings or errors.

The complete two-PDF drag/drop and rendering-lifecycle matrix has not yet been manually executed. See `TESTING.md` for the exact outstanding checklist.

Vite still reports that the main minified JavaScript chunk exceeds 500 kB. Code splitting is deferred to the performance phase.
