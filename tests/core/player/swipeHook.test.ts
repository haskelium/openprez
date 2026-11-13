// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NavigationAction } from "../../../core/player/navigation";
import { useSwipeNavigation } from "../../../core/player/swipe";

function pointerEvent(type: string, pointerId: number, clientX: number, clientY: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: "touch" },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

function sendPointer(
  target: Element,
  type: string,
  pointerId: number,
  clientX: number,
  clientY: number,
) {
  target.dispatchEvent(pointerEvent(type, pointerId, clientX, clientY));
}

function sendSwipe(
  target: Element,
  pointerId: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  sendPointer(target, "pointerdown", pointerId, startX, startY);
  sendPointer(target, "pointerup", pointerId, endX, endY);
}

/** Horizontal and vertical single-finger swipes in both directions. */
const SWIPES = [
  { name: "left", start: [300, 300], end: [120, 310] },
  { name: "right", start: [120, 300], end: [300, 310] },
  { name: "up", start: [300, 300], end: [310, 120] },
  { name: "down", start: [300, 120], end: [310, 300] },
] as const;

function sendEverySwipe(target: Element, firstPointerId: number) {
  SWIPES.forEach(({ start, end }, index) => {
    sendSwipe(target, firstPointerId + index, start[0], start[1], end[0], end[1]);
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("touch swipe listener", () => {
  it("dispatches navigation for a swipe that starts in the slide area", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    document.body.append(stage);

    act(() => sendSwipe(stage, 1, 180, 100, 100, 105));
    expect(dispatch).toHaveBeenCalledWith({ type: "nextStep" });
  });

  it("does not navigate for a swipe that starts on interactive slide content", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    const button = document.createElement("button");
    stage.append(button);
    document.body.append(stage);

    act(() => sendSwipe(button, 1, 180, 100, 100, 100));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not navigate for a swipe that starts outside the slide area", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const footer = document.createElement("div");
    document.body.append(footer);

    act(() => sendSwipe(footer, 1, 180, 100, 100, 100));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not navigate when a swipe starts on semantic button controls", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    const roleButton = document.createElement("div");
    roleButton.setAttribute("role", "button");
    const summary = document.createElement("summary");
    stage.append(roleButton, summary);
    document.body.append(stage);

    act(() => {
      sendSwipe(roleButton, 1, 180, 100, 100, 100);
      sendSwipe(summary, 2, 180, 100, 100, 100);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches a key-frame action for aligned two-finger swipes even when the first finger lifts last", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    document.body.append(stage);

    act(() => {
      sendPointer(stage, "pointerdown", 1, 200, 100);
      sendPointer(stage, "pointerdown", 2, 300, 100);
      sendPointer(stage, "pointerup", 2, 240, 100);
      sendPointer(stage, "pointerup", 1, 140, 100);
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "nextKeyFrame" });
  });

  it("aborts navigation when a touch is cancelled", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    document.body.append(stage);

    act(() => {
      sendPointer(stage, "pointerdown", 1, 180, 100);
      sendPointer(stage, "pointercancel", 1, 100, 100);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("aborts navigation when a third finger joins the gesture", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    document.body.append(stage);

    act(() => {
      sendPointer(stage, "pointerdown", 1, 240, 100);
      sendPointer(stage, "pointerdown", 2, 340, 100);
      sendPointer(stage, "pointerdown", 3, 440, 100);
      sendPointer(stage, "pointerup", 1, 180, 100);
      sendPointer(stage, "pointerup", 2, 280, 100);
      sendPointer(stage, "pointerup", 3, 380, 100);
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not navigate for drags that start on opted-out content or its nested descendants", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    const piece = document.createElement("div");
    piece.dataset.swipeIgnore = "";
    const label = document.createElement("p");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    svg.append(bar);
    piece.append(label, svg);
    stage.append(piece);
    document.body.append(stage);

    act(() => {
      sendEverySwipe(piece, 1);
      sendEverySwipe(label, 11);
      sendEverySwipe(bar, 21);
    });
    expect(dispatch).not.toHaveBeenCalled();

    act(() => sendEverySwipe(stage, 31));
    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      "nextStep",
      "prevStep",
      "nextSlide",
      "prevSlide",
    ]);
  });

  it("does not navigate for drags whose pointerdown the slide content already handled", () => {
    const dispatch = vi.fn<(action: NavigationAction) => void>();
    renderHook(() => useSwipeNavigation(dispatch));
    const stage = document.createElement("div");
    stage.dataset.slideArea = "";
    const draggable = document.createElement("div");
    draggable.addEventListener("pointerdown", (event) => event.preventDefault());
    const nested = document.createElement("span");
    draggable.append(nested);
    stage.append(draggable);
    document.body.append(stage);

    act(() => {
      sendEverySwipe(draggable, 1);
      sendEverySwipe(nested, 11);
    });
    expect(dispatch).not.toHaveBeenCalled();

    act(() => sendEverySwipe(stage, 21));
    expect(dispatch).toHaveBeenCalledTimes(SWIPES.length);
  });
});
