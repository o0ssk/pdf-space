import {
  checkProjectSourceHealth,
  corruptRevisionForTest,
  listProjectRevisions,
  loadProjectWithRecovery,
} from "./pdfSpaceDatabase";
import { setPersistenceFaultInjection } from "./persistenceFaults";
import {
  getPersistenceReadMetrics,
  resetPersistenceReadMetrics,
} from "./persistenceReadMetrics";

export function exposePersistenceDiagnostics(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.__PDF_SPACE_DEBUG__ = {
    ...window.__PDF_SPACE_DEBUG__,
    validateProject: loadProjectWithRecovery,
    listProjectRevisions,
    corruptRevisionForTest,
    checkSourceHealth: async (projectId: string) => {
      const loaded = await loadProjectWithRecovery(projectId);
      return loaded.status === "unrecoverable"
        ? loaded
        : checkProjectSourceHealth(loaded.project);
    },
    setPersistenceFaultInjection,
    getPersistenceReadMetrics,
    resetPersistenceReadMetrics,
  };
}
