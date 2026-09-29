import React, { useRef } from "react";
import { ArrowDown, ArrowUpRight, ShieldCheck, Zap, Layers, Globe } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
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

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.6], [1, 0.985]);
  const translateY = useTransform(scrollYProgress, [0, 0.6], [0, 30]);

  return (
    <section className="landing-hero" id="home" ref={sectionRef}>
      <span aria-hidden="true" id="landing-nav-sentinel" />

      {/* Ambient background atmosphere */}
      <div aria-hidden="true" className="landing-hero-atmosphere pointer-events-none">
        <i />
        <i />
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="landing-hero-copy"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        transition={{
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="landing-hero-badge">
          <span className="badge-glow-dot" />
          <span>Local-First PDF Workspace • 100% Client-Side</span>
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
          <a className="landing-secondary-button" href="#product-showcase">
            {copy.hero.secondaryAction}
            <ArrowDown aria-hidden="true" />
          </a>
        </div>

        <div className="landing-hero-features-strip" aria-label="Key highlights">
          <div className="hero-feature-item">
            <Zap className="hero-feature-icon" />
            <span>Instant In-Memory</span>
          </div>
          <span className="hero-feature-divider">•</span>
          <div className="hero-feature-item">
            <ShieldCheck className="hero-feature-icon" />
            <span>0 Bytes Uploaded</span>
          </div>
          <span className="hero-feature-divider">•</span>
          <div className="hero-feature-item">
            <Layers className="hero-feature-icon" />
            <span>Merge & Split</span>
          </div>
          <span className="hero-feature-divider">•</span>
          <div className="hero-feature-item">
            <Globe className="hero-feature-icon" />
            <span>Arabic & English</span>
          </div>
        </div>
      </motion.div>

      <div className="landing-hero-stage">
        <motion.div
          className="hero-workspace-scrollframe"
          style={
            reduceMotion
              ? {}
              : {
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
