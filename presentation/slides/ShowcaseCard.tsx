import { EASE_OUT, useMotionAllowance } from "@core";
import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const SHOWCASE_URL = "/showcase.html";

// The showcase entry is served only by the development server; production builds ship this
// deck alone, so a link there would be dead.
const showcaseServed = import.meta.env.DEV;

const fanTransition = { duration: 0.45, ease: EASE_OUT };

// Idle: a tight arc — cards bunched around a circle whose center sits below them, rotated
// tangent to it (outer cards low and tilted, center card on top). Hover: the arc spreads
// into the fan. DOM order fixes z-order: left card behind, right card topmost, in both states.
const leftCard: Variants = {
  rest: { rotate: -12, x: -40, y: 14 },
  hover: { rotate: -19, x: -150, y: 8, transition: fanTransition },
};
const middleCard: Variants = {
  rest: { rotate: 0, x: 0, y: 6 },
  hover: { rotate: 0, x: 0, y: -26, scale: 1.06, transition: fanTransition },
};
const rightCard: Variants = {
  rest: { rotate: 12, x: 40, y: 14 },
  hover: { rotate: 19, x: 150, y: 8, transition: fanTransition },
};

function MiniSlide({ variants, children }: { variants: Variants; children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      style={{ transformOrigin: "50% 100%" }}
      className="absolute inset-x-0 bottom-4 mx-auto h-[160px] w-[284px] overflow-hidden rounded-2xl border-2 border-theme-accent4 bg-theme-accent5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]"
    >
      {children}
    </motion.div>
  );
}

function BarsMotif() {
  return (
    <svg viewBox="0 0 312 176" className="size-full" aria-hidden="true">
      {[40, 80, 120, 160, 200, 240].map((x, index) => {
        const height = [44, 76, 58, 104, 88, 128][index];
        return (
          <rect
            key={x}
            x={x}
            y={150 - height}
            width="26"
            height={height}
            rx="5"
            fill="var(--color-theme-accent4)"
          />
        );
      })}
    </svg>
  );
}

function FlowMotif() {
  return (
    <svg viewBox="0 0 312 176" className="size-full" aria-hidden="true">
      <path
        d="M 52 120 C 110 120, 110 56, 156 56 S 210 120, 260 120"
        fill="none"
        stroke="var(--color-theme-accent3)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {[
        [52, 120],
        [156, 56],
        [260, 120],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="16" fill="var(--color-theme-data3)" />
      ))}
    </svg>
  );
}

function TitleMotif() {
  return (
    <svg viewBox="0 0 312 176" className="size-full" aria-hidden="true">
      <circle cx="248" cy="58" r="64" fill="var(--color-theme-accent2)" opacity="0.55" />
      <rect x="32" y="64" width="168" height="18" rx="9" fill="var(--color-theme-data3)" />
      <rect x="32" y="96" width="120" height="12" rx="6" fill="var(--color-theme-neutral)" />
      <rect x="32" y="124" width="72" height="12" rx="6" fill="var(--color-theme-data2)" />
    </svg>
  );
}

function SlideFan() {
  return (
    <div className="relative h-[220px]">
      <MiniSlide variants={leftCard}>
        <BarsMotif />
      </MiniSlide>
      <MiniSlide variants={middleCard}>
        <FlowMotif />
      </MiniSlide>
      <MiniSlide variants={rightCard}>
        <TitleMotif />
      </MiniSlide>
    </div>
  );
}

function OpenShowcaseButton() {
  return (
    <span className="mt-10 inline-flex items-center gap-4 self-start rounded-full bg-theme-accent3 px-10 py-5 text-[30px] font-bold text-theme-on-primary transition-colors duration-300 group-hover:bg-theme-accent5 group-focus-visible:bg-theme-accent5">
      Open the showcase
      <span
        className="transition-transform duration-300 group-hover:translate-x-2"
        aria-hidden="true"
      >
        →
      </span>
    </span>
  );
}

function DevServerHint() {
  return (
    <p className="mt-10 text-[24px] text-theme-neutral">
      Run <code className="font-mono font-bold text-theme-accent5">pnpm dev</code>, then open{" "}
      <code className="font-mono font-bold text-theme-accent5">{SHOWCASE_URL}</code>
    </p>
  );
}

const cardClassName =
  "group relative flex w-[600px] flex-col rounded-[40px] border-2 border-theme-accent2 bg-theme-accent1 p-12 text-left outline-none transition-colors hover:border-theme-accent3 focus-visible:border-theme-accent5";

const cardGlow = {
  boxShadow: "0 40px 140px -30px color-mix(in srgb, var(--color-theme-accent2) 75%, transparent)",
};

/** Invites the viewer to browse the showcase deck; the slide fan spreads on hover. */
export function ShowcaseCard() {
  const { entrance, ambient } = useMotionAllowance();
  const hoverState = ambient ? "hover" : "rest";

  const content = (
    <>
      <SlideFan />
      <p className="mt-14 text-[22px] font-bold tracking-[0.2em] text-theme-accent3 uppercase">
        Showcase deck
      </p>
      <p className="mt-3 text-[46px] leading-[1.1] font-bold text-balance text-theme-accent5">
        See what a deck can do
      </p>
      <p className="mt-4 text-[26px] leading-snug text-theme-neutral">
        Animated builds, flow diagrams, live code and the presenter view — a full deck to explore
        before you build yours.
      </p>
      {showcaseServed ? <OpenShowcaseButton /> : <DevServerHint />}
    </>
  );

  return (
    <motion.div
      className="relative"
      initial={entrance ? { opacity: 0, x: 40 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.5, ease: EASE_OUT }}
    >
      {showcaseServed ? (
        <motion.a
          href={SHOWCASE_URL}
          className={cardClassName}
          style={cardGlow}
          initial="rest"
          animate="rest"
          whileHover={hoverState}
          whileFocus={hoverState}
        >
          {content}
        </motion.a>
      ) : (
        <motion.div className={cardClassName} style={cardGlow} initial="rest" animate="rest">
          {content}
        </motion.div>
      )}
    </motion.div>
  );
}
