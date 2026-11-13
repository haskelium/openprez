import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE_OUT } from "../components/motion";
import { usePresenterWindow } from "../presenter/usePresenterWindow";
import type { PresentationTemplate } from "../template/contract";
import { toneStyleVariables } from "../template/style";
import type { NavigationControls } from "./controls";
import { formatCopyrightNotice } from "./copyrightNotice";
import type { Deck } from "./deck";
import { ExportStage } from "./ExportStage";
import { commandForKey, toggleFullscreen } from "./keyboard";
import { parseHash, toHash } from "./navigation";
import { resolvePresentationDate } from "./presentationDate";
import { Stage } from "./Stage";
import { StepContext } from "./step-context";
import { useSwipeNavigation } from "./swipe";
import { usePdfExport } from "./usePdfExport";
import { useSessionController } from "./useSessionController";
import { useSlideTransition } from "./useSlideTransition";

declare const __OPENPREZ_EXPORT_DATE__: string;

interface PlayerProps {
  deck: Deck;
  template: PresentationTemplate;
}

export function Player({ deck, template }: PlayerProps) {
  const reduceMotion = useReducedMotion();
  const standaloneBuildDate =
    import.meta.env.MODE === "standalone" || import.meta.env.MODE === "showcase-standalone"
      ? __OPENPREZ_EXPORT_DATE__
      : undefined;
  // Fixed for the whole session; standalone builds use their build date unless the deck overrides it.
  const [presentationDate] = useState(() =>
    resolvePresentationDate(deck.date, standaloneBuildDate),
  );
  const copyrightNotice = useMemo(
    () => formatCopyrightNotice(deck.copyrightNotice, presentationDate),
    [deck.copyrightNotice, presentationDate],
  );
  const session = useSessionController(deck.slides);
  const { snapshot, can, autoAdvance } = session;
  const { position } = snapshot;
  const { stepCounts } = session.deck;
  const { direction, hasChangedSlide } = useSlideTransition(position.slide);
  const captureRef = useRef<HTMLDivElement>(null);
  const pdfExport = usePdfExport({ deck, presentationDate, standaloneBuildDate, captureRef });
  // Touch navigation enters the same main-window session transition as keyboard and presenter commands.
  useSwipeNavigation(session.dispatchNavigation);
  const slide = deck.slides[position.slide - 1];
  const presenterWindow = usePresenterWindow(snapshot, session.dispatchCommand);
  const toggleNotes = presenterWindow.toggle;

  useEffect(() => {
    const hash = toHash(position);
    if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
  }, [position]);

  useEffect(() => {
    const onHashChange = () =>
      session.dispatchNavigation({
        type: "goto",
        position: parseHash(window.location.hash, stepCounts),
      });
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [session.dispatchNavigation, stepCounts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const command = commandForKey(event);
      if (!command) return;
      event.preventDefault();
      if (command === "fullscreen") toggleFullscreen();
      else if (command === "notes") toggleNotes();
      else if (command === "autoAdvancePause") session.toggleAutoAdvancePause();
      else session.dispatchNavigation({ type: command });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session.dispatchNavigation, session.toggleAutoAdvancePause, toggleNotes]);

  const stepValue = useMemo(
    () => ({ step: position.step, steps: slide.steps }),
    [position.step, slide.steps],
  );

  const controls: NavigationControls = {
    slide: position.slide,
    total: deck.slides.length,
    can,
    dispatch: session.dispatchNavigation,
    onExportPdf: pdfExport.start,
    exporting: pdfExport.exporting,
    exportError: pdfExport.error,
    notesOpen: presenterWindow.open,
    onToggleNotes: toggleNotes,
    notesError: presenterWindow.error,
    autoAdvance,
  };

  const exportFrame = pdfExport.frame;

  return (
    <MotionConfig reducedMotion="user">
      <Stage
        tone={slide.tone}
        toneStyle={toneStyleVariables(template, slide.tone)}
        slideArea={
          // Not initial={false} here: Motion would pass it down and silence the opening slide's own
          // entrance animations. Only the slide container skips its transition on first mount.
          <AnimatePresence custom={direction}>
            <motion.div
              key={slide.id}
              data-slide={slide.id}
              data-tone={slide.tone}
              className="absolute inset-0 bg-surface text-on-surface"
              custom={direction}
              variants={{
                enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : 80 * dir }),
                center: { opacity: 1, x: 0 },
                exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : -80 * dir }),
              }}
              initial={hasChangedSlide ? "enter" : false}
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <StepContext.Provider value={stepValue}>
                <slide.Component step={stepValue.step} steps={stepValue.steps} />
              </StepContext.Provider>
            </motion.div>
          </AnimatePresence>
        }
        footer={
          <template.Footer
            controls={controls}
            date={presentationDate}
            copyrightNotice={copyrightNotice}
            Brand={template.FooterBrand}
          />
        }
      />
      {exportFrame && pdfExport.date && pdfExport.frameIndex !== null && (
        <ExportStage
          key={`${exportFrame.slide.id}:${exportFrame.step}`}
          slide={exportFrame.slide}
          step={exportFrame.step}
          date={pdfExport.date}
          copyrightNotice={formatCopyrightNotice(deck.copyrightNotice, pdfExport.date)}
          page={pdfExport.frameIndex + 1}
          total={pdfExport.total}
          template={template}
          captureRef={captureRef}
        />
      )}
    </MotionConfig>
  );
}
