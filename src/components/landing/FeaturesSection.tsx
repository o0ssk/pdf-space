import React from "react";
import { FileArchive, LayoutGrid, Save, Search } from "lucide-react";
import { motion } from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";

type FeaturesSectionProps = {
  copy: LandingCopy;
};

const featureIcons = [LayoutGrid, Save, Search, FileArchive] as const;

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ copy }) => {
  return (
    <section className="landing-light-section features-section" id="features">
      <div className="landing-shell">
        <div className="landing-section-heading">
          <h2>{copy.features.title}</h2>
          <p>{copy.features.description}</p>
        </div>

        <div className="features-grid">
          {copy.features.items.map((feature, index) => {
            const Icon = featureIcons[index];
            if (!Icon) return null;
            return (
              <motion.article
                className="feature-card"
                initial={false}
                key={feature.title}
              >
                <span className="feature-card-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span aria-hidden="true" className="feature-card-detail" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
