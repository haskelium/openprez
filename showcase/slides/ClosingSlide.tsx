import { EASE_OUT, Logo, useMotionAllowance } from "@core";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/** Seconds after which the tagline rises, once the logo and thumbnails have arrived. */
const TAGLINE_DELAY = 1.4;

const THUMB = { width: 172, height: 97 };
const RING = { cx: 960, cy: 455, rx: 815, ry: 345 };
// Angles in degrees (0 = right, clockwise), leaving the top and bottom centre free for the text.
const ANGLES = [-72, -36, 0, 36, 72, 108, 144, 180, 216, 252];

const ink = "var(--color-theme-on-primary)";
const ice = "var(--color-theme-accent5)";
const panel = "var(--color-theme-accent1)";

interface Thumb {
  label: string;
  surface: string;
  art: ReactNode;
}

// One miniature per showcase slide, in deck order: each composed differently, all in the same frame.
const thumbs: Thumb[] = [
  {
    label: "title",
    surface: ink,
    art: (
      <>
        <circle cx="86" cy="38" r="30" fill="var(--color-theme-accent2)" opacity="0.35" />
        <rect x="50" y="30" width="72" height="12" rx="6" fill={ice} />
        <rect x="62" y="50" width="48" height="6" rx="3" fill="var(--color-theme-accent3)" />
      </>
    ),
  },
  {
    label: "dilemma",
    surface: "var(--color-theme-primary)",
    art: (
      <>
        <path d="M 30 10 V 70 H 150" fill="none" stroke={ink} strokeWidth="3" />
        <circle cx="62" cy="28" r="6" fill="var(--color-theme-accent4)" />
        <circle cx="128" cy="58" r="6" fill="var(--color-theme-accent4)" />
        <circle cx="132" cy="22" r="10" fill="var(--color-theme-accent3)" />
      </>
    ),
  },
  {
    label: "no two alike",
    surface: panel,
    art: (
      <>
        {[
          ["var(--color-theme-accent2)", 18, 12],
          ["var(--color-theme-accent5)", 66, 12],
          ["var(--color-theme-accent3)", 114, 12],
          ["var(--color-theme-accent5)", 18, 44],
          ["var(--color-theme-accent4)", 66, 44],
          ["var(--color-theme-data2)", 114, 44],
        ].map(([fill, x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="40" height="26" rx="4" fill={fill as string} />
        ))}
      </>
    ),
  },
  {
    label: "code",
    surface: panel,
    art: (
      <>
        <rect x="16" y="22" width="60" height="7" rx="3" fill="var(--color-theme-data2)" />
        <rect x="80" y="22" width="44" height="7" rx="3" fill={ice} />
        <rect x="16" y="36" width="40" height="7" rx="3" fill="var(--color-theme-data2)" />
        <rect x="60" y="36" width="80" height="7" rx="3" fill={ice} />
        <rect
          x="10"
          y="48"
          width="152"
          height="12"
          rx="3"
          fill="var(--color-theme-accent3)"
          opacity="0.35"
        />
        <rect x="16" y="51" width="34" height="6" rx="3" fill="var(--color-theme-data2)" />
        <rect x="54" y="51" width="70" height="6" rx="3" fill={ice} />
      </>
    ),
  },
  {
    label: "interactive",
    surface: ink,
    art: (
      <>
        <rect x="14" y="20" width="32" height="46" rx="5" fill="var(--color-theme-accent2)" />
        <rect x="52" y="20" width="32" height="46" rx="5" fill={panel} />
        <rect x="90" y="20" width="32" height="46" rx="5" fill={panel} />
        <rect x="128" y="20" width="32" height="46" rx="5" fill="var(--color-theme-primary)" />
        <rect x="96" y="44" width="5" height="16" fill="var(--color-theme-accent3)" />
        <rect x="104" y="36" width="5" height="24" fill="var(--color-theme-accent3)" />
        <rect x="112" y="30" width="5" height="30" fill="var(--color-theme-data2)" />
      </>
    ),
  },
  {
    label: "layers",
    surface: ink,
    art: (
      <>
        <path
          d="M 40 50 L 110 50 L 130 66 L 60 66 Z"
          fill={panel}
          stroke="var(--color-theme-accent3)"
          strokeWidth="2"
        />
        <path d="M 40 32 L 110 32 L 130 48 L 60 48 Z" fill="var(--color-theme-accent4)" />
        <path d="M 40 14 L 110 14 L 130 30 L 60 30 Z" fill={ice} />
        <rect x="62" y="18" width="10" height="8" rx="2" fill="var(--color-theme-accent3)" />
        <rect x="76" y="18" width="10" height="8" rx="2" fill="var(--color-theme-accent4)" />
      </>
    ),
  },
  {
    label: "workflow",
    surface: ink,
    art: (
      <>
        <circle
          cx="86"
          cy="40"
          r="26"
          fill="none"
          stroke="var(--color-theme-accent3)"
          strokeWidth="3"
        />
        {[
          [86, 14],
          [112, 40],
          [86, 66],
          [60, 40],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="8" fill="var(--color-theme-accent2)" />
        ))}
        <rect x="80" y="32" width="12" height="16" rx="2" fill={ice} />
      </>
    ),
  },
  {
    label: "spec to slide",
    surface: ink,
    art: (
      <>
        <rect x="12" y="12" width="64" height="56" rx="5" fill={panel} />
        <rect x="18" y="22" width="40" height="5" rx="2" fill={ice} />
        <rect x="18" y="34" width="50" height="5" rx="2" fill="var(--color-theme-data2)" />
        <rect x="18" y="46" width="30" height="5" rx="2" fill={ice} />
        <rect x="92" y="12" width="68" height="56" rx="5" fill="var(--color-theme-primary)" />
        <rect x="98" y="40" width="17" height="14" rx="2" fill="var(--color-theme-accent2)" />
        <rect x="118" y="40" width="17" height="14" rx="2" fill="var(--color-theme-accent2)" />
        <rect x="138" y="40" width="17" height="14" rx="2" fill="var(--color-theme-accent2)" />
      </>
    ),
  },
  {
    label: "presenter",
    surface: ink,
    art: (
      <>
        <rect x="12" y="16" width="62" height="40" rx="4" fill="var(--color-theme-primary)" />
        <rect x="18" y="28" width="14" height="22" rx="2" fill="var(--color-theme-accent2)" />
        <rect x="36" y="28" width="14" height="22" rx="2" fill="var(--color-theme-accent2)" />
        <rect x="84" y="10" width="78" height="58" rx="4" fill={panel} />
        <rect x="90" y="18" width="30" height="20" rx="2" fill="var(--color-theme-primary)" />
        <rect x="126" y="20" width="30" height="5" rx="2" fill="var(--color-theme-accent4)" />
        <rect x="126" y="30" width="24" height="5" rx="2" fill={ice} />
      </>
    ),
  },
  {
    label: "anywhere",
    surface: ink,
    art: (
      <>
        {[14, 66, 118].map((x) => (
          <rect key={x} x={x} y="20" width="40" height="40" rx="5" fill={panel} />
        ))}
        <rect x="124" y="30" width="28" height="18" rx="2" fill={ice} />
        <rect x="127" y="35" width="6" height="8" fill="var(--color-theme-accent3)" />
        <rect x="135" y="35" width="6" height="8" fill="var(--color-theme-accent4)" />
        <rect x="143" y="35" width="6" height="8" fill="var(--color-theme-data2)" />
        <path d="M 56 40 H 64 M 108 40 H 116" stroke="var(--color-theme-data2)" strokeWidth="3" />
      </>
    ),
  },
];

function ringPosition(index: number) {
  const angle = (ANGLES[index] * Math.PI) / 180;
  return {
    x: RING.cx + RING.rx * Math.cos(angle) - THUMB.width / 2,
    y: RING.cy + RING.ry * Math.sin(angle) - THUMB.height / 2,
    // Start further out along the same ray, so every thumbnail converges toward the logo.
    fromX: RING.rx * 0.55 * Math.cos(angle),
    fromY: RING.ry * 0.9 * Math.sin(angle),
  };
}

function MiniSlide({ thumb, index }: { thumb: Thumb; index: number }) {
  const { entrance, ambient } = useMotionAllowance();
  const { x, y, fromX, fromY } = ringPosition(index);
  const tilt = ((index % 5) - 2) * 3;

  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={entrance ? { opacity: 0, x: fromX, y: fromY, rotate: tilt * 4 } : false}
        animate={{ opacity: 1, x: 0, y: 0, rotate: tilt }}
        transition={{ duration: 0.9, delay: 0.15 + index * 0.06, ease: EASE_OUT }}
      >
        <motion.g
          animate={ambient ? { y: [0, -6, 0] } : { y: 0 }}
          transition={
            ambient
              ? {
                  duration: 4 + (index % 3),
                  delay: 1.2 + index * 0.2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }
              : { duration: 0 }
          }
        >
          <rect
            width={THUMB.width}
            height={THUMB.height}
            rx="10"
            fill={thumb.surface}
            stroke="var(--color-theme-accent4)"
            strokeOpacity="0.55"
            strokeWidth="2"
          />
          {thumb.art}
          {/* The shared frame: every miniature carries the same footer strip. */}
          <rect
            x="0"
            y={THUMB.height - 14}
            width={THUMB.width}
            height="14"
            rx="0"
            fill={ink}
            opacity="0.85"
          />
          <rect x="10" y={THUMB.height - 9} width="22" height="4" rx="2" fill={ice} opacity="0.8" />
          <rect
            x={THUMB.width - 30}
            y={THUMB.height - 9}
            width="20"
            height="4"
            rx="2"
            fill={ice}
            opacity="0.8"
          />
        </motion.g>
      </motion.g>
    </g>
  );
}

export function ClosingSlide() {
  const { entrance } = useMotionAllowance();
  const rise = (delay: number) => ({
    initial: entrance ? { opacity: 0, y: 24 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: EASE_OUT },
  });

  return (
    <div className="relative h-full overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[455px] left-1/2 size-[1300px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-theme-accent2) 28%, transparent) 0%, transparent 62%)",
        }}
      />

      <svg
        viewBox="0 0 1920 1016"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="The ten showcase slides, each composed differently, all around the OpenPrez logo"
      >
        {thumbs.map((thumb, index) => (
          <MiniSlide key={thumb.label} thumb={thumb} index={index} />
        ))}
      </svg>

      <div className="absolute inset-x-0 top-[300px] flex flex-col items-center text-center">
        <h2>
          <Logo animated className="h-[130px] text-theme-primary" />
        </h2>
        <motion.p
          className="mt-14 text-[52px] leading-tight font-bold text-theme-accent5"
          {...rise(TAGLINE_DELAY)}
        >
          Creative freedom, engineered outcomes.
        </motion.p>
      </div>

      <motion.div
        className="absolute inset-x-0 bottom-[44px] flex items-center justify-center gap-5"
        {...rise(TAGLINE_DELAY + 0.3)}
      >
        <p className="text-[26px] text-theme-neutral">Get the code:</p>
        <a
          href="https://github.com/haskelium/openprez"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-theme-accent1 px-6 py-3 font-mono text-[26px] font-bold text-theme-accent5 ring-2 ring-theme-accent4/60 transition-transform hover:scale-105"
        >
          github.com/haskelium/openprez
        </a>
      </motion.div>
    </div>
  );
}
