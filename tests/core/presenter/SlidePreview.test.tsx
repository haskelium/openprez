// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SlideProps } from "../../../core/player/deck";
import { defineSlide } from "../../../core/player/deck";
import { useExportMode } from "../../../core/player/export-context";
import { SlidePreview } from "../../../core/presenter/SlidePreview";

const PreviewSlide = ({ step, steps }: SlideProps) => {
  const exportMode = useExportMode();
  return <button type="button">{`${step}/${steps}/${exportMode ? "settled" : "live"}`}</button>;
};
const slide = defineSlide({ id: "preview", steps: 3, Component: PreviewSlide });

class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [{ target, contentRect: { width: 480 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve(): void {}
  disconnect(): void {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("static presenter slide preview", () => {
  it("renders the requested settled step inside an inert, inaccessible thumbnail", () => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    const { container } = render(
      <SlidePreview slide={slide} step={2} label="Current slide preview" />,
    );

    const preview = container.querySelector<HTMLElement>('[data-slide-preview="preview"]');
    expect(screen.getByRole("img", { name: "Current slide preview" })).toBeTruthy();
    expect(preview).not.toBeNull();
    expect(preview?.hasAttribute("inert")).toBe(true);
    expect(preview?.getAttribute("aria-hidden")).toBe("true");
    expect(preview?.classList.contains("pointer-events-none")).toBe(true);
    expect(preview?.textContent).toBe("2/3/settled");
  });
});
