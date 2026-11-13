// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoAdvanceIndicator } from "../../../core/components/AutoAdvanceIndicator";

const onTogglePause = () => undefined;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("auto-advance indicator", () => {
  it("renders nothing when the step does not auto-advance", () => {
    const markup = renderToStaticMarkup(createElement(AutoAdvanceIndicator, { autoAdvance: null }));
    expect(markup).toBe("");
  });

  it("shows a draining ring, a pause button and the remaining seconds while running", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 16, 9, 5, 0, 0));
    const startedAt = Date.now() - 2_500;

    const markup = renderToStaticMarkup(
      createElement(AutoAdvanceIndicator, {
        autoAdvance: {
          snapshot: { startedAt, pausedElapsed: null },
          totalMs: 10_000,
          onTogglePause,
        },
      }),
    );

    expect(markup).toContain("data-auto-advance");
    expect(markup).not.toContain("data-auto-advance-paused");
    expect(markup).toContain('aria-label="Pause auto-advance"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("8 seconds remaining");
    expect(markup).toContain(
      `stroke-dashoffset="${String(2 * Math.PI * 20 * (1 - 7_500 / 10_000))}"`,
    );
  });

  it("does not restart its interval for equivalent controls objects", () => {
    vi.useFakeTimers();
    const snapshot = { startedAt: Date.now(), pausedElapsed: null };
    const controls = { snapshot, totalMs: 10_000, onTogglePause };
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const view = render(createElement(AutoAdvanceIndicator, { autoAdvance: controls }));

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(250));
    view.rerender(
      createElement(AutoAdvanceIndicator, {
        autoAdvance: { snapshot, totalMs: 10_000, onTogglePause },
      }),
    );
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it("stops ticking while paused and corrects remaining time when the snapshot changes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const snapshot = { startedAt: 90_000, pausedElapsed: null };
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const view = render(
      createElement(AutoAdvanceIndicator, {
        autoAdvance: { snapshot, totalMs: 10_000, onTogglePause },
      }),
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1_000));
    view.rerender(
      createElement(AutoAdvanceIndicator, {
        autoAdvance: {
          snapshot: { startedAt: 101_000, pausedElapsed: 1_000 },
          totalMs: 10_000,
          onTogglePause,
        },
      }),
    );
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("9 seconds remaining")).toBeTruthy();

    act(() => vi.advanceTimersByTime(3_000));
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Resume auto-advance" }));
  });

  it("freezes the ring at the remaining time and offers resume while paused", () => {
    const markup = renderToStaticMarkup(
      createElement(AutoAdvanceIndicator, {
        autoAdvance: {
          snapshot: { startedAt: 0, pausedElapsed: 5_000 },
          totalMs: 10_000,
          onTogglePause,
        },
      }),
    );

    expect(markup).toContain('data-auto-advance-paused="true"');
    expect(markup).toContain('aria-label="Resume auto-advance"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("5 seconds remaining");
    expect(markup).toContain(
      `stroke-dashoffset="${String(2 * Math.PI * 20 * (1 - 5_000 / 10_000))}"`,
    );
  });
});
