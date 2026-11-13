import { isPresenterProtocolMessage, type PresenterProtocolMessage } from "./protocol";

/** Query parameter that turns the app into the presenter window for one main-window session. */
export const PRESENTER_PARAM = "presenter";
export const HEARTBEAT_INTERVAL_MS = 1000;
export const HEARTBEAT_TIMEOUT_MS = 4000;
/** How often each window checks whether the window it is linked to has closed. */
export const LINKED_WINDOW_POLL_MS = 500;
/** How long the main window waits before trusting "presenter-closing"; a reload reconnects within it. */
export const CLOSING_RECHECK_MS = 300;

/** The subset of BroadcastChannel used by synchronization so tests can inject an in-memory peer. */
export interface ChannelLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  close(): void;
}

export interface PresenterChannel {
  send(message: PresenterProtocolMessage): void;
  /** Subscribe to validated messages for this session; returns an unsubscribe function. */
  onMessage(listener: (message: PresenterProtocolMessage) => void): () => void;
  close(): void;
}

export function channelName(sessionId: string): string {
  return `presenter:${sessionId}`;
}

/** Random id that scopes one main window and its presenter window, so other tabs never cross-talk. */
export function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The validation boundary: only well-formed messages for this session reach listeners. */
export function createPresenterChannel(sessionId: string, target: ChannelLike): PresenterChannel {
  return {
    send: (message) => target.postMessage(message),
    onMessage(listener) {
      const handle = (event: MessageEvent) => {
        if (isPresenterProtocolMessage(event.data) && event.data.sessionId === sessionId) {
          listener(event.data);
        }
      };
      target.addEventListener("message", handle);
      return () => target.removeEventListener("message", handle);
    },
    close: () => target.close(),
  };
}

/** A synchronized channel, or null when BroadcastChannel is absent or cannot be constructed. */
export function openPresenterChannel(sessionId: string): PresenterChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return createPresenterChannel(sessionId, new BroadcastChannel(channelName(sessionId)));
  } catch {
    // Construction can be refused (e.g. by privacy settings); that is the unsupported case.
    return null;
  }
}

/** Whether the presenter has exceeded the heartbeat deadline without hearing from its main window. */
export function isMainWindowLost(lastHeard: number, now: number): boolean {
  return now - lastHeard > HEARTBEAT_TIMEOUT_MS;
}

/** URL of the presenter window: same page, with the session id, keeping the current position hash. */
export function presenterUrl(pathname: string, hash: string, sessionId: string): string {
  return `${pathname}?${PRESENTER_PARAM}=${encodeURIComponent(sessionId)}${hash}`;
}

/** Session id from a location search string, or null when this is not a presenter window. */
export function readPresenterSession(search: string): string | null {
  const id = new URLSearchParams(search).get(PRESENTER_PARAM);
  return id ? id : null;
}
