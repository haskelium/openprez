// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { useSessionController } from "../../../core/player/useSessionController";
import { usePresenterWindow } from "../../../core/presenter/usePresenterWindow";

const deck = defineDeck({
  title: "Channel support",
  slides: [defineSlide({ id: "only", Component: () => null })],
});

class AvailableChannel {
  addEventListener() {}
  removeEventListener() {}
  postMessage() {}
  close() {}
}

function MainWindowHarness() {
  const session = useSessionController(deck.slides, { slide: 1, step: 1 });
  const presenter = usePresenterWindow(session.snapshot, session.dispatchCommand);
  return (
    <>
      <button type="button" onClick={presenter.toggle}>
        Speaker notes
      </button>
      {presenter.error && <span role="alert">{presenter.error}</span>}
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("synchronized presenter support", () => {
  it("explains missing BroadcastChannel without opening an unsynchronized window", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<MainWindowHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Speaker notes" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Synchronized presenter notes are unavailable",
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("explains constructor failure without opening an unsynchronized window", () => {
    vi.stubGlobal(
      "BroadcastChannel",
      class {
        constructor() {
          throw new Error("channel creation denied");
        }
      },
    );
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<MainWindowHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Speaker notes" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "Synchronized presenter notes are unavailable",
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("still explains a blocked popup when synchronization is available", () => {
    vi.stubGlobal("BroadcastChannel", AvailableChannel);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<MainWindowHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Speaker notes" }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain("Allow pop-ups to open speaker notes");
  });
});
