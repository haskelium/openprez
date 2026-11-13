import { describe, expect, it } from "vitest";
import {
  candidateExecutables,
  discoverBrowser,
  inferEngine,
  resolveBrowser,
  screenshotArguments,
} from "./browsers.mjs";

const existsAmong = (paths) => (candidate) => paths.includes(candidate);

describe("candidate executables", () => {
  it("looks up Linux commands on PATH", () => {
    const env = { PATH: "/usr/local/bin:/usr/bin" };
    expect(candidateExecutables("chrome", "linux", env)).toEqual([
      "/usr/local/bin/google-chrome",
      "/usr/local/bin/google-chrome-stable",
      "/usr/local/bin/chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chrome",
    ]);
  });

  it("tries macOS app bundles before PATH", () => {
    const env = { PATH: "/opt/homebrew/bin", HOME: "/Users/ada" };
    expect(candidateExecutables("edge", "darwin", env)).toEqual([
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Users/ada/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/opt/homebrew/bin/microsoft-edge",
      "/opt/homebrew/bin/microsoft-edge-stable",
    ]);
  });

  it("builds Windows install paths from the environment, then PATH", () => {
    const env = {
      PROGRAMFILES: "C:\\Program Files",
      "PROGRAMFILES(X86)": "C:\\Program Files (x86)",
      LOCALAPPDATA: "C:\\Users\\ada\\AppData\\Local",
      PATH: "C:\\Tools",
    };
    expect(candidateExecutables("edge", "win32", env)).toEqual([
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Users\\ada\\AppData\\Local\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Tools\\msedge.exe",
    ]);
  });

  it("skips Windows install roots that are not set", () => {
    const env = { PROGRAMFILES: "C:\\Program Files" };
    expect(candidateExecutables("firefox", "win32", env)).toEqual([
      "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
    ]);
  });
});

describe("auto-detection", () => {
  it("prefers Chrome, then Chromium, then Edge, then Firefox", () => {
    const env = { PATH: "/usr/bin" };
    const exists = existsAmong([
      "/usr/bin/firefox",
      "/usr/bin/chromium",
      "/usr/bin/microsoft-edge",
    ]);
    expect(discoverBrowser({ platform: "linux", env, exists })).toEqual({
      name: "chromium",
      engine: "chromium",
      executable: "/usr/bin/chromium",
    });
  });

  it("falls back to Firefox when no Chromium-engine browser is installed", () => {
    const env = { PATH: "/usr/bin" };
    const browser = discoverBrowser({
      platform: "linux",
      env,
      exists: existsAmong(["/usr/bin/firefox-esr"]),
    });
    expect(browser).toEqual({
      name: "firefox",
      engine: "firefox",
      executable: "/usr/bin/firefox-esr",
    });
  });

  it("finds Chrome in a macOS app bundle", () => {
    const executable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    const browser = discoverBrowser({
      platform: "darwin",
      env: { PATH: "/usr/bin" },
      exists: existsAmong([executable]),
    });
    expect(browser).toEqual({ name: "chrome", engine: "chromium", executable });
  });

  it("returns null when nothing is installed", () => {
    expect(
      discoverBrowser({ platform: "linux", env: { PATH: "/usr/bin" }, exists: () => false }),
    ).toBe(null);
  });
});

describe("explicit browser choice", () => {
  const system = { platform: "linux", env: { PATH: "/usr/bin" } };

  it("uses a named browser when installed", () => {
    const result = resolveBrowser({
      ...system,
      choice: "Firefox",
      exists: existsAmong(["/usr/bin/firefox", "/usr/bin/google-chrome"]),
    });
    expect(result).toEqual({
      ok: true,
      browser: { name: "firefox", engine: "firefox", executable: "/usr/bin/firefox" },
    });
  });

  it("reports a named browser that is not installed", () => {
    const result = resolveBrowser({ ...system, choice: "edge", exists: () => false });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Edge was not found");
  });

  it("infers the engine from an executable path", () => {
    const result = resolveBrowser({
      ...system,
      choice: "/opt/custom/msedge",
      exists: existsAmong(["/opt/custom/msedge"]),
    });
    expect(result).toEqual({
      ok: true,
      browser: { name: "custom", engine: "chromium", executable: "/opt/custom/msedge" },
    });
  });

  it("requires --engine when the executable name is unrecognised", () => {
    const exists = existsAmong(["/opt/custom/browser"]);
    const missing = resolveBrowser({ ...system, choice: "/opt/custom/browser", exists });
    expect(missing.ok).toBe(false);
    expect(missing.error).toContain("--engine");
    const explicit = resolveBrowser({
      ...system,
      choice: "/opt/custom/browser",
      engine: "firefox",
      exists,
    });
    expect(explicit).toEqual({
      ok: true,
      browser: { name: "custom", engine: "firefox", executable: "/opt/custom/browser" },
    });
  });

  it("reports a missing executable path", () => {
    const result = resolveBrowser({ ...system, choice: "/nonexistent", exists: () => false });
    expect(result).toEqual({ ok: false, error: "Browser executable not found: /nonexistent" });
  });

  it("rejects an unknown engine", () => {
    const result = resolveBrowser({ ...system, engine: "webkit", exists: () => true });
    expect(result.ok).toBe(false);
  });
});

describe("engine inference", () => {
  it("recognises the supported executables on every platform", () => {
    expect(inferEngine("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")).toBe(
      "chromium",
    );
    expect(inferEngine("/Applications/Chromium.app/Contents/MacOS/Chromium")).toBe("chromium");
    expect(inferEngine("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")).toBe(
      "chromium",
    );
    expect(inferEngine("/usr/bin/firefox-esr")).toBe("firefox");
    expect(inferEngine("/usr/bin/safari")).toBe(null);
  });
});

describe("screenshot arguments", () => {
  const capture = {
    profileDirectory: "/tmp/profile",
    width: 1900,
    height: 2400,
    pngPath: "/repo/dist/report.png",
    url: "file:///repo/dist/report.html",
  };

  it("builds Chromium headless flags with an isolated profile", () => {
    expect(screenshotArguments("chromium", capture)).toEqual([
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=/tmp/profile",
      "--window-size=1900,2400",
      "--screenshot=/repo/dist/report.png",
      "file:///repo/dist/report.html",
    ]);
  });

  it("builds Firefox headless flags with an isolated profile", () => {
    expect(screenshotArguments("firefox", capture)).toEqual([
      "--headless",
      "--no-remote",
      "--profile",
      "/tmp/profile",
      "--window-size",
      "1900,2400",
      "--screenshot",
      "/repo/dist/report.png",
      "file:///repo/dist/report.html",
    ]);
  });
});
