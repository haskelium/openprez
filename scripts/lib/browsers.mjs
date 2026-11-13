// Pure browser discovery and command building shared by template reports and browser tests.
// Every function takes the platform, environment and an existence check as inputs,
// so the per-platform behavior can be unit-tested from any host.
import { posix, win32 } from "node:path";

/** Browsers tried in this order when none is named. */
export const BROWSER_NAMES = ["chrome", "chromium", "edge", "firefox"];

const ENGINE_BY_BROWSER = {
  chrome: "chromium",
  chromium: "chromium",
  edge: "chromium",
  firefox: "firefox",
};

const LABEL_BY_BROWSER = {
  chrome: "Chrome",
  chromium: "Chromium",
  edge: "Edge",
  firefox: "Firefox",
};

const UNIX_COMMANDS = {
  chrome: ["google-chrome", "google-chrome-stable", "chrome"],
  chromium: ["chromium", "chromium-browser"],
  edge: ["microsoft-edge", "microsoft-edge-stable"],
  firefox: ["firefox", "firefox-esr"],
};

const MAC_APP_BINARIES = {
  chrome: "Google Chrome.app/Contents/MacOS/Google Chrome",
  chromium: "Chromium.app/Contents/MacOS/Chromium",
  edge: "Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  firefox: "Firefox.app/Contents/MacOS/firefox",
};

const WINDOWS_INSTALL_PATHS = {
  chrome: "Google\\Chrome\\Application\\chrome.exe",
  chromium: "Chromium\\Application\\chrome.exe",
  edge: "Microsoft\\Edge\\Application\\msedge.exe",
  firefox: "Mozilla Firefox\\firefox.exe",
};

const WINDOWS_COMMANDS = {
  chrome: ["chrome.exe"],
  chromium: ["chromium.exe"],
  edge: ["msedge.exe"],
  firefox: ["firefox.exe"],
};

/** Human-readable list of the supported browsers, for messages. */
export function supportedBrowsersLabel() {
  return BROWSER_NAMES.map((name) => LABEL_BY_BROWSER[name]).join(", ");
}

/** Directories listed in the PATH variable, split with the platform's delimiter. */
export function pathDirectories(platform, env) {
  const value = platform === "win32" ? (env.PATH ?? env.Path ?? "") : (env.PATH ?? "");
  const delimiter = platform === "win32" ? ";" : ":";
  return value.split(delimiter).filter((directory) => directory.length > 0);
}

function commandsOnPath(commands, platform, env) {
  const join = platform === "win32" ? win32.join : posix.join;
  return pathDirectories(platform, env).flatMap((directory) =>
    commands.map((command) => join(directory, command)),
  );
}

function windowsInstallCandidates(browser, env) {
  const roots = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(
    (root) => typeof root === "string" && root.length > 0,
  );
  return roots.map((root) => win32.join(root, WINDOWS_INSTALL_PATHS[browser]));
}

function macAppCandidates(browser, env) {
  const appFolders = ["/Applications"];
  if (env.HOME) appFolders.push(posix.join(env.HOME, "Applications"));
  return appFolders.map((folder) => posix.join(folder, MAC_APP_BINARIES[browser]));
}

/** Executable paths to try for one browser, most specific first. */
export function candidateExecutables(browser, platform, env) {
  if (platform === "win32") {
    return [
      ...windowsInstallCandidates(browser, env),
      ...commandsOnPath(WINDOWS_COMMANDS[browser], platform, env),
    ];
  }
  if (platform === "darwin") {
    return [
      ...macAppCandidates(browser, env),
      ...commandsOnPath(UNIX_COMMANDS[browser], platform, env),
    ];
  }
  return commandsOnPath(UNIX_COMMANDS[browser], platform, env);
}

function findBrowser(browser, { platform, env, exists }) {
  const executable = candidateExecutables(browser, platform, env).find(exists);
  if (!executable) return null;
  return { name: browser, engine: ENGINE_BY_BROWSER[browser], executable };
}

/** The first supported browser installed, in auto-detection order, or null. */
export function discoverBrowser(system) {
  for (const browser of BROWSER_NAMES) {
    const found = findBrowser(browser, system);
    if (found) return found;
  }
  return null;
}

/** Engine implied by an executable's file name, or null when unrecognised. */
export function inferEngine(executable) {
  const fileName = executable.split(/[\\/]/).pop()?.toLowerCase() ?? "";
  if (fileName.includes("firefox")) return "firefox";
  if (/chrome|chromium|msedge|microsoft edge|microsoft-edge/.test(fileName)) return "chromium";
  return null;
}

function resolveExecutablePath(choice, engine, exists) {
  if (!exists(choice)) {
    return { ok: false, error: `Browser executable not found: ${choice}` };
  }
  const resolvedEngine = engine ?? inferEngine(choice);
  if (!resolvedEngine) {
    return {
      ok: false,
      error: `Cannot tell the engine of ${choice}; pass --engine chromium or --engine firefox.`,
    };
  }
  return { ok: true, browser: { name: "custom", engine: resolvedEngine, executable: choice } };
}

/**
 * Resolves the browser to use: a named browser, an executable path, or auto-detection.
 * Returns { ok: true, browser } with browser null when auto-detection finds nothing,
 * or { ok: false, error } when an explicit choice cannot be honored.
 */
export function resolveBrowser({ choice, engine, platform, env, exists }) {
  if (engine !== undefined && engine !== "chromium" && engine !== "firefox") {
    return { ok: false, error: `Unknown engine "${engine}"; use chromium or firefox.` };
  }
  if (choice === undefined) {
    return { ok: true, browser: discoverBrowser({ platform, env, exists }) };
  }
  const named = choice.toLowerCase();
  if (BROWSER_NAMES.includes(named)) {
    const found = findBrowser(named, { platform, env, exists });
    if (found) return { ok: true, browser: found };
    return {
      ok: false,
      error: `${LABEL_BY_BROWSER[named]} was not found; pass its executable path with --browser <path>.`,
    };
  }
  return resolveExecutablePath(choice, engine, exists);
}

/** Command-line arguments that capture `url` into `pngPath` at the given window size. */
export function screenshotArguments(engine, { profileDirectory, width, height, pngPath, url }) {
  if (engine === "firefox") {
    return [
      "--headless",
      "--no-remote",
      "--profile",
      profileDirectory,
      "--window-size",
      `${width},${height}`,
      "--screenshot",
      pngPath,
      url,
    ];
  }
  return [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDirectory}`,
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    url,
  ];
}
