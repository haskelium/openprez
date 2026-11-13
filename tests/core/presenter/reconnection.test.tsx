// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { useSessionController } from "../../../core/player/useSessionController";
import { usePresenterSession } from "../../../core/presenter/usePresenterSession";
import { usePresenterWindow } from "../../../core/presenter/usePresenterWindow";
import {
  createQueuedBroadcastChannel,
  type QueuedMessage,
} from "../../support/queuedBroadcastChannel";

const deck = defineDeck({
  title: "Presenter reconnection",
  slides: [
    defineSlide({ id: "one", steps: 2, autoAdvance: [100, 100], Component: () => null }),
    defineSlide({ id: "two", steps: 2, autoAdvance: [100, 100], Component: () => null }),
    defineSlide({ id: "three", steps: 1, autoAdvance: [100], Component: () => null }),
  ],
});
const sessionId = "reconnection-test";
const wireState = (snapshot: {
  position: { slide: number; step: number };
  timer: { startedAt: number; pausedElapsed: number | null };
  autoAdvance: { startedAt: number; pausedElapsed: number | null };
}) =>
  JSON.stringify({
    position: snapshot.position,
    timer: snapshot.timer,
    autoAdvance: snapshot.autoAdvance,
  });

let transport: ReturnType<typeof createQueuedBroadcastChannel>;

function MainWindowHarness() {
  const session = useSessionController(deck.slides, { slide: 1, step: 1 });
  usePresenterWindow(session.snapshot, session.dispatchCommand);
  return (
    <>
      <output data-testid="main-connection-state">active</output>
      <output data-testid="main-session-state">{wireState(session.snapshot)}</output>
      <button type="button" onClick={() => session.dispatchNavigation({ type: "nextSlide" })}>
        Main next slide
      </button>
      <button
        type="button"
        onClick={() => session.dispatchCommand({ type: "timer", command: "reset" })}
      >
        Main reset timer
      </button>
      <button
        type="button"
        onClick={() => session.dispatchCommand({ type: "autoAdvance", command: "pause" })}
      >
        Main pause countdown
      </button>
    </>
  );
}

function PresenterWindowHarness() {
  const session = usePresenterSession(sessionId);
  return (
    <>
      <output data-testid="presenter-connection-state">{session.connectionState}</output>
      <output data-testid="presenter-session-state">
        {session.snapshot ? wireState(session.snapshot) : "no snapshot"}
      </output>
      <button
        type="button"
        disabled={session.connectionState !== "connected"}
        onClick={() => session.sendCommand({ type: "navigation", action: { type: "nextStep" } })}
      >
        Presenter next step
      </button>
    </>
  );
}

function settleMessages() {
  for (let batch = 0; batch < 30 && transport.pending.length > 0; batch += 1) {
    act(() => transport.deliverAll());
  }
  expect(transport.pending).toHaveLength(0);
}

function mountWindows() {
  transport = createQueuedBroadcastChannel();
  vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
  vi.stubGlobal("crypto", { randomUUID: () => sessionId });
  render(
    <>
      <MainWindowHarness />
      <PresenterWindowHarness />
    </>,
  );
  settleMessages();
}

function removePendingMessage(message: QueuedMessage) {
  const index = transport.pending.indexOf(message);
  if (index >= 0) transport.pending.splice(index, 1);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("presenter heartbeat recovery", () => {
  it("keeps notes open, disables commands, and resynchronizes one current snapshot before replay", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    transport = createQueuedBroadcastChannel();
    vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
    vi.stubGlobal("crypto", { randomUUID: () => sessionId });
    render(
      <>
        <MainWindowHarness />
        <PresenterWindowHarness />
      </>,
    );
    settleMessages();
    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("connected");
    expect(screen.getByTestId("presenter-session-state").textContent).toBe(
      screen.getByTestId("main-session-state").textContent,
    );

    fireEvent.click(screen.getByRole("button", { name: "Presenter next step" }));
    const staleCommand = transport.pending.find(
      ({ target, data }) =>
        target === transport.instances[0] && (data as { type?: string }).type === "command",
    );
    expect(staleCommand).toBeDefined();

    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId("presenter-connection-state").textContent).not.toBe("connected");
    const commandCount = transport.sent.filter(
      ({ sender, data }) =>
        sender === transport.instances[1] && (data as { type?: string }).type === "command",
    ).length;
    const disabledCommand = screen.getByRole("button", { name: "Presenter next step" });
    expect(disabledCommand.hasAttribute("disabled")).toBe(true);
    fireEvent.click(disabledCommand);
    expect(
      transport.sent.filter(
        ({ sender, data }) =>
          sender === transport.instances[1] && (data as { type?: string }).type === "command",
      ),
    ).toHaveLength(commandCount);

    fireEvent.click(screen.getByRole("button", { name: "Main next slide" }));
    fireEvent.click(screen.getByRole("button", { name: "Main reset timer" }));
    fireEvent.click(screen.getByRole("button", { name: "Main pause countdown" }));
    const authoritativeState = screen.getByTestId("main-session-state").textContent;
    expect(JSON.parse(authoritativeState ?? "{}")).toMatchObject({
      position: { slide: 2, step: 1 },
      timer: { startedAt: Date.now(), pausedElapsed: null },
      autoAdvance: { startedAt: Date.now(), pausedElapsed: 0 },
    });

    fireEvent.focus(window);
    const helloAttempts = transport.pending.filter(
      ({ target, data }) =>
        target === transport.instances[0] && (data as { type?: string }).type === "hello",
    );
    const newestHello = helloAttempts.at(-1);
    if (!newestHello) throw new Error("Expected a fresh handshake after focus");
    removePendingMessage(newestHello);
    act(() => transport.deliverMessage(newestHello.target, newestHello.data));

    const refreshedSnapshot = transport.pending.find(
      ({ target, data }) =>
        target === transport.instances[1] &&
        (data as { type?: string; generation?: number }).type === "snapshot" &&
        (data as { generation: number }).generation === 2,
    );
    if (!refreshedSnapshot) throw new Error("Expected the generation-two snapshot");
    removePendingMessage(refreshedSnapshot);
    act(() => transport.deliverMessage(refreshedSnapshot.target, refreshedSnapshot.data));
    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("connected");
    expect(screen.getByTestId("presenter-session-state").textContent).toBe(authoritativeState);

    if (!staleCommand) throw new Error("Expected one command from the old generation");
    removePendingMessage(staleCommand);
    act(() => transport.deliverMessage(staleCommand.target, staleCommand.data));
    expect(screen.getByTestId("main-session-state").textContent).toBe(authoritativeState);

    settleMessages();
    expect(screen.getByTestId("presenter-session-state").textContent).toBe(authoritativeState);
    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("connected");
  });

  it("recovers from main-window liveness after handshake retries are exhausted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    mountWindows();
    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("connected");

    // The main window is suspended: nothing it sends or receives is delivered for a while.
    act(() => vi.advanceTimersByTime(12_000));
    transport.pending.length = 0;
    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("disconnected");

    fireEvent.click(screen.getByRole("button", { name: "Main next slide" }));
    act(() => vi.advanceTimersByTime(1_000));
    settleMessages();

    expect(screen.getByTestId("presenter-connection-state").textContent).toBe("connected");
    expect(screen.getByTestId("presenter-session-state").textContent).toBe(
      screen.getByTestId("main-session-state").textContent,
    );
  });
});
