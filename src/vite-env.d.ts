/// <reference types="vite/client" />

import type { PdfTextPageDiagnostic } from "./lib/pdf-text/pdfTextDiagnostics";
import type { PdfSpacePerformanceSnapshot } from "./lib/performance/performanceDiagnostics";
import type {
  PersistedProjectEnvelope,
  ProjectLoadResult,
  ProjectSourceHealth,
  PersistenceReadMetrics,
} from "./lib/persistence/persistenceTypes";
import type { PersistenceFaultPoint } from "./lib/persistence/persistenceFaults";

declare global {
  const __APP_VERSION__: string;

  type PdfTextDebugPageInput = {
    documentId?: string;
    pageId?: string;
    sourceDocumentId?: string;
    originalPageIndex?: number;
    query?: string;
  };

  type PdfTextDebugIndexSnapshot = {
    totalRequiredKeys: number;
    queuedKeys: number;
    extractingKeys: number;
    readyKeys: number;
    emptyKeys: number;
    failedKeys: number;
    cancelledKeys: number;
  };

  interface PdfSpaceDebugApi {
    performanceSnapshot?: () => PdfSpacePerformanceSnapshot;
    validateProject?: (projectId: string) => Promise<ProjectLoadResult>;
    listProjectRevisions?: (projectId: string) => Promise<PersistedProjectEnvelope[]>;
    corruptRevisionForTest?: (projectId: string, revision: number) => Promise<void>;
    checkSourceHealth?: (projectId: string) => Promise<ProjectLoadResult | ProjectSourceHealth>;
    setPersistenceFaultInjection?: (fault: PersistenceFaultPoint | null) => void;
    getPersistenceReadMetrics?: () => PersistenceReadMetrics;
    resetPersistenceReadMetrics?: () => void;
    inspectTextPage?: (input: PdfTextDebugPageInput) => PdfTextPageDiagnostic;
    inspectTextIndex?: () => PdfTextDebugIndexSnapshot;
  }

  interface Window {
    __PDF_SPACE_DEBUG__?: PdfSpaceDebugApi;
    isInternalDragging?: boolean;
    draggedPageId?: string | null;
    draggedPageContainerId?: string | null;
  }
}

export {};
