/** 1-based position in the deck. */
export interface Position {
  slide: number;
  step: number;
}

export type NavigationAction =
  | {
      type:
        | "nextStep"
        | "prevStep"
        | "nextSlide"
        | "prevSlide"
        | "nextKeyFrame"
        | "prevKeyFrame"
        | "first"
        | "last";
    }
  | { type: "goto"; position: Position };

type KeyFrameSteps = readonly (readonly number[])[];

function keyFramePositions(stepCounts: readonly number[], keyFrames?: KeyFrameSteps): Position[] {
  return stepCounts.flatMap((steps, index) =>
    (keyFrames?.[index] ?? [steps]).map((step) => ({ slide: index + 1, step })),
  );
}

/** Clamp an arbitrary position into the deck: an out-of-range slide lands on the first or last slide at step 1, an out-of-range step on that slide's first or last step. */
export function clampPosition(
  stepCounts: readonly number[],
  slide: number,
  step: number,
): Position {
  const last = stepCounts.length;
  if (!Number.isInteger(slide) || slide < 1) return { slide: 1, step: 1 };
  if (slide > last) return { slide: last, step: 1 };
  const steps = stepCounts[slide - 1];
  if (!Number.isInteger(step) || step < 1) return { slide, step: 1 };
  return { slide, step: Math.min(step, steps) };
}

export function navigate(
  stepCounts: readonly number[],
  position: Position,
  action: NavigationAction,
  keyFrames?: KeyFrameSteps,
): Position {
  const { slide, step } = position;
  const last = stepCounts.length;
  const stepsOf = (index: number) => stepCounts[index - 1];
  const frames = keyFramePositions(stepCounts, keyFrames);

  switch (action.type) {
    case "nextStep":
      if (step < stepsOf(slide)) return { slide, step: step + 1 };
      return slide < last ? { slide: slide + 1, step: 1 } : position;
    case "prevStep":
      if (step > 1) return { slide, step: step - 1 };
      return slide > 1 ? { slide: slide - 1, step: stepsOf(slide - 1) } : position;
    case "nextSlide":
      return slide < last ? { slide: slide + 1, step: 1 } : position;
    case "prevSlide":
      return slide > 1 ? { slide: slide - 1, step: 1 } : position;
    case "nextKeyFrame":
      return (
        frames.find(
          (frame) => frame.slide > slide || (frame.slide === slide && frame.step > step),
        ) ?? position
      );
    case "prevKeyFrame":
      return (
        frames
          .slice()
          .reverse()
          .find((frame) => frame.slide < slide || (frame.slide === slide && frame.step < step)) ??
        position
      );
    case "first":
      return { slide: 1, step: 1 };
    case "last":
      return { slide: last, step: 1 };
    case "goto":
      return clampPosition(stepCounts, action.position.slide, action.position.step);
  }
}

export function availableActions(
  stepCounts: readonly number[],
  { slide, step }: Position,
  keyFrames?: KeyFrameSteps,
) {
  const last = stepCounts.length;
  const frames = keyFramePositions(stepCounts, keyFrames);
  return {
    prevSlide: slide > 1,
    prevStep: slide > 1 || step > 1,
    nextStep: slide < last || step < stepCounts[slide - 1],
    nextSlide: slide < last,
    prevKeyFrame: frames.some(
      (frame) => frame.slide < slide || (frame.slide === slide && frame.step < step),
    ),
    nextKeyFrame: frames.some(
      (frame) => frame.slide > slide || (frame.slide === slide && frame.step > step),
    ),
  };
}

export function parseHash(hash: string, stepCounts: readonly number[]): Position {
  const match = /^#\/(\d+)(?:\/(\d+))?\/?$/.exec(hash);
  if (!match) return { slide: 1, step: 1 };
  return clampPosition(stepCounts, Number(match[1]), match[2] ? Number(match[2]) : 1);
}

export function toHash({ slide, step }: Position): string {
  return `#/${slide}/${step}`;
}

/** The position Next step would reach, or null at the end of the deck. */
export function nextStepPosition(
  stepCounts: readonly number[],
  position: Position,
): Position | null {
  const next = navigate(stepCounts, position, { type: "nextStep" });
  return next.slide === position.slide && next.step === position.step ? null : next;
}
