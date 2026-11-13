import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Deck } from "../player/deck";
import { nextStepPosition, type Position } from "../player/navigation";
import { SLIDE_AREA_HEIGHT, STAGE_WIDTH } from "../player/Stage";
import type { PresentationTemplate } from "../template/contract";
import { SlidePreview } from "./SlidePreview";

/** The next preview's width, and height, as a share of the current one. */
const NEXT_SIZE_RATIO = 0.8;

interface PreviewColumn {
  /** Content width of the preview column. */
  width: number;
  /** Content height of the preview column. */
  height: number;
  currentLabelHeight: number;
  nextLabelHeight: number;
  /** Row gap between the four stacked children (label, preview, label, preview). */
  gap: number;
}

/**
 * Widths for the preview pair, sized as one unit so the next preview is always
 * `NEXT_SIZE_RATIO` of the current one with both borders fitting the column: the measured
 * height bounds the pair first, and the column width bounds it proportionally second.
 */
export function previewWidths({
  width,
  height,
  currentLabelHeight,
  nextLabelHeight,
  gap,
}: PreviewColumn): { current: number; next: number } {
  const aspect = STAGE_WIDTH / SLIDE_AREA_HEIGHT;
  const labelHeight = currentLabelHeight + nextLabelHeight;
  const availableHeight = Math.max(height - labelHeight - gap * 3, 0);
  const current = Math.min(width, (availableHeight / (1 + NEXT_SIZE_RATIO)) * aspect);
  return { current, next: current * NEXT_SIZE_RATIO };
}

interface PresenterPreviewsProps {
  deck: Deck;
  position: Position;
  template?: PresentationTemplate;
}

/** Current and next static slide previews for the presenter window. */
export function PresenterPreviews({ deck, position, template }: PresenterPreviewsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const nowLabelRef = useRef<HTMLParagraphElement>(null);
  const nextLabelRef = useRef<HTMLParagraphElement>(null);
  const [widths, setWidths] = useState({ current: 0, next: 0 });

  const stepCounts = useMemo(() => deck.slides.map((slide) => slide.steps), [deck]);
  const upcoming = nextStepPosition(stepCounts, position);
  const slide = deck.slides[position.slide - 1];
  const upcomingSlide = upcoming ? deck.slides[upcoming.slide - 1] : null;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const nowLabel = nowLabelRef.current;
    const nextLabel = nextLabelRef.current;
    if (!section || !nowLabel || !nextLabel) return;
    const measure = () => {
      const rect = section.getBoundingClientRect();
      const gap = Number.parseFloat(getComputedStyle(section).rowGap) || 0;
      const measured = previewWidths({
        width: rect.width,
        height: rect.height,
        currentLabelHeight: nowLabel.getBoundingClientRect().height,
        nextLabelHeight: nextLabel.getBoundingClientRect().height,
        gap,
      });
      setWidths((previous) =>
        previous.current === measured.current && previous.next === measured.next
          ? previous
          : measured,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(nowLabel);
    observer.observe(nextLabel);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-label="Slide previews" className="flex min-h-0 flex-col gap-4">
      <p
        ref={nowLabelRef}
        className="text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase"
      >
        Now
      </p>
      <div style={{ width: widths.current }}>
        <SlidePreview
          key={`current:${position.slide}:${position.step}`}
          slide={slide}
          step={position.step}
          label={`Current: slide ${position.slide}, step ${position.step}`}
          template={template}
        />
      </div>
      <p
        ref={nextLabelRef}
        className="text-[15px] font-bold tracking-[0.18em] text-presenter-muted uppercase"
      >
        Next
      </p>
      <div style={{ width: widths.next }}>
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
