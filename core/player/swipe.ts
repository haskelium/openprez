import { useEffect } from "react";
import { toggleFullscreen } from "./keyboard";
import type { NavigationAction } from "./navigation";

type SwipeNavigationType = Extract<
  Exclude<NavigationAction, { type: "goto" }>["type"],
  "nextStep" | "prevStep" | "nextSlide" | "prevSlide" | "nextKeyFrame" | "prevKeyFrame"
>;

export type ClassifiedGesture =
  | { type: "fullscreen"; direction: "enterFullscreen" | "exitFullscreen" }
  | { type: "navigation"; action: SwipeNavigationType };

/** Minimum displacement along the dominant axis for a touch to count as a swipe. */
const SWIPE_MIN_DISTANCE_PX = 40;
/** The dominant axis must outdistance the other by this ratio, or the swipe is ambiguous. */
const SWIPE_AXIS_DOMINANCE = 1.25;
/** A two-finger pinch must change the distance between fingers by at least this much. */
const PINCH_MIN_DISTANCE_CHANGE_PX = 60;

/**
 * Slide content that owns its touches; a swipe never starts on it. Custom gesture content
 * (drag, draw, pan) opts out with `data-swipe-ignore`, which covers all its descendants.
 */
const TOUCH_INTERACTIVE =
  "button, a[href], input, textarea, select, summary, [role='button'], [contenteditable]:not([contenteditable='false']), [data-swipe-ignore]";

/** One pointer's movement over the life of a gesture. */
export interface SwipeTrack {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SwipeGesture {
  /** How many pointers joined the gesture. */
  pointerCount: number;
  /** The first pointer's movement. It decides direction. */
  primary: SwipeTrack;
  /** The second pointer's movement, when two fingers joined. */
  secondary: SwipeTrack | null;
}

/** Map a two-finger pinch to a fullscreen direction, or null for other gestures. */
export function classifyPinch(gesture: SwipeGesture): "enterFullscreen" | "exitFullscreen" | null {
  if (gesture.pointerCount !== 2 || !gesture.secondary) return null;

  const startDistance = distanceBetween(
    gesture.primary.startX,
    gesture.primary.startY,
    gesture.secondary.startX,
    gesture.secondary.startY,
  );
  const endDistance = distanceBetween(
    gesture.primary.endX,
    gesture.primary.endY,
    gesture.secondary.endX,
    gesture.secondary.endY,
  );
  const distanceChange = endDistance - startDistance;
  if (Math.abs(distanceChange) < PINCH_MIN_DISTANCE_CHANGE_PX) return null;

  return distanceChange > 0 ? "enterFullscreen" : "exitFullscreen";
}

/** Map a completed touch gesture to a navigation action, or null when it must not navigate. */
export function classifyGesture(gesture: SwipeGesture): ClassifiedGesture | null {
  const pinch = classifyPinch(gesture);
  if (pinch) return { type: "fullscreen", direction: pinch };
  const action = classifySwipe(gesture);
  return action ? { type: "navigation", action } : null;
}

export function classifySwipe(gesture: SwipeGesture): SwipeNavigationType | null {
  if (gesture.pointerCount < 1 || gesture.pointerCount > 2) return null;

  const dx = gesture.primary.endX - gesture.primary.startX;
  const dy = gesture.primary.endY - gesture.primary.startY;
  const horizontal =
    Math.abs(dx) >= SWIPE_MIN_DISTANCE_PX && Math.abs(dx) >= Math.abs(dy) * SWIPE_AXIS_DOMINANCE;
  const vertical =
    Math.abs(dy) >= SWIPE_MIN_DISTANCE_PX && Math.abs(dy) >= Math.abs(dx) * SWIPE_AXIS_DOMINANCE;
  if (!horizontal && !vertical) return null;

  if (gesture.pointerCount === 2) {
    // Two-finger vertical is left for system scroll gestures; only key frames use two fingers.
    if (!horizontal || !isAlignedTwoFingerSwipe(gesture)) return null;
    return dx < 0 ? "nextKeyFrame" : "prevKeyFrame";
  }
  if (horizontal) return dx < 0 ? "nextStep" : "prevStep";
  return dy < 0 ? "nextSlide" : "prevSlide";
}

/** Both fingers must make a clear horizontal movement in the same direction. */
function isAlignedTwoFingerSwipe(gesture: SwipeGesture): boolean {
  const { secondary } = gesture;
  if (!secondary) return false;

  const primaryDx = gesture.primary.endX - gesture.primary.startX;
  const secondaryDx = secondary.endX - secondary.startX;
  const secondaryDy = secondary.endY - secondary.startY;
  const secondaryIsHorizontal =
    Math.abs(secondaryDx) >= SWIPE_MIN_DISTANCE_PX &&
    Math.abs(secondaryDx) >= Math.abs(secondaryDy) * SWIPE_AXIS_DOMINANCE;

  return secondaryIsHorizontal && Math.sign(primaryDx) === Math.sign(secondaryDx);
}

/** Dispatch navigation for touch swipes on the slide area, mirroring the keyboard model. */
export function useSwipeNavigation(dispatch: (action: NavigationAction) => void): void {
  useEffect(() => {
    // Pointers still down, keyed by pointer id.
    const active = new Map<number, SwipeTrack>();
    // First two pointers in the order they joined; their order must not depend on release order.
    const joined: SwipeTrack[] = [];
    // Abandoned gestures (a pointercancel, or a third finger joining) never navigate.
    let abandoned = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-slide-area]")) return;
      if (target.closest(TOUCH_INTERACTIVE)) return;
      // Slide content that handled the pointerdown itself (a drag, a drawing) owns the gesture.
      if (event.defaultPrevented) return;

      if (active.size === 0) {
        active.clear();
        joined.length = 0;
        abandoned = false;
      }
      const track = trackOf(event);
      active.set(event.pointerId, track);
      if (joined.length < 2) joined.push(track);
      else abandoned = true;
    };

    const onPointerUp = (event: PointerEvent) => {
      release(event, false);
    };

    const onPointerCancel = (event: PointerEvent) => {
      release(event, true);
    };

    const release = (event: PointerEvent, cancel: boolean) => {
      const track = active.get(event.pointerId);
      if (!track) return;
      track.endX = event.clientX;
      track.endY = event.clientY;
      active.delete(event.pointerId);
      if (cancel) abandoned = true;
      if (active.size === 0) finish();
    };

    const finish = () => {
      if (!abandoned && joined.length > 0) {
        const gesture = {
          pointerCount: joined.length,
          primary: joined[0],
          secondary: joined.length > 1 ? joined[1] : null,
        };
        const action = classifyGesture(gesture);
        if (action?.type === "fullscreen") {
          const fullscreen = Boolean(document.fullscreenElement);
          if (
            (action.direction === "enterFullscreen" && !fullscreen) ||
            (action.direction === "exitFullscreen" && fullscreen)
          ) {
            toggleFullscreen();
          }
        } else if (action?.type === "navigation") {
          dispatch({ type: action.action });
        }
      }
      active.clear();
      joined.length = 0;
      abandoned = false;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [dispatch]);
}

function trackOf(event: PointerEvent): SwipeTrack {
  return {
    startX: event.clientX,
    startY: event.clientY,
    endX: event.clientX,
    endY: event.clientY,
  };
}

function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}
