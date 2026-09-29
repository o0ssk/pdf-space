export type LocalProjectEvent =
  | { type: "project-created"; projectId: string }
  | { type: "project-updated"; projectId: string }
  | { type: "project-renamed"; projectId: string; name: string }
  | { type: "project-deleted"; projectId: string }
  | {
      type: "project-committed";
      projectId: string;
      revision: number;
      savedAt: string;
      sessionId?: string;
    };

const CHANNEL_NAME = "pdf-space-projects";
export const PROJECT_SESSION_ID = crypto.randomUUID();

export function publishLocalProjectEvent(event: LocalProjectEvent): void {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(
    event.type === "project-committed"
      ? { ...event, sessionId: PROJECT_SESSION_ID }
      : event
  );
  channel.close();
}

export function subscribeToLocalProjectEvents(
  listener: (event: LocalProjectEvent) => void
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener("message", (message: MessageEvent<LocalProjectEvent>) => {
    if (message.data?.type) listener(message.data);
  });
  return () => channel.close();
}
