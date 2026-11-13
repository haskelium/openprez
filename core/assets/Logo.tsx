import { motion, useReducedMotion } from "motion/react";
import type { SVGProps } from "react";
import { EASE_OUT } from "../components/motion";
import { useExportMode } from "../player/export-context";

const VIEW_BOX = "0 0 196 40";
const STROKE = { strokeWidth: 3.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export type LogoProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  /**
   * Play the entrance once: the brackets open, the play mark lands, then the wordmark rises.
   * Renders settled for PDF export and for viewers who prefer reduced motion.
   */
  animated?: boolean;
};

/**
 * The OpenPrez logo: code brackets around a play mark, then the wordmark. Single color: it follows
 * the surrounding text color, so it adapts to every tone.
 */
export function Logo({ animated = false, ...props }: LogoProps) {
  const exportMode = useExportMode();
  const reduceMotion = useReducedMotion() ?? false;
  const play = animated && !exportMode && !reduceMotion;
  const enter = (delay: number) => ({ duration: 0.6, delay, ease: EASE_OUT });

  return (
    <svg viewBox={VIEW_BOX} role="img" aria-label="OpenPrez" fill="currentColor" {...props}>
      <motion.path
        d="M 11 9 L 2.5 20 L 11 31"
        fill="none"
        stroke="currentColor"
        {...STROKE}
        initial={play ? { x: 9, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={enter(0.1)}
      />
      <motion.path
        d="M 39 9 L 47.5 20 L 39 31"
        fill="none"
        stroke="currentColor"
        {...STROKE}
        initial={play ? { x: -9, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={enter(0.1)}
      />
      <motion.path
        d="M 19 11.5 L 32.5 20 L 19 28.5 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={play ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={enter(0.45)}
      />
      <motion.g
        initial={play ? { y: 8, opacity: 0 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={enter(0.7)}
      >
        <text x="58" y="29.5" fontSize="27" fontFamily="Arial, Helvetica, sans-serif">
          <tspan fontWeight="400">Open</tspan>
          <tspan fontWeight="700">Prez</tspan>
        </text>
      </motion.g>
    </svg>
  );
}
