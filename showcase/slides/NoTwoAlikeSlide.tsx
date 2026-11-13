import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const MINI_WIDTH = 320;
const MINI_HEIGHT = 180;
const FOOTER_HEIGHT = 18;
const CONTENT_BOTTOM = MINI_HEIGHT - FOOTER_HEIGHT;
const FOOTER_STEP = 3;

interface Composition {
  name: string;
  surface: string;
  /** Build step at which the composition joins the mosaic. */
  appearsAt: number;
  art: ReactNode;
}

const ink = "var(--color-theme-on-primary)";
const lavender = "var(--color-theme-primary)";

const compositions: Composition[] = [
  {
    name: "orbit",
    surface: "var(--color-theme-accent1)",
    appearsAt: 1,
    art: (
      <>
        <ellipse
          cx="160"
          cy="82"
          rx="120"
          ry="46"
          fill="none"
          stroke="var(--color-theme-accent4)"
          strokeWidth="2"
        />
        <ellipse
          cx="160"
          cy="82"
          rx="70"
          ry="26"
          fill="none"
          stroke="var(--color-theme-accent4)"
          strokeWidth="2"
        />
        <circle cx="160" cy="82" r="22" fill="var(--color-theme-accent2)" />
        <circle cx="280" cy="82" r="9" fill="var(--color-theme-data2)" />
        <circle cx="104" cy="66" r="7" fill="var(--color-theme-data1)" />
        <circle cx="70" cy="110" r="8" fill={lavender} />
      </>
    ),
  },
  {
    name: "timeline",
    surface: "var(--color-theme-accent5)",
    appearsAt: 1,
    art: (
      <>
        <line
          x1="24"
          y1="96"
          x2="296"
          y2="96"
          stroke="var(--color-theme-accent4)"
          strokeWidth="4"
        />
        {[48, 120, 192, 264].map((x, index) => (
          <g key={x}>
            <circle
              cx={x}
              cy="96"
              r={index === 2 ? 12 : 8}
              fill={index === 2 ? "var(--color-theme-accent2)" : "var(--color-theme-accent4)"}
            />
            <rect
              x={x - 26}
              y={index % 2 ? 112 : 56}
              width="52"
              height="10"
              rx="5"
              fill="var(--color-theme-accent4)"
            />
          </g>
        ))}
      </>
    ),
  },
  {
    name: "big number",
    surface: "var(--color-theme-accent3)",
    appearsAt: 2,
    art: (
      <>
        <text x="28" y="118" fontSize="96" fontWeight="700" fill="var(--color-theme-on-primary)">
          87%
        </text>
        <rect
          x="30"
          y="134"
          width="150"
          height="10"
          rx="5"
          fill="var(--color-theme-accent5)"
          opacity="0.6"
        />
      </>
    ),
  },
  {
    name: "split",
    surface: ink,
    appearsAt: 2,
    art: (
      <>
        <rect x="0" y="0" width="150" height={CONTENT_BOTTOM} fill={lavender} />
        <rect x="20" y="52" width="100" height="16" rx="4" fill={ink} />
        <rect x="20" y="78" width="80" height="16" rx="4" fill={ink} />
        {[40, 82, 124].map((y) => (
          <g key={y}>
            <rect
              x="172"
              y={y - 14}
              width="34"
              height="22"
              rx="4"
              fill="var(--color-theme-data2)"
            />
            <rect
              x="216"
              y={y - 8}
              width="80"
              height="10"
              rx="5"
              fill="var(--color-theme-neutral)"
            />
          </g>
        ))}
      </>
    ),
  },
  {
    name: "route",
    surface: "var(--color-theme-accent4)",
    appearsAt: 3,
    art: (
      <>
        <path
          d="M 36 130 C 90 40, 150 150, 200 70 S 270 40, 290 52"
          fill="none"
          stroke="var(--color-theme-accent5)"
          strokeWidth="4"
          strokeDasharray="2 10"
          strokeLinecap="round"
        />
        <circle cx="36" cy="130" r="10" fill="var(--color-theme-data1)" />
        <circle cx="200" cy="70" r="8" fill="var(--color-theme-accent5)" />
        <path
          d="M 290 32 C 300 32, 306 40, 306 48 C 306 60, 290 72, 290 72 C 290 72, 274 60, 274 48 C 274 40, 280 32, 290 32 Z"
          fill="var(--color-theme-data2)"
        />
      </>
    ),
  },
  {
    name: "chart",
    surface: "var(--color-theme-primary)",
    appearsAt: 3,
    art: (
      <>
        {[40, 62, 54, 88, 118].map((height, index) => (
          <rect
            key={height}
            x={34 + index * 54}
            y={140 - height}
            width="36"
            height={height}
            rx="4"
            fill={index === 4 ? "var(--color-theme-accent2)" : ink}
          />
        ))}
        <line x1="24" y1="141" x2="300" y2="141" stroke={ink} strokeWidth="3" />
      </>
    ),
  },
];

export function NoTwoAlikeSlide({ step }: SlideProps) {
  const allowance = useMotionAllowance();
  const footerFocus = step >= FOOTER_STEP;

  return (
    <div className="flex h-full flex-col px-32 pt-24">
      <h2 className="text-[80px] leading-none font-bold tracking-tight">
        No two slides look the same.
      </h2>
      <p className="mt-6 text-[30px] text-theme-neutral">
        The agent composes each slide for its message: no layout library, no stock grid.
      </p>

      <div className="mt-12 grid max-w-[1500px] grid-cols-3 gap-x-10 gap-y-8">
        {compositions.map((composition) => {
          const visible = step >= composition.appearsAt;
          return (
            <motion.figure
              key={composition.name}
              initial={false}
              animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.92 }}
              transition={stepTransition(allowance, 0.5)}
            >
              <svg
                viewBox={`0 0 ${MINI_WIDTH} ${MINI_HEIGHT}`}
                className="w-full overflow-hidden rounded-xl shadow-2xl"
                role="img"
              >
                <title>{`A ${composition.name} composition`}</title>
                <rect width={MINI_WIDTH} height={MINI_HEIGHT} fill={composition.surface} />
                {composition.art}
                <SharedFooter highlighted={footerFocus} />
              </svg>
            </motion.figure>
          );
        })}
      </div>

      <motion.p
        className="mt-10 text-[30px] font-bold"
        initial={false}
        animate={{ opacity: footerFocus ? 1 : 0, y: footerFocus ? 0 : 16 }}
        transition={stepTransition(allowance, 0.45, footerFocus ? 0.3 : 0)}
      >
        One constant: <span className="text-theme-data2">the frame and its footer.</span> Everything
        above it is the agent&apos;s to compose.
      </motion.p>
    </div>
  );
}

function SharedFooter({ highlighted }: { highlighted: boolean }) {
  const allowance = useMotionAllowance();
  return (
    <g>
      <rect y={CONTENT_BOTTOM} width={MINI_WIDTH} height={FOOTER_HEIGHT} fill={ink} />
      <rect x="10" y={CONTENT_BOTTOM + 6} width="26" height="6" rx="3" fill={lavender} />
      <rect
        x="146"
        y={CONTENT_BOTTOM + 7}
        width="28"
        height="4"
        rx="2"
        fill={lavender}
        opacity="0.5"
      />
      <rect x="284" y={CONTENT_BOTTOM + 6} width="26" height="6" rx="3" fill={lavender} />
      <motion.rect
        x="2"
        y={CONTENT_BOTTOM + 1}
        width={MINI_WIDTH - 4}
        height={FOOTER_HEIGHT - 3}
        rx="3"
        fill="none"
        stroke="var(--color-theme-data2)"
        strokeWidth="3"
        initial={false}
        animate={{ opacity: highlighted ? 1 : 0 }}
        transition={stepTransition(allowance, 0.4)}
      />
    </g>
  );
}
