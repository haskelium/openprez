import type { NavigationAction, Position } from "../player/navigation";
import type { SessionCommand, SessionSnapshot } from "../player/session";
import type { TimerCommand, TimerSnapshot } from "../time";

export const PRESENTER_PROTOCOL_VERSION = 1;
const MAX_SESSION_ID_LENGTH = 128;

interface ProtocolMessageBase {
  protocolVersion: typeof PRESENTER_PROTOCOL_VERSION;
  sessionId: string;
}

/** Commands a presenter may send; countdown expiry is only ever raised by the main window. */
export type PresenterCommand = Exclude<SessionCommand, { type: "autoAdvanceExpired" }>;

export type PresenterToMainMessage =
  | (ProtocolMessageBase & { type: "hello" })
  | (ProtocolMessageBase & {
      type: "command";
      generation: number;
      commandId: number;
      command: PresenterCommand;
    })
  | (ProtocolMessageBase & { type: "presenter-closing"; generation: number });

export type MainToPresenterMessage =
  | (ProtocolMessageBase & {
      type: "snapshot";
      generation: number;
      revision: number;
      state: SessionSnapshot;
    })
  | (ProtocolMessageBase & { type: "heartbeat"; generation: number })
  | (ProtocolMessageBase & { type: "shutdown" });

export type PresenterProtocolMessage = PresenterToMainMessage | MainToPresenterMessage;

/**
 * Main-window protocol state. Every handshake starts a new connection generation, so commands
 * from a superseded connection are rejected; `revision` orders snapshots across generations.
 */
export interface MainProtocolState {
  generation: number;
  revision: number;
  lastCommandId: number;
}

export interface PresenterProtocolState {
  generation: number;
  revision: number;
}

export type MainProtocolDecision =
  | { accepted: false; reason: string }
  | { accepted: true; kind: "handshake"; state: MainProtocolState }
  | { accepted: true; kind: "command"; state: MainProtocolState; command: PresenterCommand }
  | { accepted: true; kind: "presenter-closing" };

export type PresenterProtocolDecision =
  | { accepted: false; reason: string }
  | { accepted: true; kind: "snapshot"; state: PresenterProtocolState; snapshot: SessionSnapshot }
  /** Liveness; `current` is false when the main window has moved to another generation. */
  | { accepted: true; kind: "heartbeat"; current: boolean }
  | { accepted: true; kind: "shutdown" };

export const INITIAL_MAIN_PROTOCOL_STATE: MainProtocolState = {
  generation: 0,
  revision: 0,
  lastCommandId: 0,
};

export const INITIAL_PRESENTER_PROTOCOL_STATE: PresenterProtocolState = {
  generation: 0,
  revision: -1,
};

/** The next snapshot message, together with the protocol state that records its revision. */
export function nextSnapshotMessage(
  state: MainProtocolState,
  sessionId: string,
  snapshot: SessionSnapshot,
): { state: MainProtocolState; message: MainToPresenterMessage } {
  const revision = state.revision + 1;
  return {
    state: { ...state, revision },
    message: {
      type: "snapshot",
      protocolVersion: PRESENTER_PROTOCOL_VERSION,
      sessionId,
      generation: state.generation,
      revision,
      state: {
        position: snapshot.position,
        timer: snapshot.timer,
        autoAdvance: snapshot.autoAdvance,
      },
    },
  };
}

/** Validate untrusted channel data once, at the channel boundary. */
export function isPresenterProtocolMessage(value: unknown): value is PresenterProtocolMessage {
  if (!isRecord(value) || !isProtocolBase(value)) return false;
  switch (value.type) {
    case "hello":
    case "shutdown":
      return true;
    case "command":
      return (
        isPositiveInteger(value.generation) &&
        isPositiveInteger(value.commandId) &&
        isPresenterCommand(value.command)
      );
    case "presenter-closing":
    case "heartbeat":
      return isPositiveInteger(value.generation);
    case "snapshot":
      return (
        isPositiveInteger(value.generation) &&
        isNonNegativeInteger(value.revision) &&
        isSessionSnapshot(value.state)
      );
    default:
      return false;
  }
}

/** Decide whether a validated presenter message may affect the main session. */
export function decideMainMessage(
  current: MainProtocolState,
  message: PresenterProtocolMessage,
): MainProtocolDecision {
  switch (message.type) {
    case "hello":
      return {
        accepted: true,
        kind: "handshake",
        state: { ...current, generation: current.generation + 1, lastCommandId: 0 },
      };
    case "command":
      if (message.generation !== current.generation) {
        return { accepted: false, reason: "superseded-generation" };
      }
      if (message.commandId <= current.lastCommandId) {
        return { accepted: false, reason: "duplicate-command" };
      }
      return {
        accepted: true,
        kind: "command",
        command: message.command,
        state: { ...current, lastCommandId: message.commandId },
      };
    case "presenter-closing":
      return message.generation === current.generation
        ? { accepted: true, kind: "presenter-closing" }
        : { accepted: false, reason: "superseded-generation" };
    default:
      return { accepted: false, reason: "wrong-direction" };
  }
}

/** Decide whether a validated main-window message advances the presenter's accepted state. */
export function decidePresenterMessage(
  current: PresenterProtocolState,
  message: PresenterProtocolMessage,
): PresenterProtocolDecision {
  switch (message.type) {
    case "snapshot":
      if (message.generation < current.generation) {
        return { accepted: false, reason: "superseded-generation" };
      }
      if (message.revision <= current.revision) {
        return { accepted: false, reason: "stale-revision" };
      }
      return {
        accepted: true,
        kind: "snapshot",
        snapshot: message.state,
        state: { generation: message.generation, revision: message.revision },
      };
    case "heartbeat":
      return {
        accepted: true,
        kind: "heartbeat",
        current: message.generation === current.generation,
      };
    case "shutdown":
      return { accepted: true, kind: "shutdown" };
    default:
      return { accepted: false, reason: "wrong-direction" };
  }
}

function isProtocolBase(value: Record<string, unknown>): boolean {
  return (
    value.protocolVersion === PRESENTER_PROTOCOL_VERSION &&
    typeof value.sessionId === "string" &&
    value.sessionId.trim().length > 0 &&
    value.sessionId.length <= MAX_SESSION_ID_LENGTH &&
    typeof value.type === "string"
  );
}

function isSessionSnapshot(value: unknown): value is SessionSnapshot {
  return (
    isRecord(value) &&
    isPosition(value.position) &&
    isTimerSnapshot(value.timer) &&
    isTimerSnapshot(value.autoAdvance)
  );
}

function isPresenterCommand(value: unknown): value is PresenterCommand {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "navigation":
      return isNavigationAction(value.action);
    case "timer":
      return isTimerCommand(value.command);
    case "autoAdvance":
      return value.command === "pause" || value.command === "resume" || value.command === "toggle";
    default:
      return false;
  }
}

function isNavigationAction(value: unknown): value is NavigationAction {
  if (!isRecord(value)) return false;
  switch (value.type) {
    case "nextStep":
    case "prevStep":
    case "nextSlide":
    case "prevSlide":
    case "nextKeyFrame":
    case "prevKeyFrame":
    case "first":
    case "last":
      return true;
    case "goto":
      return isPosition(value.position);
    default:
      return false;
  }
}

function isPosition(value: unknown): value is Position {
  return isRecord(value) && isPositiveInteger(value.slide) && isPositiveInteger(value.step);
}

function isTimerSnapshot(value: unknown): value is TimerSnapshot {
  return (
    isRecord(value) &&
    isNonNegativeNumber(value.startedAt) &&
    (value.pausedElapsed === null || isNonNegativeNumber(value.pausedElapsed))
  );
}

function isTimerCommand(value: unknown): value is TimerCommand {
  return value === "reset" || value === "pause" || value === "resume";
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
