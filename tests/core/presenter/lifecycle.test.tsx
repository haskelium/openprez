// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { useSessionController } from "../../../core/player/useSessionController";
import { PresenterView } from "../../../core/presenter/PresenterView";
import { createPresenterChannel } from "../../../core/presenter/sync";
import { usePresenterSession } from "../../../core/presenter/usePresenterSession";
import { usePresenterWindow } from "../../../core/presenter/usePresenterWindow";
import { createQueuedBroadcastChannel } from "../../support/queuedBroadcastChannel";

const sessionId = "lifecycle-test";
const deck = defineDeck({
  title: "Presenter lifecycle",
  slides: [defineSlide({ id: "slide", steps: 3, Component: () => null })],
});
let transport: ReturnType<typeof createQueuedBroadcastChannel>;

const toggleIdentities = new Set<() => void>();

function MainHarness() {
  const session = useSessionController(deck.slides, { slide: 1, step: 1 });
  const presenter = usePresenterWindow(session.snapshot, session.dispatchCommand);
  toggleIdentities.add(presenter.toggle);
  return (
    <>
      <button type="button" onClick={() => session.dispatchNavigation({ type: "nextStep" })}>
        Main next step
      </button>
      <output data-testid="main-notes-state">{presenter.open ? "open" : "closed"}</output>
      <button type="button" onClick={presenter.toggle}>
        Toggle notes
      </button>
    </>
  );
}

function PresenterHarness() {
  const session = usePresenterSession(sessionId);
  return <output data-testid="presenter-state">{session.connectionState}</output>;
}

function settleMessages() {
  for (let batch = 0; batch < 20 && transport.pending.length > 0; batch += 1) {
    act(() => transport.deliverAll());
  }
  expect(transport.pending).toHaveLength(0);
}

function setup({ presenter = true }: { presenter?: boolean } = {}) {
  transport = createQueuedBroadcastChannel();
  vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
  vi.stubGlobal("crypto", { randomUUID: () => sessionId });
  render(
    <>
      <MainHarness />
      {presenter && <PresenterHarness />}
    </>,
  );
  settleMessages();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("presenter window lifecycle", () => {
  it("keeps the notes toggle stable while the presentation navigates", () => {
    setup({ presenter: false });
    toggleIdentities.clear();
    fireEvent.click(screen.getByRole("button", { name: "Main next step" }));
    fireEvent.click(screen.getByRole("button", { name: "Main next step" }));
    expect(toggleIdentities.size).toBe(1);
  });

  it("ends the presenter session when its opener is confirmed closed", () => {
    vi.useFakeTimers();
    const opener = { closed: false };
    vi.stubGlobal("opener", opener);
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
    setup();
    expect(screen.getByTestId("presenter-state").textContent).toBe("connected");

    opener.closed = true;
    act(() => vi.advanceTimersByTime(500));

    expect(screen.getByTestId("presenter-state").textContent).toBe("ended");
    expect(close).toHaveBeenCalled();
  });

  it("opens one synchronized window and toggles it closed", () => {
    setup({ presenter: false });
    const handle = { closed: false, close: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(handle as unknown as Window);

    fireEvent.click(screen.getByRole("button", { name: "Toggle notes" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("main-notes-state").textContent).toBe("open");

    fireEvent.click(screen.getByRole("button", { name: "Toggle notes" }));
    expect(handle.close).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("main-notes-state").textContent).toBe("closed");
  });

  it("only marks notes closed after the linked window is confirmed closed", () => {
    vi.useFakeTimers();
    setup({ presenter: false });
    const handle = { closed: false, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(handle as unknown as Window);
    fireEvent.click(screen.getByRole("button", { name: "Toggle notes" }));

    const presenterChannel = createPresenterChannel(
      sessionId,
      new transport.BroadcastChannel(`presenter:${sessionId}`),
    );
    presenterChannel.send({
      type: "hello",
      protocolVersion: 1,
      sessionId,
    });
    settleMessages();
    presenterChannel.send({
      type: "presenter-closing",
      protocolVersion: 1,
      sessionId,
      generation: 1,
    });
    settleMessages();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("main-notes-state").textContent).toBe("open");

    handle.closed = true;
    presenterChannel.send({
      type: "presenter-closing",
      protocolVersion: 1,
      sessionId,
      generation: 1,
    });
    settleMessages();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByTestId("main-notes-state").textContent).toBe("closed");
    presenterChannel.close();
  });

  it("sends explicit shutdown on main-window pagehide and ends the presenter session", () => {
    setup();
    expect(screen.getByTestId("presenter-state").textContent).toBe("connected");
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);

    act(() => window.dispatchEvent(new Event("pagehide")));
    settleMessages();

    expect(screen.getByTestId("presenter-state").textContent).toBe("ended");
    expect(close).toHaveBeenCalled();
    expect(transport.sent.some(({ data }) => (data as { type?: string }).type === "shutdown")).toBe(
      true,
    );
  });

  it("keeps presenter N as a local close action", () => {
    transport = createQueuedBroadcastChannel();
    vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    const close = vi.spyOn(window, "close").mockImplementation(() => undefined);
    render(<PresenterView deck={deck} sessionId={sessionId} />);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    });

    expect(close).toHaveBeenCalled();
  });

  it("survives StrictMode effect cleanup and reconnects the same presenter session", () => {
    transport = createQueuedBroadcastChannel();
    vi.stubGlobal("BroadcastChannel", transport.BroadcastChannel);
    vi.stubGlobal("crypto", { randomUUID: () => sessionId });
    render(
      <StrictMode>
        <MainHarness />
        <PresenterHarness />
      </StrictMode>,
    );
    settleMessages();

    expect(screen.getByTestId("presenter-state").textContent).toBe("connected");
    expect(screen.getByTestId("main-notes-state").textContent).toBe("closed");
  });
});
