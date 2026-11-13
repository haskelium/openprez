import type { RefObject } from "react";
import type { PresentationTemplate } from "../template/contract";
import { toneStyleVariables } from "../template/style";
import type { Slide } from "./deck";
import { ExportModeContext } from "./export-context";
import {
  FOOTER_HEIGHT,
  SLIDE_AREA_HEIGHT,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  StageScaleContext,
} from "./Stage";
import { StepContext } from "./step-context";

export interface ExportStageProps {
  slide: Slide;
  step: number;
  date: Date;
  copyrightNotice?: string;
  page: number;
  total: number;
  template: PresentationTemplate;
  captureRef: RefObject<HTMLDivElement | null>;
}

export function ExportStage({
  captureRef,
  slide,
  step,
  date,
  copyrightNotice,
  page,
  total,
  template,
}: ExportStageProps) {
  const slideProps = { step, steps: slide.steps };

  return (
    <div
      data-export-host
      aria-hidden="true"
      inert
      style={{
        position: "fixed",
        left: -STAGE_WIDTH,
        top: 0,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        pointerEvents: "none",
      }}
    >
      <div
        data-stage
        data-exporting
        data-export-capture
        ref={captureRef}
        data-tone={slide.tone}
        className="flex shrink-0 flex-col overflow-hidden bg-surface text-on-surface"
        style={{
          ...toneStyleVariables(template, slide.tone),
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
        }}
      >
        <StageScaleContext.Provider value={1}>
          <div
            data-slide-area
            data-slide={slide.id}
            className="relative overflow-hidden"
            style={{ height: SLIDE_AREA_HEIGHT, contain: "layout paint" }}
          >
            <ExportModeContext.Provider value>
              <StepContext.Provider value={slideProps}>
                <slide.Component step={step} steps={slide.steps} />
              </StepContext.Provider>
            </ExportModeContext.Provider>
          </div>
          <ExportModeContext.Provider value>
            <div data-footer-area style={{ height: FOOTER_HEIGHT }}>
              <template.ExportFooter
                date={date}
                copyrightNotice={copyrightNotice}
                page={page}
                total={total}
                Brand={template.FooterBrand}
              />
            </div>
          </ExportModeContext.Provider>
        </StageScaleContext.Provider>
      </div>
    </div>
  );
}
