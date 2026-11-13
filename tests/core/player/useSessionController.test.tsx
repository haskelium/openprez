// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { useSessionController } from "../../../core/player/useSessionController";

const Component = () => null;
const deck = defineDeck({
  title: "Session controller",
  slides: [
    defineSlide({ id: "first", steps: 2, autoAdvance: [1, 2], Component }),
    defineSlide({ id: "last", steps: 1, autoAdvance: [1], Component }),
  ],
});
const MAX_TIMEOUT_MS = 2_147_483_647;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("main session controller", () => {
  it("advances from one step deadline and restarts the landed step's countdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const { result } = renderHook(() => useSessionController(deck.slides, { slide: 1, step: 1 }));

    act(() => vi.advanceTimersByTime(999));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 1 });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 2 });
    expect(result.current.snapshot.autoAdvance).toEqual({ startedAt: 2_000, pausedElapsed: null });

    act(() => vi.advanceTimersByTime(1_999));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 2 });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.snapshot.position).toEqual({ slide: 2, step: 1 });
    expect(result.current.snapshot.autoAdvance.startedAt).toBe(4_000);
  });

  it("keeps navigation paused until explicitly resumed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const { result } = renderHook(() => useSessionController(deck.slides, { slide: 1, step: 1 }));

    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.toggleAutoAdvancePause());
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 1 });

    act(() => result.current.dispatchNavigation({ type: "nextStep" }));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 2 });
    expect(result.current.snapshot.autoAdvance.pausedElapsed).toBe(0);
    act(() => result.current.toggleAutoAdvancePause());
    act(() => vi.advanceTimersByTime(1_999));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 2 });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.snapshot.position).toEqual({ slide: 2, step: 1 });
  });

  it("chunks delays beyond the browser timer limit without advancing early", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const longDeck = defineDeck({
      title: "Long countdown",
      slides: [
        defineSlide({
          id: "long",
          steps: 2,
          autoAdvance: [(MAX_TIMEOUT_MS + 5_000) / 1_000, 1],
          Component,
        }),
      ],
    });
    const { result } = renderHook(() =>
      useSessionController(longDeck.slides, { slide: 1, step: 1 }),
    );

    act(() => vi.advanceTimersByTime(MAX_TIMEOUT_MS));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 1 });
    act(() => vi.advanceTimersByTime(4_999));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 1 });
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.snapshot.position).toEqual({ slide: 1, step: 2 });
  });

  it("does not schedule countdown expiry at the final step", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const { result } = renderHook(() => useSessionController(deck.slides, { slide: 2, step: 1 }));

    expect(result.current.autoAdvance).toBeNull();
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.snapshot.position).toEqual({ slide: 2, step: 1 });
  });
});
