import React, { useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useNavigate } from "react-router-dom";
import type { LandingCopy } from "../../lib/landing/landingCopy";
import { PROJECTS_ROUTE } from "../../lib/navigation/productRoutes";
import { HeroWorkspaceScene } from "./visuals/HeroWorkspaceScene";

type LandingHeroProps = {
  copy: LandingCopy;
};

export const LandingHero: React.FC<LandingHeroProps> = ({ copy }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Mouse tilt spring values for responsive 3D perspective - very gentle and restrained
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const mouseTiltX = useSpring(useTransform(rawMouseY, [-0.5, 0.5], [2.5, -2.5]), {
    stiffness: 100,
    damping: 24,
  });
  const mouseTiltY = useSpring(useTransform(rawMouseX, [-0.5, 0.5], [-3.5, 3.5]), {
    stiffness: 100,
    damping: 24,
  });

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    rawMouseX.set(x);
    rawMouseY.set(y);
  };

  const handleMouseLeave = () => {
    rawMouseX.set(0);
    rawMouseY.set(0);
  };

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.72], [0.985, 1]);
  const translateY = useTransform(scrollYProgress, [0, 0.72], [0, 40]);

  return (
    <section
      className="landing-hero"
      id="home"
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={sectionRef}
    >
      <span aria-hidden="true" id="landing-nav-sentinel" />

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="landing-hero-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        transition={{
          duration: 0.64,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="landing-hero-badge">
          <span className="badge-dot" />
          <span>{copy.hero.badge}</span>
        </div>

        <h1>{copy.hero.title}</h1>
        <p>{copy.hero.description}</p>
        <span className="landing-visually-hidden">
          {copy.hero.sceneDescription}
        </span>

        <div className="landing-hero-actions">
          <button
            className="landing-primary-button"
            onClick={() => {
              void navigate(PROJECTS_ROUTE);
            }}
            type="button"
          >
            {copy.hero.primaryAction}
            <ArrowUpRight aria-hidden="true" />
          </button>
          <a className="landing-secondary-button" href="#features">
            {copy.hero.secondaryAction}
            <ArrowDown aria-hidden="true" />
          </a>
        </div>

        <div className="landing-hero-tools-strip" aria-label="Core Tools">
          {copy.hero.tools.map((tool) => (
            <span className="hero-tool-chip" key={tool}>
              {tool}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="landing-hero-stage" style={{ perspective: 1200 }}>
        <motion.div
          className="hero-workspace-scrollframe"
          style={
            reduceMotion
              ? {}
              : {
                  rotateX: mouseTiltX,
                  rotateY: mouseTiltY,
                  scale,
                  y: translateY,
                }
          }
        >
          <HeroWorkspaceScene copy={copy} />
        </motion.div>
      </div>
    </section>
  );
};
