import { useCallback, useEffect, useRef, useState } from "react";
import { toHash } from "../player/navigation";
import type { SessionCommand, SessionSnapshot } from "../player/session";
import {
  decideMainMessage,
  INITIAL_MAIN_PROTOCOL_STATE,
  type MainProtocolState,
  nextSnapshotMessage,
  PRESENTER_PROTOCOL_VERSION,
} from "./protocol";
import {
  CLOSING_RECHECK_MS,
  createSessionId,
  HEARTBEAT_INTERVAL_MS,
  LINKED_WINDOW_POLL_MS,
  openPresenterChannel,
  type PresenterChannel,
  presenterUrl,
} from "./sync";

const ERROR_VISIBLE_MS = 6000;
const BLOCKED_MESSAGE = "Allow pop-ups to open speaker notes";
const UNSUPPORTED_MESSAGE = "Synchronized presenter notes are unavailable in this browser";

export interface PresenterWindowState {
  open: boolean;
  error: string | null;
  /** Opens the presenter window, or closes it when open. Stable across renders. */
  toggle: () => void;
}

/** Main-window adapter: owns the popup lifecycle and publishes authoritative session snapshots. */
export function usePresenterWindow(
  sessionSnapshot: SessionSnapshot,
  dispatchCommand: (command: SessionCommand) => void,
): PresenterWindowState {
  const [sessionId] = useState(createSessionId);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<Window | null>(null);
  const channelRef = useRef<PresenterChannel | null>(null);
  const protocolRef = useRef<MainProtocolState>(INITIAL_MAIN_PROTOCOL_STATE);
  const latestRef = useRef({ sessionSnapshot, dispatchCommand });

  useEffect(() => {
    latestRef.current = { sessionSnapshot, dispatchCommand };
  });

  const markClosed = useCallback(() => {
    handleRef.current = null;
    setOpen(false);
  }, []);

  const publishSnapshot = useCallback(
    (channel: PresenterChannel, snapshot: SessionSnapshot) => {
      if (protocolRef.current.generation === 0) return; // No presenter has connected yet.
      const next = nextSnapshotMessage(protocolRef.current, sessionId, snapshot);
      protocolRef.current = next.state;
      channel.send(next.message);
    },
    [sessionId],
  );

  useEffect(() => {
    const channel = openPresenterChannel(sessionId);
    if (!channel) return;
    channelRef.current = channel;
    protocolRef.current = INITIAL_MAIN_PROTOCOL_STATE;
    let closingRecheck: number | undefined;

    const unsubscribe = channel.onMessage((message) => {
      const decision = decideMainMessage(protocolRef.current, message);
      if (!decision.accepted) return;
      switch (decision.kind) {
        case "handshake":
          protocolRef.current = decision.state;
          if (handleRef.current?.closed === false) setOpen(true);
          publishSnapshot(channel, latestRef.current.sessionSnapshot);
          return;
        case "command":
          protocolRef.current = decision.state;
          latestRef.current.dispatchCommand(decision.command);
          return;
        case "presenter-closing":
          // A reload also says "closing"; only a handle that is really closed marks it closed.
          window.clearTimeout(closingRecheck);
          closingRecheck = window.setTimeout(() => {
            if (handleRef.current?.closed !== false) markClosed();
          }, CLOSING_RECHECK_MS);
      }
    });

    const heartbeat = window.setInterval(() => {
      const { generation } = protocolRef.current;
      // Stop once the popup this window opened is known to be closed.
      if (generation === 0 || handleRef.current?.closed === true) return;
      channel.send({
        type: "heartbeat",
        protocolVersion: PRESENTER_PROTOCOL_VERSION,
        sessionId,
        generation,
      });
    }, HEARTBEAT_INTERVAL_MS);

    const onPageHide = () => {
      channel.send({ type: "shutdown", protocolVersion: PRESENTER_PROTOCOL_VERSION, sessionId });
      handleRef.current?.close();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.clearInterval(heartbeat);
      window.clearTimeout(closingRecheck);
      unsubscribe();
      channel.close();
      channelRef.current = null;
    };
  }, [markClosed, publishSnapshot, sessionId]);

  useEffect(() => {
    const channel = channelRef.current;
    if (channel) publishSnapshot(channel, sessionSnapshot);
  }, [publishSnapshot, sessionSnapshot]);

  useEffect(() => {
    if (!open) return;
    const poll = window.setInterval(() => {
      if (handleRef.current?.closed !== false) markClosed();
    }, LINKED_WINDOW_POLL_MS);
    return () => window.clearInterval(poll);
  }, [open, markClosed]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), ERROR_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  const toggle = useCallback(() => {
    const current = handleRef.current;
    if (current && !current.closed) {
      current.close();
      markClosed();
      return;
    }
    if (!channelRef.current) {
      setError(UNSUPPORTED_MESSAGE);
      return;
    }
    const { position } = latestRef.current.sessionSnapshot;
    const handle = window.open(
      presenterUrl(window.location.pathname, toHash(position), sessionId),
      `presenter-${sessionId}`,
      "popup,width=1280,height=800",
    );
    if (!handle) {
      setError(BLOCKED_MESSAGE);
      return;
    }
    handleRef.current = handle;
    setError(null);
    setOpen(true);
  }, [markClosed, sessionId]);

  return { open, error, toggle };
}
