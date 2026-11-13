---

name: build-template
description: Plan and build a runtime presentation template in templates/ (palette, tones, font roles, footer, local imagery and design references), with colour and font visual reports and tests. Loaded by /opp-propose (Plan) and /opp-apply (Implement) for template changes.
user-invocable: false
---

# Build a presentation template

A template is the presentation's visual skin: the palette, named tones, semantic font roles, local visual assets, and live and PDF footers. This skill is not a command: the OpenPrez workflow loads it for a change whose proposal records `Type: template`. `/opp-propose` follows **Plan**, which writes no template code; `/opp-apply` follows **Implement**. The shared rules apply at both stages. Before changing any colours, show the user the issues you found and the options for fixing them.

Read first: `docs/templates.md`, `core/template/contract.ts` and `templates/default/` (the reference implementation).

## Workflow at a glance

- **Plan (`/opp-propose`):** confirm the template name and activation, define its visual system, create and review `palette.json` and `fonts.json` with both reports, then write the approved design and implementation tasks. Do not write template code in this phase.
- **Implement (`/opp-apply`):** build only the approved template, bundle licensed assets locally, record required third-party credits, add its footer/contrast/font tests, and run scoped checks and visual reports. Do not add slide content or change shared documentation.

The detailed **Plan** and **Implement** sections below are authoritative for each step.

## Shared rules

### Scope and boundaries

- A template lives in its own folder, `templates/<name>/`, with `index.ts` default-exporting a `PresentationTemplate`. Keep its assets, components and tests inside that folder.
- A template may import only `@core` and its own sibling files. Biome enforces this, so a template can't import another template, even the default. To reuse something, copy it into the folder, or promote it to `@core` as a separate workstream.
- A template arranges the player's state and actions; it never changes navigation, keyboard handling, steps, the presenter window or export.
- A template can't decorate the slide area. Its imagery is limited to the footer and the tone colours; slide illustrations belong in the active deck's own assets folder.
- Leave the other templates in the repository.

### Palette, tones and font

- **Token roles:** the token names are fixed slots in the contract, not colour names.
  - `onPrimary` is the primary background and `primary` the primary foreground. Both are used by every `base` slide.
  - `accent1`–`accent5` are the secondary accents, `neutral` is the neutral, and `data1`, `data2` and `data3` are the data colours.
  - Choose any values for these slots that suit the atmosphere.
- **Tones:** `base` and `inverse` are required. Extra tones (for example a section-break colour) are free names that slides select with `tone`. Each tone is a `surface`/`onSurface` pair.
- **Contrast targets:**
  - Every tone's text needs at least 4.5:1, and the template's contrast test enforces this.
  - Aim for 7:1 or more on `base` and `inverse`, because projectors wash out contrast.
- **Hue design:**
  - Give a warm palette one cool counterpoint, or a cool palette one warm one, so charts have a clearly separate second series.
  - Data accents should differ in lightness as well as hue, so they survive colour-vision deficiency and greyscale printing.
  - Keep tone surfaces out of the accent families you expect on them, or those accents will vanish.
- **Font roles:** provide body, display and mono stacks through the `fonts` object for new or reworked templates. `fontSans` remains required for compatibility; keep it equal to `fonts.body`. A legacy template without `fonts` uses `fontSans` for body only, while display and mono use system defaults. Never map the legacy stack to the other roles.
- **Pairing and hierarchy:** choose families and fallback stacks that work together at presentation distance. Assign each role a clear job, then establish hierarchy with size, weight, line height, tracking and spacing rather than using extra unrelated typefaces. Use the `font-body`, `font-display` and `font-mono` utilities; default text and `font-sans` resolve to body.

### Choosing and sourcing fonts

- **Installed or bundled:** a stack of widely installed faces (for example Arial, Georgia, `system-ui`, `ui-monospace`) needs no files. Bundle a font only when the design needs a face that presenting machines may not have. Every bundled file adds to the build, and `pnpm prez` inlines it as base64, about a third larger.
- **Selection criteria** (record the outcome in `design.md`):
  - glyph coverage for every language the deck uses, including its punctuation and symbols; for example French needs `œ`, which font services usually place in the `latin-ext` subset, and most decks need curly quotes, en and em dashes and `€`;
  - only the weights and styles the hierarchy uses, typically body regular and bold (plus italic if the deck uses it), one or two display weights, and mono regular and bold; one variable font is better than many static files when it covers the range;
  - legibility at projection distance: a generous x-height, open shapes, and distinct `I`/`l`/`1` and `0`/`O`, especially in mono; tabular figures when the deck shows data;
  - a fallback stack of installed faces with similar proportions, ending in a generic family (`sans-serif`, `serif` or `monospace`).
- **Licences:** accept the SIL Open Font License 1.1, Apache 2.0, the Ubuntu Font Licence, or another licence that explicitly allows embedding and redistribution with software at no cost. Reject "free for personal use", desktop-only, per-domain or unclear terms. Read the licence at the font's official source (the foundry's repository, or the font's folder in `github.com/google/fonts`), not a mirror.
- **Unmodified files:** use font files exactly as distributed; no font-conversion tooling is assumed. Never subset, convert or rename a font whose licence reserves its name (an OFL Reserved Font Name is declared right after the copyright line), because that makes a modified version that may not carry the name. Prefer WOFF2; if a font ships only TTF or OTF, use that file as-is or choose another font.
- **Getting WOFF2 files:** take them from the foundry's release. For a Google Fonts family whose licence declares no Reserved Font Name, the CSS API serves WOFF2 files per subset to a browser user agent: `curl -A '<desktop browser user agent>' 'https://fonts.googleapis.com/css2?family=<Family>:wght@<weights>&display=swap'` lists the file URL for each subset; download the subsets the deck needs and keep their `unicode-range` values. Fetch files only while authoring; never reference these URLs from the template. Do not add npm font packages: they add dependencies.
- **Licence texts:** keep the font files and their licence text (for example `OFL.txt`) together in `templates/<name>/fonts/`.

### Imagery and local assets

- **Art direction:** decide what visual language supports the template: image treatment and crop, recurring motifs, shape language, stroke weight and the amount of detail. Keep the choices coherent and legible at presentation scale; avoid unrelated stock decoration.
- **Local assets:** keep every image, SVG and font file inside `templates/<name>/`. Never fetch at runtime, hotlink, or reference a remote font or image URL.
- **Licensing:** prefer original artwork or CC0/public-domain imagery. For every other asset, verify from an authoritative source that its terms allow redistribution inside the built app, and follow all attribution requirements before adding it.
- **Image preparation:** crop and compress photos for their actual display size. Import photos as modules and render them with `<img>`, not CSS `background-image`, so PDF capture embeds them reliably.
- **SVG direction and export safety:** use clear silhouettes, intentional stroke weights and theme CSS variables for colors. Build export-critical diagrams from SVG-native shapes and text; avoid `<foreignObject>`. Keep essential text out of raster artwork and provide accessible text for meaningful images.

### Footer and export footer invariants

The `Footer` and `ExportFooter` components own the format and copy. The player owns the actions. Keep all of these:

- the logo (`Logo` from `@core`), the copyright line, the presentation date and `n / total` at the right;
- the six `NavigationButtons` from `@core`, then the Speaker notes and Export PDF `ActionButton`s, in that order, with their labels and tooltips;
- the `footer-actions` class on the action group, so it auto-hides on hover and focus and stays visible on touch devices;
- the Speaker notes `aria-pressed` state, the status and alert messages (`role="status"` for export progress, `role="alert"` for errors such as a blocked pop-up), and the auto-advance indicator placed before the date; keep each alert outside `.footer-actions` so it remains visible when that group auto-hides;
- an `ExportFooter` with the `data-pdf-footer` marker, the same branding and date, `page / total`, and no buttons or auto-advance indicator.

The footer must stay readable on every declared tone: use the `surface`/`on-surface` tokens, never fixed colours. Any footer motion must respect reduced motion and `useExportMode()`.

### Palette report

The palette report takes either a proposed palette file (during planning) or a template folder (during implementation). The `--screenshot` flag also writes a PNG:

```sh
node .agents/skills/build-template/scripts/palette-report.mjs openprez/changes/<change-name>/palette.json --screenshot
node .agents/skills/build-template/scripts/palette-report.mjs templates/<name> --screenshot
```

- **Palette file:** JSON `{ "name": "<name>", "palette": { ...all ten tokens }, "tones": { "base": { "surface", "onSurface" }, "inverse": { ... }, ... } }`, with `#RRGGBB` values and a lowercase kebab-case name. The report lists every missing token or tone.
- **Output:**
  - The HTML goes to `dist/template-reports/<name>.html`, with the PNG next to it (`dist/` is gitignored, and `pnpm build` empties it, so rerun the report after a build).
  - The script also prints a text summary: the palette with HSL, each tone's text contrast, each accent's contrast on each tone, and near-identical swatch pairs (CIE76 ΔE < 20) for normal vision and each simulation. These lists are review inputs, not automatic palette failures: distinguish colours used together as data series from intentional tonal families. Keep all findings visible, including advisory tritanopia results, and explain any remaining accessibility limitations.
- **Browser options:**
  - The screenshot uses an installed Chrome, Chromium, Edge or Firefox, tried in that order, and never downloads a browser.
  - `--browser chrome|chromium|edge|firefox|<path>` picks one explicitly.
  - Add `--engine chromium|firefox` when a custom executable's name doesn't reveal its engine.
  - `--out <file.html>` changes the report location.
- **Reading the screenshot:** open the PNG and look at it; the text summary can't judge harmony. If the image is too large for your context, downscale it first. If no browser was found, work from the summary, and tell the user a visual check of the HTML is still needed.

Review checklist. For each item, note the token and the evidence:

1. **Hue balance:** the accents are not all one family. There is a cool or warm counterpoint for a second data series.
2. **Near-duplicates and colour-vision collapse:** review every reported pair by its intended role, not against a blanket palette-wide threshold.
   - **Data series:** name the recommended series tokens in `design.md` and the eventual `STYLEGUIDE.md` (at minimum the data colours and the warm/cool counterpoint). These colours must reach pairwise CIE76 ΔE ≥ 20 in normal vision, protanopia and deuteranopia, or have an explicit documented fallback. Prefer changing or separating a confusable pair in lightness. If keeping it, define a recommended series order, state how many series can rely on colour alone, and require direct labels or patterns whenever confusable colours appear together. Ordering alone does not make a confusable pair distinguishable.
   - **Other near-pairs:** keep with a recorded role rationale (for example foreground/highlight or surface/panel), or change a colour. A pair with no deliberate role rationale is an accidental duplicate and must change. Record each kept pair and its rationale in `design.md` and carry the usage restrictions into `STYLEGUIDE.md`; a role rationale does not exempt a pair also used together as data series.
   - **Tritanopia:** review as advisory, not an automatic rejection. Explain confusable data-series pairs and address their use through colour changes, a restricted series order, or required labels/patterns. Keep the findings and limitations in the documentation; do not claim that clearing a simulation threshold certifies full accessibility.
3. **Vanishing accents:** accents that are FILL (< 3:1) on the tone they would naturally appear on, especially a tone surface from the accent's own family.
4. **Dark-panel visibility:** panels and borders against dark tone surfaces must reach at least 1.5:1 WCAG contrast against the adjacent surface for projector visibility. Use the report's accent-on-tone ratio when it covers the pair; otherwise calculate the pair with `contrastRatio` from `.agents/skills/build-template/scripts/colour.mjs` (re-exported from `scripts/lib/colour.ts`).
5. **Accent use:** on each tone, distinguish TEXT (≥ 4.5), LARGE (≥ 3) and FILL (< 3). Never use a FILL accent as text on that surface. This becomes the colour-usage guidance.

**Before changing any colours:** present each finding and the trade-offs of changing, replacing or deliberately keeping the affected colours (via `ask_user`). Explain which findings affect data-series distinguishability and which are intentional tonal families, together with any remaining accessibility limitations and required labels/patterns. Wait for the user's choice; do not edit the palette before they accept an option. After a colour change, rerun the report. Verify that data-series findings meet the distinctness target or have the documented fallback, and that every other kept near-pair has a role rationale; advisory tritanopia findings remain visible. Do not chase a palette-wide no-close-pairs result.

### Font report

Use the font report alongside the palette report, first on proposed roles and then on the implemented template:

```sh
node .agents/skills/build-template/scripts/font-report.mjs openprez/changes/<change-name>/fonts.json --screenshot
node .agents/skills/build-template/scripts/font-report.mjs templates/<name> --screenshot
```

- **Fonts file:** JSON `{ "name": "<lowercase-kebab-case>", "fonts": { "body": "<stack>", "display": "<stack>", "mono": "<stack>" } }`. Each role needs a non-empty CSS family stack. The tool reports missing roles and malformed values together. Proposal reports use installed fonts only: a face not installed on this machine will fall back, so do not treat that rendering as a review of the missing face. Recheck bundled faces after implementation.
- **Template input:** loads the roles and `fontSans` from `index.ts`, warns if the compatibility alias differs from body, and embeds local WOFF2/WOFF/TTF/OTF files referenced by `fonts.css`. Keep that stylesheet font-only (`@font-face` rules); remote URLs and CSS imports are rejected, never fetched. Font descriptors (weight ranges, styles, Unicode subsets) are preserved; `local()` sources are removed so an installed copy cannot mask a broken bundled file.
- **Output:** `dist/template-reports/<name>-fonts.html` (detailed specimen sheet) and `<name>-fonts-slide.html` (separate 1920×1080 composition preview), each with a PNG when `--screenshot` is used. All are disposable build artifacts; rerun after `pnpm build`. Both HTML files are self-contained and work offline.
- **Specimens:** projection-oriented stage-pixel sizes — display 112/72px, body 48px, labels 36px and mono 40px — at regular 400 and bold 700, plus ambiguous characters (`I/l/1`, `O/0`), numerals, `œ`, quotes, dashes and `€`. These are review defaults, not mandatory slide sizes. The 22–32px samples are explicitly labelled stress tests, not the recommended slide hierarchy. A combined display/body/mono composition exposes role harmony. Each role also has a side-by-side fallback view with its first family removed; a generic-only stack stays unchanged. Remaining installed families still depend on the viewing machine.
- **Browser options:** `--screenshot`, `--browser chrome|chromium|edge|firefox|<path>`, `--engine chromium|firefox` and `--out <file.html>` work as in the palette report. No browser is downloaded; without one, HTML is still written and a visual review remains outstanding.
- **Visual review, not a score:** open the separate 1920×1080 slide-preview PNG first to judge slide proportions, then zoom the detailed sheet to inspect individual specimens and fallbacks. Do not judge slide readability from a tall sheet shrunk to fit a viewer. Check character distinction, accents and punctuation, regular/bold readability, hierarchy and rhythm, and whether the fallback preserves the intended character and fit. Check that font loading has settled without an error. Samples do not prove every glyph or weight is present (browsers may synthesize bold or use glyph fallbacks), and are not an accessibility certification.
- **Review outcome:** record findings, limitations and keep/change decisions in `design.md`; present actionable problems and options to the user before changing the proposed roles. If the agent cannot view images or a primary face is unavailable, say exactly which visual check is still needed rather than claiming it passed.

## Plan (`/opp-propose`)

Write only planning artifacts in `openprez/changes/<change-name>/`; no template code, assets or configuration.

1. **Name and activation.** Choose a distinctive kebab-case name not already used under `templates/` (an upstream template with the same name would conflict later), and write it into the proposal's `## Change type` section. Ask whether the template becomes the active one; record the answer in `design.md`.
2. **Visual direction.** Using the shared rules, decide the art direction, palette, tones, three font roles and footer composition. For every font, decide whether it is installed or bundled and check it against "Choosing and sourcing fonts": glyph coverage for the deck's languages, the weights and styles needed, and its licence, including any Reserved Font Name. For every font or image to download, identify the exact source file and verify its licence now; record the source, licence and required attribution in the plan.
3. **Validate colours and fonts before code.** Write the proposed palette and tones to `palette.json` in the change folder, run the palette report on it with `--screenshot`, and work through the review checklist. Resolve every finding with the user before the plan is final. Write the three proposed font stacks to `fonts.json` beside it, run the font report with `--screenshot`, and review legibility, role harmony and fallback behavior. Record findings, decisions and any unavailable primary-face or visual checks in `design.md`; do not present an unrendered face as validated.
4. **Design document.** In `design.md`, record the palette table with each tone's text contrast and the accent classes per tone, the font roles with their stacks, bundled files, weights, subsets, sources and licences, the imagery with sources and licences, the footer composition, the activation decision, and the outline of `STYLEGUIDE.md` (roles and hierarchy, motifs, asset paths, credits, colour-usage guidance). There is no `content.md`.
5. **Tasks.** In `tasks.md`, list the Implement steps below for this template, each with how it is verified.

## Implement (`/opp-apply`)

Build only the template named in the proposal, from the approved `design.md`, `palette.json` and `fonts.json`. If the approved plan turns out to be unworkable, stop and ask rather than deviating silently.

1. **Template code.** Create `templates/<name>/` with `index.ts` (palette, tones and font roles from the approved plan; `fontSans` equal to `fonts.body`), the `Footer` and `ExportFooter`, and any template-local components.
2. **Assets and credits.** Download and prepare the approved fonts and images into the template folder. When third-party assets require attribution, record each in `templates/<name>/CREDITS.md`; omit that file when there are no such assets. For images and SVGs, include file, title, creator, source URL, license and license URL, modifications, and required attribution. For fonts, include family, style/weight, source file URL, version, license and required attribution, with the licence text kept as "Choosing and sourcing fonts" describes.
3. **Wire and check the fonts.** When the template bundles fonts, declare them in `templates/<name>/fonts.css` and import that file from `index.ts` (`import "./fonts.css";`). Only the active template's entry is imported, so only its fonts are bundled.

   ```css
   @font-face {
     font-family: "Family Name";
     src: url("./fonts/family-name-latin.woff2") format("woff2");
     font-weight: 400 700; /* the range of a variable font, or one rule per static weight */
     font-style: normal;
     font-display: swap;
     unicode-range: U+0000-00FF, U+0131, U+0152-0153; /* only when the family is split into subset files */
   }
   ```

   Name the family first in its role stack, followed by the installed fallbacks, for example `display: '"Family Name", Georgia, serif'`. `font-display: swap` suits files that are local and load quickly; PDF capture waits for `document.fonts.ready`. Then verify:
   - in `pnpm dev`, `document.fonts.check('700 32px "Family Name"')` is true for every family and weight the style guide uses, and a heading's computed `font-family` starts with the display family;
   - `pnpm prez` embeds the font files, and `dist/prez.html` renders with them when opened without network access;
   - an exported PDF page shows the bundled faces.

   For every template (including installed-only stacks), run the font report on `templates/<name>` with `--screenshot` and review it against the approved `fonts.json` and hierarchy in `design.md`. For bundled faces this checks the embedded local files, not a system copy. Inspect legibility, role harmony, coverage-sensitive glyphs and fallback fit; record new findings and ask the user before changing roles. This complements, not replaces, the bundled-font checks above.

   Remove temporary test fonts and fixtures after validation.
4. **Validate the colours.** Run the palette report on `templates/<name>` and confirm it matches the approved `palette.json` findings. Any new finding goes back to the user before the palette changes.
5. **Style guide.** Create or update `templates/<name>/STYLEGUIDE.md` with the three font stacks and their hierarchy (with a stage-pixel example), visual motifs, reusable image/SVG references, exact local asset paths, applicable license/credit information, and the colour-usage guidance from the review checklist:
   - which accents are text-safe, large-text-only or fill-only on each tone;
   - that fill-only accents are decorative fills, never text on that tone;
   - the named data-series tokens and their pairwise distinctness results for normal vision, protanopia and deuteranopia, plus advisory tritanopia findings;
   - kept near-pairs with their role rationales and remaining accessibility limitations;
   - the recommended series order and colour-only series limit, with required direct labels or patterns wherever the documented fallback applies;
   - dark panel or border contrast against its adjacent dark surface, with the projector-visibility rationale.

   Name only assets, components and roles that actually exist. Keep template-specific choices in this file, not in shared documentation; keep this skill generic.
6. **Tests.** Every template has its own tests in its folder. Run them with `pnpm vitest run templates/<name>`.

   **Footer invariants** (`templates/<name>/footer.test.tsx`): templates can't import one another, so adapt `templates/default/footer.test.tsx` into the new folder. It checks:
   - the eight action labels in order: Previous slide, Previous key frame, Previous step, Next step, Next key frame, Next slide, Speaker notes, Export PDF;
   - the disabled state on the first slide;
   - Speaker notes `aria-pressed` both false and true;
   - a blocked pop-up shown as `role="alert"` outside `.footer-actions`, and still visible when the action group is hidden;
   - the export footer containing `data-pdf-footer`, the copyright and `page / total`, and no `<button` and no auto-advance indicator;
   - the auto-advance indicator placed before the date, and absent when the step doesn't auto-advance.

   **Tone contrast** (`templates/<name>/contrast.test.ts`): required for every template you create or rework. Reuse the test-only assertion from `tests/support/contrast.ts`; do not duplicate its colour math or promote test support into the runtime `@core` API.

   ```ts
   import { describe, it } from "vitest";
   import { assertTemplateToneContrast } from "../../tests/support/contrast";
   import template from "./index";

   describe("tone contrast", () => {
     it("keeps every declared tone at 4.5:1 for body text", () => {
       assertTemplateToneContrast(template.tones);
     });
   });
   ```

   **Font roles** (`templates/<name>/fonts.test.ts`): required for every template you create or rework. It guards the compatibility alias and the fallbacks of each role:

   ```ts
   import { describe, expect, it } from "vitest";
   import template from "./index";

   const GENERIC_FAMILIES = ["sans-serif", "serif", "monospace", "system-ui", "ui-monospace"];

   describe("font roles", () => {
     it("keeps fontSans equal to the body role", () => {
       expect(template.fontSans).toBe(template.fonts?.body);
     });

     it.each(["body", "display", "mono"] as const)("%s stack ends in a generic family", (role) => {
       const families = template.fonts?.[role].split(",").map((family) => family.trim()) ?? [];
       expect(GENERIC_FAMILIES).toContain(families.at(-1));
     });
   });
   ```

7. **Activation.** `@template/<name>` resolves to `templates/<name>/index.ts` with no alias or path configuration. If the plan makes the template active, change the template import in both `app/main.tsx` and `app/showcase.tsx`, so the dev showcase and the production build match. Otherwise leave both unchanged.
8. **Checks and report.**
   - Do not bump the version, propose a tag, or edit shared documentation such as `docs/templates.md`, the README or `AGENTS.md`. Tell the user the change edits foundation areas (the template folder and, if activated, the composition entries), so it is outside the deck-only merge guarantee and later upstream pulls may need review.
   - **Checks:** run `pnpm check`, then `pnpm vitest run templates/<name>`, and fix every failure. Do not refresh dependencies for user-template authoring; run `pnpm update --latest` only for actual application-foundation or explicit dependency work, as described in `core/AGENTS.md`. After the build, rerun the font report on `templates/<name>` with `--screenshot` (the build clears `dist/`) and review the final typography.
   - **Preview:** preview each tone and the footer in `pnpm dev`. Check the PDF export when the footer or imagery changed, since footer images must appear in the exported pages.

Shipping a template in the upstream foundation is not part of this workflow. A maintainer does it as a separate foundation change: bump `package.json` following "Release versioning" in `core/AGENTS.md` (a new template or tone is minor, a colour or footer fix is a patch), propose the matching tag, list the template in `docs/templates.md`, and update the README or `AGENTS.md` wherever they describe the active palette.
