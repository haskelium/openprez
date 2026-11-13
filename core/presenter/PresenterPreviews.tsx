import { useMemo } from "react";
import type { Deck } from "../player/deck";
import { nextStepPosition, type Position } from "../player/navigation";
import type { PresentationTemplate } from "../template/contract";
import { SlidePreview } from "./SlidePreview";

interface PresenterPreviewsProps {
  deck: Deck;
  position: Position;
  template?: PresentationTemplate;
}

/** Current and next static slide previews for the presenter window. */
export function PresenterPreviews({ deck, position, template }: PresenterPreviewsProps) {
  const stepCounts = useMemo(() => deck.slides.map((slide) => slide.steps), [deck]);
  const upcoming = nextStepPosition(stepCounts, position);
  const slide = deck.slides[position.slide - 1];
  const upcomingSlide = upcoming ? deck.slides[upcoming.slide - 1] : null;

  return (
    <section aria-label="Slide previews" className="flex min-h-0 flex-col gap-4">
      <p className="text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase">Now</p>
      <SlidePreview
        key={`current:${position.slide}:${position.step}`}
        slide={slide}
        step={position.step}
        label={`Current: slide ${position.slide}, step ${position.step}`}
        template={template}
      />
      <p className="mt-2 text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase">
        Next
      </p>
      <div className="w-3/4">
        {upcoming && upcomingSlide ? (
          <SlidePreview
            key={`next:${upcoming.slide}:${upcoming.step}`}
            slide={upcomingSlide}
            step={upcoming.step}
            label={`Next: slide ${upcoming.slide}, step ${upcoming.step}`}
            template={template}
          />
        ) : (
          <div
            data-presenter-end
            className="flex aspect-[1920/1016] w-full items-center justify-center rounded-lg border-2 border-dashed border-presenter-border text-[22px] font-bold text-presenter-muted"
          >
            End of deck
          </div>
        )}
      </div>
    </section>
  );
}
