import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Undo2, 
  Redo2, 
  Plus, 
  Save, 
  Download, 
  Columns3, 
  Layout, 
  HelpCircle, 
  ArrowLeft,
  ChevronLeft,
  Menu,
  Info
} from "lucide-react";
import { useToast } from "../ui/Toast";

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
};

export const WorkspaceTopbar: React.FC<TopbarProps> = ({
  isLeftSidebarOpen,
  isRightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isTabletView,
  isMobileView,
  onAddPDFs,
  hasDocuments = false,
  totalPageCount = 0,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAddFiles = () => {
    if (onAddPDFs) {
      onAddPDFs();
    } else {
      showToast(
        "PDF import",
        "PDF file import is currently unavailable.",
        "info"
      );
    }
  };

  const handleHelp = () => {
    showToast(
      "Workspace Help",
      "PDF Space provides an interactive workspace to organize documents and pages visually. Use the controls to arrange, split, and merge PDFs.",
      "sparkles"
    );
  };

  return (
    <header 
      aria-label="Workspace top navigation"
      className="h-[64px] min-h-[64px] border-b border-border-main bg-panel-bg/95 backdrop-blur-md px-4 flex items-center justify-between gap-4 select-none relative z-30"
    >
      {/* Left Area: Logo & Back Navigation */}
      <div className="flex items-center gap-3">
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          title="Return to Landing Page"
          aria-label="Return to Landing Page"
          className="p-1.5 rounded-lg text-muted-text hover:text-primary-text hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" focusable="false" />
          {!isMobileView && <span className="text-[12px] font-semibold">Home</span>}
        </button>

        <div className="hidden sm:block w-px h-5 bg-white/5" />

        {/* Brand/Logo in Toolbar */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-accent/20 border border-blue-accent/40 flex items-center justify-center shadow-[0_0_10px_rgba(49,92,255,0.3)]">
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              className="text-blue-bright"
              aria-hidden="true" 
              focusable="false"
            >
              <circle cx="12" cy="12" r="3" fill="currentColor" className="text-blue-bright/40" />
              <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-30 12 12)" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-primary-text tracking-wide">PDF Space</span>
        </div>
      </div>

      {/* Project Title Area */}
      <div className="flex-grow max-w-xs md:max-w-md flex flex-col items-center sm:items-start text-center sm:text-left truncate">
        <div className="flex items-center gap-2 max-w-full">
          <span 
            className="text-[13.5px] lg:text-[14px] font-extrabold text-primary-text tracking-wide border-b border-transparent hover:border-muted-text/30 px-1 py-0.5 rounded cursor-text truncate transition-colors"
            title="Project title (renaming available in later phases)"
          >
            Untitled Workspace
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span 
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              hasDocuments ? "bg-emerald-400" : "bg-blue-bright animate-pulse"
            }`} 
            aria-hidden="true" 
          />
          <span className="text-[9.5px] text-muted-text font-bold tracking-wider uppercase">
            {hasDocuments 
              ? `${totalPageCount} page${totalPageCount !== 1 ? "s" : ""} active` 
              : "Empty workspace"}
          </span>
        </div>
      </div>

      {/* Center/Actions Area */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Undo/Redo */}
        <button
          disabled
          title="Undo is currently unavailable."
          aria-label="Undo"
          className="p-1.5 rounded-lg text-muted-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <Undo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>
        <button
          disabled
          title="Redo is currently unavailable."
          aria-label="Redo"
          className="p-1.5 rounded-lg text-muted-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          <Redo2 className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>

        <div className="w-px h-5 bg-white/5 mx-1" />

        {/* Add Files */}
        <button
          onClick={handleAddFiles}
          title="Add PDF Files"
          aria-label="Add PDF Files"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-accent/10 hover:bg-blue-accent/20 border border-blue-bright/20 hover:border-blue-bright/40 text-[11.5px] lg:text-[12px] font-bold text-blue-bright transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
          {!isMobileView && <span>Add Files</span>}
        </button>

        {/* Save */}
        <button
          disabled
          title="Available after documents are added and local project saving is implemented."
          aria-label="Save Project (Unavailable: Available after documents are added and local project saving is implemented.)"
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 border border-white/5 text-secondary-text disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[11.5px] lg:text-[12px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          {isMobileView ? (
            <Save className="w-4 h-4" aria-hidden="true" focusable="false" />
          ) : (
            <span>Save</span>
          )}
        </button>

        {/* Export */}
        <button
          disabled
          title="Available after documents are added and page editing is implemented."
          aria-label="Export Workspace PDF (Unavailable: Available after documents are added and page editing is implemented.)"
          className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 border border-white/5 text-secondary-text disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[11.5px] lg:text-[12px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright"
        >
          {isMobileView ? (
            <Download className="w-4 h-4" aria-hidden="true" focusable="false" />
          ) : (
            <span>Export</span>
          )}
        </button>
      </div>

      {/* Right Area: Layout toggles / Help */}
      <div className="flex items-center gap-1 md:gap-1.5">
        <div className="hidden sm:block w-px h-5 bg-white/5 mx-1" />

        {/* Documents Sidebar Toggle */}
        <button
          onClick={onToggleLeftSidebar}
          title={isLeftSidebarOpen ? "Collapse Documents" : "Expand Documents"}
          aria-label={isLeftSidebarOpen ? "Collapse Documents" : "Expand Documents"}
          aria-pressed={isLeftSidebarOpen}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
            isLeftSidebarOpen 
              ? "bg-blue-accent/10 text-blue-bright border border-blue-accent/20" 
              : "text-muted-text hover:text-primary-text hover:bg-white/5 border border-transparent"
          }`}
        >
          {/* Custom representation of Sidebar Left */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>

        {/* Inspector Sidebar Toggle */}
        <button
          onClick={onToggleRightSidebar}
          title={isRightSidebarOpen ? "Collapse Inspector" : "Expand Inspector"}
          aria-label={isRightSidebarOpen ? "Collapse Inspector" : "Expand Inspector"}
          aria-pressed={isRightSidebarOpen}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer ${
            isRightSidebarOpen 
              ? "bg-blue-accent/10 text-blue-bright border border-blue-accent/20" 
              : "text-muted-text hover:text-primary-text hover:bg-white/5 border border-transparent"
          }`}
        >
          {/* Custom representation of Sidebar Right */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M15 3v18"/>
          </svg>
        </button>

        <button
          onClick={handleHelp}
          title="Workspace Information"
          aria-label="Workspace Information"
          className="p-1.5 rounded-lg text-muted-text hover:text-primary-text hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-bright cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" focusable="false" />
        </button>
      </div>
    </header>
  );
};
