import {
  applyTimerCommand,
  createTimerSnapshot,
  type TimerCommand,
  type TimerSnapshot,
} from "../time";
import {
  type AutoAdvanceSnapshot,
  applyAutoAdvanceCommand,
  createAutoAdvanceSnapshot,
  restartAutoAdvance,
} from "./autoAdvance";
import { type NavigationAction, navigate, type Position } from "./navigation";

/** The main window's authoritative state, published in full to the presenter window. */
export interface SessionSnapshot {
  position: Position;
  timer: TimerSnapshot;
  autoAdvance: AutoAdvanceSnapshot;
}

/** The deck shape navigation needs, computed once per deck. */
export interface DeckShape {
  stepCounts: readonly number[];
  keyFrames: readonly (readonly number[])[];
}

/** "toggle" resolves against the authoritative state, so a stale view cannot pick the wrong way. */
export type AutoAdvanceSessionCommand = "pause" | "resume" | "toggle";

export type SessionCommand =
  | { type: "navigation"; action: NavigationAction }
  | { type: "timer"; command: TimerCommand }
  | { type: "autoAdvance"; command: AutoAdvanceSessionCommand }
  | { type: "autoAdvanceExpired"; position: Position };

/** Create a complete main-window session snapshot from one captured wall-clock instant. */
export function createSessionSnapshot(position: Position, now: number): SessionSnapshot {
  return {
    position,
    timer: createTimerSnapshot(now),
    autoAdvance: createAutoAdvanceSnapshot(now),
  };
}

/** Apply one accepted main-window command and keep position and countdown state coherent. */
export function transitionSession(
  current: SessionSnapshot,
  command: SessionCommand,
  now: number,
  deck: DeckShape,
): SessionSnapshot {
  switch (command.type) {
    case "navigation":
      return navigateSession(current, command.action, now, deck);
    case "timer": {
      const timer = applyTimerCommand(current.timer, command.command, now);
      return timer === current.timer ? current : { ...current, timer };
    }
    case "autoAdvance": {
      const paused = current.autoAdvance.pausedElapsed !== null;
      const resolved =
        command.command === "toggle" ? (paused ? "resume" : "pause") : command.command;
      const autoAdvance = applyAutoAdvanceCommand(current.autoAdvance, resolved, now);
      return autoAdvance === current.autoAdvance ? current : { ...current, autoAdvance };
    }
    case "autoAdvanceExpired":
      // An expiry scheduled for a step that is no longer current must not advance again.
      return samePosition(command.position, current.position)
        ? navigateSession(current, { type: "nextStep" }, now, deck)
        : current;
  }
}

function navigateSession(
  current: SessionSnapshot,
  action: NavigationAction,
  now: number,
  deck: DeckShape,
): SessionSnapshot {
  const position = navigate(deck.stepCounts, current.position, action, deck.keyFrames);
  if (samePosition(position, current.position)) return current;
  return { ...current, position, autoAdvance: restartAutoAdvance(current.autoAdvance, now) };
}

function samePosition(left: Position, right: Position): boolean {
  return left.slide === right.slide && left.step === right.step;
}
