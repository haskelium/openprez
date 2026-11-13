import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { AutoAdvanceControls } from "../player/autoAdvance";
import { remainingMs } from "../player/autoAdvance";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SMOOTH_TICK_MS = 200;
const REDUCED_MOTION_TICK_MS = 1000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Circular countdown for the current step's auto-advance, with the pause/play toggle at its
 * center. Renders nothing when the step does not auto-advance. Colors follow the surrounding
 * text color, so it stays legible on every tone and in the presenter window.
 */
export function AutoAdvanceIndicator({ autoAdvance }: { autoAdvance: AutoAdvanceControls | null }) {
  const [now, setNow] = useState(() => Date.now());
  const hasCountdown = autoAdvance !== null;
  const snapshot = autoAdvance?.snapshot;
  const startedAt = snapshot?.startedAt;
  const pausedElapsed = snapshot?.pausedElapsed;
  const totalDurationMs = autoAdvance?.totalMs;
  const paused = pausedElapsed !== null && pausedElapsed !== undefined;

  // Tick only while running; fresh-but-equivalent control objects do not restart this interval.
  useEffect(() => {
    if (!hasCountdown || paused) return;
    // The ring sweeps with a short transition, or steps once per second under reduced motion.
    const tickMs = prefersReducedMotion() ? REDUCED_MOTION_TICK_MS : SMOOTH_TICK_MS;
    const interval = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(interval);
  }, [hasCountdown, paused]);

  // Wall-clock correction when a new step, pause or resume arrives (including after tab throttling).
  useEffect(() => {
    if (startedAt === undefined || totalDurationMs === undefined || pausedElapsed === undefined) {
      return;
    }
    setNow(Date.now());
  }, [startedAt, pausedElapsed, totalDurationMs]);

  if (!autoAdvance) return null;

  const { snapshot: currentSnapshot, totalMs, onTogglePause, disabled = false } = autoAdvance;
  const remaining = remainingMs(currentSnapshot, totalMs, now);
  const seconds = Math.ceil(remaining / 1000);
  const label = paused ? "Resume auto-advance" : "Pause auto-advance";

  return (
    <div
      data-auto-advance
      data-auto-advance-paused={paused || undefined}
      className="relative flex size-11 shrink-0 items-center justify-center"
    >
      <svg aria-hidden="true" viewBox="0 0 44 44" className="absolute inset-0 size-full -rotate-90">
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-current opacity-20"
        />
        <circle
          cx="22"
          cy="22"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - remaining / totalMs)}
          className="stroke-current transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <button
        type="button"
        aria-label={label}
        aria-pressed={paused}
        disabled={disabled}
        title={label}
        onClick={onTogglePause}
        // Keep focus off the button after a mouse click, so Space keeps meaning "Next step".
        onMouseDown={(event) => event.preventDefault()}
        className="group relative flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paused ? (
          <Play aria-hidden="true" className="size-5" strokeWidth={2.25} />
        ) : (
          <Pause aria-hidden="true" className="size-5" strokeWidth={2.25} />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-3 py-1.5 text-base text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {label}
        </span>
      </button>
      <span className="sr-only">
        {seconds} second{seconds === 1 ? "" : "s"} remaining
      </span>
    </div>
  );
}
