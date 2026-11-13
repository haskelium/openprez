#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFontCss } from "./font-assets.mjs";
import { parseFontFile, validateFontDefinition } from "./font-file.mjs";
import {
  FONT_REPORT_WIDTH,
  FONT_SLIDE_HEIGHT,
  fontReportHeight,
  renderFontReport,
  renderFontSlide,
  renderFontSummary,
} from "./font-specimens.mjs";
import {
  captureReportScreenshots,
  printReportFailure,
  runReportCommand,
  writeReportHtml,
} from "./report-cli.mjs";
import { loadTemplateModule } from "./report-runtime.mjs";

const USAGE = `Usage: node .agents/skills/build-template/scripts/font-report.mjs <fonts.json|template-dir>
  <fonts.json>                A proposed { name, fonts: { body, display, mono } } file
  <template-dir>              A template folder with index.ts and optional fonts.css
  [--out <file.html>]          Report path (default: dist/template-reports/<name>-fonts.html)
  [--screenshot]               Capture specimen-sheet and 1920x1080 slide PNGs
  [--browser <name|path>]      chrome, chromium, edge, firefox, or an executable path
  [--engine chromium|firefox]  Engine of an unrecognised browser executable
  [-h|--help]                 Print this help`;

function isTemplate(value) {
  return value !== null && typeof value === "object" && typeof value.fontSans === "string";
}

async function loadSource(source) {
  if (source.toLowerCase().endsWith(".json")) {
    const parsed = parseFontFile(await readFile(source, "utf8"));
    if (!parsed.ok) {
      return { ok: false, error: `Invalid fonts file:\n  ${parsed.errors.join("\n  ")}` };
    }
    return { ...parsed, css: "", source: "Proposal (installed fonts only)", warnings: [] };
  }
  const module = await loadTemplateModule(source);
  const template = isTemplate(module.default)
    ? module.default
    : Object.values(module).find(isTemplate);
  if (!template) return { ok: false, error: "Template entry exports no template with fontSans." };
  const parsed = validateFontDefinition(template);
  if (!parsed.ok) {
    return { ok: false, error: `Invalid template font roles:\n  ${parsed.errors.join("\n  ")}` };
  }
  const assets = await loadFontCss(source);
  if (!assets.ok) return assets;
  const warnings =
    template.fontSans !== template.fonts.body
      ? ["fontSans differs from fonts.body; the compatibility alias should match."]
      : [];
  return {
    ...parsed,
    css: assets.css,
    source: `Template · ${assets.faceCount} embedded @font-face rule(s)`,
    warnings,
  };
}

/** Run the font report with injectable logging and browser discovery for tests. */
export function runFontReport(argv, { browserSystem, capture, log = console.log } = {}) {
  return runReportCommand(argv, {
    expectedSource: "fonts file or template directory",
    usage: USAGE,
    log,
    run: async (options, writeLog) => {
      const input = await loadSource(options.source);
      if (!input.ok) return input;
      const defaultName = `${input.definition.name}-fonts.html`;
      const htmlPath = await writeReportHtml(
        options.out,
        defaultName,
        renderFontReport(input.definition, {
          fontCss: input.css,
          source: input.source,
          warnings: input.warnings,
        }),
      );
      const slideHtmlPath = `${htmlPath.replace(/\.html?$/i, "")}-slide.html`;
      await writeReportHtml(
        slideHtmlPath,
        "unused-slide-preview.html",
        renderFontSlide(input.definition, {
          fontCss: input.css,
          source: input.source,
          warnings: input.warnings,
        }),
      );
      writeLog(renderFontSummary(input.definition, input.warnings));
      writeLog(`\nReport: ${htmlPath}`);
      writeLog(`Slide preview: ${slideHtmlPath}`);

      const screenshots = await captureReportScreenshots({
        options,
        browserSystem,
        capture,
        reports: [
          {
            htmlPath,
            width: FONT_REPORT_WIDTH,
            height: fontReportHeight(input.definition),
            resultKey: "pngPath",
            settleFonts: true,
          },
          {
            htmlPath: slideHtmlPath,
            width: FONT_REPORT_WIDTH,
            height: FONT_SLIDE_HEIGHT,
            resultKey: "slidePngPath",
            settleFonts: true,
          },
        ],
        noBrowserDetail:
          "Pass --browser <name|path> to choose one; open the HTML report for visual review.",
        log: writeLog,
      });
      if (!screenshots.ok) return screenshots;
      return { ok: true, htmlPath, slideHtmlPath, ...screenshots };
    },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runFontReport(process.argv.slice(2));
  printReportFailure(result, USAGE);
}
