import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { env } from "node:process";
import { candidateExecutables } from "../lib/browsers.mjs";

const CHROMIUM_FAMILY = ["chromium", "chrome", "edge"];

async function isExecutable(path) {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Locate an installed Chromium-family executable without downloading a browser. */
export async function findBrowser(
  pathEnv = env.PATH ?? env.Path ?? "",
  override = env.OPENPREZ_BROWSER,
  platform = process.platform,
) {
  if (override) {
    if (await isExecutable(override)) return override;
    throw new Error(
      `OPENPREZ_BROWSER is set to "${override}", which is not an executable file. Point it at an installed Chromium-family browser.`,
    );
  }

  const environment = { ...env, PATH: pathEnv };
  for (const browser of CHROMIUM_FAMILY) {
    for (const candidate of candidateExecutables(browser, platform, environment)) {
      if (await isExecutable(candidate)) return candidate;
    }
  }
  throw new Error("No Chromium-family browser found on PATH. Install one or set OPENPREZ_BROWSER.");
}
