import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { motion } from "motion/react";

const CENTER = { x: 1160, y: 600 };
const RING_RADIUS = 260;
const NODE_RADIUS = 74;
const ENTRY_STEP = 6;

/** Where a phase's label sits so the ring never crosses it. */
type Side = "right-above" | "right" | "right-below" | "left";

interface Phase {
  name: string;
  command: string;
  outputs: string[];
  x: number;
  y: number;
  labelSide: Side;
}

const phases: Phase[] = [
  {
    name: "Explore",
    command: "/opp-explore",
    outputs: ["think it through", "read-only"],
    x: CENTER.x,
    y: CENTER.y - RING_RADIUS,
    labelSide: "right-above",
  },
  {
    name: "Propose",
    command: "/opp-propose",
    outputs: ["proposal.md", "content.md", "design.md", "tasks.md"],
    x: CENTER.x + RING_RADIUS,
    y: CENTER.y,
    labelSide: "right",
  },
  {
    name: "Apply",
    command: "/opp-apply",
    outputs: ["slides + notes", "pnpm check"],
    x: CENTER.x,
    y: CENTER.y + RING_RADIUS,
    labelSide: "right-below",
  },
  {
    name: "Archive",
    command: "/opp-archive",
    outputs: ["sync the story", "keep the history"],
    x: CENTER.x - RING_RADIUS,
    y: CENTER.y,
    labelSide: "left",
  },
];

/** The quarter arc from one phase to the next, clockwise along the ring. */
function arcBetween(from: Phase, to: Phase): string {
  return `M ${from.x} ${from.y} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${to.x} ${to.y}`;
}

/** A phase lights up on step index + 2; step 1 shows the story document alone. */
function phaseStep(index: number): number {
  return index + 2;
}

export function WorkflowSlide({ step }: SlideProps) {
  const allowance = useMotionAllowance();
  const currentPhase = step - 2;

  return (
    <div className="relative h-full">
      <div className="absolute top-24 left-32">
        <h2 className="max-w-[900px] text-[64px] leading-[1.05] font-bold tracking-tight">
          One loop, to start a deck or to change one.
        </h2>
      </div>

      <svg viewBox="0 0 1920 1016" className="absolute inset-0 h-full w-full" role="img">
        <title>The OpenPrez loop: explore, propose, apply and archive around presentation.md</title>

        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={RING_RADIUS}
          fill="none"
          stroke="var(--color-theme-accent4)"
          strokeWidth="3"
          strokeDasharray="6 14"
        />

        {phases.map((phase, index) => {
          const next = phases[(index + 1) % phases.length];
          // Each arc draws as the phase it leads to lights up; the last arc closes the loop with archive.
          const closesLoop = index === phases.length - 1;
          const drawn = step >= phaseStep(closesLoop ? index : index + 1);
          return (
            <motion.path
              key={`${phase.name}-arc`}
              d={arcBetween(phase, next)}
              fill="none"
              stroke="var(--color-theme-accent3)"
              strokeWidth="8"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: drawn ? 1 : 0, opacity: drawn ? 1 : 0 }}
              transition={stepTransition(allowance, 0.7)}
            />
          );
        })}

        <StoryDocument synced={step >= phaseStep(phases.length - 1)} />

        <EntryPoints visible={step >= ENTRY_STEP} />

        {phases.map((phase, index) => (
          <PhaseNode
            key={phase.name}
            phase={phase}
            active={step >= phaseStep(index)}
            current={index === currentPhase}
          />
        ))}
      </svg>
    </div>
  );
}

interface Entry {
  title: string;
  detail: string;
  top: number;
}

const entries: Entry[] = [
  { title: "New deck", detail: "reset, then plan the whole story", top: 290 },
  { title: "Existing deck", detail: "change one slide or a section", top: 410 },
];

const ENTRY_LEFT = 128;
const ENTRY_WIDTH = 520;
const ENTRY_HEIGHT = 112;

/** The two ways into the same loop, both landing on Explore. */
function EntryPoints({ visible }: { visible: boolean }) {
  const allowance = useMotionAllowance();
  const explore = phases[0];

  return (
    <motion.g
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -30 }}
      transition={stepTransition(allowance, 0.5)}
    >
      {entries.map((entry, index) => {
        const startX = ENTRY_LEFT + ENTRY_WIDTH;
        const startY = entry.top + ENTRY_HEIGHT / 2;
        const endX = explore.x - NODE_RADIUS - 14;
        const endY = explore.y + (index === 0 ? -18 : 18);
        return (
          <g key={entry.title}>
            <path
              d={`M ${startX} ${startY} C ${startX + 220} ${startY}, ${endX - 220} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke="var(--color-theme-data2)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d={`M ${endX - 18} ${endY - 11} L ${endX} ${endY} L ${endX - 18} ${endY + 11} Z`}
              fill="var(--color-theme-data2)"
            />
            <rect
              x={ENTRY_LEFT}
              y={entry.top}
              width={ENTRY_WIDTH}
              height={ENTRY_HEIGHT}
              rx="18"
              fill="var(--color-theme-accent1)"
              stroke="var(--color-theme-data2)"
              strokeWidth="3"
            />
            <text
              x={ENTRY_LEFT + 30}
              y={entry.top + 48}
              fontSize="32"
              fontWeight="700"
              fill="var(--color-theme-accent5)"
            >
              {entry.title}
            </text>
            <text
              x={ENTRY_LEFT + 30}
              y={entry.top + 86}
              fontSize="24"
              fill="var(--color-theme-neutral)"
            >
              {entry.detail}
            </text>
          </g>
        );
      })}
    </motion.g>
  );
}

function StoryDocument({ synced }: { synced: boolean }) {
  const allowance = useMotionAllowance();
  const width = 220;
  const height = 260;
  const left = CENTER.x - width / 2;
  const top = CENTER.y - height / 2;
  const fold = 44;

  return (
    <g>
      <path
        d={`M ${left} ${top} H ${left + width - fold} L ${left + width} ${top + fold} V ${top + height} H ${left} Z`}
        fill="var(--color-theme-accent5)"
      />
      <path
        d={`M ${left + width - fold} ${top} V ${top + fold} H ${left + width}`}
        fill="var(--color-theme-accent3)"
      />
      {[0, 1, 2, 3, 4].map((line) => (
        <rect
          key={line}
          x={left + 28}
          y={top + 92 + line * 30}
          width={line === 0 ? 120 : 164 - (line % 2) * 40}
          height="12"
          rx="6"
          fill="var(--color-theme-accent4)"
        />
      ))}
      <text
        x={CENTER.x}
        y={top + 62}
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fontFamily="ui-monospace, Menlo, Consolas, monospace"
        fill="var(--color-theme-on-primary)"
      >
        presentation.md
      </text>
      <motion.g
        initial={false}
        animate={{ opacity: synced ? 1 : 0 }}
        transition={stepTransition(allowance, 0.5, synced ? 0.5 : 0)}
      >
        <path
          d={`M ${CENTER.x - RING_RADIUS + NODE_RADIUS + 10} ${CENTER.y} H ${left - 14}`}
          stroke="var(--color-theme-data2)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M ${left - 26} ${CENTER.y - 12} L ${left - 6} ${CENTER.y} L ${left - 26} ${CENTER.y + 12} Z`}
          fill="var(--color-theme-data2)"
        />
      </motion.g>
    </g>
  );
}

function PhaseNode({
  phase,
  active,
  current,
}: {
  phase: Phase;
  active: boolean;
  current: boolean;
}) {
  const allowance = useMotionAllowance();
  const label = labelPlacement(phase);
  const fade = stepTransition(allowance, 0.4);

  return (
    <g>
      <circle
        cx={phase.x}
        cy={phase.y}
        r={NODE_RADIUS}
        fill="var(--color-theme-accent1)"
        stroke="var(--color-theme-accent4)"
        strokeWidth="6"
      />
      <motion.circle
        cx={phase.x}
        cy={phase.y}
        r={NODE_RADIUS}
        fill="var(--color-theme-accent2)"
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={fade}
      />
      <motion.circle
        cx={phase.x}
        cy={phase.y}
        r={NODE_RADIUS + 3}
        fill="none"
        stroke="var(--color-theme-data2)"
        strokeWidth="6"
        initial={false}
        animate={{ opacity: current ? 1 : 0 }}
        transition={fade}
      />
      <text
        x={phase.x}
        y={phase.y + 9}
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill={active ? "var(--color-theme-on-primary)" : "var(--color-theme-neutral)"}
      >
        {phase.name}
      </text>
      <motion.g
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={stepTransition(allowance, 0.4, active ? 0.2 : 0)}
      >
        <text
          x={label.x}
          y={label.y}
          textAnchor={label.anchor}
          fontSize="26"
          fontWeight="700"
          fontFamily="ui-monospace, Menlo, Consolas, monospace"
          fill="var(--color-theme-accent3)"
        >
          {phase.command}
        </text>
        {phase.outputs.map((output, index) => (
          <text
            key={output}
            x={label.x}
            y={label.y + LABEL_FIRST_LINE + index * LABEL_LINE}
            textAnchor={label.anchor}
            fontSize="24"
            fill="var(--color-theme-primary)"
          >
            {output}
          </text>
        ))}
      </motion.g>
    </g>
  );
}

const LABEL_FIRST_LINE = 38;
const LABEL_LINE = 32;

/** Places a phase's command and outputs beside its node, vertically centered on it. */
function labelPlacement(phase: Phase): { x: number; y: number; anchor: "start" | "end" } {
  const gap = NODE_RADIUS + 28;
  const blockHeight = LABEL_FIRST_LINE + (phase.outputs.length - 1) * LABEL_LINE;
  switch (phase.labelSide) {
    case "right-above":
      return { x: phase.x + gap, y: phase.y - NODE_RADIUS + 4, anchor: "start" };
    case "right-below":
      return { x: phase.x + gap, y: phase.y + 10, anchor: "start" };
    case "right":
      return { x: phase.x + gap, y: phase.y - blockHeight / 2 + 8, anchor: "start" };
    case "left":
      return { x: phase.x - gap, y: phase.y - blockHeight / 2 + 8, anchor: "end" };
  }
}
