import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Undo2, 
  Redo2, 
  Plus, 
  Save, 
  Download, 
  HelpCircle, 
  FolderOpen,
  Pencil,
  Search,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { PersistenceSaveStatus } from "../../lib/persistence/persistenceTypes";
import { validateProjectName } from "../../lib/projects/projectManagement";
import { RenameProjectDialog } from "../projects/ProjectDialogs";
import { SpatialMark } from "../ui/StudioPrimitives";

type TopbarProps = {
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  isTabletView: boolean;
  isMobileView: boolean;
  onAddPDFs?: () => void;
  hasDocuments?: boolean;
  totalPageCount?: number;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  onUndo: () => void;
  onRedo: () => void;
  projectName: string;
  saveStatus: PersistenceSaveStatus;
  lastSavedAt: number | null;
  canSave: boolean;
  isSaveBusy: boolean;
  onSave: () => void;
  onRenameProject: (name: string) => Promise<boolean>;
  canExport: boolean;
  onExport: () => void;
  onGoHome: () => void;
  onSearch: () => void;
  onHelp: () => void;
  searchTriggerRef: React.RefObject<HTMLButtonElement | null>;
  searchShortcutLabel: string;
};

export const WorkspaceTopbar: React.FC<TopbarProps> = ({
  isLeftSidebarOpen,
  isRightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isMobileView,
  onAddPDFs,
  hasDocuments = false,
  totalPageCount = 0,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  projectName,
  saveStatus,
  lastSavedAt,
  canSave,
  isSaveBusy,
  onSave,
  onRenameProject,
  canExport,
  onExport,
  onGoHome,
  onSearch,
  onHelp,
  searchTriggerRef,
  searchShortcutLabel,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [mobileRenameOpen, setMobileRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const [validationMessage, setValidationMessage] = useState("");
  const nameEditorRef = useRef<HTMLFormElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const renameButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleAddFiles = () => {
    if (onAddPDFs) {
      onAddPDFs();
    }
  };

  const restoreRenameFocus = useCallback(() => {
    window.setTimeout(() => renameButtonRef.current?.focus(), 0);
  }, []);

  const closeInlineRename = useCallback(
    (restoreFocus = true) => {
      setIsEditingName(false);
      setDraftName(projectName);
      setValidationMessage("");
      if (restoreFocus) restoreRenameFocus();
    },
    [projectName, restoreRenameFocus]
  );

  const beginRename = useCallback(() => {
    setDraftName(projectName);
    setValidationMessage("");
    if (isMobileView) {
      setMobileRenameOpen(true);
      return;
    }
    setIsEditingName(true);
  }, [isMobileView, projectName]);

  const commitInlineRename = useCallback(
    async (restoreFocus = true) => {
      const validation = validateProjectName(draftName);
      if (validation.valid === false) {
        setValidationMessage(validation.error);
        nameInputRef.current?.focus();
        return false;
      }
      if (validation.name === projectName) {
        closeInlineRename(restoreFocus);
        return true;
      }
      setValidationMessage("");
      const succeeded = await onRenameProject(validation.name);
      if (succeeded) {
        setIsEditingName(false);
        if (restoreFocus) restoreRenameFocus();
      } else {
        nameInputRef.current?.focus();
      }
      return succeeded;
    },
    [
      closeInlineRename,
      draftName,
      onRenameProject,
      projectName,
      restoreRenameFocus,
    ]
  );

  useEffect(() => {
    if (!isEditingName) return;
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, [isEditingName]);

  useEffect(() => {
    if (!isEditingName) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (nameEditorRef.current?.contains(event.target as Node)) return;
      const validation = validateProjectName(draftName);
      if (validation.valid === false) {
        closeInlineRename(false);
        return;
      }
      void commitInlineRename(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [
    closeInlineRename,
    commitInlineRename,
    draftName,
    isEditingName,
  ]);

  const submitInlineRename = (event: FormEvent) => {
    event.preventDefault();
    void commitInlineRename();
  };

  const saveStatusLabel =
    saveStatus === "saving"
      ? "Saving locally…"
      : saveStatus === "dirty"
        ? "Unsaved changes"
        : saveStatus === "error"
          ? "Local save failed"
          : saveStatus === "conflict"
            ? "Changed in another tab"
          : saveStatus === "unavailable"
            ? "Local saving unavailable"
            : saveStatus === "saved"
              ? `Saved locally${
                  lastSavedAt
                    ? ` • ${new Date(lastSavedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}`
                    : ""
                }`
              : hasDocuments
                ? `${totalPageCount} page${
                    totalPageCount !== 1 ? "s" : ""
                  } active`
                : "Empty workspace";

  return (
    <>
    <header 
      aria-label="Workspace top navigation"
      className="relative z-30 flex min-h-[112px] flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b studio-divider bg-panel-bg/92 px-3 py-2 backdrop-blur-xl select-none sm:h-[68px] sm:min-h-[68px] sm:flex-nowrap sm:gap-4 sm:px-4 sm:py-0"
    >
      {/* Left Area: Logo & Back Navigation */}
      <div className="order-1 flex flex-shrink-0 items-center gap-3 sm:order-none">
        {/* Back Button */}
        <button
          onClick={onGoHome}
          title="Open Local Projects"
          aria-label="Open Local Projects"
          className="flex h-10 w-10 items-center justify-center gap-1 rounded-lg text-muted-text transition-colors hover:bg-white/5 hover:text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright sm:w-auto sm:px-2 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" aria-hidden="true" focusable="false" />
          {!isMobileView && <span className="text-[12px] font-semibold">Projects</span>}
        </button>

        <div className="hidden sm:block h-5 w-px bg-border-main" />

        {/* Brand/Logo in Toolbar */}
        <div className="hidden md:flex items-center gap-2">
          <SpatialMark compact className="h-7 w-7" />
          <span className="text-[13px] font-semibold tracking-[-0.025em] text-primary-text">PDF Space</span>
        </div>
      </div>

      {/* Project Title Area */}
      <div className="relative order-4 flex min-w-0 basis-full flex-col items-start text-left sm:order-none sm:max-w-xs sm:flex-grow sm:basis-auto md:max-w-md">
        <div className="group flex min-w-0 max-w-full items-center gap-1">
          {isEditingName ? (
            <form
              ref={nameEditorRef}
              onSubmit={submitInlineRename}
              aria-busy={isSaveBusy}
              className="relative w-[clamp(150px,24vw,260px)]"
            >
              <label htmlFor="workspace-project-name" className="sr-only">
                Project name
              </label>
              <input
                ref={nameInputRef}
                id="workspace-project-name"
                value={draftName}
                maxLength={101}
                dir="auto"
                onChange={(event) => {
                  setDraftName(event.target.value);
                  setValidationMessage("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    closeInlineRename();
                  }
                }}
                aria-invalid={Boolean(validationMessage)}
                aria-describedby={
                  validationMessage
                    ? "workspace-project-name-error"
                    : undefined
                }
                className="h-8 w-full rounded-[9px] border border-blue-bright/50 bg-main-bg px-2.5 text-[13px] font-semibold text-primary-text outline-none focus:ring-2 focus:ring-blue-bright/30"
              />
              {validationMessage && (
                <span
                  id="workspace-project-name-error"
                  role="alert"
                  className="absolute left-0 top-8 z-50 w-max max-w-[260px] rounded-lg border border-red-400/20 bg-[#160b10] px-2.5 py-1.5 text-[10px] font-bold text-red-300 shadow-xl"
                >
                  {validationMessage}
                </span>
              )}
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={beginRename}
                title={projectName}
                aria-label={`Rename project. Current name: ${projectName}`}
                className="min-w-0 truncate rounded px-1 py-0.5 text-sm font-semibold tracking-[-0.025em] text-primary-text transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                {projectName}
              </button>
              <button
                ref={renameButtonRef}
                type="button"
                onClick={beginRename}
                title="Rename project"
                aria-label="Rename project"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-muted-text opacity-60 transition-all hover:bg-white/5 hover:text-primary-text sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span 
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              saveStatus === "error" ||
              saveStatus === "unavailable" ||
              saveStatus === "conflict"
                ? "bg-amber-400"
                : saveStatus === "dirty"
                  ? "bg-amber-400"
                  : saveStatus === "saving"
                    ? "bg-blue-bright animate-pulse"
                    : hasDocuments
                      ? "bg-emerald-400"
                      : "bg-blue-bright"
            }`} 
            aria-hidden="true" 
          />
          <span className="truncate text-[11px] font-semibold text-muted-text">
            {saveStatusLabel}
          </span>
        </div>
      </div>

      {/* Center/Actions Area */}
      <div className="order-2 flex items-center gap-1.5 sm:order-none md:gap-2">
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={
            canUndo && undoLabel
              ? `Undo ${undoLabel} (Ctrl/Cmd+Z)`
              : "Nothing to undo."
          }
          aria-label={
            canUndo && undoLabel ? `Undo ${undoLabel}` : "Undo unavailable"
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-text enabled:hover:text-primary-text enabled:hover:bg-white/5 enabled:cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <Undo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title={
            canRedo && redoLabel
              ? `Redo ${redoLabel} (Ctrl/Cmd+Shift+Z or Ctrl+Y)`
              : "Nothing to redo."
          }
          aria-label={
            canRedo && redoLabel ? `Redo ${redoLabel}` : "Redo unavailable"
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-text enabled:hover:text-primary-text enabled:hover:bg-white/5 enabled:cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <Redo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>

        <div className="mx-1 hidden h-5 w-px bg-white/5 sm:block" />

        <button
          ref={searchTriggerRef}
          type="button"
          onClick={onSearch}
          title={`Search workspace (${searchShortcutLabel})`}
          aria-label={`Search workspace, ${searchShortcutLabel}`}
          className="flex h-10 w-10 items-center justify-center gap-1.5 rounded-lg border border-border-main bg-panel-elevated text-[11.5px] font-bold text-secondary-text transition-colors hover:border-blue-bright/30 hover:bg-blue-accent/10 hover:text-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright lg:w-auto lg:px-3"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">Search</span>
          <kbd className="ml-1 hidden rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-[8.5px] font-bold text-muted-text xl:inline">
            {searchShortcutLabel}
          </kbd>
        </button>

        {/* Add Files */}
        <button
          onClick={handleAddFiles}
          title="Add PDF Files"
          aria-label="Add PDF Files"
          className="studio-interactive flex h-10 w-10 items-center justify-center gap-1.5 rounded-[10px] bg-blue-accent text-[11.5px] font-semibold text-white shadow-[0_8px_20px_rgba(49,95,236,0.22)] hover:bg-blue-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright lg:w-auto lg:px-3 lg:text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
          {!isMobileView && <span>Add Files</span>}
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          aria-busy={isSaveBusy}
          title={
            saveStatus === "conflict"
              ? "Resolve the newer revision saved in another tab."
              : saveStatus === "error"
              ? "Retry local save"
              : saveStatus === "unavailable"
                ? "Local saving is unavailable in this browser session."
                : "Save project locally"
          }
          aria-label={
            saveStatus === "error"
              ? "Retry saving project locally"
              : "Save project locally"
          }
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-main bg-panel-elevated text-[11.5px] font-bold text-secondary-text transition-all hover:border-border-strong disabled:opacity-30 disabled:cursor-not-allowed enabled:cursor-pointer sm:w-auto sm:px-3 lg:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          {isMobileView ? (
            <Save className="w-4 h-4" aria-hidden="true" focusable="false" />
          ) : (
            <span>Save</span>
          )}
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          title={canExport ? "Export PDFs" : "Add pages before exporting"}
          aria-label={
            canExport ? "Export PDFs" : "Export unavailable. Add pages before exporting."
          }
          className="studio-interactive flex h-10 w-10 items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-blue-accent to-blue-bright text-[11.5px] font-semibold text-white shadow-[0_8px_20px_rgba(49,95,236,0.32)] transition-all enabled:hover:brightness-110 disabled:opacity-30 disabled:shadow-none disabled:cursor-not-allowed enabled:cursor-pointer sm:w-auto sm:px-4.5 lg:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          {isMobileView ? (
            <Download className="w-4 h-4" aria-hidden="true" focusable="false" />
          ) : (
            <>
              <Download className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
              <span>Export</span>
            </>
          )}
        </button>
      </div>

      {/* Right Area: Layout toggles / Help */}
      <div className="order-3 flex items-center gap-1 sm:order-none md:gap-1.5">
        <div className="hidden sm:block w-px h-5 bg-white/5 mx-1" />

        {/* Documents Sidebar Toggle */}
        <button
          onClick={onToggleLeftSidebar}
          title={isLeftSidebarOpen ? "Collapse Documents" : "Expand Documents"}
          aria-label={isLeftSidebarOpen ? "Collapse Documents" : "Expand Documents"}
          aria-pressed={isLeftSidebarOpen}
          className={`hidden h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright sm:flex cursor-pointer ${
            isLeftSidebarOpen 
              ? "bg-blue-accent/10 text-blue-bright border border-blue-accent/20" 
              : "text-muted-text hover:text-primary-text hover:bg-white/5 border border-transparent"
          }`}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </button>

        {/* Inspector Sidebar Toggle */}
        <button
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? "Collapse Inspector" : "Expand Inspector"}
          aria-label={isRightSidebarOpen ? "Collapse Inspector" : "Expand Inspector"}
          aria-pressed={isRightSidebarOpen}
          className={`hidden h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright sm:flex cursor-pointer ${
            isRightSidebarOpen 
              ? "bg-blue-accent/10 text-blue-bright border border-blue-accent/20" 
              : "text-muted-text hover:text-primary-text hover:bg-white/5 border border-transparent"
          }`}
        >
          <PanelRight className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
        </button>

        <button
          onClick={onHelp}
          title="Help"
          aria-label="Open Help"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-text hover:text-primary-text hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>
      </div>
    </header>
    <RenameProjectDialog
      isOpen={mobileRenameOpen}
      currentName={projectName}
      busy={isSaveBusy}
      onCancel={() => setMobileRenameOpen(false)}
      onRename={(name) => {
        void onRenameProject(name).then((succeeded) => {
          if (succeeded) setMobileRenameOpen(false);
        });
      }}
    />
    </>
  );
};
