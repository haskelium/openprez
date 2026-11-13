import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type { NavigationControls } from "./controls";

interface ActionButtonProps {
  label: string;
  Icon: LucideIcon;
  enabled: boolean;
  /** Set for toggle actions; exposes the state as aria-pressed and a filled background. */
  pressed?: boolean;
  onPress: () => void;
}

/** One icon-only action with tooltip and pressed state, shared by the presenter window and template footers. */
export function ActionButton({ label, Icon, enabled, pressed, onPress }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={!enabled}
      onClick={onPress}
      // Keep focus off the button after a mouse click, so Space keeps meaning "Next step".
      onMouseDown={(event) => event.preventDefault()}
      className={`group relative flex size-11 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-current disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent ${pressed ? "bg-current/20 hover:bg-current/25" : ""}`}
    >
      <Icon aria-hidden="true" className="size-7" strokeWidth={2.25} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-3 py-1.5 text-base text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}

interface NavigationButtonsProps {
  can: NavigationControls["can"];
  dispatch: NavigationControls["dispatch"];
}

/** The six navigation buttons, in player order; shared by the presenter window and the template footer. */
export function NavigationButtons({ can, dispatch }: NavigationButtonsProps) {
  return (
    <nav aria-label="Presentation navigation" className="flex items-center gap-1">
      <ActionButton
        label="Previous slide"
        Icon={ChevronsLeft}
        enabled={can.prevSlide}
        onPress={() => dispatch({ type: "prevSlide" })}
      />
      <ActionButton
        label="Previous key frame"
        Icon={SkipBack}
        enabled={can.prevKeyFrame}
        onPress={() => dispatch({ type: "prevKeyFrame" })}
      />
      <ActionButton
        label="Previous step"
        Icon={ChevronLeft}
        enabled={can.prevStep}
        onPress={() => dispatch({ type: "prevStep" })}
      />
      <ActionButton
        label="Next step"
        Icon={ChevronRight}
        enabled={can.nextStep}
        onPress={() => dispatch({ type: "nextStep" })}
      />
      <ActionButton
        label="Next key frame"
        Icon={SkipForward}
        enabled={can.nextKeyFrame}
        onPress={() => dispatch({ type: "nextKeyFrame" })}
      />
      <ActionButton
        label="Next slide"
        Icon={ChevronsRight}
        enabled={can.nextSlide}
        onPress={() => dispatch({ type: "nextSlide" })}
      />
    </nav>
  );
}
