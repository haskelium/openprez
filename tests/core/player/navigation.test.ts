import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineSlide } from "../../../core/player/deck";
import { commandForKey } from "../../../core/player/keyboard";
import { availableActions, navigate, parseHash } from "../../../core/player/navigation";

const Component = () => null;
const stepCounts = [4, 3, 2];
const keyFrames = [[1, 4], [2, 3], [2]];

describe("slide key-frame declarations", () => {
  it("defaults to the final step and sorts declared frames", () => {
    expect(defineSlide({ id: "single", steps: 4, Component }).keyFrames).toEqual([4]);
    expect(
      defineSlide({ id: "multiple", steps: 4, keyFrames: [4, 1, 2], Component }).keyFrames,
    ).toEqual([1, 2, 4]);
  });

  it.each([
    { frames: [] },
    { frames: [1, 1] },
    { frames: [0] },
    { frames: [5] },
    { frames: [1.5] },
  ])("rejects invalid key frames $frames", ({ frames }) => {
    expect(() => defineSlide({ id: "invalid", steps: 4, keyFrames: frames, Component })).toThrow();
  });
});

describe("key-frame navigation", () => {
  it("skips to the nearest later and earlier frame, including adjacent slides", () => {
    expect(
      navigate(stepCounts, { slide: 1, step: 2 }, { type: "nextKeyFrame" }, keyFrames),
    ).toEqual({
      slide: 1,
      step: 4,
    });
    expect(
      navigate(stepCounts, { slide: 1, step: 4 }, { type: "nextKeyFrame" }, keyFrames),
    ).toEqual({
      slide: 2,
      step: 2,
    });
    expect(
      navigate(stepCounts, { slide: 2, step: 2 }, { type: "prevKeyFrame" }, keyFrames),
    ).toEqual({
      slide: 1,
      step: 4,
    });
  });

  it("keeps key-frame actions at the deck boundaries", () => {
    expect(
      navigate(stepCounts, { slide: 1, step: 1 }, { type: "prevKeyFrame" }, keyFrames),
    ).toEqual({
      slide: 1,
      step: 1,
    });
    expect(
      navigate(stepCounts, { slide: 3, step: 2 }, { type: "nextKeyFrame" }, keyFrames),
    ).toEqual({
      slide: 3,
      step: 2,
    });
  });

  it("preserves ordinary step navigation and clamps URL positions", () => {
    expect(navigate(stepCounts, { slide: 1, step: 4 }, { type: "nextStep" }, keyFrames)).toEqual({
      slide: 2,
      step: 1,
    });
    expect(parseHash("#/2/9", stepCounts)).toEqual({ slide: 2, step: 3 });
  });

  it("reports only actions that can move from the current position", () => {
    expect(availableActions(stepCounts, { slide: 1, step: 1 }, keyFrames)).toMatchObject({
      prevSlide: false,
      prevStep: false,
      prevKeyFrame: false,
      nextStep: true,
      nextKeyFrame: true,
    });
  });
});

class ElementStub {
  constructor(private readonly tagName: string) {}

  closest(selector: string) {
    return selector.includes(this.tagName) ? this : null;
  }
}

function keyEvent(key: string, target: EventTarget | null = null, shiftKey = false): KeyboardEvent {
  return {
    key,
    target,
    shiftKey,
    defaultPrevented: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
  } as KeyboardEvent;
}

describe("presentation keyboard mapping", () => {
  beforeEach(() => vi.stubGlobal("Element", ElementStub));
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["ArrowRight", false, "nextStep"],
    ["ArrowLeft", false, "prevStep"],
    ["ArrowDown", false, "nextSlide"],
    ["ArrowUp", false, "prevSlide"],
    ["ArrowRight", true, "nextKeyFrame"],
    ["ArrowLeft", true, "prevKeyFrame"],
    [" ", false, "nextStep"],
    ["Home", false, "first"],
    ["End", false, "last"],
    ["n", false, "notes"],
    ["N", true, "notes"],
  ] as const)("maps %s with shift=%s", (key, shiftKey, expected) => {
    expect(commandForKey(keyEvent(key, null, shiftKey))).toBe(expected);
  });

  it.each(["PageUp", "PageDown"])("ignores %s", (key) => {
    expect(commandForKey(keyEvent(key))).toBeNull();
  });

  it("leaves editable fields and focused buttons in control", () => {
    expect(
      commandForKey(keyEvent(" ", new ElementStub("input") as unknown as EventTarget)),
    ).toBeNull();
    expect(
      commandForKey(keyEvent("n", new ElementStub("input") as unknown as EventTarget)),
    ).toBeNull();
    expect(
      commandForKey(keyEvent("Enter", new ElementStub("button") as unknown as EventTarget)),
    ).toBeNull();
  });
});
