import { useLayoutEffect, useRef, useState } from "react";
import type { Slide } from "../player/deck";
import { ExportModeContext } from "../player/export-context";
import { SlideAreaContext, STAGE_HEIGHT, STAGE_WIDTH, StageScaleContext } from "../player/Stage";
import { StepContext } from "../player/step-context";
import type { PresentationTemplate } from "../template/contract";
import { DEFAULT_FOOTER_HEIGHT, resolveFooterHeight } from "../template/footer-height";
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
  // A preview without a resolved template falls back to the default 64px-footer split.
  const footerHeight = template ? resolveFooterHeight(template) : DEFAULT_FOOTER_HEIGHT;
  const slideAreaHeight = STAGE_HEIGHT - footerHeight;

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
        aspectRatio: `${STAGE_WIDTH} / ${slideAreaHeight}`,
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
            height: slideAreaHeight,
            zoom: scale,
            contain: "layout paint",
          }}
        >
          <StageScaleContext.Provider value={scale}>
            <SlideAreaContext.Provider value={{ width: STAGE_WIDTH, height: slideAreaHeight }}>
              <ExportModeContext.Provider value>
                <StepContext.Provider value={{ step, steps: slide.steps }}>
                  <slide.Component step={step} steps={slide.steps} />
                </StepContext.Provider>
              </ExportModeContext.Provider>
            </SlideAreaContext.Provider>
          </StageScaleContext.Provider>
        </div>
      )}
    </div>
  );
}
