import { describe, expect, it } from "vitest";
import {
  applyAutoAdvanceCommand,
  createAutoAdvanceSnapshot,
  expiryDelayMs,
  remainingMs,
  restartAutoAdvance,
  stepAutoAdvanceMs,
} from "../../../core/player/autoAdvance";
import { defineDeck, defineSlide, type Slide } from "../../../core/player/deck";

const Component = () => null;

function slideWith(autoAdvance: number | number[] | undefined, defaultAutoAdvance?: number): Slide {
  const [slide] = defineDeck({
    title: "Deck",
    defaultAutoAdvance,
    slides: [defineSlide({ id: "s", steps: 3, autoAdvance, Component })],
  }).slides;
  return slide;
}

describe("auto-advance countdown calculations", () => {
  it("counts remaining time down from the step's full duration", () => {
    const snapshot = createAutoAdvanceSnapshot(100_000);
    expect(remainingMs(snapshot, 10_000, 102_500)).toBe(7_500);
    expect(expiryDelayMs(snapshot, 10_000, 102_500)).toBe(7_500);
  });

  it("clamps remaining time at zero and reports expiry as null", () => {
    const snapshot = createAutoAdvanceSnapshot(100_000);
    expect(remainingMs(snapshot, 10_000, 200_000)).toBe(0);
    expect(expiryDelayMs(snapshot, 10_000, 110_000)).toBeNull();
    expect(expiryDelayMs(snapshot, 10_000, 109_999)).toBe(1);
  });

  it("freezes the remaining time while paused and continues from it on resume", () => {
    const running = createAutoAdvanceSnapshot(100_000);
    const paused = applyAutoAdvanceCommand(running, "pause", 104_000);
    expect(paused).toEqual({ startedAt: 100_000, pausedElapsed: 4_000 });
    expect(remainingMs(paused, 10_000, 500_000)).toBe(6_000);
    expect(expiryDelayMs(paused, 10_000, 500_000)).toBe(6_000);

    const resumed = applyAutoAdvanceCommand(paused, "resume", 300_000);
    expect(remainingMs(resumed, 10_000, 301_000)).toBe(5_000);
  });

  it("ignores pause while paused and resume while running", () => {
    const running = createAutoAdvanceSnapshot(100_000);
    expect(applyAutoAdvanceCommand(running, "resume", 200_000)).toBe(running);
    const paused = applyAutoAdvanceCommand(running, "pause", 160_000);
    expect(applyAutoAdvanceCommand(paused, "pause", 200_000)).toBe(paused);
  });
});

describe("countdown restart on navigation", () => {
  it("restarts a running countdown at the full duration of the landed step", () => {
    const restarted = restartAutoAdvance(createAutoAdvanceSnapshot(100_000), 500_000);
    expect(restarted).toEqual({ startedAt: 500_000, pausedElapsed: null });
    expect(remainingMs(restarted, 10_000, 502_000)).toBe(8_000);
  });

  it("keeps a paused deck paused, frozen at the full duration", () => {
    const paused = applyAutoAdvanceCommand(createAutoAdvanceSnapshot(100_000), "pause", 104_000);
    const restarted = restartAutoAdvance(paused, 500_000);
    expect(restarted).toEqual({ startedAt: 500_000, pausedElapsed: 0 });
    expect(remainingMs(restarted, 10_000, 900_000)).toBe(10_000);
  });
});

describe("per-step duration lookup", () => {
  it("returns the current step's duration in milliseconds", () => {
    expect(stepAutoAdvanceMs(slideWith([3]), 1)).toBe(3_000);
    expect(stepAutoAdvanceMs(slideWith([3]), 2)).toBeNull();
    expect(stepAutoAdvanceMs(slideWith([3]), 3)).toBeNull();
  });

  it("returns null for slides that never auto-advance", () => {
    expect(stepAutoAdvanceMs(slideWith(undefined), 1)).toBeNull();
    expect(stepAutoAdvanceMs(slideWith(undefined, 10), 2)).toBe(10_000);
  });
});
