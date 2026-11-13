// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useCallback } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { type NavigationAction, navigate, type Position } from "../../../core/player/navigation";
import { useSessionController } from "../../../core/player/useSessionController";
import { PresenterView } from "../../../core/presenter/PresenterView";
import type { PresenterProtocolMessage } from "../../../core/presenter/protocol";
import { usePresenterWindow } from "../../../core/presenter/usePresenterWindow";
import type { QueuedChannelInstance } from "../../support/queuedBroadcastChannel";
import { createQueuedBroadcastChannel } from "../../support/queuedBroadcastChannel";

const NullComponent = () => null;

const deck = defineDeck({
  title: "Navigation sync",
  slides: [
    defineSlide({ id: "intro", steps: 4, keyFrames: [2, 4], Component: NullComponent }),
    ...Array.from({ length: 8 }, (_, index) =>
      defineSlide({
        id: `slide-${index + 2}`,
        steps: 4,
        keyFrames: [2, 4],
        Component: NullComponent,
      }),
    ),
  ],
});
const stepCounts = deck.slides.map((slide) => slide.steps);
const keyFrames = deck.slides.map((slide) => slide.keyFrames);
const initialPosition = { slide: 5, step: 3 };

let transport: ReturnType<typeof createQueuedBroadcastChannel>;

function MainWindowHarness() {
  const session = useSessionController(deck.slides, initialPosition);
  usePresenterWindow(session.snapshot, session.dispatchCommand);
  const nextSlide = useCallback(
    () => session.dispatchNavigation({ type: "nextSlide" }),
    [session.dispatchNavigation],
  );
  return (
    <>
      <output data-testid="main-position">
        {`${session.snapshot.position.slide}/${session.snapshot.position.step}`}
      </output>
      <button type="button" onClick={nextSlide}>
        Main next slide
      </button>
    </>
  );
}

function settleMessages() {
  for (let batch = 0; batch < 30 && transport.pending.length > 0; batch += 1) {
    act(() => transport.deliverAll());
  }
  expect(
    transport.pending.map(({ target, data }) => ({
      target: transport.instances.indexOf(target),
      type: (data as { type?: string }).type,
      generation: (data as { generation?: number }).generation,
      revision: (data as { revision?: number }).revision,
    })),
  ).toEqual([]);
}

function mountWindows() {
  transport = createQueuedBroadcastChannel();
  vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
  vi.stubGlobal("crypto", { randomUUID: () => "navigation-test" });
  window.history.replaceState(null, "", "#/5/3");
  render(
    <>
      <MainWindowHarness />
      <PresenterView deck={deck} sessionId="navigation-test" />
    </>,
  );
  settleMessages();
  transport.sent.length = 0;
  const main = transport.instances[0];
  const presenter = transport.instances[1];
  if (!main || !presenter) throw new Error("Expected both presenter windows to create channels");
  return { main, presenter };
}

function expectPositions(position: Position) {
  expect(screen.getByTestId("main-position").textContent).toBe(
    `${position.slide}/${position.step}`,
  );
  expect(document.querySelector("[data-presenter-position]")?.textContent).toBe(
    `Slide ${position.slide} / 9 · Step ${position.step} / 4`,
  );
}

function press(key: string, count: number, shiftKey = false) {
  act(() => {
    for (let repeat = 0; repeat < count; repeat += 1) {
      fireEvent.keyDown(window, { key, shiftKey, repeat: repeat > 0 });
    }
  });
}

function expectedAfter(
  position: Position,
  type: Exclude<NavigationAction, { type: "goto" }>["type"],
  count: number,
) {
  let next = position;
  for (let index = 0; index < count; index += 1) {
    next = navigate(stepCounts, next, { type }, keyFrames);
  }
  return next;
}

function protocolMessages(type: PresenterProtocolMessage["type"], sender?: QueuedChannelInstance) {
  return transport.sent
    .filter(
      (message) =>
        (!sender || message.sender === sender) && (message.data as { type?: string }).type === type,
    )
    .map((message) => message.data as PresenterProtocolMessage);
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("authoritative presenter navigation", () => {
  it.each([
    ["ArrowLeft", "prevStep", false],
    ["ArrowRight", "nextStep", false],
    ["ArrowUp", "prevSlide", false],
    ["ArrowDown", "nextSlide", false],
    ["ArrowLeft", "prevKeyFrame", true],
    ["ArrowRight", "nextKeyFrame", true],
    [" ", "nextStep", false],
  ] as const)(
    "preserves held %s (%s, shift=%s) despite delayed snapshots",
    (key, type, shiftKey) => {
      const { main, presenter } = mountWindows();
      let expected = initialPosition;
      for (let repeat = 0; repeat < 8; repeat += 1) {
        fireEvent.keyDown(window, { key, shiftKey, repeat: repeat > 0 });
        act(() => transport.deliverTo(main));
        expected = expectedAfter(expected, type, 1);
        expect(screen.getByTestId("main-position").textContent).toBe(
          `${expected.slide}/${expected.step}`,
        );
      }
      fireEvent.keyUp(window, { key, shiftKey });
      expect(protocolMessages("command", presenter)).toHaveLength(8);
      settleMessages();
      expectPositions(expected);
      expect(protocolMessages("command", main)).toHaveLength(0);
      expect(protocolMessages("snapshot", presenter)).toHaveLength(0);
    },
  );

  it("reduces bursts against successive main positions, not stale presenter state", () => {
    const { main } = mountWindows();
    press("ArrowLeft", 11);
    fireEvent.keyUp(window, { key: "ArrowLeft" });
    act(() => transport.deliverTo(main));
    expect(screen.getByTestId("main-position").textContent).toBe(
      `${expectedAfter(initialPosition, "prevStep", 11).slide}/${expectedAfter(initialPosition, "prevStep", 11).step}`,
    );
    settleMessages();
    expectPositions(expectedAfter(initialPosition, "prevStep", 11));
  });

  it("applies main and presenter navigation in the same authoritative order", () => {
    const { main } = mountWindows();
    fireEvent.click(screen.getByRole("button", { name: "Main next slide" }));
    press("ArrowLeft", 1);
    fireEvent.keyUp(window, { key: "ArrowLeft" });
    act(() => transport.deliverTo(main));
    expect(screen.getByTestId("main-position").textContent).toBe("5/4");
    settleMessages();
    expectPositions({ slide: 5, step: 4 });
  });

  it("routes presenter navigation buttons through the authoritative session", () => {
    const { main } = mountWindows();
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    act(() => transport.deliverTo(main));
    expect(screen.getByTestId("main-position").textContent).toBe("5/2");
    settleMessages();
    expectPositions({ slide: 5, step: 2 });
  });

  it("rejects duplicate commands and delayed snapshots without echoes", () => {
    const { main, presenter } = mountWindows();
    press("ArrowRight", 1);
    fireEvent.keyUp(window, { key: "ArrowRight" });
    const sentCommand = protocolMessages("command", presenter)[0];
    expect(sentCommand?.type).toBe("command");
    transport.pending.push({ target: main, data: sentCommand });
    act(() => transport.deliverTo(main));
    expect(screen.getByTestId("main-position").textContent).toBe("5/4");

    // A second accepted navigation creates a newer full snapshot.
    fireEvent.click(screen.getByRole("button", { name: "Main next slide" }));
    const pendingSnapshots = transport.pending.filter(
      ({ target, data }) => target === presenter && (data as { type?: string }).type === "snapshot",
    );
    expect(pendingSnapshots.length).toBeGreaterThanOrEqual(2);
    const newest = pendingSnapshots[pendingSnapshots.length - 1];
    if (!newest) throw new Error("Expected a newest snapshot");
    transport.pending.splice(
      0,
      transport.pending.length,
      ...transport.pending.filter((message) => message !== newest),
    );
    act(() => transport.deliverMessage(newest.target, newest.data));
    expect(document.querySelector("[data-presenter-position]")?.textContent).toBe(
      "Slide 6 / 9 · Step 1 / 4",
    );
    settleMessages();
    expectPositions({ slide: 6, step: 1 });
    expect(protocolMessages("command", presenter)).toHaveLength(1);
  });

  it("keeps remote navigation disabled when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    window.history.replaceState(null, "", "#/5/3");
    render(<PresenterView deck={deck} sessionId="offline" />);
    expect(screen.getByRole("status").textContent).toContain("unavailable");
    expect(screen.getByRole("button", { name: "Next step" }).hasAttribute("disabled")).toBe(true);
    press("ArrowLeft", 2);
    expect(document.querySelector("[data-presenter-position]")?.textContent).toBe(
      "Slide 5 / 9 · Step 3 / 4",
    );
  });
});
