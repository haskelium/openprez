import { motion } from "motion/react";
import { useState } from "react";
import { useStep } from "../player/step-context";
import { useMotionAllowance } from "./motion";

export interface FlowLineProps {
  /** SVG path data, in the coordinate system of the enclosing <svg>. */
  d: string;
  /** Build step at which the line draws in; defaults to 1. */
  step?: number;
  /** Stroke color; any CSS color, theme variables included. */
  color?: string;
  width?: number;
  /** Seconds to draw the line. */
  duration?: number;
  /** Show moving pulses along the line once it is drawn; defaults to true. */
  flowing?: boolean;
}

/**
 * Line that draws itself when its build step is reached and retracts when stepping back.
 * Place it inside an <svg>. With a reduced-motion preference it appears instantly, without pulses.
 */
export function FlowLine({
  d,
  step: appearsAt = 1,
  color = "var(--color-theme-accent3)",
  width = 4,
  duration = 0.9,
  flowing = true,
}: FlowLineProps) {
  const { step } = useStep();
  const allowance = useMotionAllowance();
  const visible = step >= appearsAt;
  // A line whose step is already behind the slide's entry step appears complete instead of redrawing.
  const [alreadyDrawn] = useState(step > appearsAt);
  const drawDuration = allowance.ambient ? duration : 0;

  return (
    <g data-flow-line data-visible={visible}>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        initial={
          !allowance.entrance
            ? false
            : { pathLength: alreadyDrawn ? 1 : 0, opacity: alreadyDrawn ? 1 : 0 }
        }
        animate={{ pathLength: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
        transition={{ duration: drawDuration, ease: "easeInOut" }}
      />
      {flowing && allowance.ambient && (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--color-theme-on-primary)"
          strokeWidth={width * 0.6}
          strokeLinecap="round"
          strokeDasharray="2 22"
          initial={{ opacity: alreadyDrawn ? 0.9 : 0, strokeDashoffset: 0 }}
          animate={{ opacity: visible ? 0.9 : 0, strokeDashoffset: -240 }}
          transition={{
            opacity: { duration: 0.3, delay: visible ? duration : 0 },
            strokeDashoffset: { duration: 4, ease: "linear", repeat: Number.POSITIVE_INFINITY },
          }}
        />
      )}
    </g>
  );
}
