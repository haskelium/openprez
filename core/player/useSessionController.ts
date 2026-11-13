import { useCallback, useEffect, useMemo, useState } from "react";
import { type AutoAdvanceControls, expiryDelayMs, stepAutoAdvanceMs } from "./autoAdvance";
import type { Slide } from "./deck";
import { availableActions, type NavigationAction, type Position, parseHash } from "./navigation";
import {
  createSessionSnapshot,
  type DeckShape,
  type SessionCommand,
  type SessionSnapshot,
  transitionSession,
} from "./session";

// Browser timers clamp larger delays to a near-immediate timeout; long countdowns are chunked.
const MAX_TIMEOUT_MS = 2_147_483_647;

export interface SessionController {
  snapshot: SessionSnapshot;
  deck: DeckShape;
  /** Which navigation actions apply at the current position. */
  can: ReturnType<typeof availableActions>;
  /** The current step's countdown, or null when it does not auto-advance. */
  autoAdvance: AutoAdvanceControls | null;
  dispatchCommand: (command: SessionCommand) => void;
  dispatchNavigation: (action: NavigationAction) => void;
  toggleAutoAdvancePause: () => void;
}

/** Owns the main window's position, rehearsal timer and active step countdown. */
export function useSessionController(
  slides: readonly Slide[],
  initialPosition?: Position,
): SessionController {
  const deck = useMemo<DeckShape>(
    () => ({
      stepCounts: slides.map((slide) => slide.steps),
      keyFrames: slides.map((slide) => slide.keyFrames),
    }),
    [slides],
  );
  const [snapshot, setSnapshot] = useState(() =>
    createSessionSnapshot(
      initialPosition ?? parseHash(window.location.hash, deck.stepCounts),
      Date.now(),
    ),
  );

  const dispatchCommand = useCallback(
    (command: SessionCommand) => {
      // Captured once outside the updater, so a replayed updater yields the same state.
      const now = Date.now();
      setSnapshot((current) => transitionSession(current, command, now, deck));
    },
    [deck],
  );
  const dispatchNavigation = useCallback(
    (action: NavigationAction) => dispatchCommand({ type: "navigation", action }),
    [dispatchCommand],
  );
  const toggleAutoAdvancePause = useCallback(
    () => dispatchCommand({ type: "autoAdvance", command: "toggle" }),
    [dispatchCommand],
  );

  const { position, autoAdvance: countdown } = snapshot;
  const can = availableActions(deck.stepCounts, position, deck.keyFrames);
  const durationMs = can.nextStep
    ? stepAutoAdvanceMs(slides[position.slide - 1], position.step)
    : null;

  const autoAdvance = useMemo<AutoAdvanceControls | null>(
    () =>
      durationMs === null
        ? null
        : { snapshot: countdown, totalMs: durationMs, onTogglePause: toggleAutoAdvancePause },
    [countdown, durationMs, toggleAutoAdvancePause],
  );

  useEffect(() => {
    if (durationMs === null || countdown.pausedElapsed !== null) return;
    let timer: number | null = null;

    const scheduleExpiryCheck = () => {
      const delay = expiryDelayMs(countdown, durationMs, Date.now());
      if (delay === null) {
        dispatchCommand({ type: "autoAdvanceExpired", position });
        return;
      }
      timer = window.setTimeout(scheduleExpiryCheck, Math.min(delay, MAX_TIMEOUT_MS));
    };

    scheduleExpiryCheck();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [countdown, dispatchCommand, durationMs, position]);

  return {
    snapshot,
    deck,
    can,
    autoAdvance,
    dispatchCommand,
    dispatchNavigation,
    toggleAutoAdvancePause,
  };
}
