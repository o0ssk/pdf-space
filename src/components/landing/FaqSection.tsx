import React, { useState } from "react";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import { landingMotion } from "../../lib/landing/landingMotion";

type FaqSectionProps = {
  copy: LandingCopy;
};

export const FaqSection: React.FC<FaqSectionProps> = ({ copy }) => {
  const reduceMotion = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="landing-light-section faq-section" id="faq">
      <div className="landing-shell faq-shell">
        <div className="landing-section-header">
          <span className="editorial-eyebrow">{copy.faq.eyebrow}</span>
          <h2 className="editorial-title">{copy.faq.title}</h2>
          <p className="editorial-lead">{copy.faq.description}</p>
        </div>

        <div className="faq-list">
          {copy.faq.items.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            return (
              <article className={isOpen ? "is-open" : ""} key={item.question}>
                <h3>
                  <button
                    aria-controls={panelId}
                    aria-expanded={isOpen}
                    id={buttonId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <Plus aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      aria-labelledby={buttonId}
                      className="faq-answer"
                      id={panelId}
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      role="region"
                      {...(reduceMotion
                        ? {}
                        : { exit: { height: 0, opacity: 0 } })}
                      transition={{
                        duration: landingMotion.duration.control,
                        ease: landingMotion.ease.enter,
                      }}
                    >
                      <p>{item.answer}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
