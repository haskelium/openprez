import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { resolveBrowser, supportedBrowsersLabel } from "./browsers.mjs";
import { captureScreenshot, isFile, REPOSITORY_ROOT } from "./report-runtime.mjs";

const REPORT_OPTIONS = {
  out: { type: "string" },
  screenshot: { type: "boolean", default: false },
  browser: { type: "string" },
  engine: { type: "string" },
  help: { type: "boolean", short: "h", default: false },
};

/** Parse the common options used by both offline template reports. */
export function parseReportArguments(argv, expectedSource) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: REPORT_OPTIONS,
    });
    if (values.help) return { ok: true, help: true };
    if (positionals.length !== 1) {
      return { ok: false, error: `Expected exactly one ${expectedSource}.` };
    }
    return { ok: true, help: false, options: { ...values, source: resolve(positionals[0]) } };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

/** Run report-specific work after shared argument parsing and normalize expected failures. */
export async function runReportCommand(argv, { expectedSource, usage, run, log = console.log }) {
  const parsed = parseReportArguments(argv, expectedSource);
  if (!parsed.ok) return parsed;
  if (parsed.help) {
    log(usage);
    return { ok: true };
  }
  try {
    return await run(parsed.options, log);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Write one report to its requested path or the shared default report directory. */
export async function writeReportHtml(outputPath, defaultName, html) {
  const htmlPath = resolve(
    outputPath ?? join(REPOSITORY_ROOT, "dist", "template-reports", defaultName),
  );
  await mkdir(dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, html);
  return htmlPath;
}

/** Capture a report or report set using one discovered local browser. */
export async function captureReportScreenshots({
  options,
  browserSystem = { platform: process.platform, env: process.env, exists: isFile },
  reports,
  noBrowserDetail,
  capture = captureScreenshot,
  log = console.log,
}) {
  if (!options.screenshot) return { ok: true };

  const choice = resolveBrowser({
    choice: options.browser,
    engine: options.engine,
    ...browserSystem,
  });
  if (!choice.ok) return choice;
  if (!choice.browser) {
    log(
      `No screenshot taken: no supported browser found (${supportedBrowsersLabel()}). ` +
        noBrowserDetail,
    );
    return { ok: true };
  }

  const output = {};
  for (const report of reports) {
    const path = await capture(choice.browser, report);
    output[report.resultKey] = path;
    log(`Screenshot: ${path} (${choice.browser.name}, ${report.width}x${report.height})`);
  }
  return { ok: true, ...output };
}

/** Print a normalized report error and return a failing process status. */
export function printReportFailure(result, usage, error = console.error) {
  if (result.ok) return;
  error(`${result.error}\n\n${usage}`);
  process.exitCode = 1;
}
