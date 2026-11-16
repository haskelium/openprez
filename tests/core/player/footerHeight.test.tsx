// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { ExportStage } from "../../../core/player/ExportStage";
import { Player } from "../../../core/player/Player";
import { useSlideArea } from "../../../core/player/Stage";
import { testTemplate } from "../../support/testTemplate";

afterEach(() => {
  cleanup();
});

// jsdom has no layout engine or font loading; the stage only needs these APIs to exist.
if (typeof ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
if (typeof document.fonts === "undefined") {
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
}

function height(element: HTMLElement | null): string | null {
  return element ? (element.style.height ?? null) : null;
}

const deck = defineDeck({
  title: "Footer Height Deck",
  slides: [defineSlide({ id: "only", Component: () => <span>Slide</span> })],
});

describe("live stage split", () => {
  it("uses the 64px default split when the template declares no footer height", () => {
    const { container } = render(<Player deck={deck} template={testTemplate()} />);
    expect(height(container.querySelector("[data-footer-area]"))).toBe("64px");
    expect(height(container.querySelector("[data-slide-area]"))).toBe("1016px");
  });

  it("derives the split from a template-declared footer height", () => {
    const { container } = render(
      <Player deck={deck} template={testTemplate({ footerHeight: 120 })} />,
    );
    expect(height(container.querySelector("[data-footer-area]"))).toBe("120px");
    expect(height(container.querySelector("[data-slide-area]"))).toBe("960px");
  });
});

function SlideAreaReader() {
  const slideArea = useSlideArea();
  return <span data-slide-area-readout>{`${slideArea.width}x${slideArea.height}`}</span>;
}

const readerDeck = defineDeck({
  title: "Footer Height Reader Deck",
  slides: [defineSlide({ id: "reader", steps: 1, Component: SlideAreaReader })],
});

describe("export stage split", () => {
  it("matches the template's split and exposes the slide area to the slide", () => {
    const slide = readerDeck.slides[0];
    const { container } = render(
      <ExportStage
        slide={slide}
        step={1}
        date={new Date("2026-10-13T00:00:00Z")}
        page={1}
        total={1}
        template={testTemplate({ footerHeight: 120 })}
        captureRef={{ current: null }}
      />,
    );
    expect(height(container.querySelector("[data-footer-area]"))).toBe("120px");
    expect(height(container.querySelector("[data-slide-area]"))).toBe("960px");
    expect(container.querySelector("[data-slide-area-readout]")?.textContent ?? "").toBe(
      "1920x960",
    );
  });
});
