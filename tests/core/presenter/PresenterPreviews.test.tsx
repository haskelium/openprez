// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { PresenterPreviews, previewWidths } from "../../../core/presenter/PresenterPreviews";

const Component = () => null;
const deck = defineDeck({
  title: "Deck",
  slides: [
    defineSlide({ id: "a", steps: 3, Component }),
    defineSlide({ id: "b", steps: 1, Component }),
  ],
});
const lastStep = { slide: 2, step: 1 };
const ASPECT = 1920 / 1016;

class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [{ target, contentRect: { width: 0 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("preview pair sizing", () => {
  it("bounds the pair by the available height on wide columns", () => {
    const { current, next } = previewWidths({
      width: 2000,
      height: 1000,
      currentLabelHeight: 20,
      nextLabelHeight: 20,
      gap: 16,
    });
    expect(current).toBeCloseTo(((1000 - 40 - 48) / 1.8) * ASPECT, 6);
    expect(next).toBeCloseTo(current * 0.8, 6);
    expect(next).toBeLessThan(current);
  });

  it("bounds the pair by the column width on wide-but-short windows, keeping the ratio", () => {
    const { current, next } = previewWidths({
      width: 500,
      height: 2000,
      currentLabelHeight: 20,
      nextLabelHeight: 20,
      gap: 16,
    });
    expect(current).toBe(500);
    expect(next).toBe(400);
    expect(next).toBeLessThan(current);
  });

  it("collapses to zero when no height remains below the labels", () => {
    const { current, next } = previewWidths({
      width: 500,
      height: 20,
      currentLabelHeight: 20,
      nextLabelHeight: 20,
      gap: 16,
    });
    expect(current).toBe(0);
    expect(next).toBe(0);
  });
});

describe("presenter preview areas", () => {
  beforeEach(() => {
    // jsdom has no layout; stub every measured box so the mount-time measure is deterministic.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const box =
        this instanceof HTMLElement && this.tagName === "SECTION" ? [1500, 1000] : [1500, 20];
      return { width: box[0], height: box[1] } as DOMRect;
    });
  });

  it("applies proportional measured widths so the next preview is smaller", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const { container } = render(
      <PresenterPreviews deck={deck} position={{ slide: 1, step: 2 }} />,
    );
    const section = container.querySelector<HTMLElement>('[aria-label="Slide previews"]');
    expect(section).toBeTruthy();
    const [, current, , next] = [...(section?.querySelectorAll<HTMLElement>(":scope > *") ?? [])];
    if (!current || !next) throw new Error("expected both preview areas to render");
    const currentWidth = parseFloat(current.style.width);
    const nextWidth = parseFloat(next.style.width);
    expect(currentWidth).toBeCloseTo(((1000 - 40) / 1.8) * ASPECT, 2);
    expect(nextWidth).toBeCloseTo(currentWidth * 0.8, 1);
    expect(nextWidth).toBeLessThan(currentWidth);
  });

  it("constrains the end-of-deck placeholder like the next preview", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const { container } = render(<PresenterPreviews deck={deck} position={lastStep} />);

    const section = container.querySelector<HTMLElement>('[aria-label="Slide previews"]');
    expect(section?.querySelector("[data-presenter-end]")).toBeTruthy();
  });
});
