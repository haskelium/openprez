import { useState } from "react";

export interface SlideTransition {
  /** The slide the transition state describes. */
  slide: number;
  /** Direction of the last slide change, so enter/exit animations move the right way. */
  direction: 1 | -1;
  /** False until the first slide change: the opening slide appears without a transition. */
  hasChangedSlide: boolean;
}

/** The transition state after moving to `slide`; unchanged when the slide is the same. */
export function nextSlideTransition(previous: SlideTransition, slide: number): SlideTransition {
  if (slide === previous.slide) return previous;
  return { slide, direction: slide > previous.slide ? 1 : -1, hasChangedSlide: true };
}

/** Derive slide-change animation state from the current slide number. */
export function useSlideTransition(slide: number): SlideTransition {
  const [transition, setTransition] = useState<SlideTransition>({
    slide,
    direction: 1,
    hasChangedSlide: false,
  });
  const next = nextSlideTransition(transition, slide);
  // React's derived-state pattern: storing during render re-renders before committing.
  if (next !== transition) setTransition(next);
  return next;
}
