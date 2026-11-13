import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { motion } from "motion/react";

const PLOT = { left: 860, right: 1790, top: 110, bottom: 880 };
const MID_X = (PLOT.left + PLOT.right) / 2;
const MID_Y = (PLOT.top + PLOT.bottom) / 2;

interface Contender {
  name: string;
  verdict: string;
  x: number;
  y: number;
  appearsAt: number;
  highlight?: boolean;
}

const contenders: Contender[] = [
  {
    name: "Template tools",
    verdict: "On brief, but every deck looks the same.",
    x: 1040,
    y: 290,
    appearsAt: 2,
  },
  {
    name: "Free-form generation",
    verdict: "Fresh, but rarely what you asked for.",
    x: 1580,
    y: 730,
    appearsAt: 3,
  },
  {
    name: "OpenPrez",
    verdict: "Free in form, controlled in outcome.",
    x: 1610,
    y: 260,
    appearsAt: 4,
    highlight: true,
  },
];

export function DilemmaSlide({ step }: SlideProps) {
  const allowance = useMotionAllowance();

  return (
    <div className="relative h-full">
      <div className="absolute top-24 left-32 w-[640px]">
        <h2 className="text-[68px] leading-[1.05] font-bold tracking-tight">
          AI slides today: the same template, or a surprise.
        </h2>
        <ul className="mt-14 flex flex-col gap-8">
          {contenders.map((contender) => {
            const visible = step >= contender.appearsAt;
            return (
              <motion.li
                key={contender.name}
                className={
                  contender.highlight ? "rounded-2xl bg-on-surface px-7 py-5 text-surface" : ""
                }
                initial={false}
                animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -24 }}
                transition={stepTransition(allowance, 0.45)}
              >
                <p className="text-[32px] font-bold">{contender.name}</p>
                <p className="mt-1 text-[26px] leading-snug">{contender.verdict}</p>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <svg viewBox="0 0 1920 1016" className="absolute inset-0 h-full w-full" role="img">
        <title>Freedom versus control: where slide tools sit</title>
        <Axes />
        {contenders.map((contender) => (
          <ContenderDot
            key={contender.name}
            contender={contender}
            visible={step >= contender.appearsAt}
          />
        ))}
      </svg>
    </div>
  );
}

// The tone's own text colour, so axes and labels stay legible on whichever surface the template gives.
const ink = "var(--color-on-surface)";

function Axes() {
  return (
    <g>
      <line
        x1={MID_X}
        y1={PLOT.top}
        x2={MID_X}
        y2={PLOT.bottom}
        stroke={ink}
        strokeOpacity="0.25"
        strokeWidth="3"
        strokeDasharray="8 12"
      />
      <line
        x1={PLOT.left}
        y1={MID_Y}
        x2={PLOT.right}
        y2={MID_Y}
        stroke={ink}
        strokeOpacity="0.25"
        strokeWidth="3"
        strokeDasharray="8 12"
      />
      <path
        d={`M ${PLOT.left} ${PLOT.top} V ${PLOT.bottom} H ${PLOT.right}`}
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d={`M ${PLOT.left - 14} ${PLOT.top + 22} L ${PLOT.left} ${PLOT.top} L ${PLOT.left + 14} ${PLOT.top + 22}`}
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d={`M ${PLOT.right - 22} ${PLOT.bottom - 14} L ${PLOT.right} ${PLOT.bottom} L ${PLOT.right - 22} ${PLOT.bottom + 14}`}
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <text
        x={PLOT.right}
        y={PLOT.bottom + 56}
        textAnchor="end"
        fontSize="30"
        fontWeight="700"
        fill={ink}
      >
        Creative freedom
      </text>
      <text
        x={PLOT.left - 36}
        y={PLOT.top}
        textAnchor="end"
        fontSize="30"
        fontWeight="700"
        fill={ink}
        transform={`rotate(-90 ${PLOT.left - 36} ${PLOT.top})`}
      >
        Control over the outcome
      </text>
    </g>
  );
}

function ContenderDot({ contender, visible }: { contender: Contender; visible: boolean }) {
  const allowance = useMotionAllowance();
  const radius = contender.highlight ? 46 : 30;

  return (
    <motion.g
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.4 }}
      transition={stepTransition(allowance, 0.5)}
    >
      {contender.highlight && (
        <motion.circle
          cx={contender.x}
          cy={contender.y}
          r={radius + 26}
          fill="var(--color-theme-accent3)"
          animate={allowance.ambient && visible ? { opacity: [0.18, 0.4, 0.18] } : { opacity: 0.3 }}
          transition={
            allowance.ambient && visible
              ? { duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
              : { duration: 0 }
          }
        />
      )}
      <circle
        cx={contender.x}
        cy={contender.y}
        r={radius}
        fill={contender.highlight ? "var(--color-theme-accent3)" : "var(--color-theme-accent4)"}
        stroke={ink}
        strokeWidth="5"
      />
      <text
        x={contender.x}
        y={contender.y - radius - 22}
        textAnchor="middle"
        fontSize={contender.highlight ? 40 : 30}
        fontWeight="700"
        fill={ink}
      >
        {contender.name}
      </text>
    </motion.g>
  );
}
