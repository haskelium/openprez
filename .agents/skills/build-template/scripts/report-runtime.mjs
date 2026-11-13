import { execFile } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { screenshotArguments } from "./browsers.mjs";

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CAPTURE_TIMEOUT_MS = 30_000;
const PNG_POLL_INTERVAL_MS = 250;

export class ReportError extends Error {}

export function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    // Browser discovery probes many nonexistent paths.
    return false;
  }
}

export async function loadTemplateModule(templateDirectory) {
  const entry = join(templateDirectory, "index.ts");
  if (!existsSync(entry)) throw new ReportError(`Template entry not found: ${entry}`);
  const { createServer } = await import("vite");
  const server = await createServer({
    root: REPOSITORY_ROOT,
    configFile: join(REPOSITORY_ROOT, "vite.config.ts"),
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  try {
    return await server.ssrLoadModule(entry);
  } catch (error) {
    throw new ReportError(`Could not load ${entry}: ${error.message}`);
  } finally {
    await server.close();
  }
}

function run(executable, args, timeout) {
  return new Promise((resolveRun) => {
    execFile(executable, args, { timeout, windowsHide: true }, (error, _stdout, stderr) => {
      resolveRun({ error, stderr: String(stderr ?? "").trim() });
    });
  });
}

function screenshotFailure(executable, error, stderr) {
  const reason = error?.killed ? "timed out" : `exited with ${error?.code ?? "no screenshot"}`;
  return new ReportError(
    [
      `Screenshot failed: ${basename(executable)} ${reason}.`,
      stderr && `Browser output:\n${stderr}`,
      "If the browser is a Snap or Flatpak package, try --browser with a non-sandboxed binary.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function waitForFile(path, deadline) {
  while (Date.now() < deadline) {
    try {
      if ((await stat(path)).size > 0) return true;
    } catch (error) {
      // Some browser launchers return before the PNG exists.
      if (error.code !== "ENOENT") throw error;
    }
    await new Promise((wait) => setTimeout(wait, PNG_POLL_INTERVAL_MS));
  }
  return false;
}

export async function captureScreenshot(browser, { htmlPath, width, height, settleFonts = false }) {
  const pngPath = `${htmlPath.replace(/\.html?$/i, "")}.png`;
  await rm(pngPath, { force: true });
  const profileDirectory = await mkdtemp(join(tmpdir(), "template-report-profile-"));
  try {
    const deadline = Date.now() + CAPTURE_TIMEOUT_MS;
    const args = screenshotArguments(browser.engine, {
      profileDirectory,
      width,
      height,
      pngPath,
      url: pathToFileURL(htmlPath).href,
    });
    if (settleFonts && browser.engine === "chromium") {
      // Inline fonts still decode asynchronously; allow layout to settle before capture.
      args.unshift("--run-all-compositor-stages-before-draw", "--virtual-time-budget=5000");
    }
    const { error, stderr } = await run(browser.executable, args, CAPTURE_TIMEOUT_MS);
    if (error) throw screenshotFailure(browser.executable, error, stderr);
    if (await waitForFile(pngPath, deadline)) return pngPath;
    throw screenshotFailure(browser.executable, undefined, stderr);
  } finally {
    await rm(profileDirectory, { recursive: true, force: true });
  }
}
