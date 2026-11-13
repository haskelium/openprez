// Pure palette analysis and report rendering. Every section has an explicit pixel
// height computed here, so the screenshot window can match the page exactly.
import { escapeHtml } from "../../../../scripts/lib/html.ts";
import {
  classifyContrast,
  colourDistance,
  contrastRatio,
  DEFICIENCIES,
  parseHex,
  simulateDeficiency,
  toHex,
  toHsl,
} from "./colour.mjs";

/** Palette tokens the template contract reserves for the primary foreground/background pair. */
const PRIMARY_TOKENS = ["primary", "onPrimary"];

/** Below this CIE76 distance, two swatches are flagged as hard to tell apart in small chart marks. */
export const CLOSE_PAIR_THRESHOLD = 20;

export const PAGE_WIDTH = 1900;
const PAGE_PADDING = 24;
const HEADER_HEIGHT = 72;
const SECTION_GAP = 28;
const SECTION_TITLE_HEIGHT = 44;
const SWATCHES_PER_ROW = 10;
const SWATCH_WIDTH = 170;
const SWATCH_GAP = 12;
const SWATCH_COLOUR_HEIGHT = 96;
const SWATCH_LABEL_HEIGHT = 66;
const SIMULATION_TITLE_HEIGHT = 34;
const SIMULATION_COLOUR_HEIGHT = 72;
const SIMULATION_LABEL_HEIGHT = 44;
const TONES_PER_ROW = 4;
const TONE_CARD_WIDTH = 445;
const TONE_CARD_HEIGHT = 230;
const TONE_GAP = 12;
const TABLE_HEADER_HEIGHT = 44;
const TABLE_ROW_HEIGHT = 44;

const CLASS_LABELS = { text: "TEXT", "large-text": "LARGE", "fill-only": "FILL" };
const CLASS_COLOURS = { text: "#1E7A3C", "large-text": "#9A5B00", "fill-only": "#5E5E5E" };

function colour(hex) {
  return { hex: hex.toUpperCase(), rgb: parseHex(hex) };
}

function findInvalidColours(template) {
  const errors = [];
  for (const [token, value] of Object.entries(template.palette ?? {})) {
    if (typeof value !== "string" || !parseHex(value)) {
      errors.push(`palette.${token} = ${String(value)}`);
    }
  }
  for (const [tone, pair] of Object.entries(template.tones ?? {})) {
    for (const key of ["surface", "onSurface"]) {
      const value = pair?.[key];
      if (typeof value !== "string" || !parseHex(value)) {
        errors.push(`tones.${tone}.${key} = ${String(value)}`);
      }
    }
  }
  return errors;
}

function closePairs(swatches) {
  const pairs = [];
  for (let first = 0; first < swatches.length; first += 1) {
    for (let second = first + 1; second < swatches.length; second += 1) {
      const distance = colourDistance(swatches[first].rgb, swatches[second].rgb);
      if (distance < CLOSE_PAIR_THRESHOLD) {
        pairs.push({ first: swatches[first].token, second: swatches[second].token, distance });
      }
    }
  }
  return pairs;
}

/**
 * Analyses a template's palette and tones.
 * Returns { ok: true, analysis } or { ok: false, errors } listing unsupported colour values.
 */
export function analyseTemplate(template) {
  const errors = findInvalidColours(template);
  if (errors.length > 0) return { ok: false, errors };

  const palette = Object.entries(template.palette).map(([token, hex]) => {
    const value = colour(hex);
    return {
      token,
      ...value,
      hsl: toHsl(value.rgb),
      primary: PRIMARY_TOKENS.includes(token),
    };
  });
  const accents = palette.filter((swatch) => !swatch.primary);
  const tones = Object.entries(template.tones).map(([name, pair]) => {
    const surface = colour(pair.surface);
    const onSurface = colour(pair.onSurface);
    const textRatio = contrastRatio(surface.rgb, onSurface.rgb);
    return { name, surface, onSurface, textRatio, textClass: classifyContrast(textRatio) };
  });
  const accentContrast = accents.map((accent) => ({
    token: accent.token,
    hex: accent.hex,
    cells: tones.map((tone) => {
      const ratio = contrastRatio(accent.rgb, tone.surface.rgb);
      return { tone: tone.name, ratio, class: classifyContrast(ratio) };
    }),
  }));
  const simulations = DEFICIENCIES.map((deficiency) => {
    const swatches = palette.map((swatch) => {
      const rgb = simulateDeficiency(swatch.rgb, deficiency);
      return { token: swatch.token, rgb, hex: toHex(rgb) };
    });
    return { deficiency, swatches, closePairs: closePairs(swatches) };
  });

  return {
    ok: true,
    analysis: {
      name: template.name,
      palette,
      accents,
      tones,
      accentContrast,
      simulations,
      closePairs: closePairs(palette),
    },
  };
}

function rowsOf(count, perRow) {
  return Math.max(1, Math.ceil(count / perRow));
}

function swatchGridHeight(count, swatchHeight) {
  const rows = rowsOf(count, SWATCHES_PER_ROW);
  return rows * swatchHeight + (rows - 1) * SWATCH_GAP;
}

function sectionHeights(analysis) {
  const paletteCount = analysis.palette.length;
  const simulationBlock =
    SIMULATION_TITLE_HEIGHT +
    swatchGridHeight(paletteCount, SIMULATION_COLOUR_HEIGHT + SIMULATION_LABEL_HEIGHT);
  const toneRows = rowsOf(analysis.tones.length, TONES_PER_ROW);
  return {
    palette:
      SECTION_TITLE_HEIGHT +
      swatchGridHeight(paletteCount, SWATCH_COLOUR_HEIGHT + SWATCH_LABEL_HEIGHT),
    tones: SECTION_TITLE_HEIGHT + toneRows * TONE_CARD_HEIGHT + (toneRows - 1) * TONE_GAP,
    simulations: SECTION_TITLE_HEIGHT + DEFICIENCIES.length * simulationBlock,
    contrast:
      SECTION_TITLE_HEIGHT +
      TABLE_HEADER_HEIGHT +
      (1 + analysis.accentContrast.length) * TABLE_ROW_HEIGHT,
  };
}

/** Exact page height of the rendered report, in CSS pixels. */
export function reportHeight(analysis) {
  const heights = Object.values(sectionHeights(analysis));
  const sections = heights.reduce((total, height) => total + height, 0);
  return 2 * PAGE_PADDING + HEADER_HEIGHT + heights.length * SECTION_GAP + sections;
}

function formatHsl({ hue, saturation, lightness }) {
  return `H${Math.round(hue)}° S${Math.round(saturation)} L${Math.round(lightness)}`;
}

function swatchHtml({ colourHex, colourHeight, labelHeight, lines }) {
  const label = lines.map(escapeHtml).join("<br>");
  return `<div class="swatch" style="width:${SWATCH_WIDTH}px"><div style="height:${colourHeight}px;background:${colourHex}"></div><div class="label" style="height:${labelHeight}px">${label}</div></div>`;
}

function swatchGridHtml(swatches) {
  return `<div class="grid" style="gap:${SWATCH_GAP}px">${swatches.join("")}</div>`;
}

function paletteSectionHtml(analysis) {
  return swatchGridHtml(
    analysis.palette.map((swatch) =>
      swatchHtml({
        colourHex: swatch.hex,
        colourHeight: SWATCH_COLOUR_HEIGHT,
        labelHeight: SWATCH_LABEL_HEIGHT,
        lines: [
          `${swatch.token}${swatch.primary ? " (primary)" : ""}`,
          swatch.hex,
          formatHsl(swatch.hsl),
        ],
      }),
    ),
  );
}

function toneCardHtml(tone, accents) {
  const accentSwatches = accents
    .map(
      (accent) =>
        `<span class="accent" title="${escapeHtml(accent.token)}" style="background:${accent.hex}"></span>`,
    )
    .join("");
  return `<div class="tone" style="width:${TONE_CARD_WIDTH}px;height:${TONE_CARD_HEIGHT}px;background:${tone.surface.hex};color:${tone.onSurface.hex}">
<div class="tone-name">${escapeHtml(tone.name)}</div>
<div class="tone-body">Body text on surface · ${tone.textRatio.toFixed(2)}:1</div>
<div class="tone-meta">${tone.onSurface.hex} on ${tone.surface.hex} · accents in palette order</div>
<div class="accents">${accentSwatches}</div>
</div>`;
}

function tonesSectionHtml(analysis) {
  const cards = analysis.tones.map((tone) => toneCardHtml(tone, analysis.accents)).join("");
  return `<div class="grid" style="gap:${TONE_GAP}px">${cards}</div>`;
}

function simulationsSectionHtml(analysis) {
  return analysis.simulations
    .map((simulation) => {
      const swatches = simulation.swatches.map((swatch) =>
        swatchHtml({
          colourHex: swatch.hex,
          colourHeight: SIMULATION_COLOUR_HEIGHT,
          labelHeight: SIMULATION_LABEL_HEIGHT,
          lines: [swatch.token, swatch.hex],
        }),
      );
      return `<div class="subtitle" style="height:${SIMULATION_TITLE_HEIGHT}px">${escapeHtml(simulation.deficiency)}</div>${swatchGridHtml(swatches)}`;
    })
    .join("");
}

function contrastCellHtml({ sampleHex, surfaceHex, onSurfaceHex, ratio, contrastClass }) {
  return `<td style="background:${surfaceHex};color:${onSurfaceHex}"><span class="sample" style="color:${sampleHex}">Aa</span> ${ratio.toFixed(2)} <span class="badge" style="background:${CLASS_COLOURS[contrastClass]}">${CLASS_LABELS[contrastClass]}</span></td>`;
}

function contrastSectionHtml(analysis) {
  const header = analysis.tones.map((tone) => `<th>${escapeHtml(tone.name)}</th>`).join("");
  const textRow = analysis.tones
    .map((tone) =>
      contrastCellHtml({
        sampleHex: tone.onSurface.hex,
        surfaceHex: tone.surface.hex,
        onSurfaceHex: tone.onSurface.hex,
        ratio: tone.textRatio,
        contrastClass: tone.textClass,
      }),
    )
    .join("");
  const accentRows = analysis.accentContrast
    .map((accent) => {
      const cells = accent.cells
        .map((cell, index) =>
          contrastCellHtml({
            sampleHex: accent.hex,
            surfaceHex: analysis.tones[index].surface.hex,
            onSurfaceHex: analysis.tones[index].onSurface.hex,
            ratio: cell.ratio,
            contrastClass: cell.class,
          }),
        )
        .join("");
      return `<tr><th class="row-label"><span class="dot" style="background:${accent.hex}"></span>${escapeHtml(accent.token)} ${accent.hex}</th>${cells}</tr>`;
    })
    .join("");
  return `<table style="--header:${TABLE_HEADER_HEIGHT}px;--row:${TABLE_ROW_HEIGHT}px"><thead><tr><th class="row-label">Pair (TEXT ≥ 4.5 · LARGE ≥ 3 · FILL &lt; 3)</th>${header}</tr></thead><tbody><tr><th class="row-label">tone text (onSurface)</th>${textRow}</tr>${accentRows}</tbody></table>`;
}

const STYLES = `
* { box-sizing: border-box; }
html, body { margin: 0; background: #151515; }
body { width: ${PAGE_WIDTH}px; padding: ${PAGE_PADDING}px; color: #EEEEEE; font: 15px/1.4 system-ui, -apple-system, "Segoe UI", Arial, sans-serif; overflow: hidden; }
header { height: ${HEADER_HEIGHT}px; font-size: 30px; font-weight: 700; overflow: hidden; }
header small { display: block; font-size: 15px; font-weight: 400; color: #AAAAAA; }
section { margin-top: ${SECTION_GAP}px; overflow: hidden; }
h2 { height: ${SECTION_TITLE_HEIGHT}px; margin: 0; font-size: 22px; line-height: ${SECTION_TITLE_HEIGHT}px; color: #CCCCCC; overflow: hidden; }
.grid { display: flex; flex-wrap: wrap; }
.swatch { flex: none; }
.label { padding: 4px; font-size: 14px; line-height: 19px; overflow: hidden; }
.subtitle { font-size: 17px; line-height: ${SIMULATION_TITLE_HEIGHT}px; color: #BBBBBB; overflow: hidden; }
.tone { flex: none; padding: 20px; overflow: hidden; }
.tone-name { font-size: 30px; font-weight: 700; line-height: 40px; height: 40px; }
.tone-body { font-size: 20px; line-height: 30px; height: 30px; }
.tone-meta { font-size: 14px; line-height: 22px; height: 22px; opacity: 0.85; }
.accents { display: flex; gap: 8px; margin-top: 24px; }
.accent { width: 42px; height: 42px; border-radius: 6px; flex: none; }
table { border-collapse: collapse; table-layout: fixed; width: 100%; }
th, td { overflow: hidden; white-space: nowrap; padding: 0 12px; text-align: left; }
thead th { height: var(--header); color: #CCCCCC; font-size: 16px; }
tbody th, tbody td { height: var(--row); font-size: 16px; }
.row-label { width: 360px; color: #EEEEEE; font-weight: 400; }
.dot { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-right: 8px; vertical-align: -2px; }
.sample { font-size: 22px; font-weight: 700; margin-right: 6px; }
.badge { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #FFFFFF; vertical-align: 2px; }
`;

/** Self-contained, offline HTML report: no scripts, no external requests. */
export function renderReportHtml(analysis) {
  const heights = sectionHeights(analysis);
  const section = (title, height, body) =>
    `<section style="height:${height}px"><h2>${title}</h2>${body}</section>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Palette report · ${escapeHtml(analysis.name)}</title>
<style>${STYLES}</style>
</head>
<body style="height:${reportHeight(analysis)}px">
<header>Palette report · ${escapeHtml(analysis.name)}<small>${analysis.palette.length} palette tokens · ${analysis.tones.length} tones</small></header>
${section("Palette", heights.palette, paletteSectionHtml(analysis))}
${section("Tones with accents", heights.tones, tonesSectionHtml(analysis))}
${section("Colour-vision simulations (Machado 2009, severity 1.0)", heights.simulations, simulationsSectionHtml(analysis))}
${section("Contrast (WCAG 2.x)", heights.contrast, contrastSectionHtml(analysis))}
</body>
</html>
`;
}

function pairsLine(pairs) {
  if (pairs.length === 0) return "none";
  return pairs
    .map((pair) => `${pair.first} ~ ${pair.second} (ΔE ${pair.distance.toFixed(1)})`)
    .join(", ");
}

/** Plain-text summary for agents that cannot view the screenshot. */
export function renderSummary(analysis) {
  const tokenWidth = Math.max(...analysis.palette.map((swatch) => swatch.token.length));
  const toneWidth = Math.max(...analysis.tones.map((tone) => tone.name.length));
  const lines = [`Template: ${analysis.name}`, "", "Palette:"];
  for (const swatch of analysis.palette) {
    lines.push(
      `  ${swatch.token.padEnd(tokenWidth)}  ${swatch.hex}  ${formatHsl(swatch.hsl)}${swatch.primary ? "  (primary)" : ""}`,
    );
  }
  lines.push("", "Tone text contrast:");
  for (const tone of analysis.tones) {
    lines.push(
      `  ${tone.name.padEnd(toneWidth)}  ${tone.onSurface.hex} on ${tone.surface.hex}  ${tone.textRatio.toFixed(2)}  ${tone.textClass}`,
    );
  }
  lines.push("", "Accent contrast on each tone surface:");
  for (const accent of analysis.accentContrast) {
    const cells = accent.cells
      .map((cell) => `${cell.tone} ${cell.ratio.toFixed(2)} ${cell.class}`)
      .join(" | ");
    lines.push(`  ${accent.token.padEnd(tokenWidth)}  ${cells}`);
  }
  lines.push("", `Near-identical swatches (ΔE76 < ${CLOSE_PAIR_THRESHOLD}):`);
  lines.push(`  normal vision: ${pairsLine(analysis.closePairs)}`);
  for (const simulation of analysis.simulations) {
    lines.push(`  ${simulation.deficiency}: ${pairsLine(simulation.closePairs)}`);
  }
  return lines.join("\n");
}
