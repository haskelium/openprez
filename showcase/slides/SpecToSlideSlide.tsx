import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { motion } from "motion/react";

const MONO = "ui-monospace, Menlo, Consolas, monospace";
const SPEC = { left: 128, top: 330, width: 660, height: 480 };
const FRAME = { left: 1110, top: 320, width: 680, height: 382 };
const NOTE = { top: FRAME.top + FRAME.height + 34, height: 96 };
const INVERSE_STEP = 4;

interface SpecItem {
  key: string;
  value: string;
  /** Build step at which this line becomes part of the slide. */
  step: number;
  /** Vertical position of the slide element the line produced. */
  targetY: number;
}

const specItems: SpecItem[] = [
  { key: "message", value: "Freedom with a frame", step: 2, targetY: FRAME.top + 92 },
  { key: "steps", value: "3, one claim each", step: 3, targetY: FRAME.top + 240 },
  { key: "tone", value: "inverse", step: 4, targetY: FRAME.top + FRAME.height - 40 },
  { key: "notes", value: "pause after the claim", step: 5, targetY: NOTE.top + NOTE.height / 2 },
];

function specLineY(index: number): number {
  return SPEC.top + 150 + index * 78;
}

export function SpecToSlideSlide({ step }: SlideProps) {
  return (
    <div className="relative h-full">
      <div className="absolute top-24 left-32">
        <h2 className="text-[80px] leading-none font-bold tracking-tight">Spec in, slide out.</h2>
        <p className="mt-6 text-[30px] text-theme-neutral">
          Every line you approved becomes something you can point at.
        </p>
      </div>

      <svg viewBox="0 0 1920 1016" className="absolute inset-0 h-full w-full" role="img">
        <title>Each line of the design spec maps to an element of the finished slide</title>
        <SpecCard step={step} />
        <SlideFrame step={step} />
        <PresenterNote visible={step >= 5} />
        {specItems.map((item, index) => (
          <Connector
            key={item.key}
            fromY={specLineY(index) - 10}
            toY={item.targetY}
            drawn={step >= item.step}
          />
        ))}
      </svg>
    </div>
  );
}

function SpecCard({ step }: { step: number }) {
  const allowance = useMotionAllowance();
  return (
    <g>
      <rect
        x={SPEC.left}
        y={SPEC.top}
        width={SPEC.width}
        height={SPEC.height}
        rx="24"
        fill="var(--color-theme-accent1)"
        stroke="var(--color-theme-accent4)"
        strokeWidth="3"
      />
      <text
        x={SPEC.left + 40}
        y={SPEC.top + 62}
        fontSize="22"
        fontFamily={MONO}
        fill="var(--color-theme-neutral)"
      >
        design.md
      </text>
      <text
        x={SPEC.left + 40}
        y={SPEC.top + 104}
        fontSize="32"
        fontWeight="700"
        fontFamily={MONO}
        fill="var(--color-theme-primary)"
      >
        ## 7. pitch
      </text>
      {specItems.map((item, index) => {
        const y = specLineY(index);
        return (
          <g key={item.key}>
            <motion.rect
              x={SPEC.left + 20}
              y={y - 40}
              width={SPEC.width - 40}
              height="56"
              rx="10"
              fill="var(--color-theme-accent3)"
              initial={false}
              animate={{ opacity: step === item.step ? 0.2 : 0 }}
              transition={stepTransition(allowance, 0.35)}
            />
            <text x={SPEC.left + 40} y={y} fontSize="28" fontFamily={MONO}>
              <tspan fill="var(--color-theme-data2)">{item.key}: </tspan>
              <tspan fill="var(--color-theme-accent5)">{item.value}</tspan>
            </text>
          </g>
        );
      })}
    </g>
  );
}

function SlideFrame({ step }: { step: number }) {
  const allowance = useMotionAllowance();
  return (
    <g>
      <SlideFace
        step={step}
        surface="var(--color-theme-accent1)"
        text="var(--color-theme-primary)"
      />
      <motion.g
        initial={false}
        animate={{ opacity: step >= INVERSE_STEP ? 1 : 0 }}
        transition={stepTransition(allowance, 0.5)}
      >
        <SlideFace
          step={step}
          surface="var(--color-theme-primary)"
          text="var(--color-theme-on-primary)"
        />
      </motion.g>
      <rect
        x={FRAME.left}
        y={FRAME.top}
        width={FRAME.width}
        height={FRAME.height}
        rx="18"
        fill="none"
        stroke="var(--color-theme-accent4)"
        strokeWidth="3"
        strokeDasharray={step === 1 ? "10 10" : undefined}
      />
    </g>
  );
}

/** The rendered pitch slide in one tone; the inverse face cross-fades over the base one. */
function SlideFace({ step, surface, text }: { step: number; surface: string; text: string }) {
  const allowance = useMotionAllowance();
  return (
    <g>
      <rect
        x={FRAME.left}
        y={FRAME.top}
        width={FRAME.width}
        height={FRAME.height}
        rx="18"
        fill={surface}
      />
      <motion.text
        x={FRAME.left + 44}
        y={FRAME.top + 108}
        fontSize="50"
        fontWeight="700"
        fill={text}
        initial={false}
        animate={{ opacity: step >= 2 ? 1 : 0 }}
        transition={stepTransition(allowance, 0.45)}
      >
        Freedom with a frame
      </motion.text>
      {[0, 1, 2].map((claim) => (
        <motion.g
          key={claim}
          initial={false}
          animate={{ opacity: step >= 3 ? 1 : 0 }}
          transition={stepTransition(allowance, 0.4, step >= 3 ? claim * 0.15 : 0)}
        >
          <rect
            x={FRAME.left + 44 + claim * 204}
            y={FRAME.top + 190}
            width="184"
            height="100"
            rx="14"
            fill="var(--color-theme-accent2)"
          />
          <text
            x={FRAME.left + 136 + claim * 204}
            y={FRAME.top + 250}
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="var(--color-theme-on-primary)"
          >
            {`claim ${claim + 1}`}
          </text>
        </motion.g>
      ))}
    </g>
  );
}

function PresenterNote({ visible }: { visible: boolean }) {
  const allowance = useMotionAllowance();
  return (
    <motion.g
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={stepTransition(allowance, 0.45)}
    >
      <rect
        x={FRAME.left}
        y={NOTE.top}
        width={FRAME.width}
        height={NOTE.height}
        rx="18"
        fill="var(--color-theme-accent1)"
        stroke="var(--color-theme-data2)"
        strokeWidth="3"
      />
      <text
        x={FRAME.left + 32}
        y={NOTE.top + 42}
        fontSize="20"
        fontWeight="700"
        fill="var(--color-theme-data2)"
      >
        PRESENTER VIEW ONLY
      </text>
      <text x={FRAME.left + 32} y={NOTE.top + 76} fontSize="28" fill="var(--color-theme-accent5)">
        “Pause after the claim.”
      </text>
    </motion.g>
  );
}

function Connector({ fromY, toY, drawn }: { fromY: number; toY: number; drawn: boolean }) {
  const allowance = useMotionAllowance();
  const startX = SPEC.left + SPEC.width + 12;
  const endX = FRAME.left - 16;
  return (
    <motion.path
      d={`M ${startX} ${fromY} C ${startX + 160} ${fromY}, ${endX - 160} ${toY}, ${endX} ${toY}`}
      fill="none"
      stroke="var(--color-theme-data2)"
      strokeWidth="5"
      strokeLinecap="round"
      initial={false}
      animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
      transition={stepTransition(allowance, 0.6)}
    />
  );
}
