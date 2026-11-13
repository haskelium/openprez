import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSnapshot } from "../player/session";
import {
  decidePresenterMessage,
  INITIAL_PRESENTER_PROTOCOL_STATE,
  PRESENTER_PROTOCOL_VERSION,
  type PresenterCommand,
} from "./protocol";
import {
  isMainWindowLost,
  LINKED_WINDOW_POLL_MS,
  openPresenterChannel,
  type PresenterChannel,
} from "./sync";

const MAX_HANDSHAKE_ATTEMPTS = 5;
const HANDSHAKE_RETRY_MS = 1000;

export type PresenterConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "unsupported"
  | "ended";

export interface PresenterSession {
  connectionState: PresenterConnectionState;
  /** Last complete state accepted from the main window; retained while disconnected. */
  snapshot: SessionSnapshot | null;
  /** Sends a command only while connected; nothing is queued while disconnected. */
  sendCommand: (command: PresenterCommand) => void;
}

/** Presenter-side adapter: handshakes for complete snapshots and never owns session state. */
export function usePresenterSession(sessionId: string): PresenterSession {
  const [connectionState, setConnectionState] = useState<PresenterConnectionState>(() =>
    typeof BroadcastChannel === "undefined" ? "unsupported" : "connecting",
  );
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const channelRef = useRef<PresenterChannel | null>(null);
  const protocolRef = useRef(INITIAL_PRESENTER_PROTOCOL_STATE);
  const connectionStateRef = useRef(connectionState);
  const commandIdRef = useRef(0);

  const changeConnectionState = useCallback((state: PresenterConnectionState) => {
    connectionStateRef.current = state;
    setConnectionState(state);
  }, []);

  useEffect(() => {
    const channel = openPresenterChannel(sessionId);
    if (!channel) {
      changeConnectionState("unsupported");
      return;
    }
    channelRef.current = channel;
    let lastHeard = Date.now();
    let attemptsLeft = 0;
    let retryTimer: number | undefined;

    const endSession = () => {
      window.clearTimeout(retryTimer);
      changeConnectionState("ended");
      // Browsers refuse to close windows they did not open; the "ended" status then explains it.
      window.close();
    };

    const sendHello = () => {
      if (attemptsLeft === 0) {
        changeConnectionState("disconnected");
        return;
      }
      attemptsLeft -= 1;
      channel.send({ type: "hello", protocolVersion: PRESENTER_PROTOCOL_VERSION, sessionId });
      retryTimer = window.setTimeout(sendHello, HANDSHAKE_RETRY_MS);
    };

    /** Disable remote controls and ask for a fresh snapshot, unless a handshake is under way. */
    const resynchronize = () => {
      const state = connectionStateRef.current;
      if (state === "ended" || (state === "connecting" && attemptsLeft > 0)) return;
      changeConnectionState("connecting");
      attemptsLeft = MAX_HANDSHAKE_ATTEMPTS;
      window.clearTimeout(retryTimer);
      sendHello();
    };

    const unsubscribe = channel.onMessage((message) => {
      const decision = decidePresenterMessage(protocolRef.current, message);
      if (!decision.accepted) return;
      lastHeard = Date.now();
      switch (decision.kind) {
        case "snapshot":
          if (decision.state.generation !== protocolRef.current.generation) {
            commandIdRef.current = 0;
          }
          protocolRef.current = decision.state;
          attemptsLeft = 0;
          window.clearTimeout(retryTimer);
          setSnapshot(decision.snapshot);
          changeConnectionState("connected");
          return;
        case "heartbeat":
          // Liveness after a gap, or from a newer generation, means the view may be stale.
          if (!decision.current || connectionStateRef.current !== "connected") resynchronize();
          return;
        case "shutdown":
          endSession();
      }
    });

    resynchronize();
    const watchdog = window.setInterval(() => {
      if (window.opener?.closed === true) {
        endSession();
        return;
      }
      if (connectionStateRef.current === "connected" && isMainWindowLost(lastHeard, Date.now())) {
        resynchronize();
      }
    }, LINKED_WINDOW_POLL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && connectionStateRef.current !== "connected") {
        resynchronize();
      }
    };
    const onFocus = () => {
      if (connectionStateRef.current !== "connected") resynchronize();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const onPageHide = () => {
      const { generation } = protocolRef.current;
      if (generation === 0) return;
      channel.send({
        type: "presenter-closing",
        protocolVersion: PRESENTER_PROTOCOL_VERSION,
        sessionId,
        generation,
      });
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(watchdog);
      window.clearTimeout(retryTimer);
      unsubscribe();
      channel.close();
      channelRef.current = null;
    };
  }, [changeConnectionState, sessionId]);

  const sendCommand = useCallback(
    (command: PresenterCommand) => {
      const channel = channelRef.current;
      const { generation } = protocolRef.current;
      if (connectionStateRef.current !== "connected" || !channel || generation === 0) return;
      commandIdRef.current += 1;
      channel.send({
        type: "command",
        protocolVersion: PRESENTER_PROTOCOL_VERSION,
        sessionId,
        generation,
        commandId: commandIdRef.current,
        command,
      });
    },
    [sessionId],
  );

  return { connectionState, snapshot, sendCommand };
}
