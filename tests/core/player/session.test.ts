import { describe, expect, it } from "vitest";
import { applyAutoAdvanceCommand } from "../../../core/player/autoAdvance";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import {
  createSessionSnapshot,
  type DeckShape,
  type SessionCommand,
  type SessionSnapshot,
  transitionSession,
} from "../../../core/player/session";
import { applyTimerCommand } from "../../../core/time";

const Component = () => null;
const deck = defineDeck({
  title: "Session transitions",
  slides: [
    defineSlide({ id: "first", steps: 2, autoAdvance: [1, 2], Component }),
    defineSlide({ id: "last", steps: 1, autoAdvance: [3], Component }),
  ],
});
const shape: DeckShape = {
  stepCounts: deck.slides.map((slide) => slide.steps),
  keyFrames: deck.slides.map((slide) => slide.keyFrames),
};

function transition(snapshot: SessionSnapshot, command: SessionCommand, now: number) {
  return transitionSession(snapshot, command, now, shape);
}

describe("authoritative session transition", () => {
  it("starts timer snapshots from one captured instant", () => {
    expect(createSessionSnapshot({ slide: 1, step: 1 }, 1_000)).toEqual({
      position: { slide: 1, step: 1 },
      timer: { startedAt: 1_000, pausedElapsed: null },
      autoAdvance: { startedAt: 1_000, pausedElapsed: null },
    });
  });

  it("updates navigation and countdown together while leaving the session timer untouched", () => {
    const initial = createSessionSnapshot({ slide: 1, step: 1 }, 1_000);
    const next = transition(initial, { type: "navigation", action: { type: "nextStep" } }, 2_000);

    expect(next.position).toEqual({ slide: 1, step: 2 });
    expect(next.autoAdvance).toEqual({ startedAt: 2_000, pausedElapsed: null });
    expect(next.timer).toBe(initial.timer);
  });

  it("preserves countdown pause across navigation and resets the landed step to full time", () => {
    const initial = createSessionSnapshot({ slide: 1, step: 1 }, 1_000);
    const state = {
      ...initial,
      autoAdvance: applyAutoAdvanceCommand(initial.autoAdvance, "pause", 1_400),
    };
    const next = transition(state, { type: "navigation", action: { type: "nextSlide" } }, 5_000);

    expect(next.position).toEqual({ slide: 2, step: 1 });
    expect(next.autoAdvance).toEqual({ startedAt: 5_000, pausedElapsed: 0 });
  });

  it("resolves a countdown toggle against the authoritative state", () => {
    const running = createSessionSnapshot({ slide: 1, step: 1 }, 1_000);
    const paused = transition(running, { type: "autoAdvance", command: "toggle" }, 1_500);
    expect(paused.autoAdvance).toEqual({ startedAt: 1_000, pausedElapsed: 500 });
    const resumed = transition(paused, { type: "autoAdvance", command: "toggle" }, 9_000);
    expect(resumed.autoAdvance).toEqual({ startedAt: 8_500, pausedElapsed: null });
  });

  it("applies timer resets without changing position or the step countdown", () => {
    const initial = createSessionSnapshot({ slide: 1, step: 2 }, 1_000);
    const state = { ...initial, timer: applyTimerCommand(initial.timer, "pause", 1_500) };
    const reset = transition(state, { type: "timer", command: "reset" }, 9_000);

    expect(reset.position).toBe(state.position);
    expect(reset.timer).toEqual({ startedAt: 9_000, pausedElapsed: null });
    expect(reset.autoAdvance).toBe(state.autoAdvance);
  });

  it("ignores stale expiry after navigation and does not advance past the deck's final step", () => {
    const initial = createSessionSnapshot({ slide: 1, step: 1 }, 1_000);
    const moved = transition(initial, { type: "navigation", action: { type: "nextStep" } }, 2_000);
    expect(
      transition(moved, { type: "autoAdvanceExpired", position: initial.position }, 3_000),
    ).toBe(moved);

    const final = createSessionSnapshot({ slide: 2, step: 1 }, 4_000);
    expect(transition(final, { type: "autoAdvanceExpired", position: final.position }, 7_000)).toBe(
      final,
    );
  });

  it("leaves the complete snapshot identical when navigation is unavailable", () => {
    const final = createSessionSnapshot({ slide: 2, step: 1 }, 4_000);
    expect(transition(final, { type: "navigation", action: { type: "nextStep" } }, 5_000)).toBe(
      final,
    );
  });
});
