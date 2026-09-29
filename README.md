# PDF Space

PDF Space is a local-first visual workspace for organizing PDF pages, splitting and merging documents, and exporting standard PDF files directly in the browser.

## Features

- **Local-First & Private:** All PDF processing happens locally in the browser with Web Workers and IndexedDB. No files are uploaded to any server.
- **Visual Page Canvas:** Intuitive drag-and-drop workspace to reorder, move, rotate, duplicate, and delete PDF pages across document groups.
- **Document Groups:** Create, rename, reorder, duplicate, and delete document groups to organize complex multi-page files.
- **Fast PDF Rendering:** High-performance thumbnail rendering and document caching powered by PDF.js.
- **PDF Text Search:** Embedded English and Arabic text search across all documents with contextual snippets and direct page navigation.
- **Quick Navigation:** Jump instantly to documents or pages with `Ctrl/Cmd + K`.
- **Durable Local Persistence:** IndexedDB storage with automatic recovery revisions and revision integrity checks.
- **Flexible Export:** Export single document groups as standalone PDFs or multiple groups packaged into a ZIP archive.
- **Bilingual Interface:** First-class support for both English and Arabic with automatic layout direction (LTR/RTL).

## Tech Stack

- **Framework:** React 19, TypeScript
- **Styling:** Tailwind CSS, Lucide Icons, Motion
- **PDF Engine:** PDF.js, pdf-lib
- **Utilities:** JSZip, idb (IndexedDB)
- **Tooling:** Vite

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

### Production Build

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Linting & Type Checking

```bash
npm run lint
npm run typecheck
```

## License

MIT
