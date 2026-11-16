import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Tone } from "./deck";

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
/** Footer band height when the active template declares no `footerHeight` of its own. */
export const FOOTER_HEIGHT = 64;
export const SLIDE_AREA_HEIGHT = STAGE_HEIGHT - FOOTER_HEIGHT;

/** Current zoom factor from stage pixels to screen pixels. */
export const StageScaleContext = createContext(1);

/** The slide's usable area in stage pixels: full stage width, stage height minus the footer band. */
export interface SlideArea {
  width: number;
  height: number;
}

/** Default slide area for usage outside the player's stages (the 64px-footer split). */
const DEFAULT_SLIDE_AREA: SlideArea = { width: STAGE_WIDTH, height: SLIDE_AREA_HEIGHT };

/**
 * Slide area of the stage the slide renders in: the live player's stage, an export page
 * or a presenter preview. Defaults to the standard split for usages outside those stages.
 */
export const SlideAreaContext = createContext<SlideArea>(DEFAULT_SLIDE_AREA);

/** The slide's usable area, for slides that size their layout against it. */
export function useSlideArea(): SlideArea {
  return useContext(SlideAreaContext);
}

interface StageProps {
  tone: Tone;
  /** The template's resolved surface pair for this tone, applied as CSS variables. */
  toneStyle: CSSProperties;
  /** Footer band height in stage pixels, resolved from the active template. */
  footerHeight: number;
  slideArea: ReactNode;
  footer: ReactNode;
}

/** Fixed 1920x1080 stage, scaled uniformly to fit the window and letterboxed in black. */
export function Stage({ tone, toneStyle, footerHeight, slideArea, footer }: StageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // A hidden or collapsed window reports zero size; keep the last usable scale.
      if (width > 0 && height > 0) setScale(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={viewportRef}
      className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black"
    >
      <div
        data-stage
        data-tone={tone}
        className="flex shrink-0 flex-col overflow-hidden bg-surface text-on-surface"
        style={{ ...toneStyle, width: STAGE_WIDTH, height: STAGE_HEIGHT, zoom: scale }}
      >
        <StageScaleContext.Provider value={scale}>
          <SlideAreaContext.Provider
            value={{ width: STAGE_WIDTH, height: STAGE_HEIGHT - footerHeight }}
          >
            <div
              data-slide-area
              className="relative overflow-hidden"
              // Confines position: fixed content to the slide area, so a slide can never cover the footer.
              style={{
                height: STAGE_HEIGHT - footerHeight,
                contain: "layout paint",
                touchAction: "none",
              }}
            >
              {slideArea}
            </div>
            <div data-footer-area style={{ height: footerHeight }}>
              {footer}
            </div>
          </SlideAreaContext.Provider>
        </StageScaleContext.Provider>
      </div>
    </div>
  );
}
