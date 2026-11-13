import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

/** Minimal Node-native CDP client for focused browser smoke checks. */
export class CdpClient {
  #socket;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();

  constructor(socket) {
    this.#socket = socket;
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!Number.isInteger(message.id)) {
        for (const listener of this.#listeners.get(message.method) ?? []) listener(message.params);
        return;
      }
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`CDP websocket failed: ${url}`)), {
        once: true,
      });
    });
    return new CdpClient(socket);
  }

  async send(method, params = {}) {
    const id = this.#nextId++;
    const response = new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
    });
    this.#socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  /** Subscribe to a CDP event; returns an unsubscribe function. */
  on(method, listener) {
    const listeners = this.#listeners.get(method) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }

  async close() {
    for (const pending of this.#pending.values()) {
      pending.reject(new Error("CDP connection closed"));
    }
    this.#pending.clear();
    this.#socket.close();
  }
}

export async function waitForDevtoolsPort(profilePath, process, timeoutMs = 10_000) {
  const portFile = `${profilePath}/DevToolsActivePort`;
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(`Browser exited before CDP startup (code ${process.exitCode})`);
    }
    try {
      const file = await readFile(portFile, "utf8");
      const port = Number(file.split("\n", 1)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch (error) {
      lastError = error;
    }
    await delay(50);
  }
  throw new Error(
    `Timed out waiting for browser CDP startup: ${lastError?.message ?? "no port file"}`,
  );
}

export async function waitFor(predicate, { timeoutMs = 5000, intervalMs = 50 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await predicate();
    if (last) return last;
    await delay(intervalMs);
  }
  throw new Error("Timed out waiting for browser condition");
}
