import React from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router-dom";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import { landingMotion } from "../../lib/landing/landingMotion";
import { PROJECTS_ROUTE } from "../../lib/navigation/productRoutes";

type FinalCtaSectionProps = {
  copy: LandingCopy;
};

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ copy }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  return (
    <section className="final-cta-section">
      <motion.div
        className="landing-shell final-cta-inner"
        initial={reduceMotion ? false : { opacity: 0.85, y: 12 }}
        transition={{
          duration: landingMotion.duration.section,
          ease: landingMotion.ease.enter,
        }}
        viewport={{ amount: 0.35, once: true }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <span className="editorial-eyebrow">{copy.finalCta.eyebrow}</span>
        <h2>{copy.finalCta.title}</h2>
        <p>{copy.finalCta.description}</p>
        <button
          className="landing-primary-button"
          onClick={() => {
            void navigate(PROJECTS_ROUTE);
          }}
          type="button"
        >
          {copy.finalCta.action}
          <ArrowUpRight aria-hidden="true" />
        </button>
        <span className="final-cta-footnote">{copy.finalCta.footnote}</span>
      </motion.div>
    </section>
  );
};
