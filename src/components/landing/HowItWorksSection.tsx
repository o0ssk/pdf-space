import React, { useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  FileOutput,
  FolderPlus,
  GripVertical,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import { landingMotion } from "../../lib/landing/landingMotion";
import { MiniPdfPage } from "./visuals/MiniPdfPage";

type HowItWorksSectionProps = {
  copy: LandingCopy;
};

const WorkflowSimulation: React.FC<{
  activeIndex: number;
  copy: LandingCopy;
}> = ({ activeIndex, copy }) => {
  const reduceMotion = useReducedMotion();
  const step = copy.howItWorks.steps[activeIndex];
  if (!step) return null;

  return (
    <div className="workflow-simulation">
      <header>
        <span>PDF Space</span>
        <strong>{step.title}</strong>
      </header>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`workflow-state is-step-${activeIndex + 1}`}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          key={activeIndex}
          {...(reduceMotion ? {} : { exit: { opacity: 0, y: -10 } })}
          transition={{
            duration: landingMotion.duration.control,
            ease: landingMotion.ease.enter,
          }}
        >
          {activeIndex === 0 ? (
            <div className="workflow-new-project">
              <FolderPlus aria-hidden="true" />
              <div>
                <strong>{step.title}</strong>
                <span>Untitled Workspace</span>
              </div>
              <div className="workflow-empty-document">Untitled Document</div>
            </div>
          ) : null}

          {activeIndex === 1 ? (
            <div className="workflow-import">
              <div className="workflow-import-source">
                <ArrowDownToLine aria-hidden="true" />
                <strong>{step.title}</strong>
                <span>Report 01.pdf</span>
                <span>Plans 02.pdf</span>
              </div>
              <div className="workflow-import-pages">
                <MiniPdfPage label="Imported page 01" variant="report" />
                <MiniPdfPage label="Imported page 02" variant="plan" />
                <MiniPdfPage label="Imported page 03" variant="editorial" />
              </div>
            </div>
          ) : null}

          {activeIndex === 2 ? (
            <div className="workflow-organize">
              <div>
                <span>Report 01</span>
                <MiniPdfPage
                  label="Selected report page"
                  selected
                  variant="report"
                />
              </div>
              <span className="workflow-insert-marker">
                <GripVertical aria-hidden="true" />
              </span>
              <div>
                <span>Plans 02</span>
                <MiniPdfPage label="Plan destination page" variant="plan" />
              </div>
            </div>
          ) : null}

          {activeIndex === 3 ? (
            <div className="workflow-export">
              <div className="workflow-export-stack" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <FileOutput aria-hidden="true" />
              <div>
                <strong>Report 01.pdf</strong>
                <strong>Plans 02.pdf</strong>
                <span>
                  <Check aria-hidden="true" />
                  Standard PDFs in one ZIP
                </span>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="workflow-progress" aria-hidden="true">
        {copy.howItWorks.steps.map((item, index) => (
          <i className={index <= activeIndex ? "is-active" : ""} key={item.title} />
        ))}
      </div>
    </div>
  );
};

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({
  copy,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 72%", "end 35%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const nextIndex = Math.min(
      copy.howItWorks.steps.length - 1,
      Math.max(0, Math.floor(value * copy.howItWorks.steps.length))
    );
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
  });

  return (
    <section
      className="landing-light-section how-it-works-section"
      id="how-it-works"
      ref={sectionRef}
    >
      <div className="landing-shell">
        <div className="landing-section-header">
          <span className="editorial-eyebrow">{copy.howItWorks.eyebrow}</span>
          <h2 className="editorial-title">{copy.howItWorks.title}</h2>
          <p className="editorial-lead">{copy.howItWorks.description}</p>
        </div>

        <div className="how-it-works-layout">
          <div className="workflow-sticky">
            <WorkflowSimulation activeIndex={activeIndex} copy={copy} />
          </div>

          <ol className="workflow-steps">
            {copy.howItWorks.steps.map((step, index) => (
              <li
                aria-current={activeIndex === index ? "step" : undefined}
                className={activeIndex === index ? "is-active" : ""}
                key={step.title}
              >
                <button onClick={() => setActiveIndex(index)} type="button">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
