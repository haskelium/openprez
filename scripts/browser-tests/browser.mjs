import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { CdpClient, waitFor, waitForDevtoolsPort } from "./cdp.mjs";
import { findBrowser } from "./findBrowser.mjs";

export { waitFor };
export const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Launch an isolated headless Chromium and run `scenario` against its first page. */
export async function withBrowser(scenario) {
  const browser = await findBrowser();
  let launch;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      launch = await launchBrowser(browser);
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      console.warn(`Browser startup failed; retrying with a fresh profile: ${error.message}`);
    }
  }
  const { child, profile, port } = launch;
  let client;
  try {
    const page = (await listPageTargets(port)).find((target) => target.webSocketDebuggerUrl);
    if (!page) throw new Error("Chromium did not expose a page target");
    client = await connectPage(page.webSocketDebuggerUrl);
    await scenario({ client, port });
  } finally {
    await client?.close();
    await stopProcess(child);
    await rm(profile, { recursive: true, force: true });
  }
}

async function launchBrowser(browser) {
  const profile = await mkdtemp(join(tmpdir(), "openprez-browser-"));
  let child;
  let stderr = "";
  try {
    child = spawn(
      browser,
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdio: ["ignore", "ignore", "pipe"], detached: process.platform !== "win32" },
    );
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-8192);
    });
    const launchFailure = new Promise((_, reject) => {
      child.once("error", (error) =>
        reject(new Error(`Could not launch browser at ${browser}: ${error.message}`)),
      );
    });
    const port = await Promise.race([waitForDevtoolsPort(profile, child), launchFailure]);
    return { child, profile, port };
  } catch (error) {
    await stopProcess(child);
    await rm(profile, { recursive: true, force: true });
    throw new Error(
      `${error.message}${stderr.trim() ? `\nBrowser stderr:\n${stderr.trim()}` : ""}`,
    );
  }
}

export async function listPageTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`Could not list browser targets: ${response.status}`);
  return (await response.json()).filter((target) => target.type === "page");
}

export async function connectPage(webSocketUrl) {
  const client = await CdpClient.connect(webSocketUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  return client;
}

/** Evaluate an expression in the page and return its JSON value. */
export async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result?.value;
}

/** Wait until an expression is truthy, tolerating evaluations interrupted by navigation. */
export function waitForPage(client, expression, timeoutMs = 10_000) {
  return waitFor(
    async () => {
      try {
        return await evaluate(client, expression);
      } catch (error) {
        if (/Inspected target navigated|Execution context was destroyed/.test(error.message)) {
          return null;
        }
        throw error;
      }
    },
    { timeoutMs },
  );
}

export function navigate(client, url) {
  return client.send("Page.navigate", { url });
}

export async function pressKey(client, key) {
  const keyCodes = { ArrowLeft: 37, ArrowRight: 39, n: 78, p: 80 };
  const event = { key, code: key, windowsVirtualKeyCode: keyCodes[key] };
  await client.send("Input.dispatchKeyEvent", { type: "keyDown", ...event });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

/** Click an element with real mouse input, so user-activation rules (popups) apply. */
export async function click(client, selector) {
  const center = await evaluate(
    client,
    `(() => {
      const rect = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
      return rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    })()`,
  );
  if (!center) throw new Error(`Could not find clickable element: ${selector}`);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await client.send("Input.dispatchMouseEvent", {
      type,
      ...center,
      button: "left",
      clickCount: 1,
    });
  }
}

export async function swipe(client, from, to) {
  const touch = (type, point) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: point ? [{ id: 1, ...point }] : [],
    });
  await touch("touchStart", from);
  for (let index = 1; index <= 6; index += 1) {
    const progress = index / 6;
    await touch("touchMove", {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    });
  }
  await touch("touchEnd");
}

/** Start the Vite dev server on a free port and return the showcase URL. */
export async function startViteServer() {
  const port = await availablePort();
  const server = spawn(
    "pnpm",
    ["exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", detached: process.platform !== "win32" },
  );
  const url = `http://127.0.0.1:${port}/showcase.html`;
  const launchFailure = new Promise((_, reject) => {
    server.once("error", (error) => reject(new Error(`Could not start Vite: ${error.message}`)));
  });
  try {
    await Promise.race([
      waitFor(
        () =>
          fetch(url).then(
            (response) => response.ok,
            () => null,
          ),
        { timeoutMs: 30_000 },
      ),
      launchFailure,
    ]);
  } catch (error) {
    await stopProcess(server);
    throw error;
  }
  return { server, url };
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

/** Stop a detached child and its process group, escalating to SIGKILL after three seconds. */
export async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", () => resolve(true)));
  signalProcessGroup(child, "SIGTERM");
  if (!(await Promise.race([exited, delay(3000).then(() => false)]))) {
    signalProcessGroup(child, "SIGKILL");
    await exited;
  }
}

function signalProcessGroup(child, signal) {
  try {
    if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
