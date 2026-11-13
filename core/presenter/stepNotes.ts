export interface StepNoteSegment {
  step: number | null;
  text: string;
  startOffset: number;
}

export interface ParsedStepNotes {
  segments: StepNoteSegment[];
  invalidMarkers: string[];
}

const STEP_MARKER_PREFIX = "[[step:";

export function parseStepNotes(notes: string, steps: number): ParsedStepNotes {
  const segments: StepNoteSegment[] = [];
  const invalidMarkers: string[] = [];
  let activeStep: number | null = null;
  let cursor = 0;

  const append = (text: string, startOffset: number) => {
    if (text.length > 0) segments.push({ step: activeStep, text, startOffset });
  };

  let markerIndex = notes.indexOf(STEP_MARKER_PREFIX, cursor);
  while (markerIndex !== -1) {
    const markerEnd = notes.indexOf("]]", markerIndex + STEP_MARKER_PREFIX.length);
    const nextMarkerIndex = notes.indexOf(
      STEP_MARKER_PREFIX,
      markerIndex + STEP_MARKER_PREFIX.length,
    );
    const nestedMarker =
      nextMarkerIndex !== -1 && (markerEnd === -1 || nextMarkerIndex < markerEnd);
    const markerValueStart = markerIndex + STEP_MARKER_PREFIX.length;
    const whitespaceOffset = notes.slice(markerValueStart).search(/\s/);
    const malformedEnd =
      whitespaceOffset === -1 ? notes.length : markerValueStart + whitespaceOffset;
    const tokenEnd = nestedMarker
      ? nextMarkerIndex
      : markerEnd === -1
        ? malformedEnd
        : markerEnd + 2;
    const marker = notes.slice(markerIndex, tokenEnd);
    const markerValue = notes.slice(
      markerValueStart,
      nestedMarker || markerEnd === -1 ? tokenEnd : markerEnd,
    );
    const step = /^\d+$/.test(markerValue) ? Number(markerValue) : Number.NaN;
    const isValid =
      !nestedMarker && markerEnd !== -1 && Number.isSafeInteger(step) && step > 0 && step <= steps;

    append(notes.slice(cursor, markerIndex), cursor);
    if (isValid) {
      activeStep = step;
    } else {
      invalidMarkers.push(marker);
      activeStep = null;
      append(marker, markerIndex);
    }
    cursor = tokenEnd;
    markerIndex = notes.indexOf(STEP_MARKER_PREFIX, cursor);
  }

  append(notes.slice(cursor), cursor);
  return { segments, invalidMarkers };
}

/** The pane scroll offset that brings a step's passage fully into view, aligning oversized ones at the top. */
export function scrollTargetForStep(
  scrollTop: number,
  maxScrollTop: number,
  viewportTop: number,
  viewportBottom: number,
  stepTop: number,
  stepBottom: number,
): number {
  const viewportHeight = viewportBottom - viewportTop;
  const stepHeight = stepBottom - stepTop;
  if (viewportHeight <= 0 || stepHeight <= 0) return scrollTop;

  const adjustment =
    stepHeight > viewportHeight || stepTop < viewportTop
      ? stepTop - viewportTop
      : stepBottom > viewportBottom
        ? stepBottom - viewportBottom
        : 0;
  return Math.max(0, Math.min(maxScrollTop, scrollTop + adjustment));
}
