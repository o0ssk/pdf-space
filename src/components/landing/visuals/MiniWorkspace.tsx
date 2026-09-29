import React from "react";
import { Check, GripVertical, Search } from "lucide-react";
import { useReducedMotion } from "motion/react";
import type { LandingCopy } from "../../../lib/landing/landingCopy";
import { MiniPdfPage, type MiniPdfPageVariant } from "./MiniPdfPage";

export type MiniWorkspaceMode = "full" | "ordering" | "transfer";

type MiniWorkspaceProps = {
  className?: string;
  copy: LandingCopy;
  hero?: boolean;
  mode?: MiniWorkspaceMode;
};

type PageDefinition = {
  label: string;
  variant: MiniPdfPageVariant;
};

const sourcePages: readonly PageDefinition[] = [
  { label: "Report page 01", variant: "report" },
  { label: "Report page 02", variant: "editorial" },
  { label: "Report page 03", variant: "plan" },
  { label: "Report page 04", variant: "report" },
];

const destinationPages: readonly PageDefinition[] = [
  { label: "Plans page 01", variant: "plan" },
  { label: "Plans page 02", variant: "editorial" },
  { label: "Plans page 03", variant: "report" },
];

const DocumentGroup: React.FC<{
  active?: boolean;
  destination?: boolean;
  mode: MiniWorkspaceMode;
  name: string;
  pages: readonly PageDefinition[];
}> = ({ active = false, destination = false, mode, name, pages }) => (
  <section
    aria-label={name}
    className={`mini-document-group ${active ? "is-active" : ""} ${
      destination ? "is-destination" : ""
    }`}
  >
    <header>
      <span className="mini-document-color" aria-hidden="true" />
      <strong dir="ltr">{name}</strong>
      <small>{pages.length} pages</small>
    </header>
    <div className="mini-document-pages">
      {pages.map((page, index) => (
        <MiniPdfPage
          key={page.label}
          label={page.label}
          selected={
            (!destination && mode === "transfer" && index === 1) ||
            (!destination && mode === "ordering" && index === 2)
          }
          variant={page.variant}
        />
      ))}
      {destination && mode === "transfer" ? (
        <div className="mini-destination-slot" aria-hidden="true" />
      ) : null}
      {!destination && mode === "ordering" ? (
        <span className="mini-order-marker" aria-hidden="true">
          <GripVertical />
        </span>
      ) : null}
    </div>
  </section>
);

export const MiniWorkspace: React.FC<MiniWorkspaceProps> = ({
  className = "",
  copy,
  hero = false,
  mode = "full",
}) => {
  const reduceMotion = useReducedMotion();
  const sourceName = copy.showcase.documentNames[0];
  const destinationName = copy.showcase.documentNames[1];

  return (
    <div
      aria-label={copy.showcase.tabs[
        mode === "full" ? 0 : mode === "ordering" ? 1 : 2
      ]}
      className={`mini-workspace is-${mode} ${hero ? "is-hero" : ""} ${
        reduceMotion ? "is-reduced" : ""
      } ${className}`.trim()}
      role="group"
    >
      <div className="mini-workspace-topbar" aria-hidden="true">
        <span className="mini-workspace-brand">PDF Space</span>
        <span className="mini-workspace-project">Project Library</span>
        <span className="mini-workspace-search">
          <Search />
          Search
        </span>
      </div>

      <div className="mini-workspace-canvas">
        <DocumentGroup
          active={mode !== "full"}
          mode={mode}
          name={sourceName}
          pages={sourcePages}
        />
        <DocumentGroup
          active={mode === "transfer"}
          destination
          mode={mode}
          name={destinationName}
          pages={destinationPages}
        />

        {mode === "transfer" || hero ? (
          <>
            <div className="mini-transfer-path" aria-hidden="true">
              <svg viewBox="0 0 420 90">
                <path d="M8 68C132 62 238 9 410 20" />
              </svg>
            </div>
            <MiniPdfPage
              className="mini-travel-page"
              label="Moving report page 02"
              variant="editorial"
            />
            <span className="mini-transfer-status" role="status">
              <Check aria-hidden="true" />
              {copy.hero.transferStatus}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
};
