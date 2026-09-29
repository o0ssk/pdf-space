/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui/Toast";
import { UnsupportedBrowserState } from "./components/UnsupportedBrowserState";
import { getBrowserSupport } from "./lib/browserSupport";
const LandingPage = lazy(() =>
  import("./pages/LandingPage").then((module) => ({ default: module.LandingPage }))
);
const ComingSoonPage = lazy(() =>
  import("./pages/ComingSoonPage").then((module) => ({
    default: module.ComingSoonPage,
  }))
);
const ProjectsPage = lazy(() =>
  import("./pages/ProjectsPage").then((module) => ({ default: module.ProjectsPage }))
);
const WorkspacePage = lazy(() =>
  import("./pages/WorkspacePage").then((module) => ({ default: module.WorkspacePage }))
);

function RouteLoadingState() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-main-bg text-sm text-muted-text" role="status">
      Opening PDF Space…
    </div>
  );
}

export default function App() {
  const browserSupport = getBrowserSupport();

  if (!browserSupport.supported) {
    return <UnsupportedBrowserState missing={browserSupport.missing} />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingState />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<ComingSoonPage context="login" />} />
            <Route
              path="/privacy"
              element={<ComingSoonPage context="privacy" />}
            />
            <Route path="/terms" element={<ComingSoonPage context="terms" />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/workspace/:projectId" element={<WorkspacePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}
