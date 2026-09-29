import React from "react";
import { Lock, Cpu, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";

type TrustSectionProps = {
  copy: LandingCopy;
};

const metricIcons = [Cpu, Lock, WifiOff];

export const TrustSection: React.FC<TrustSectionProps> = ({ copy }) => {
  return (
    <section className="landing-section trust-section" id="architecture">
      <div className="landing-shell">
        <div className="trust-card-container">
          <div className="trust-header">
            <span className="editorial-eyebrow">{copy.trust.eyebrow}</span>
            <h2 className="editorial-title">{copy.trust.title}</h2>
            <p className="editorial-lead">{copy.trust.description}</p>
          </div>

          <div className="trust-metrics-grid">
            {copy.trust.metrics.map((metric, index) => {
              const Icon = metricIcons[index] ?? Lock;
              return (
                <motion.div
                  className="trust-metric-card"
                  initial={false}
                  key={metric.label}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="metric-icon-wrap">
                    <Icon aria-hidden="true" className="metric-icon" />
                  </div>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-sublabel">{metric.sublabel}</div>
                </motion.div>
              );
            })}
          </div>

          <div className="trust-diagram-strip" aria-hidden="true">
            <div className="trust-pipeline-step">
              <span className="step-point" />
              <span className="step-name">Local Device Memory</span>
            </div>
            <div className="trust-pipeline-connector">
              <span className="connector-line" />
              <span className="connector-badge">WebAssembly & Web Workers</span>
              <span className="connector-line" />
            </div>
            <div className="trust-pipeline-step">
              <span className="step-point is-secured" />
              <span className="step-name">Direct In-Memory Output</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
