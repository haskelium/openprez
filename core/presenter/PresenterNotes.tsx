import { useEffect, useMemo, useRef } from "react";
import type { Slide } from "../player/deck";
import type { Position } from "../player/navigation";
import { parseStepNotes, scrollTargetForStep } from "./stepNotes";

interface PresenterNotesProps {
  slide: Slide;
  position: Position;
}

/** Renders complete notes, step markers and scrolls the current passage into view. */
export function PresenterNotes({ slide, position }: PresenterNotesProps) {
  const paneRef = useRef<HTMLElement>(null);
  const parsedNotes = useMemo(
    () => parseStepNotes(slide.notes ?? "", slide.steps),
    [slide.notes, slide.steps],
  );
  const hasNotes = parsedNotes.segments.some((segment) => segment.text.trim().length > 0);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || pane.dataset.slideId !== slide.id) return;
    if (!parsedNotes.segments.some((segment) => segment.step === position.step)) return;

    const activeSegments = pane.querySelectorAll<HTMLElement>(
      `[data-presenter-note-segment][data-step="${position.step}"]`,
    );
    const rects = Array.from(activeSegments).flatMap((segment) =>
      Array.from(segment.getClientRects()),
    );
    if (rects.length === 0) return;

    const paneRect = pane.getBoundingClientRect();
    const styles = window.getComputedStyle(pane);
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const viewportTop = paneRect.top + pane.clientTop + paddingTop;
    const viewportBottom = paneRect.top + pane.clientTop + pane.clientHeight - paddingBottom;
    const stepTop = Math.min(...rects.map((rect) => rect.top));
    const stepBottom = Math.max(...rects.map((rect) => rect.bottom));
    const target = scrollTargetForStep(
      pane.scrollTop,
      pane.scrollHeight - pane.clientHeight,
      viewportTop,
      viewportBottom,
      stepTop,
      stepBottom,
    );

    if (target !== pane.scrollTop) pane.scrollTop = target;
  }, [slide.id, position.step, parsedNotes]);

  return (
    <section
      ref={paneRef}
      aria-label="Speaker notes"
      data-slide-id={slide.id}
      className="min-h-0 overflow-auto rounded-xl bg-presenter-surface p-7 ring-1 ring-presenter-border"
    >
      {hasNotes ? (
        <>
          {parsedNotes.invalidMarkers.length > 0 && (
            <p
              role="alert"
              data-presenter-note-warning
              className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-[18px] font-bold text-amber-950 ring-2 ring-amber-400"
            >
              Invalid speaker-note step marker
              {parsedNotes.invalidMarkers.length === 1 ? "" : "s"}:{" "}
              {parsedNotes.invalidMarkers.join(", ")}. Use [[step:N]] with N from 1 to {slide.steps}
              .
            </p>
          )}
          <p data-presenter-notes className="text-[28px] leading-relaxed whitespace-pre-wrap">
            {parsedNotes.segments.map((segment) => {
              const state =
                segment.step === null
                  ? "unassociated"
                  : segment.step === position.step
                    ? "current"
                    : segment.step === position.step + 1 && segment.step <= slide.steps
                      ? "next"
                      : "other";
              const segmentClass =
                state === "current"
                  ? "box-decoration-clone rounded-sm bg-presenter-now-soft font-semibold text-presenter-text"
                  : state === "next"
                    ? "box-decoration-clone rounded-sm bg-presenter-next-soft text-presenter-text"
                    : "";
              const badgeClass =
                state === "current"
                  ? "bg-presenter-now text-presenter-ink"
                  : state === "next"
                    ? "bg-presenter-next text-presenter-ink"
                    : "bg-presenter-step text-presenter-ink";

              return (
                <span
                  key={segment.startOffset}
                  data-presenter-note-segment
                  data-step={segment.step ?? undefined}
                  data-step-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {segment.step !== null && (
                    <>
                      <span className="sr-only">
                        Step {segment.step}
                        {state === "current" ? ", current" : state === "next" ? ", next" : ""}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`mx-1 inline-flex min-w-8 items-center justify-center gap-1 rounded-full px-2 py-0.5 align-middle text-[16px] font-bold leading-tight ${badgeClass}`}
                      >
                        {segment.step}
                        {state === "current" && <span>NOW</span>}
                        {state === "next" && <span>NEXT</span>}
                      </span>
                    </>
                  )}
                  {/* The passage text alone carries the highlight; the badge keeps its pill look. */}
                  <span className={segmentClass}>{segment.text}</span>
                </span>
              );
            })}
          </p>
        </>
      ) : (
        <p data-presenter-notes className="text-[24px] text-presenter-muted italic">
          No speaker notes for this slide.
        </p>
      )}
    </section>
  );
}
