import { describe, expect, it } from "vitest";
import { commandForKey } from "../../../core/player/keyboard";

// commandForKey reads the DOM's Element global; node tests provide a stand-in for it.
class FakeElement {}
(globalThis as { Element?: unknown }).Element = FakeElement;

function keyOf(key: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    defaultPrevented: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    target: null,
    ...init,
  } as KeyboardEvent;
}

describe("keyboard mapping", () => {
  it("maps the navigation, notes and fullscreen keys", () => {
    expect(commandForKey(keyOf("ArrowRight"))).toBe("nextStep");
    expect(commandForKey(keyOf("ArrowLeft", { shiftKey: true }))).toBe("prevKeyFrame");
    expect(commandForKey(keyOf(" "))).toBe("nextStep");
    expect(commandForKey(keyOf("ArrowDown"))).toBe("nextSlide");
    expect(commandForKey(keyOf("Home"))).toBe("first");
    expect(commandForKey(keyOf("n"))).toBe("notes");
    expect(commandForKey(keyOf("F"))).toBe("fullscreen");
  });

  it("maps P to the auto-advance pause toggle", () => {
    expect(commandForKey(keyOf("p"))).toBe("autoAdvancePause");
    expect(commandForKey(keyOf("P"))).toBe("autoAdvancePause");
  });

  it("ignores modified keys and unknown keys", () => {
    expect(commandForKey(keyOf("p", { ctrlKey: true }))).toBeNull();
    expect(commandForKey(keyOf("p", { metaKey: true }))).toBeNull();
    expect(commandForKey(keyOf("p", { altKey: true }))).toBeNull();
    expect(commandForKey(keyOf("x"))).toBeNull();
    expect(commandForKey(keyOf("p", { defaultPrevented: true }))).toBeNull();
  });
});
