import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  HardDrive,
  Info,
  Keyboard,
  RotateCcw,
  X,
} from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  WORKSPACE_SHORTCUTS,
  WorkspaceShortcutCategory,
  isMacPlatform,
  shortcutKeys,
} from "../../lib/onboarding/workspaceShortcuts";
import { APP_VERSION } from "../../lib/version";

export type HelpSection = "guide" | "shortcuts" | "storage" | "about";

type HelpDialogProps = {
  isOpen: boolean;
  initialSection?: HelpSection;
  onClose: () => void;
  onReplayGuide: () => void;
};

const SECTIONS: Array<{
  id: HelpSection;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { id: "guide", label: "Quick Guide", icon: BookOpen },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
  { id: "storage", label: "Local Storage & Privacy", icon: HardDrive },
  { id: "about", label: "About PDF Space", icon: Info },
];

const GUIDE_ITEMS = [
  ["Add PDFs", "Use Add Files or drop one or more PDF files into the workspace."],
  ["Organize pages", "Drag pages to reorder them or move them between documents."],
  ["Edit pages", "Rotate, duplicate, copy, move, or delete selected pages."],
  ["Manage documents", "Create, rename, reorder, duplicate, and delete document groups."],
  ["Search", "Use Quick Navigation or search embedded PDF text."],
  ["Export", "Export one document as a PDF or several documents together in a ZIP file."],
] as const;

const SHORTCUT_CATEGORIES: WorkspaceShortcutCategory[] = [
  "Search",
  "Navigation",
  "Selection",
  "Editing",
  "History",
];

export const HelpDialog: React.FC<HelpDialogProps> = ({
  isOpen,
  initialSection = "guide",
  onClose,
  onReplayGuide,
}) => {
  const { containerRef } = useFocusTrap({ isOpen });
  const [section, setSection] = useState<HelpSection>(initialSection);
  const mac = useMemo(() => isMacPlatform(), []);

  useEffect(() => {
    if (isOpen) setSection(initialSection);
  }, [initialSection, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape, true);
    return () => window.removeEventListener("keydown", closeOnEscape, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="studio-dialog-overlay fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <section
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-help-title"
        aria-describedby="workspace-help-description"
        tabIndex={-1}
        className="command-surface flex h-dvh w-full flex-col overflow-hidden rounded-none border-0 sm:h-auto sm:max-h-[min(760px,calc(100dvh-2rem))] sm:max-w-[860px] sm:rounded-[18px] sm:border"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border-main px-5 py-4 sm:px-6">
          <div>
            <h1 id="workspace-help-title" className="text-balance text-[17px] font-semibold tracking-[-0.025em] text-primary-text">Help</h1>
            <p id="workspace-help-description" className="mt-1 text-pretty text-xs leading-5 text-muted-text">
              Learn the core workflow, review working shortcuts, and understand local project storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Help"
            className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl text-muted-text hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 sm:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Help topics" className="grid grid-cols-3 gap-2 border-b border-border-main p-3 sm:flex sm:flex-col sm:border-b-0 sm:border-r sm:p-4">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? "page" : undefined}
                  className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 text-center text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright sm:justify-start sm:gap-2 sm:px-3 sm:text-left ${
                    section === item.id
                      ? "border border-blue-bright/25 bg-blue-accent/10 text-blue-bright"
                      : "border border-transparent text-secondary-text hover:bg-white/5 hover:text-primary-text"
                  }`}
                >
                  <Icon className="size-4" aria-hidden={true} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            {section === "guide" && (
              <div>
                <h2 className="text-balance text-[16px] font-extrabold">Quick Guide</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {GUIDE_ITEMS.map(([title, copy], index) => (
                    <article key={title} className="rounded-xl border border-border-main bg-panel-bg/60 p-4">
                      <p className="text-[9px] font-extrabold text-blue-bright">{index + 1}</p>
                      <h3 className="mt-1 text-sm font-extrabold text-primary-text">{title}</h3>
                      <p className="mt-1.5 text-pretty text-xs leading-5 text-muted-text">{copy}</p>
                    </article>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onReplayGuide}
                  className="mt-5 flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[11px] font-extrabold text-secondary-text hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Replay Quick Guide
                </button>
              </div>
            )}

            {section === "shortcuts" && (
              <div>
                <h2 className="text-balance text-[16px] font-extrabold">Keyboard Shortcuts</h2>
                <p className="mt-1 text-pretty text-[10.5px] leading-relaxed text-muted-text">
                  Shortcuts pause while you type in a field or while a conflicting dialog is open.
                </p>
                <div className="mt-5 space-y-5">
                  {SHORTCUT_CATEGORIES.map((category) => {
                    const entries = WORKSPACE_SHORTCUTS.filter((item) => item.category === category);
                    if (!entries.length) return null;
                    return (
                      <section key={category} aria-labelledby={`shortcut-${category}`}>
                        <h3 id={`shortcut-${category}`} className="text-[10px] font-extrabold uppercase text-muted-text">{category}</h3>
                        <dl className="mt-2 divide-y divide-white/5 rounded-xl border border-border-main bg-panel-bg/45">
                          {entries.map((shortcut) => (
                            <div key={shortcut.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <dt className="text-[11px] font-bold text-secondary-text">{shortcut.label}</dt>
                                {shortcut.context && <dd className="mt-0.5 text-[9.5px] text-muted-text">{shortcut.context}</dd>}
                              </div>
                              <dd className="flex flex-wrap gap-1.5">
                                {shortcutKeys(shortcut, mac).map((keys) => (
                                  <kbd key={keys} className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[9px] font-bold text-primary-text">{keys}</kbd>
                                ))}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {section === "storage" && (
              <div className="space-y-4">
                <h2 className="text-balance text-[16px] font-extrabold">Local Storage & Privacy</h2>
                <article className="rounded-xl border border-blue-bright/20 bg-blue-accent/[0.06] p-4">
                  <h3 className="text-[12px] font-extrabold">Processed locally</h3>
                  <p className="mt-1.5 text-pretty text-[10.5px] leading-relaxed text-secondary-text">
                    Your PDF files are processed locally and are not uploaded by PDF Space.
                  </p>
                </article>
                <article className="rounded-xl border border-border-main bg-panel-bg/55 p-4">
                  <h3 className="text-[12px] font-extrabold">Saved in this browser</h3>
                  <p className="mt-1.5 text-pretty text-[10.5px] leading-relaxed text-muted-text">
                    PDF Space stores editable projects in this browser. Clearing site data can remove them, and another browser or device will not carry them with you.
                  </p>
                </article>
                <article className="rounded-xl border border-border-main bg-panel-bg/55 p-4">
                  <h3 className="text-[12px] font-extrabold">Save and Export are different</h3>
                  <p className="mt-1.5 text-pretty text-[10.5px] leading-relaxed text-muted-text">
                    Save keeps your editable workspace in this browser. Export creates standard PDF files or a ZIP you can download and use anywhere.
                  </p>
                </article>
              </div>
            )}

            {section === "about" && (
              <div>
                <h2 className="text-balance text-[16px] font-extrabold">About PDF Space</h2>
                <p className="mt-3 max-w-xl text-pretty text-[11px] leading-relaxed text-secondary-text">
                  PDF Space is a local-first workspace for creating projects, adding PDFs, organizing document pages, and exporting standard PDFs.
                </p>
                <p className="mt-3 max-w-xl text-pretty text-[10.5px] leading-relaxed text-muted-text">
                  It does not use accounts, cloud synchronization, analytics, or remote PDF processing.
                </p>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-text">
                  Version {APP_VERSION}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
