import { describe, expect, it } from "vitest";
import { applyTimerCommand, createTimerSnapshot, elapsedFromSnapshot } from "../../core/time";

describe("session timer state machine", () => {
  it("counts elapsed time from the snapshot's start while running", () => {
    const timer = createTimerSnapshot(100_000);
    expect(timer).toEqual({ startedAt: 100_000, pausedElapsed: null });
    expect(elapsedFromSnapshot(timer, 160_000)).toBe(60_000);
  });

  it("pauses by freezing the elapsed time", () => {
    const paused = applyTimerCommand(createTimerSnapshot(100_000), "pause", 160_000);
    expect(paused).toEqual({ startedAt: 100_000, pausedElapsed: 60_000 });
    expect(elapsedFromSnapshot(paused, 400_000)).toBe(60_000);
  });

  it("resumes from the frozen elapsed time, excluding the paused interval", () => {
    const paused = applyTimerCommand(createTimerSnapshot(100_000), "pause", 160_000);
    const resumed = applyTimerCommand(paused, "resume", 300_000);
    expect(resumed).toEqual({ startedAt: 240_000, pausedElapsed: null });
    expect(elapsedFromSnapshot(resumed, 301_000)).toBe(61_000);
  });

  it("resets to zero as of the reset, clearing any pause", () => {
    const paused = applyTimerCommand(createTimerSnapshot(100_000), "pause", 160_000);
    expect(applyTimerCommand(paused, "reset", 500_000)).toEqual(createTimerSnapshot(500_000));
    expect(applyTimerCommand(createTimerSnapshot(100_000), "reset", 500_000)).toEqual(
      createTimerSnapshot(500_000),
    );
  });

  it("ignores pause while paused and resume while running", () => {
    const running = createTimerSnapshot(100_000);
    expect(applyTimerCommand(running, "resume", 200_000)).toBe(running);
    const paused = applyTimerCommand(running, "pause", 160_000);
    expect(applyTimerCommand(paused, "pause", 200_000)).toBe(paused);
  });
});
