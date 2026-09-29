import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { WorkspaceShell } from "../components/workspace/WorkspaceShell";
import { BARE_WORKSPACE_REDIRECT } from "../lib/navigation/productRoutes";

export const WorkspacePage: React.FC = () => {
  const { projectId } = useParams();

  if (!projectId) {
    return <Navigate to={BARE_WORKSPACE_REDIRECT} replace />;
  }

  return (
    <WorkspaceShell
      key={projectId}
      projectId={projectId}
      isNewProject={false}
    />
  );
};
