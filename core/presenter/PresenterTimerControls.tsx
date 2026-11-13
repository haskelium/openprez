import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import type { TimerCommand } from "../time";
import { formatElapsed } from "./timeFormat";

interface PresenterTimerControlsProps {
  /** Elapsed main-session time, or null before the first synchronized snapshot. */
  elapsed: number | null;
  paused: boolean;
  /** Remote timer commands are only available while synchronized. */
  enabled: boolean;
  onTimerCommand: (command: TimerCommand) => void;
}

const CONTROL_CLASS =
  "flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-presenter-control focus-visible:outline-2 focus-visible:outline-presenter-text disabled:cursor-not-allowed disabled:opacity-50";

/** Main-session elapsed time with its synchronized reset/pause/resume controls. */
export function PresenterTimerControls({
  elapsed,
  paused,
  enabled,
  onTimerCommand,
}: PresenterTimerControlsProps) {
  const pauseLabel = paused ? "Resume timer" : "Pause timer";
  return (
    <div className="flex items-center gap-3 rounded-full bg-presenter-surface py-1.5 pr-1.5 pl-4 ring-1 ring-presenter-border">
      <Timer aria-hidden="true" className="size-5" />
      <span
        data-presenter-timer
        data-presenter-timer-paused={paused || undefined}
        className={`font-bold tabular-nums ${paused || elapsed === null ? "text-presenter-muted" : ""}`}
      >
        <span className="sr-only">Elapsed time{paused ? " (paused) " : " "}</span>
        {elapsed === null ? "--:--" : formatElapsed(elapsed)}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={pauseLabel}
          title={pauseLabel}
          aria-pressed={paused || undefined}
          disabled={!enabled}
          onClick={() => onTimerCommand(paused ? "resume" : "pause")}
          className={CONTROL_CLASS}
        >
          {paused ? (
            <Play aria-hidden="true" className="size-5" />
          ) : (
            <Pause aria-hidden="true" className="size-5" />
          )}
        </button>
        <button
          type="button"
          aria-label="Reset timer"
          title="Reset timer"
          disabled={!enabled}
          onClick={() => onTimerCommand("reset")}
          className={CONTROL_CLASS}
        >
          <RotateCcw aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
