// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { InteractiveSlide } from "./InteractiveSlide";

/** The player's touch-swipe opt-out: gestures starting inside it never navigate. */
const SWIPE_IGNORE = "[data-swipe-ignore]";

function touchDown(target: Element): Event {
  const event = new Event("pointerdown", { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: 1 },
    pointerType: { value: "touch" },
    clientX: { value: 100 },
    clientY: { value: 100 },
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

beforeAll(() => {
  // jsdom implements no pointer capture; the slide's drag handlers call it.
  Element.prototype.setPointerCapture ??= () => undefined;
  Element.prototype.releasePointerCapture ??= () => undefined;
  Element.prototype.hasPointerCapture ??= () => false;
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "fonts");
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

describe("interactive physics slide font geometry", () => {
  it("waits for font readiness before measuring and placing words", async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: fontsReady },
    });
    Element.prototype.getBoundingClientRect = function () {
      const width = this.textContent?.length ? this.textContent.length * 10 : 0;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 20,
        width,
        height: 20,
        toJSON: () => ({}),
      } as DOMRect;
    };

    const { container } = render(<InteractiveSlide />);
    const word = screen.getByText("JavaScript");
    expect(word.className).toContain("invisible");
    expect(word.style.transform).toBe("");

    await act(async () => {
      resolveFonts();
      await fontsReady;
    });

    expect(word.className).toContain("visible");
    expect(word.style.transform).toBe("translate(168px, 96px) rotate(0deg)");
    expect(container.querySelector("[data-swipe-ignore]")).not.toBeNull();
  });

  it("measures the rendered local fallback when a font face is unavailable", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve(), check: () => false },
    });
    Element.prototype.getBoundingClientRect = function () {
      const width = this.textContent?.length ? this.textContent.length * 12 : 0;
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 24,
        width,
        height: 24,
        toJSON: () => ({}),
      } as DOMRect;
    };

    const { container } = render(<InteractiveSlide />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("JavaScript").style.transform).toBe(
      "translate(172px, 96px) rotate(0deg)",
    );
    expect(container.querySelector("[data-swipe-ignore]")).not.toBeNull();
  });

  it("does not initialize after font readiness resolves for an unmounted slide", async () => {
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: fontsReady },
    });
    const { unmount } = render(<InteractiveSlide />);
    unmount();

    await act(async () => {
      resolveFonts();
      await fontsReady;
    });
  });
});

describe("interactive physics slide touch ownership", () => {
  it("opts every draggable piece and its nested content out of swipe navigation", () => {
    const { container } = render(<InteractiveSlide />);
    const arena = container.firstElementChild as HTMLElement;
    const pieces = [...arena.children].filter((child) => child.className.includes("cursor-grab"));

    expect(pieces.length).toBeGreaterThan(4);
    for (const piece of pieces) {
      expect(piece.matches(SWIPE_IGNORE)).toBe(true);
      for (const descendant of piece.querySelectorAll("*")) {
        expect(descendant.closest(SWIPE_IGNORE)).toBe(piece);
      }
    }
    expect(container.querySelector("rect")?.closest(SWIPE_IGNORE)).not.toBeNull();
    expect(container.querySelector("time")?.closest(SWIPE_IGNORE)).not.toBeNull();
  });

  it("claims touches on pieces and nested content, but leaves the background to the player", () => {
    const { container } = render(<InteractiveSlide />);
    const arena = container.firstElementChild as HTMLElement;
    const word = screen.getByText("JavaScript");
    const bar = container.querySelector("rect") as Element;

    expect(touchDown(word).defaultPrevented).toBe(true);
    expect(touchDown(bar).defaultPrevented).toBe(true);

    expect(arena.closest(SWIPE_IGNORE)).toBeNull();
    expect(touchDown(arena).defaultPrevented).toBe(false);
  });
});
