import {
  applyTimerCommand,
  createTimerSnapshot,
  elapsedFromSnapshot,
  type TimerCommand,
  type TimerSnapshot,
} from "../time";
import type { Slide } from "./deck";

/** Elapsed-based countdown state shaped like the shared timer snapshot. */
export type AutoAdvanceSnapshot = TimerSnapshot;

export type AutoAdvanceCommand = Extract<TimerCommand, "pause" | "resume">;

/** Live countdown for the current step, rendered by the footer and presenter window. */
export interface AutoAdvanceControls {
  /** Wall-clock snapshot the remaining time derives from. */
  snapshot: AutoAdvanceSnapshot;
  /** The step's full countdown in milliseconds. */
  totalMs: number;
  /** Pauses a running countdown and resumes a paused one. */
  onTogglePause: () => void;
  /** Prevents a remote control from changing the authoritative countdown while disconnected. */
  disabled?: boolean;
}

export function createAutoAdvanceSnapshot(now: number = Date.now()): AutoAdvanceSnapshot {
  return createTimerSnapshot(now);
}

/** Applies a pause/resume to a countdown; pause freezes elapsed time and resume continues it. */
export function applyAutoAdvanceCommand(
  snapshot: AutoAdvanceSnapshot,
  command: AutoAdvanceCommand,
  now: number,
): AutoAdvanceSnapshot {
  return applyTimerCommand(snapshot, command, now);
}

/**
 * Fresh snapshot for a newly current step: the landed step's countdown starts at its full
 * duration again. A paused deck stays paused, frozen at zero elapsed.
 */
export function restartAutoAdvance(
  snapshot: AutoAdvanceSnapshot,
  now: number,
): AutoAdvanceSnapshot {
  return snapshot.pausedElapsed === null
    ? createAutoAdvanceSnapshot(now)
    : { startedAt: now, pausedElapsed: 0 };
}

/** Remaining milliseconds of a step's countdown at the given wall-clock time, never below zero. */
export function remainingMs(snapshot: AutoAdvanceSnapshot, totalMs: number, now: number): number {
  return Math.max(0, totalMs - elapsedFromSnapshot(snapshot, now));
}

/** Milliseconds until the countdown expires, or null when it has already fully elapsed. */
export function expiryDelayMs(
  snapshot: AutoAdvanceSnapshot,
  totalMs: number,
  now: number,
): number | null {
  const remaining = totalMs - elapsedFromSnapshot(snapshot, now);
  return remaining <= 0 ? null : remaining;
}

/** The step's auto-advance duration in milliseconds, or null when the step does not auto-advance. */
export function stepAutoAdvanceMs(slide: Slide, step: number): number | null {
  const seconds = slide.autoAdvance?.[step - 1];
  return seconds === undefined ? null : seconds * 1000;
}
