// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineSlide } from "../../../core/player/deck";
import { PresenterNotes } from "../../../core/presenter/PresenterNotes";

const slide = defineSlide({
  id: "notes",
  steps: 3,
  notes: "Opening. [[step:1]]First. [[step:2]]Current passage. [[step:3]]Later.",
  Component: () => null,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function MeasuredNotes() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const measuredPane = root.current?.querySelector<HTMLElement>("[data-slide-id='notes']");
    const activeSegment = root.current?.querySelector<HTMLElement>(
      '[data-presenter-note-segment][data-step="2"]',
    );
    if (!measuredPane || !activeSegment) throw new Error("Expected rendered note elements");
    Object.defineProperties(measuredPane, {
      clientHeight: { configurable: true, value: 100 },
      clientTop: { configurable: true, value: 0 },
      scrollHeight: { configurable: true, value: 600 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    vi.spyOn(measuredPane, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 100,
    } as DOMRect);
    vi.spyOn(activeSegment, "getClientRects").mockReturnValue([
      { top: 120, bottom: 150 } as DOMRect,
    ] as unknown as DOMRectList);
  }, []);
  return (
    <div ref={root}>
      <PresenterNotes slide={slide} position={{ slide: 1, step: 2 }} />
    </div>
  );
}

describe("presenter notes pane", () => {
  it("scrolls the active step into view while preserving full marked notes", () => {
    const { container } = render(<MeasuredNotes />);
    const pane = container.querySelector<HTMLElement>("[data-slide-id='notes']");
    if (!pane) throw new Error("Expected the rendered speaker notes pane");

    expect(pane.scrollTop).toBe(50);
    expect(container.textContent).toContain("Opening.");
    expect(container.textContent).toContain("Current passage.");
    expect(container.textContent).toContain("Later.");
  });
});
