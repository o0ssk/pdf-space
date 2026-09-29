import React from "react";
import {
  ArrowUpDown,
  FileStack,
  FileType,
  FolderKanban,
  Minimize2,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";

type FeaturesSectionProps = {
  copy: LandingCopy;
};

const featureIcons: Record<string, React.ElementType> = {
  merge: FileStack,
  split: Scissors,
  compress: Minimize2,
  convert: FileType,
  organize: FolderKanban,
  rearrange: ArrowUpDown,
  "ai-tools": Sparkles,
  workspace: ShieldCheck,
};

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ copy }) => {
  return (
    <section className="landing-section features-section" id="features">
      <div className="landing-shell">
        <div className="landing-section-header">
          <span className="editorial-eyebrow">{copy.features.eyebrow}</span>
          <h2 className="editorial-title">{copy.features.title}</h2>
          <p className="editorial-lead">{copy.features.description}</p>
        </div>

        <div className="features-editorial-grid">
          {copy.features.items.map((feature, index) => {
            const Icon = featureIcons[feature.id] ?? FileStack;
            return (
              <motion.article
                className={`luxury-feature-card luxury-feature-card-${feature.id}`}
                initial={false}
                key={feature.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="feature-card-top">
                  <span className="feature-card-tag">{feature.tag}</span>
                  <span className="feature-card-index">0{index + 1}</span>
                </div>

                <div className="feature-card-icon-wrapper">
                  <Icon aria-hidden="true" className="feature-card-icon" />
                </div>

                <div className="feature-card-content">
                  <h3 className="feature-card-title">{feature.title}</h3>
                  <p className="feature-card-desc">{feature.description}</p>
                </div>

                <div className="feature-card-micro-detail" aria-hidden="true">
                  {feature.id === "merge" && (
                    <div className="micro-merge-stack">
                      <span className="micro-sheet sheet-1">PDF A</span>
                      <span className="micro-sheet-divider">+</span>
                      <span className="micro-sheet sheet-2">PDF B</span>
                      <span className="micro-sheet-divider">→</span>
                      <span className="micro-sheet sheet-target">Unified</span>
                    </div>
                  )}
                  {feature.id === "split" && (
                    <div className="micro-split-gauge">
                      <span className="micro-pill">Pages 1–4</span>
                      <span className="micro-pill-sep">/</span>
                      <span className="micro-pill">Pages 5–12</span>
                    </div>
                  )}
                  {feature.id === "compress" && (
                    <div className="micro-compress-stat">
                      <span className="compress-val">−42%</span>
                      <span className="compress-note">Zero visual degradation</span>
                    </div>
                  )}
                  {feature.id === "convert" && (
                    <div className="micro-convert-badge">
                      <span>PDF/A-2b</span>
                      <span>ISO 19005-2</span>
                    </div>
                  )}
                  {feature.id === "organize" && (
                    <div className="micro-organize-lanes">
                      <span className="lane-dot is-active" />
                      <span className="lane-label">Architecture Canvas</span>
                    </div>
                  )}
                  {feature.id === "rearrange" && (
                    <div className="micro-rearrange-handles">
                      <span className="reorder-chip">1</span>
                      <span className="reorder-arrow">⇄</span>
                      <span className="reorder-chip is-moved">2</span>
                      <span className="reorder-chip">3</span>
                    </div>
                  )}
                  {feature.id === "ai-tools" && (
                    <div className="micro-ai-snippet">
                      <span className="ai-dot" />
                      <span className="ai-text">Arabic & Latin Semantic Index</span>
                    </div>
                  )}
                  {feature.id === "workspace" && (
                    <div className="micro-workspace-status">
                      <span className="status-live-dot" />
                      <span className="status-text">IndexedDB Local Stream</span>
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
