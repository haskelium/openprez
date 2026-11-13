import { describe, expect, it } from "vitest";
import { nextSlideTransition } from "../../../core/player/useSlideTransition";

describe("slide transition state", () => {
  const initial = { slide: 2, direction: 1 as const, hasChangedSlide: false };

  it("keeps the same state for step changes within a slide", () => {
    expect(nextSlideTransition(initial, 2)).toBe(initial);
  });

  it("records the direction of each slide change", () => {
    const forward = nextSlideTransition(initial, 3);
    expect(forward).toEqual({ slide: 3, direction: 1, hasChangedSlide: true });
    expect(nextSlideTransition(forward, 1)).toEqual({
      slide: 1,
      direction: -1,
      hasChangedSlide: true,
    });
  });
});
