import { describe, expect, it } from "vitest";
import {
  classifyGesture,
  classifyPinch,
  classifySwipe,
  type SwipeGesture,
  type SwipeTrack,
} from "../../../core/player/swipe";

function track(startX: number, startY: number, endX: number, endY: number): SwipeTrack {
  return { startX, startY, endX, endY };
}

function gesture(
  primary: SwipeTrack,
  pointerCount = 1,
  secondary: SwipeTrack | null = null,
): SwipeGesture {
  return { pointerCount, primary, secondary };
}

describe("touch swipe mapping", () => {
  it("maps one-finger horizontal and vertical swipes", () => {
    expect(classifySwipe(gesture(track(100, 100, 40, 105)))).toBe("nextStep");
    expect(classifySwipe(gesture(track(40, 100, 100, 95)))).toBe("prevStep");
    expect(classifySwipe(gesture(track(100, 100, 105, 40)))).toBe("nextSlide");
    expect(classifySwipe(gesture(track(100, 40, 95, 100)))).toBe("prevSlide");
  });

  describe("touch pinch mapping", () => {
    it("maps spreading fingers to entering fullscreen and closing fingers to exiting", () => {
      expect(classifyPinch(gesture(track(100, 100, 60, 100), 2, track(200, 100, 240, 100)))).toBe(
        "enterFullscreen",
      );
      expect(classifyPinch(gesture(track(60, 100, 100, 100), 2, track(240, 100, 200, 100)))).toBe(
        "exitFullscreen",
      );
    });

    it("does not treat small movements, one-finger gestures, or two-finger swipes as pinches", () => {
      expect(
        classifyPinch(gesture(track(100, 100, 80, 100), 2, track(200, 100, 220, 100))),
      ).toBeNull();
      expect(classifyPinch(gesture(track(100, 100, 40, 100)))).toBeNull();
      expect(
        classifyPinch(gesture(track(100, 100, 40, 100), 2, track(200, 100, 140, 100))),
      ).toBeNull();
    });
  });

  it("gives a qualifying pinch precedence over an aligned two-finger key-frame swipe", () => {
    const spreading = gesture(track(100, 100, -50, 100), 2, track(200, 100, 160, 100));
    expect(classifyPinch(spreading)).toBe("enterFullscreen");
    expect(classifySwipe(spreading)).toBe("nextKeyFrame");
    expect(classifyGesture(spreading)).toEqual({
      type: "fullscreen",
      direction: "enterFullscreen",
    });

    const closing = gesture(track(100, 100, 50, 100), 2, track(200, 100, 70, 100));
    expect(classifyPinch(closing)).toBe("exitFullscreen");
    expect(classifySwipe(closing)).toBe("nextKeyFrame");
    expect(classifyGesture(closing)).toEqual({ type: "fullscreen", direction: "exitFullscreen" });
  });

  it("maps two-finger horizontal swipes to key frames", () => {
    expect(classifySwipe(gesture(track(100, 100, 40, 100), 2, track(200, 100, 140, 100)))).toBe(
      "nextKeyFrame",
    );
    expect(classifySwipe(gesture(track(40, 100, 100, 100), 2, track(140, 100, 200, 100)))).toBe(
      "prevKeyFrame",
    );
  });

  it("ignores taps and movements below the minimum distance", () => {
    expect(classifySwipe(gesture(track(100, 100, 100, 100)))).toBeNull();
    expect(classifySwipe(gesture(track(100, 100, 61, 100)))).toBeNull();
  });

  it("ignores ambiguous diagonal movements", () => {
    expect(classifySwipe(gesture(track(100, 100, 40, 50)))).toBeNull();
  });

  it("uses the dominant axis when a diagonal drag is clearly directional", () => {
    expect(classifySwipe(gesture(track(100, 100, 40, 70)))).toBe("nextStep");
    expect(classifySwipe(gesture(track(100, 100, 70, 40)))).toBe("nextSlide");
  });

  it("requires both fingers to move horizontally in the same direction", () => {
    const primary = track(100, 100, 40, 100);
    expect(classifySwipe(gesture(primary, 2, track(200, 100, 140, 100)))).toBe("nextKeyFrame");
    expect(classifySwipe(gesture(primary, 2, track(200, 100, 200, 100)))).toBeNull();
    expect(classifySwipe(gesture(primary, 2, track(200, 100, 240, 100)))).toBeNull();
    expect(classifySwipe(gesture(primary, 2, track(200, 100, 165, 100)))).toBeNull();
  });

  it("does not map two-finger vertical or diagonally ambiguous swipes", () => {
    expect(
      classifySwipe(gesture(track(100, 100, 100, 40), 2, track(200, 100, 200, 40))),
    ).toBeNull();
    expect(
      classifySwipe(gesture(track(100, 100, 40, 100), 2, track(200, 100, 140, 50))),
    ).toBeNull();
  });

  it("ignores gestures with more than two fingers", () => {
    expect(
      classifySwipe(gesture(track(100, 100, 40, 100), 3, track(200, 100, 140, 100))),
    ).toBeNull();
  });
});
