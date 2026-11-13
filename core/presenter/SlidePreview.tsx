import { useLayoutEffect, useRef, useState } from "react";
import type { Slide } from "../player/deck";
import { ExportModeContext } from "../player/export-context";
import { SLIDE_AREA_HEIGHT, STAGE_WIDTH, StageScaleContext } from "../player/Stage";
import { StepContext } from "../player/step-context";
import type { PresentationTemplate } from "../template/contract";
import { toneStyleVariables } from "../template/style";

interface SlidePreviewProps {
  slide: Slide;
  step: number;
  /** Accessible name of the preview, for example "Current: slide 4, step 2". */
  label: string;
  /** When given, resolves the slide's tone surface pair from the template. */
  template?: PresentationTemplate;
}

/**
 * Static thumbnail of a slide's area at one build step: settled like a PDF page, scaled to the
 * available width, and inert so it never takes focus or input.
 */
export function SlidePreview({ slide, step, label, template }: SlidePreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      if (width > 0) setScale(width / STAGE_WIDTH);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      role="img"
      aria-label={label}
      data-tone={slide.tone}
      className="relative w-full overflow-hidden rounded-lg bg-surface font-sans text-on-surface ring-1 ring-presenter-border"
      style={{
        aspectRatio: `${STAGE_WIDTH} / ${SLIDE_AREA_HEIGHT}`,
        ...(template ? toneStyleVariables(template, slide.tone) : {}),
      }}
    >
      {scale > 0 && (
        <div
          inert
          aria-hidden="true"
          data-slide-preview={slide.id}
          className="pointer-events-none absolute top-0 left-0 overflow-hidden"
          style={{
            width: STAGE_WIDTH,
            height: SLIDE_AREA_HEIGHT,
            zoom: scale,
            contain: "layout paint",
          }}
        >
          <StageScaleContext.Provider value={scale}>
            <ExportModeContext.Provider value>
              <StepContext.Provider value={{ step, steps: slide.steps }}>
                <slide.Component step={step} steps={slide.steps} />
              </StepContext.Provider>
            </ExportModeContext.Provider>
          </StageScaleContext.Provider>
        </div>
      )}
    </div>
  );
}
