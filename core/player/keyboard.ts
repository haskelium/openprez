import type { NavigationAction } from "./navigation";

type NavigationType = Exclude<NavigationAction, { type: "goto" }>["type"];

const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
const ACTIVATABLE = "button, a[href], summary, [role='button']";

/** Map a key press to a player command, or null when the player must not react. */
export function commandForKey(
  event: KeyboardEvent,
): NavigationType | "fullscreen" | "notes" | "autoAdvancePause" | null {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(EDITABLE)) return null;
  // Let a focused button handle its own Space/Enter activation.
  if ((event.key === " " || event.key === "Enter") && target?.closest(ACTIVATABLE)) return null;

  switch (event.key) {
    case "ArrowRight":
      return event.shiftKey ? "nextKeyFrame" : "nextStep";
    case "ArrowLeft":
      return event.shiftKey ? "prevKeyFrame" : "prevStep";
    case " ":
      return "nextStep";
    case "ArrowDown":
      return "nextSlide";
    case "ArrowUp":
      return "prevSlide";
    case "Home":
      return "first";
    case "End":
      return "last";
    case "f":
    case "F":
      return "fullscreen";
    case "n":
    case "N":
      return "notes";
    case "p":
    case "P":
      return "autoAdvancePause";
    default:
      return null;
  }
}

export function toggleFullscreen(): void {
  const request = document.fullscreenElement
    ? document.exitFullscreen?.()
    : document.documentElement.requestFullscreen?.();
  request?.catch(() => {
    // Fullscreen can be refused by the browser; the presentation keeps working windowed.
  });
}
