import { useCallback, useEffect, useMemo, useState } from "react";
import { type AutoAdvanceControls, stepAutoAdvanceMs } from "../player/autoAdvance";
import type { NavigationControls } from "../player/controls";
import type { Deck } from "../player/deck";
import { commandForKey, toggleFullscreen } from "../player/keyboard";
import { availableActions, type NavigationAction, parseHash, toHash } from "../player/navigation";
import type { PresentationTemplate } from "../template/contract";
import { elapsedFromSnapshot, type TimerCommand } from "../time";
import { PresenterLayout } from "./PresenterLayout";
import { type PresenterConnectionState, usePresenterSession } from "./usePresenterSession";

interface PresenterViewProps {
  deck: Deck;
  sessionId: string;
  template?: PresentationTemplate;
}

const DISABLED_NAVIGATION: NavigationControls["can"] = {
  prevSlide: false,
  prevKeyFrame: false,
  prevStep: false,
  nextStep: false,
  nextKeyFrame: false,
  nextSlide: false,
};

function connectionMessage(state: PresenterConnectionState, hasSnapshot: boolean): string | null {
  switch (state) {
    case "connected":
      return null;
    case "connecting":
      return hasSnapshot
        ? "The connection was interrupted. Reconnecting; presenter controls are paused."
        : "Connecting to the presentation window. Presenter controls are paused.";
    case "disconnected":
      return "The presentation window is not responding. Presenter controls are paused until it reconnects.";
    case "unsupported":
      return "Synchronized presenter notes are unavailable in this browser.";
    case "ended":
      return "The presentation session has ended. Close this window.";
  }
}

/** The presenter window: displays snapshots from, and sends commands to, its main session. */
export function PresenterView({ deck, sessionId, template }: PresenterViewProps) {
  const stepCounts = useMemo(() => deck.slides.map((slide) => slide.steps), [deck]);
  const keyFrames = useMemo(() => deck.slides.map((slide) => slide.keyFrames), [deck]);
  const [initialPosition] = useState(() => parseHash(window.location.hash, stepCounts));
  const [now, setNow] = useState(() => new Date());
  const { connectionState, snapshot, sendCommand } = usePresenterSession(sessionId);
  const connected = connectionState === "connected";
  const position = snapshot?.position ?? initialPosition;
  const available = availableActions(stepCounts, position, keyFrames);

  const dispatch = useCallback(
    (action: NavigationAction) => sendCommand({ type: "navigation", action }),
    [sendCommand],
  );
  const onTimerCommand = useCallback(
    (command: TimerCommand) => sendCommand({ type: "timer", command }),
    [sendCommand],
  );
  const toggleAutoAdvancePause = useCallback(
    () => sendCommand({ type: "autoAdvance", command: "toggle" }),
    [sendCommand],
  );

  const durationMs = available.nextStep
    ? stepAutoAdvanceMs(deck.slides[position.slide - 1], position.step)
    : null;
  const countdown = snapshot?.autoAdvance ?? null;
  const autoAdvance = useMemo<AutoAdvanceControls | null>(
    () =>
      countdown === null || durationMs === null
        ? null
        : {
            snapshot: countdown,
            totalMs: durationMs,
            disabled: !connected,
            onTogglePause: toggleAutoAdvancePause,
          },
    [connected, countdown, durationMs, toggleAutoAdvancePause],
  );

  useEffect(() => {
    const hash = toHash(position);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", `${window.location.search}${hash}`);
    }
  }, [position]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = commandForKey(event);
      if (!command) return;
      event.preventDefault();
      if (command === "notes") window.close();
      else if (command === "fullscreen") toggleFullscreen();
      else if (command === "autoAdvancePause") toggleAutoAdvancePause();
      else dispatch({ type: command });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, toggleAutoAdvancePause]);

  return (
    <div className="fixed inset-0">
      <PresenterLayout
        deck={deck}
        position={position}
        elapsed={snapshot ? elapsedFromSnapshot(snapshot.timer, now.getTime()) : null}
        paused={snapshot !== null && snapshot.timer.pausedElapsed !== null}
        now={now}
        connected={connected}
        connectionMessage={connectionMessage(connectionState, snapshot !== null)}
        can={connected ? available : DISABLED_NAVIGATION}
        dispatch={dispatch}
        template={template}
        onTimerCommand={onTimerCommand}
        autoAdvance={autoAdvance}
      />
    </div>
  );
}
