# PDF Space — QA and Testing Guide

Last verified: 2026-07-15

This guide separates automated verification, browser smoke checks, and real-PDF manual work. A checked item means it was actually executed in the current stabilization phase.

## Required commands

```bash
npm ci
npm run test
npm run typecheck
npm run build
```

There is no ESLint script. The former `lint` command only duplicated TypeScript checking and was removed.

## Automated verification performed

- [x] `npm ci` completed; npm reported zero vulnerabilities.
- [x] `npm run test` passed: 4 test files, 23 tests.
- [x] `npm run typecheck` passed.
- [x] `npm run build` passed.

### Unit coverage

- Same-group forward and backward movement.
- Beginning and end movement.
- Adjacent no-op movement.
- Cross-group slot 0, middle, final slot, and empty target.
- No lost or duplicated page IDs.
- Immutable source identity preservation and current container updates.
- Insertion-slot clamping, before, after, start, end, and empty placement.
- Same-group projection base after removing the active page.
- Mixed and repeated source references.
- Source metadata retention after the original editable group is removed.
- Source metadata cleanup after the final reference disappears.
- Page-ID thumbnail updates before and after movement.
- Missing-page updates returning unchanged state without recreating a page.
- Thumbnail URL replacement, selective revocation, and clear.
- Active thumbnail-job cancellation suppressing completion work.

## Browser smoke verification performed

- [x] Production preview `/` loaded successfully.
- [x] Production preview `/workspace` loaded the empty workspace shell.
- [x] No browser-console warnings or errors were reported in those routes.
- [x] The approved landing page and workspace layout remained intact in the tested desktop view.

## Manual real-PDF verification still required

Automated browser control could not attach local files through the native operating-system picker. None of the following items is claimed as performed in this phase.

Use at least two different real PDFs.

### Same document

- [ ] Forward movement.
- [ ] Backward movement.
- [ ] Move to beginning.
- [ ] Move to middle.
- [ ] Move to end.
- [ ] Movement across wrapped grid rows.
- [ ] Adjacent no-op movement.
- [ ] Projected ghost equals final committed position.

### Cross document

- [ ] Move to beginning.
- [ ] Move to middle.
- [ ] Move to end.
- [ ] Move into an empty group.
- [ ] Source editable group becomes empty.
- [ ] Destination contains pages from mixed immutable sources.
- [ ] Page is neither duplicated nor lost.
- [ ] Projected ghost equals final committed position.

### Rendering and resource lifecycle

- [ ] Move a page while its thumbnail is rendering.
- [ ] Remove a group while a thumbnail is rendering.
- [ ] Remove the original editable group while moved pages still reference its source.
- [ ] Remove the final workspace reference to a source.
- [ ] Import, remove, and import the same PDFs repeatedly.
- [ ] Confirm thumbnails do not become stuck in `rendering`.
- [ ] Confirm removed pages do not reappear.
- [ ] Confirm retained object URLs and PDF proxies do not grow continuously.

### Viewer and Inspector

- [ ] A moved page still renders from its immutable source.
- [ ] The original source filename remains visible after its original group is removed.
- [ ] Viewer navigation follows the current editable group order.
- [ ] Original source page number remains correct.

### External import isolation

- [ ] External PDF file drop still imports files.
- [ ] Internal page drag never activates the external-file overlay.
- [ ] Drag cancellation leaves page order unchanged.

## Known non-blocking warning

The Vite production build reports a main JavaScript chunk over 500 kB after minification. This is tracked for later performance/code-splitting work and is not a functional failure in the stabilization phase.
