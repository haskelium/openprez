// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutoAdvanceIndicator } from "../../../core/components/AutoAdvanceIndicator";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { useSessionController } from "../../../core/player/useSessionController";
import { usePresenterSession } from "../../../core/presenter/usePresenterSession";
import { usePresenterWindow } from "../../../core/presenter/usePresenterWindow";
import { createQueuedBroadcastChannel } from "../../support/queuedBroadcastChannel";

const NullComponent = () => null;

const deck = defineDeck({
  title: "Auto-advance sync",
  slides: [defineSlide({ id: "timed", steps: 2, autoAdvance: [10, 10], Component: NullComponent })],
});
let transport: ReturnType<typeof createQueuedBroadcastChannel>;

function MainWindowHarness({ targetDeck = deck }: { targetDeck?: typeof deck }) {
  const session = useSessionController(targetDeck.slides, { slide: 1, step: 1 });
  usePresenterWindow(session.snapshot, session.dispatchCommand);
  return (
    <>
      <output data-testid="main-countdown-state">
        {session.snapshot.autoAdvance.pausedElapsed === null ? "running" : "paused"}
      </output>
      <output data-testid="main-position">
        {`${session.snapshot.position.slide}/${session.snapshot.position.step}`}
      </output>
      <AutoAdvanceIndicator autoAdvance={session.autoAdvance} />
    </>
  );
}

function PresenterWindowHarness() {
  const session = usePresenterSession("auto-advance-test");
  const snapshot = session.snapshot;
  const autoAdvance = snapshot
    ? {
        snapshot: snapshot.autoAdvance,
        totalMs: 10_000,
        disabled: session.connectionState !== "connected",
        onTogglePause: () =>
          session.sendCommand({
            type: "autoAdvance",
            command: snapshot.autoAdvance.pausedElapsed === null ? "pause" : "resume",
          }),
      }
    : null;

  return (
    <>
      <output data-testid="presenter-position">
        {snapshot ? `${snapshot.position.slide}/${snapshot.position.step}` : "connecting"}
      </output>
      <button
        type="button"
        onClick={() => session.sendCommand({ type: "navigation", action: { type: "nextStep" } })}
      >
        Presenter next step
      </button>
      <AutoAdvanceIndicator autoAdvance={autoAdvance} />
    </>
  );
}

function settleMessages() {
  for (let batch = 0; batch < 30 && transport.pending.length > 0; batch += 1) {
    act(() => transport.deliverAll());
  }
  expect(transport.pending).toHaveLength(0);
}

function mountWindows(targetDeck = deck) {
  transport = createQueuedBroadcastChannel();
  vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
  vi.stubGlobal("crypto", { randomUUID: () => "auto-advance-test" });
  render(
    <>
      <MainWindowHarness targetDeck={targetDeck} />
      <PresenterWindowHarness />
    </>,
  );
  settleMessages();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("auto-advance presenter synchronization", () => {
  it("synchronizes pause and resume commands through the authoritative session", () => {
    mountWindows();

    expect(screen.getAllByRole("button", { name: "Pause auto-advance" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Pause auto-advance" })[1]);
    settleMessages();
    expect(screen.getByTestId("main-countdown-state").textContent).toBe("paused");
    expect(screen.getAllByRole("button", { name: "Resume auto-advance" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Resume auto-advance" })[1]);
    settleMessages();
    expect(screen.getByTestId("main-countdown-state").textContent).toBe("running");
  });

  it("applies presenter navigation before the next main-window countdown expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const raceDeck = defineDeck({
      title: "Countdown race",
      slides: [
        defineSlide({ id: "first", steps: 2, autoAdvance: [1, 2], Component: NullComponent }),
        defineSlide({ id: "last", steps: 1, autoAdvance: [1], Component: NullComponent }),
      ],
    });
    mountWindows(raceDeck);

    fireEvent.click(screen.getByRole("button", { name: "Presenter next step" }));
    settleMessages();
    expect(screen.getByTestId("main-position").textContent).toBe("1/2");
    expect(screen.getByTestId("presenter-position").textContent).toBe("1/2");

    act(() => vi.advanceTimersByTime(1_999));
    expect(screen.getByTestId("main-position").textContent).toBe("1/2");
    act(() => vi.advanceTimersByTime(1));
    settleMessages();
    expect(screen.getByTestId("main-position").textContent).toBe("2/1");
    expect(screen.getByTestId("presenter-position").textContent).toBe("2/1");
  });
});
