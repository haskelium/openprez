/** Wall-clock snapshot shared by the session timer and step countdown. */
export interface TimerSnapshot {
  /** Wall-clock ms when the running period started (equals now - elapsed while running). */
  startedAt: number;
  /** Frozen elapsed ms while paused, or null while running. */
  pausedElapsed: number | null;
}

export type TimerCommand = "reset" | "pause" | "resume";

/** Fresh timer snapshot that starts counting from `now`. */
export function createTimerSnapshot(now: number = Date.now()): TimerSnapshot {
  return { startedAt: now, pausedElapsed: null };
}

/** Elapsed ms of a snapshot at a given wall-clock time; frozen while paused. */
export function elapsedFromSnapshot(timer: TimerSnapshot, now: number): number {
  return timer.pausedElapsed ?? now - timer.startedAt;
}

/** Reset, pause or resume a timer snapshot without reading browser state. */
export function applyTimerCommand(
  timer: TimerSnapshot,
  command: TimerCommand,
  now: number,
): TimerSnapshot {
  switch (command) {
    case "reset":
      return createTimerSnapshot(now);
    case "pause":
      return timer.pausedElapsed === null
        ? { startedAt: timer.startedAt, pausedElapsed: now - timer.startedAt }
        : timer;
    case "resume":
      return timer.pausedElapsed === null
        ? timer
        : { startedAt: now - timer.pausedElapsed, pausedElapsed: null };
  }
}
