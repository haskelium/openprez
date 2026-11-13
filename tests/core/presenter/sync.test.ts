import { describe, expect, it } from "vitest";
import type { PresenterProtocolMessage } from "../../../core/presenter/protocol";
import {
  type ChannelLike,
  channelName,
  createPresenterChannel,
  createSessionId,
  HEARTBEAT_TIMEOUT_MS,
  isMainWindowLost,
  presenterUrl,
  readPresenterSession,
} from "../../../core/presenter/sync";

/** In-memory stand-in for two BroadcastChannel instances on the same name. */
function channelPair(): [ChannelLike, ChannelLike] {
  const listeners = [
    new Set<(event: MessageEvent) => void>(),
    new Set<(event: MessageEvent) => void>(),
  ];
  const end = (self: number): ChannelLike => ({
    postMessage(message) {
      for (const listener of listeners[1 - self]) listener({ data: message } as MessageEvent);
    },
    addEventListener: (_type, listener) => listeners[self].add(listener),
    removeEventListener: (_type, listener) => listeners[self].delete(listener),
    close: () => listeners[self].clear(),
  });
  return [end(0), end(1)];
}

const hello: PresenterProtocolMessage = {
  type: "hello",
  protocolVersion: 1,
  sessionId: "session-a",
};

describe("presenter channel adapter", () => {
  it("delivers validated messages to the other window only", () => {
    const [mainEnd, presenterEnd] = channelPair();
    const main = createPresenterChannel("session-a", mainEnd);
    const presenter = createPresenterChannel("session-a", presenterEnd);
    const atMain: PresenterProtocolMessage[] = [];
    const atPresenter: PresenterProtocolMessage[] = [];
    main.onMessage((message) => atMain.push(message));
    presenter.onMessage((message) => atPresenter.push(message));

    presenter.send(hello);
    main.send({
      type: "heartbeat",
      protocolVersion: 1,
      sessionId: "session-a",
      generation: 1,
    });

    expect(atMain).toEqual([hello]);
    expect(atPresenter).toEqual([
      { type: "heartbeat", protocolVersion: 1, sessionId: "session-a", generation: 1 },
    ]);
  });

  it("ignores malformed and wrong-session messages and stops after unsubscribing", () => {
    const [mainEnd, presenterEnd] = channelPair();
    const presenter = createPresenterChannel("session-a", presenterEnd);
    const received: PresenterProtocolMessage[] = [];
    const unsubscribe = presenter.onMessage((message) => received.push(message));

    mainEnd.postMessage({ type: "snapshot", protocolVersion: 99, sessionId: "session-a" });
    mainEnd.postMessage({ ...hello, sessionId: "session-b" });
    mainEnd.postMessage({
      type: "heartbeat",
      protocolVersion: 1,
      sessionId: "session-a",
      generation: 1,
    });
    unsubscribe();
    mainEnd.postMessage(hello);

    expect(received).toEqual([
      { type: "heartbeat", protocolVersion: 1, sessionId: "session-a", generation: 1 },
    ]);
  });
});

describe("presenter lifecycle helpers", () => {
  it("builds a presenter URL that keeps the position hash and round-trips the session", () => {
    const url = presenterUrl("/", "#/6/2", "a b");
    expect(url).toBe("/?presenter=a%20b#/6/2");
    expect(readPresenterSession(url.slice(url.indexOf("?"), url.indexOf("#")))).toBe("a b");
  });

  it("treats a missing or empty session as the main window", () => {
    expect(readPresenterSession("")).toBeNull();
    expect(readPresenterSession("?presenter=")).toBeNull();
  });

  it("creates distinct session ids and channel names", () => {
    const first = createSessionId();
    const second = createSessionId();
    expect(first).not.toBe(second);
    expect(channelName(first)).toBe(`presenter:${first}`);
  });

  it("treats a missed heartbeat as temporary loss only after the deadline", () => {
    expect(isMainWindowLost(10_000, 10_000 + HEARTBEAT_TIMEOUT_MS)).toBe(false);
    expect(isMainWindowLost(10_000, 10_000 + HEARTBEAT_TIMEOUT_MS + 1)).toBe(true);
  });
});
