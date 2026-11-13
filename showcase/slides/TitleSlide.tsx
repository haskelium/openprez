import { EASE_OUT, Logo, useMotionAllowance } from "@core";
import { motion } from "motion/react";

/** Seconds after which the lines below the logo rise, once the logo has finished its entrance. */
const TAGLINE_DELAY = 1.05;

export function TitleSlide() {
  const { entrance } = useMotionAllowance();
  const rise = (delay: number) => ({
    initial: entrance ? { opacity: 0, y: 24 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE_OUT },
  });

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[1300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-theme-accent2) 28%, transparent) 0%, transparent 62%)",
        }}
      />
      <h1 className="relative">
        <Logo animated className="h-[150px] text-theme-primary" />
      </h1>
      <motion.p
        className="relative mt-16 text-[56px] leading-tight font-bold text-theme-accent5"
        {...rise(TAGLINE_DELAY)}
      >
        Creative freedom, engineered outcomes.
      </motion.p>
      <motion.p
        className="relative mt-6 text-[32px] text-theme-neutral"
        {...rise(TAGLINE_DELAY + 0.25)}
      >
        Every slide unique. Every result as specified.
      </motion.p>
    </div>
  );
}
