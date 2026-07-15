# First Message to ChatGPT

Upload the latest PDF Space ZIP, then send the following message:

---

You are taking over development of my project, **PDF Space — Smart PDF Workspace**, from a previous AI coding environment.

First, extract and inspect the entire uploaded repository. Read `PROJECT_CONTEXT.md` completely before making any change. Also inspect the actual code because parts of README and TESTING may be outdated.

PDF Space is a local-first multi-document PDF editor. Its main value is allowing users to open several PDFs together, visually reorder pages, move content between document groups, later copy/delete/duplicate/rotate pages, export normal PDFs, and eventually export Smart PDFs whose workspace structure can be restored later.

The approved dark cosmic landing page and workspace visual identity are locked. Do not redesign them.

Current baseline includes:

- React, TypeScript, Vite, Tailwind, Motion, PDF.js, and dnd-kit.
- Real local PDF import and thumbnail rendering.
- Single-page selection and a full-page viewer.
- Same-document reordering and cross-document movement.
- A translucent projected-page ghost.
- A canonical insertion-slot model intended to make the final drop exactly replace the ghost position.
- Internal page dragging through dnd-kit and external operating-system PDF import through native file drag events.

Before implementation:

1. Inspect the full repository.
2. Read `PROJECT_CONTEXT.md`.
3. Inspect the key workspace and drag/drop files.
4. Run `npm ci`.
5. Run `npm run typecheck`.
6. Run `npm run build`.
7. Explain the current architecture and exact project status.
8. Identify any mismatch between documentation and code.
9. Do not change anything until you understand the current baseline.

Our immediate checkpoint is to verify that the projected ghost and the final page position are always identical for same-document and cross-document movement. Test forward, backward, beginning, middle, end, wrapped rows, empty groups, cancellation, and external PDF import.

After the current drag/drop system is proven stable, the next planned phase is multi-page selection, followed by delete, duplicate, rotate, copy/move operations, and Undo/Redo. Do not implement those future phases until I approve the current checkpoint.

For every task follow this workflow:

Plan → Implement → Typecheck → Build → Test with real PDFs → Visual QA → Fix regressions → Update documentation → Final report.

Never claim a test was performed unless it actually was. Never replace original PDF source identity when a page moves between groups. Rendering and future export must continue to use `sourceDocumentId` and `originalPageIndex`.

Start by giving me a concise repository audit and current-state report. Do not edit code in your first response.

---
