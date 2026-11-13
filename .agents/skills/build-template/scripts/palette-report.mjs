#!/usr/bin/env node
// Palette report for a runtime template, or for a proposed palette file during planning:
// loads the real template module through Vite (or parses the JSON palette), writes a
// self-contained HTML report, prints a text summary, and optionally captures a PNG
// screenshot with a locally installed browser.
//
// Usage: node .agents/skills/build-template/scripts/palette-report.mjs <template-dir|palette.json>
//          [--out <file.html>] [--screenshot] [--browser <name|path>] [--engine chromium|firefox]
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parsePaletteFile } from "./palette-file.mjs";
import {
  analyseTemplate,
  PAGE_WIDTH,
  renderReportHtml,
  renderSummary,
  reportHeight,
} from "./report.mjs";
import {
  captureReportScreenshots,
  printReportFailure,
  runReportCommand,
  writeReportHtml,
} from "./report-cli.mjs";
import { loadTemplateModule, ReportError } from "./report-runtime.mjs";

const USAGE = `Usage: node .agents/skills/build-template/scripts/palette-report.mjs <template-dir|palette.json>
  <template-dir>               A template folder with index.ts
  <palette.json>               A proposed { name, palette, tones } file, before template code exists
  [--out <file.html>]          Report path (default: dist/template-reports/<name>.html)
  [--screenshot]               Also capture <report>.png with an installed browser
  [--browser <name|path>]      chrome, chromium, edge, firefox, or an executable path
  [--engine chromium|firefox]  Engine of a --browser path whose name is not recognised`;

function isTemplate(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.palette === "object" &&
    typeof value.tones === "object"
  );
}

async function loadTemplate(templateDirectory) {
  const module = await loadTemplateModule(templateDirectory);
  const template = isTemplate(module.default)
    ? module.default
    : Object.values(module).find(isTemplate);
  if (!template) {
    throw new ReportError(
      `${join(templateDirectory, "index.ts")} exports no template object with palette and tones.`,
    );
  }
  return template;
}

async function loadPaletteFile(path) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    throw new ReportError(`Could not read ${path}: ${error.message}`);
  }
  const result = parsePaletteFile(text);
  if (!result.ok) {
    throw new ReportError(`Invalid palette file ${path}:\n  ${result.errors.join("\n  ")}`);
  }
  return result.template;
}

function loadSource(source) {
  return source.toLowerCase().endsWith(".json") ? loadPaletteFile(source) : loadTemplate(source);
}

/** Run the palette report with injectable logging and browser discovery for tests. */
export function runPaletteReport(argv, { browserSystem, log = console.log } = {}) {
  return runReportCommand(argv, {
    expectedSource: "template directory or palette file",
    usage: USAGE,
    log,
    run: async (options, writeLog) => {
      const template = await loadSource(options.source);
      const result = analyseTemplate(template);
      if (!result.ok) {
        return {
          ok: false,
          error: `Unsupported colour values (use #RRGGBB):\n  ${result.errors.join("\n  ")}`,
        };
      }
      const { analysis } = result;
      const htmlPath = await writeReportHtml(
        options.out,
        `${analysis.name}.html`,
        renderReportHtml(analysis),
      );
      writeLog(renderSummary(analysis));
      writeLog(`\nReport: ${htmlPath}`);

      const screenshots = await captureReportScreenshots({
        options,
        browserSystem,
        reports: [
          {
            htmlPath,
            width: PAGE_WIDTH,
            height: reportHeight(analysis),
            resultKey: "pngPath",
          },
        ],
        noBrowserDetail:
          "Pass --browser <name|path> to choose one; the HTML report and summary above still apply.",
        log: writeLog,
      });
      if (!screenshots.ok) return screenshots;
      return { ok: true, htmlPath, ...screenshots };
    },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runPaletteReport(process.argv.slice(2));
  printReportFailure(result, USAGE);
}
