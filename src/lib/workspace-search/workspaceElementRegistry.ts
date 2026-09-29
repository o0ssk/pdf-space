export type WorkspaceElementRegistry<T extends HTMLElement = HTMLElement> = {
  register: (id: string, element: T | null) => void;
  get: (id: string) => T | null;
  has: (id: string) => boolean;
  clear: () => void;
};

export function createWorkspaceElementRegistry<
  T extends HTMLElement = HTMLElement,
>(): WorkspaceElementRegistry<T> {
  const elements = new Map<string, T>();
  return {
    register(id, element) {
      if (element) elements.set(id, element);
      else elements.delete(id);
    },
    get(id) {
      return elements.get(id) ?? null;
    },
    has(id) {
      return elements.has(id);
    },
    clear() {
      elements.clear();
    },
  };
}
