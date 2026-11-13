import { type Transition, useReducedMotion } from "motion/react";
import { useExportMode } from "../player/export-context";

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface MotionAllowance {
  /** Entrance animations may play; false while the slide renders as a static PDF page. */
  entrance: boolean;
  /** Timed, looping or path-drawing motion may run; false for PDF pages and reduced-motion viewers. */
  ambient: boolean;
}

export function useMotionAllowance(): MotionAllowance {
  const exportMode = useExportMode();
  const reduceMotion = useReducedMotion() ?? false;
  return { entrance: !exportMode, ambient: !exportMode && !reduceMotion };
}

/** A step transition that settles instantly when motion is not allowed. */
export function stepTransition(allowance: MotionAllowance, seconds = 0.5, delay = 0): Transition {
  return allowance.ambient
    ? { duration: seconds, delay, ease: EASE_OUT }
    : { duration: 0, delay: 0 };
}
