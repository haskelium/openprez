import { escapeHtml } from "../../../../scripts/lib/html.ts";
import { FONT_ROLES, fontFamilies } from "./font-file.mjs";

export const FONT_REPORT_WIDTH = 1920;
export const FONT_REPORT_HEIGHT = 4560;
export const FONT_SLIDE_HEIGHT = 1080;
const GENERIC_FALLBACK = { body: "sans-serif", display: "sans-serif", mono: "monospace" };
const MAX_STACK_CHARACTERS_PER_LINE = 80;
const STACK_LINE_HEIGHT = 24;
const DEFAULT_ROLE_SECTION_HEIGHTS = { display: 1160, body: 980, mono: 980 };

function fontReportLayout(definition) {
  const roleHeights = Object.fromEntries(
    Object.entries(definition.fonts).map(([role, stack]) => {
      const lines = Math.ceil(stack.length / MAX_STACK_CHARACTERS_PER_LINE);
      const extraLines = Math.max(0, lines - 2);
      return [role, DEFAULT_ROLE_SECTION_HEIGHTS[role] + extraLines * STACK_LINE_HEIGHT];
    }),
  );
  const height =
    FONT_REPORT_HEIGHT +
    Object.entries(roleHeights).reduce(
      (total, [role, roleHeight]) => total + roleHeight - DEFAULT_ROLE_SECTION_HEIGHTS[role],
      0,
    );
  const roleStyles = Object.entries(roleHeights)
    .map(([role, roleHeight]) => `section.${role} { height: ${roleHeight}px; }`)
    .join("\n");
  return { height, roleStyles };
}

/** Page height for the specimen report, expanded conservatively for long font stacks. */
export function fontReportHeight(definition) {
  return fontReportLayout(definition).height;
}

/** Drops the first family, retaining a generic-only stack when there is nothing to drop. */
export function fallbackStack(stack) {
  const families = fontFamilies(stack);
  if (!families) return null;
  return families.slice(1).join(", ") || null;
}

function specimens(role) {
  if (role === "display") {
    return [
      [112, 400, "Clear ideas"],
      [112, 700, "Clear ideas"],
      [72, 400, "A clear story"],
      [72, 700, "A clear story"],
    ];
  }
  const size = role === "mono" ? 40 : 48;
  const text = role === "mono" ? "total = 1234.56;" : "A clear point of view.";
  return [
    [size, 400, text],
    [size, 700, text],
    [36, 400, "Labels · 12 March · 42%"],
    [36, 700, "Labels · 12 March · 42%"],
  ];
}

function specimenHtml([size, weight, text]) {
  return `<div class="specimen" style="font-size:${size}px;font-weight:${weight}"><span class="size">${size}px / ${weight}</span>${escapeHtml(text)}</div>`;
}

function stressTestsHtml() {
  return `<div class="stress-tests"><h4>Small-size stress tests — not the recommended slide hierarchy</h4>
    ${[22, 28, 32].map((size) => specimenHtml([size, 400, "Small details · I l 1 · O 0 · œ · €"])).join("")}
  </div>`;
}

function columnHtml(role, stack, fallback) {
  const secondary = fallbackStack(stack);
  const omitted = fallback && !secondary;
  const heading = fallback ? "Fallback — first family removed" : "Requested stack";
  const note = omitted
    ? "No second family: generic-only stacks remain unchanged; a lone named face uses the role’s generic fallback."
    : "";
  const generic =
    /^(?:sans-serif|serif|monospace|system-ui|ui-monospace|ui-serif|ui-sans-serif|ui-rounded|cursive|fantasy|math|emoji|fangsong)$/i.test(
      stack,
    );
  const renderedFamily = fallback
    ? (secondary ?? (generic ? stack : GENERIC_FALLBACK[role]))
    : stack;
  return `<article data-role="${role}" data-view="${fallback ? "fallback" : "primary"}">
    <h3>${heading}</h3><p class="stack">${escapeHtml(renderedFamily)}</p>
    ${note ? `<p class="note">${note}</p>` : ""}
    <div class="specimens" style="font-family:${escapeHtml(renderedFamily)}">
      ${specimens(role).map(specimenHtml).join("")}
      <p class="glyphs">I l 1 · O 0 · 0123456789 · 42%</p>
      <p class="glyphs">œ Œ é à ç · “quotes” ‘apostrophes’ · – — €</p>
      ${stressTestsHtml()}
    </div>
  </article>`;
}

function roleHtml(role, stack) {
  return `<section class="role ${role}"><h2>${role}</h2><div class="columns">${columnHtml(role, stack, false)}${columnHtml(role, stack, true)}</div></section>`;
}

function pairingHtml(fonts) {
  return `<section class="pairing">
    <p class="pairing-kicker" style="font-family:${escapeHtml(fonts.body)}">TYPE PAIRING · SLIDE-SIZED PREVIEW</p>
    <div class="pairing-title" style="font-family:${escapeHtml(fonts.display)}">Ideas that travel</div>
    <div class="pairing-heading" style="font-family:${escapeHtml(fonts.display)}">Designed for the room</div>
    <p class="pairing-copy" style="font-family:${escapeHtml(fonts.body)}">The display sets the tone. The body carries the thought.<br>Clear hierarchy helps a message reach the whole room.</p>
    <p class="pairing-code" style="font-family:${escapeHtml(fonts.mono)}">revenue = 1,234.56 € &nbsp; · &nbsp; growth = +12.8%</p>
    <p class="pairing-label" style="font-family:${escapeHtml(fonts.body)}">36px label · Hierarchy, rhythm, weight and character.</p>
  </section>`;
}

const STYLES = `
  * { box-sizing:border-box; }
  body { margin:0; width:${FONT_REPORT_WIDTH}px; color:#171717; background:#f7f7f5; font-family:Arial,Helvetica,sans-serif; }
  body.report { padding:40px; min-height:${FONT_REPORT_HEIGHT}px; }
  header { height:240px; }
  h1 { margin:0 0 16px; font-size:36px; } h2 { margin:0 0 18px; font-size:28px; text-transform:capitalize; } h3 { margin:0 0 8px; font-size:18px; }
  header p { font-size:20px; line-height:1.45; margin:8px 0; max-width:1780px; }
  .warning { color:#663c00; } .columns { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  section { margin-bottom:24px; padding:24px; background:#fff; border:1px solid #d6d6d2; }
  section.display { height:1160px; } section.body, section.mono { height:980px; }
  article { min-width:0; } .stack { font:16px/1.4 ui-monospace,monospace; margin:0; min-height:48px; overflow-wrap:anywhere; }
  .note { margin:0; font-size:14px; min-height:24px; } .specimens { margin-top:12px; }
  .specimen { line-height:1.15; margin-bottom:14px; }
  .size { display:block; font:14px/1.5 Arial,Helvetica,sans-serif; color:#555; }
  .glyphs { margin:18px 0 0; font-size:36px; line-height:1.35; }
  .stress-tests { margin-top:24px; border-top:1px dashed #aaa; padding-top:12px; }
  .stress-tests h4 { font:16px/1.4 Arial,Helvetica,sans-serif; margin:0 0 12px; }
  .pairing { height:840px; }
  .pairing-kicker { font-size:36px; line-height:1.3; margin:0; }
  .pairing-title { margin:24px 0; font-size:112px; line-height:1.1; font-weight:700; }
  .pairing-heading { margin:0 0 24px; font-size:72px; line-height:1.15; }
  .pairing-copy { font-size:48px; line-height:1.4; margin:0 0 24px; }
  .pairing-code { font-size:40px; line-height:1.4; margin:0 0 24px; }
  .pairing-label { font-size:36px; line-height:1.4; margin:0; }
  footer { font-size:18px; line-height:1.5; }
  body.slide { height:${FONT_SLIDE_HEIGHT}px; padding:88px 112px; position:relative; }
  .slide .pairing { padding:0; border:0; background:transparent; margin:0; height:auto; }
  .slide footer { position:absolute; bottom:24px; left:112px; right:112px; color:#555; }
`;

function renderPage(
  definition,
  { fontCss = "", warnings = [] },
  className,
  content,
  { height, additionalStyles = "" } = {},
) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'">
  <title>Font ${className} · ${escapeHtml(definition.name)}</title>
  <style>${fontCss.replaceAll("<", "\\3C ")}</style><style>${STYLES}${additionalStyles}</style></head>
  <body class="${className}"${height ? ` style="height:${height}px"` : ""}>${content}
  <script>document.fonts.ready.then(() => {
    const failures = [...document.fonts].filter(face => face.status === "error");
    const messages = ${JSON.stringify(warnings).replaceAll("<", "\\u003c")};
    messages.push(failures.length
      ? "WARNING: " + failures.length + " bundled font face(s) failed to load. Do not accept this specimen as proof of the bundled design."
      : "Font loading settled. Verify faces visually; installed-family availability is not certified.");
    document.getElementById("font-state").textContent = messages.join(" · ");
    document.documentElement.dataset.fontsReady = failures.length ? "error" : "true";
  });</script></body></html>`;
}

/** Renders a neutral, offline specimen sheet with projection-oriented main samples. */
export function renderFontReport(definition, options = {}) {
  const source = options.source ?? "proposal";
  const warnings = options.warnings ?? [];
  const layout = fontReportLayout(definition);
  return renderPage(
    definition,
    options,
    "report",
    `<header>
    <h1>Font report · ${escapeHtml(definition.name)}</h1>
    <p>${escapeHtml(source)} · Projection-oriented specimens · Regular 400 / bold 700</p>
    <p>Requested stacks may render fallbacks when faces are not installed. The fallback view removes only the first family;<br>actual rendering depends on this machine. These specimens do not certify glyph coverage, weight availability or accessibility.</p>
    ${warnings.length ? `<p class="warning">${warnings.map(escapeHtml).join(" · ")}</p>` : ""}
    <p id="font-state">Waiting for font loading and layout…</p>
  </header>
  ${["display", "body", "mono"].map((role) => roleHtml(role, definition.fonts[role])).join("")}
  ${pairingHtml(definition.fonts)}
  <footer>Review the separate 1920×1080 preview for slide proportions; zoom this sheet for glyph detail. Small-size stress tests are not recommended slide sizes.</footer>`,
    { height: layout.height, additionalStyles: layout.roleStyles },
  );
}

/** Renders a separate 1920×1080 composition to avoid shrinking a tall sheet for slide review. */
export function renderFontSlide(definition, options = {}) {
  return renderPage(
    definition,
    options,
    "slide",
    `${pairingHtml(definition.fonts)}
    <footer id="font-state">Waiting for font loading and layout…</footer>`,
  );
}

export function renderFontSummary(definition, warnings = []) {
  return [
    `Template: ${definition.name}`,
    ...FONT_ROLES.map(
      (role) =>
        `  ${role}: ${definition.fonts[role]}\n    fallback: ${fallbackStack(definition.fonts[role]) ?? "no second family; see HTML"}`,
    ),
    ...warnings.map((warning) => `Warning: ${warning}`),
    "Visual review required: legibility, role harmony, glyphs and fallbacks; this is not an automated font-quality score.",
  ].join("\n");
}
