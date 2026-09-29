import React from "react";
import {
  Copy,
  Files,
  MoveRight,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";

export type PageOperationActionHandlers = {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClearSelection?: () => void;
};

type PageOperationActionsProps = PageOperationActionHandlers & {
  selectedCount: number;
  variant: "toolbar" | "inspector";
};

type ActionDefinition = {
  key: string;
  label: string;
  ariaLabel?: string;
  Icon: typeof RotateCcw;
  handler: keyof Pick<
    PageOperationActionHandlers,
    "onRotateLeft" | "onRotateRight" | "onDuplicate" | "onMove" | "onCopy"
  >;
};

const transformActions: readonly ActionDefinition[] = [
  {
    key: "rotate-left",
    label: "Rotate left",
    Icon: RotateCcw,
    handler: "onRotateLeft",
  },
  {
    key: "rotate-right",
    label: "Rotate right",
    Icon: RotateCw,
    handler: "onRotateRight",
  },
  {
    key: "duplicate",
    label: "Duplicate",
    Icon: Files,
    handler: "onDuplicate",
  },
];

const organizeActions: readonly ActionDefinition[] = [
  {
    key: "move",
    label: "Move",
    ariaLabel: "Move to…",
    Icon: MoveRight,
    handler: "onMove",
  },
  {
    key: "copy",
    label: "Copy",
    Icon: Copy,
    handler: "onCopy",
  },
];

type ActionGroupProps = {
  label: string;
  actions: readonly ActionDefinition[];
  handlers: Pick<
    PageOperationActionHandlers,
    "onRotateLeft" | "onRotateRight" | "onDuplicate" | "onMove" | "onCopy"
  >;
  selectedCount: number;
  isToolbar: boolean;
};

const ActionGroup: React.FC<ActionGroupProps> = ({
  label,
  actions,
  handlers,
  selectedCount,
  isToolbar,
}) => (
  <div
    role="group"
    aria-label={`${label} selected pages`}
    className={isToolbar ? "page-command-segment" : "inspector-command-group"}
  >
    {!isToolbar && <p className="inspector-command-label">{label}</p>}
    <div className={isToolbar ? "flex items-center" : "page-command-row"}>
      {actions.map(({ key, label: actionLabel, ariaLabel, Icon, handler }) => (
        <button
          key={key}
          type="button"
          onClick={handlers[handler]}
          aria-label={`${ariaLabel ?? actionLabel} ${selectedCount} selected ${
            selectedCount === 1 ? "page" : "pages"
          }`}
          title={actionLabel}
          className="page-command-button"
        >
          <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span className="page-command-button-label">{actionLabel}</span>
        </button>
      ))}
    </div>
  </div>
);

export const PageOperationActions: React.FC<PageOperationActionsProps> = ({
  selectedCount,
  variant,
  onRotateLeft,
  onRotateRight,
  onDuplicate,
  onMove,
  onCopy,
  onDelete,
  onClearSelection,
}) => {
  const handlers = {
    onRotateLeft,
    onRotateRight,
    onDuplicate,
    onMove,
    onCopy,
  };
  const isToolbar = variant === "toolbar";

  return (
    <div
      className={
        isToolbar
          ? "flex min-w-max items-center gap-1.5"
          : "flex flex-col gap-3"
      }
      data-page-command-layout={variant}
    >
      <ActionGroup
        label="Transform"
        actions={transformActions}
        handlers={handlers}
        selectedCount={selectedCount}
        isToolbar={isToolbar}
      />
      {isToolbar && <span className="page-command-divider" aria-hidden="true" />}
      <ActionGroup
        label="Organize"
        actions={organizeActions}
        handlers={handlers}
        selectedCount={selectedCount}
        isToolbar={isToolbar}
      />
      <span className="page-command-divider" aria-hidden="true" />

      <div
        role="group"
        aria-label="Destructive page actions"
        className={isToolbar ? "" : "inspector-danger-group"}
      >
        {!isToolbar && <p className="inspector-command-label">Remove</p>}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${selectedCount} selected ${
            selectedCount === 1 ? "page" : "pages"
          }`}
          title="Delete"
          className="page-command-button page-command-danger"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="page-command-button-label">Delete</span>
        </button>
      </div>

      {onClearSelection && (
        <>
          {isToolbar && <span className="page-command-divider" aria-hidden="true" />}
          <button
            type="button"
            onClick={onClearSelection}
            aria-label="Clear page selection"
            title="Clear selection"
            className="page-command-button page-command-clear"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="page-command-button-label">Clear</span>
          </button>
        </>
      )}
    </div>
  );
};
