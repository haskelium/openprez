import { describe, expect, it } from "vitest";
import {
  decideMainMessage,
  decidePresenterMessage,
  INITIAL_MAIN_PROTOCOL_STATE,
  INITIAL_PRESENTER_PROTOCOL_STATE,
  isPresenterProtocolMessage,
  type MainProtocolDecision,
  type MainProtocolState,
  nextSnapshotMessage,
  PRESENTER_PROTOCOL_VERSION,
  type PresenterCommand,
  type PresenterProtocolMessage,
} from "../../../core/presenter/protocol";

const sessionId = "presentation-session";
const protocolVersion = PRESENTER_PROTOCOL_VERSION;
const snapshot = {
  position: { slide: 3, step: 2 },
  timer: { startedAt: 100_000, pausedElapsed: 5_000 },
  autoAdvance: { startedAt: 110_000, pausedElapsed: null },
};
const hello: PresenterProtocolMessage = { type: "hello", protocolVersion, sessionId };
const nextStep: PresenterCommand = { type: "navigation", action: { type: "nextStep" } };

function command(generation: number, commandId: number): PresenterProtocolMessage {
  return { type: "command", protocolVersion, sessionId, generation, commandId, command: nextStep };
}

function snapshotMessage(generation: number, revision: number): PresenterProtocolMessage {
  return { type: "snapshot", protocolVersion, sessionId, generation, revision, state: snapshot };
}

function handshake(state: MainProtocolState): MainProtocolState {
  const decision = decideMainMessage(state, hello);
  if (!decision.accepted || decision.kind !== "handshake") throw new Error("Expected handshake");
  return decision.state;
}

function acceptedCommand(decision: MainProtocolDecision) {
  if (!decision.accepted || decision.kind !== "command") throw new Error("Expected command");
  return decision;
}

describe("presenter protocol validation", () => {
  it("accepts well-formed messages in both directions", () => {
    const messages: unknown[] = [
      hello,
      command(1, 1),
      { ...command(1, 2), command: { type: "timer", command: "pause" } },
      { ...command(1, 3), command: { type: "autoAdvance", command: "toggle" } },
      { type: "presenter-closing", protocolVersion, sessionId, generation: 1 },
      snapshotMessage(1, 0),
      { type: "heartbeat", protocolVersion, sessionId, generation: 1 },
      { type: "shutdown", protocolVersion, sessionId },
    ];
    expect(messages.every(isPresenterProtocolMessage)).toBe(true);
  });

  it.each([
    [{ ...hello, protocolVersion: protocolVersion + 1 }],
    [{ ...hello, sessionId: " " }],
    [{ ...hello, sessionId: "x".repeat(129) }],
    [{ ...command(1, 1), generation: 0 }],
    [{ ...command(1, 1), commandId: Number.MAX_SAFE_INTEGER + 1 }],
    [
      {
        ...command(1, 1),
        command: { type: "navigation", action: { type: "goto", position: { slide: 0, step: 1 } } },
      },
    ],
    [
      {
        ...command(1, 1),
        command: { type: "autoAdvanceExpired", position: { slide: 1, step: 1 } },
      },
    ],
    [{ ...snapshotMessage(1, 0), revision: -1 }],
    [
      {
        ...snapshotMessage(1, 0),
        state: { ...snapshot, timer: { startedAt: 1, pausedElapsed: -1 } },
      },
    ],
    [null],
    ["heartbeat"],
  ])("rejects malformed external message %j", (message) => {
    expect(isPresenterProtocolMessage(message)).toBe(false);
  });
});

describe("main protocol decisions", () => {
  it("starts a new generation on every handshake and resets command ordering", () => {
    const first = handshake(INITIAL_MAIN_PROTOCOL_STATE);
    expect(first).toEqual({ generation: 1, revision: 0, lastCommandId: 0 });
    const afterCommand = acceptedCommand(decideMainMessage(first, command(1, 4))).state;
    expect(handshake(afterCommand)).toEqual({ generation: 2, revision: 0, lastCommandId: 0 });
  });

  it("applies each command once, in order, only for the current generation", () => {
    const connected = handshake(INITIAL_MAIN_PROTOCOL_STATE);
    const first = acceptedCommand(decideMainMessage(connected, command(1, 1)));
    expect(first.command).toEqual(nextStep);
    const second = acceptedCommand(decideMainMessage(first.state, command(1, 2)));

    expect(decideMainMessage(second.state, command(1, 1))).toEqual({
      accepted: false,
      reason: "duplicate-command",
    });
    expect(decideMainMessage(handshake(second.state), command(1, 3))).toEqual({
      accepted: false,
      reason: "superseded-generation",
    });
    expect(decideMainMessage(INITIAL_MAIN_PROTOCOL_STATE, command(1, 1))).toEqual({
      accepted: false,
      reason: "superseded-generation",
    });
  });

  it("only treats closing from the current generation as a possible closure", () => {
    const connected = handshake(INITIAL_MAIN_PROTOCOL_STATE);
    const closing = (generation: number): PresenterProtocolMessage => ({
      type: "presenter-closing",
      protocolVersion,
      sessionId,
      generation,
    });
    expect(decideMainMessage(connected, closing(1))).toEqual({
      accepted: true,
      kind: "presenter-closing",
    });
    expect(decideMainMessage(handshake(connected), closing(1)).accepted).toBe(false);
  });

  it("ignores main-to-presenter messages", () => {
    expect(decideMainMessage(INITIAL_MAIN_PROTOCOL_STATE, snapshotMessage(1, 1))).toEqual({
      accepted: false,
      reason: "wrong-direction",
    });
  });

  it("builds monotonically revised full snapshots for the current generation", () => {
    const connected = handshake(INITIAL_MAIN_PROTOCOL_STATE);
    const first = nextSnapshotMessage(connected, sessionId, snapshot);
    const second = nextSnapshotMessage(first.state, sessionId, snapshot);
    expect(first.message).toEqual(snapshotMessage(1, 1));
    expect(second.state.revision).toBe(2);
  });
});

describe("presenter protocol decisions", () => {
  it("accepts newer snapshots and rejects duplicates, reordering and older generations", () => {
    const first = decidePresenterMessage(INITIAL_PRESENTER_PROTOCOL_STATE, snapshotMessage(1, 0));
    if (!first.accepted || first.kind !== "snapshot") throw new Error("Expected snapshot");
    expect(first.snapshot).toEqual(snapshot);
    expect(first.state).toEqual({ generation: 1, revision: 0 });

    expect(decidePresenterMessage(first.state, snapshotMessage(1, 0))).toEqual({
      accepted: false,
      reason: "stale-revision",
    });
    expect(decidePresenterMessage({ generation: 1, revision: 5 }, snapshotMessage(1, 4))).toEqual({
      accepted: false,
      reason: "stale-revision",
    });
    expect(decidePresenterMessage({ generation: 3, revision: 5 }, snapshotMessage(2, 9))).toEqual({
      accepted: false,
      reason: "superseded-generation",
    });
    expect(
      decidePresenterMessage({ generation: 3, revision: 5 }, snapshotMessage(4, 6)).accepted,
    ).toBe(true);
  });

  it("reports whether heartbeats belong to the presenter's generation", () => {
    const heartbeat = (generation: number): PresenterProtocolMessage => ({
      type: "heartbeat",
      protocolVersion,
      sessionId,
      generation,
    });
    const state = { generation: 2, revision: 7 };
    expect(decidePresenterMessage(state, heartbeat(2))).toEqual({
      accepted: true,
      kind: "heartbeat",
      current: true,
    });
    expect(decidePresenterMessage(state, heartbeat(3))).toEqual({
      accepted: true,
      kind: "heartbeat",
      current: false,
    });
  });

  it("accepts shutdown and ignores presenter-to-main messages", () => {
    const state = { generation: 2, revision: 7 };
    expect(decidePresenterMessage(state, { type: "shutdown", protocolVersion, sessionId })).toEqual(
      { accepted: true, kind: "shutdown" },
    );
    expect(decidePresenterMessage(state, hello)).toEqual({
      accepted: false,
      reason: "wrong-direction",
    });
  });
});
