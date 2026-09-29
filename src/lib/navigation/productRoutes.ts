export const LANDING_ROUTE = "/";
export const PROJECTS_ROUTE = "/projects";
export const BARE_WORKSPACE_REDIRECT = PROJECTS_ROUTE;

export function workspaceProjectRoute(projectId: string): string {
  return `/workspace/${projectId}`;
}
