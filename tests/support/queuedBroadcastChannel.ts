export interface QueuedChannelInstance {
  readonly name: string;
  readonly closed: boolean;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  postMessage(data: unknown): void;
  close(): void;
}

export interface QueuedMessage {
  target: QueuedChannelInstance;
  data: unknown;
}

export interface SentMessage {
  sender: QueuedChannelInstance;
  data: unknown;
}

export interface QueuedBroadcastChannelHarness {
  BroadcastChannel: new (name: string) => QueuedChannelInstance;
  instances: QueuedChannelInstance[];
  pending: QueuedMessage[];
  sent: SentMessage[];
  deliverAll(): void;
  deliverTo(target: QueuedChannelInstance): void;
  deliverMessage(target: QueuedChannelInstance, data: unknown): void;
}

/** A fresh, manually delivered BroadcastChannel network for race and ordering tests. */
export function createQueuedBroadcastChannel(): QueuedBroadcastChannelHarness {
  const channels = new Map<string, Set<QueuedChannelInstance>>();
  const instances: QueuedChannelInstance[] = [];
  const pending: QueuedMessage[] = [];
  const sent: SentMessage[] = [];

  class QueuedChannel implements QueuedChannelInstance {
    readonly name: string;
    private readonly listeners = new Set<(event: MessageEvent) => void>();
    private isClosed = false;

    constructor(name: string) {
      this.name = name;
      const peers = channels.get(name) ?? new Set<QueuedChannelInstance>();
      peers.add(this);
      channels.set(name, peers);
      instances.push(this);
    }

    get closed(): boolean {
      return this.isClosed;
    }

    postMessage(data: unknown): void {
      if (this.isClosed) return;
      sent.push({ sender: this, data });
      for (const target of channels.get(this.name) ?? []) {
        if (target !== this && !target.closed) pending.push({ target, data });
      }
    }

    addEventListener(_type: "message", listener: (event: MessageEvent) => void): void {
      this.listeners.add(listener);
    }

    removeEventListener(_type: "message", listener: (event: MessageEvent) => void): void {
      this.listeners.delete(listener);
    }

    close(): void {
      this.isClosed = true;
      this.listeners.clear();
      channels.get(this.name)?.delete(this);
    }

    deliver(data: unknown): void {
      if (this.isClosed) return;
      for (const listener of this.listeners) listener({ data } as MessageEvent);
    }
  }

  function deliverMessage(target: QueuedChannelInstance, data: unknown): void {
    if (target instanceof QueuedChannel) target.deliver(data);
  }

  function deliverTo(target: QueuedChannelInstance): void {
    const batch = pending.splice(0);
    for (const message of batch) {
      if (message.target === target) deliverMessage(message.target, message.data);
      else pending.push(message);
    }
  }

  function deliverAll(): void {
    for (let batch = 0; pending.length > 0 && batch < 100; batch += 1) {
      const messages = pending.splice(0);
      for (const message of messages) deliverMessage(message.target, message.data);
    }
    if (pending.length > 0) throw new Error("Queued BroadcastChannel messages did not settle");
  }

  return {
    BroadcastChannel: QueuedChannel,
    instances,
    pending,
    sent,
    deliverAll,
    deliverTo,
    deliverMessage,
  };
}
