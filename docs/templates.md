# Templates

The active template owns the presentation's visual identity. The default implementation lives in [`templates/default/`](../templates/default/), and the selected template is wired in [`app/main.tsx`](../app/main.tsx) and the development-only [`app/showcase.tsx`](../app/showcase.tsx).

## Responsibilities

A template provides:

- palette values and semantic body, display and mono font roles;
- named surface tones, including `base` and `inverse`;
- the live footer;
- the export footer;
- visual composition of the player-owned navigation and actions.

Templates reuse generic shell components such as `NavigationButtons`, `ActionButton`, `AutoAdvanceIndicator`, and `Logo`. They must preserve the eight actions, their order, tooltips, pressed states, and auto-hide behavior. The live footer places `AutoAdvanceIndicator` where the template chooses; it renders the current step's auto-advance countdown and renders nothing when the step has no duration. Keep player error alerts outside `.footer-actions`, so a popup, presenter-support, or export error stays visible when the actions auto-hide. Export footers omit live errors and every interactive action.

## Footer brand mark

Set the optional `PresentationTemplate.FooterBrand` component to replace the footer's OpenPrez logo in both live slides and PDF pages. Omit it to retain the OpenPrez logo. This setting affects only the footer mark, not title-slide logos, copyright copy, navigation, dates or counters.

The player passes that component as the optional `Brand` prop to `Footer` and `ExportFooter`. Both renderers must render `Brand` in their brand zone, defaulting to `Logo` when it is omitted; existing templates without this option remain compatible. The bundled default and autumn templates support it.

A mark accepts `FooterBrandProps` from `@core` and forwards `className` to its root SVG or image so the template controls sizing (the bundled footers use a 24px-high mark). Provide an accessible name (`aria-label` for SVG or `alt` for an image), preserve contrast on every tone, and keep assets local inside the template folder. Prefer SVG-native artwork using `currentColor`; do not fetch remote assets at runtime. If the mark animates, honor reduced motion and use `useExportMode()` to render its settled state in the PDF footer.

## Boundaries

Templates may import `@core` and their own sibling files. They must not import deck content, presentation assets, or deep foundation internals. Templates do not change keyboard navigation, slide state, step behavior, or presenter-window behavior.

Slides select a declared tone. The player resolves that tone to surface and text variables so slide backgrounds, footers, presenter views, and exports stay consistent. An unknown tone name, including inherited object-property names, falls back to `base`; only a tone explicitly declared as the template's own property is selected. Do not hardcode a slide's shared surface colors inside a template or slide.

## Typography and local fonts

`PresentationTemplate` exposes body, display and mono font stacks through its optional `fonts` object. Templates either provide all three roles, or omit `fonts` and rely on `fontSans` for body only while display and mono resolve to system defaults. The default text face and `font-sans` utility resolve to body, while `font-body`, `font-display` and `font-mono` let slide authors select roles explicitly.

Fonts may be obtained during authoring only after verifying that they are no-cost and their license permits embedding and redistribution in the built app. Keep the font files and their licence text in `templates/<name>/fonts/`, declare them with `@font-face` rules in `templates/<name>/fonts.css` imported by the template's `index.ts`, and do not make runtime font requests. Only the active template's fonts are bundled; `pnpm prez` embeds them in the standalone artifact. The `build-template` skill lists the selection criteria (glyph coverage, weights, legibility), acceptable licences and how to obtain unmodified WOFF2 files.

## Style guide

Every template created or reworked through a template change includes `templates/<name>/STYLEGUIDE.md`, documenting its font roles and hierarchy, visual motifs, reusable image/SVG references, local asset paths, applicable credits, and colour-usage guidance: which accents are text-safe, large-text-only or fill-only on each tone. Colour-usage guidance lives in the template's own guide, not in this page, so a user's template never edits shared documentation.

Before planning a slide's typography or visual styling, the `build-slide` skill resolves the active template from `app/main.tsx` and reads this guide. Slide authors use the guide as a design reference, not an import path: they copy or recreate reusable template artwork in the deck's own assets and retain required credits there. Deck code never imports from `templates/`.

## Building a template

Templates are built with the same OpenPrez workflow as decks, as a **template change**:

1. `/opp-explore` — discuss the look; the agent asks whether you are building a template or your slide deck.
2. `/opp-propose` — confirm the template change; the agent plans it with the `build-template` skill (`.agents/skills/build-template/SKILL.md`): name, activation, palette and tones, font roles, imagery and licences, footer, and the style-guide outline. The proposed colours are written to the change's `palette.json` and validated with the palette report before any code exists.
3. `/opp-apply` — build `templates/<name>/` with its code, assets, `CREDITS.md`, `STYLEGUIDE.md` and tests, validate the palette again, and activate it if planned.
4. `/opp-archive` — check the style guide and credits against the plan and archive the change.

Any folder under `templates/` resolves as `@template/<name>` with no alias or TypeScript-path configuration. To activate a template, change the template import in `app/main.tsx` and `app/showcase.tsx`, which must present the same template.

### Palette report

The palette report renders a template's swatches, every tone with its accents, colour-vision simulations and a WCAG contrast table. It takes a template folder, or a proposed palette file during planning:

```sh
node .agents/skills/build-template/scripts/palette-report.mjs templates/default --screenshot
node .agents/skills/build-template/scripts/palette-report.mjs openprez/changes/<change-name>/palette.json
```

A palette file is JSON `{ "name", "palette", "tones" }` with all eleven palette tokens (`primary`, `onPrimary`, `accent1`–`accent5`, `neutral`, `data1`, `data2`, `data3`), the `base` and `inverse` tones, and `#RRGGBB` values. The report is written to `dist/template-reports/<name>.html`. With `--screenshot`, a PNG is captured next to it using an installed Chrome, Chromium, Edge or Firefox; use `--browser <name|path>` to choose one. Templates created or reworked through a template change also carry a `contrast.test.ts` asserting that every tone's text reaches 4.5:1. Validate the selected template with `pnpm check`.

### Your template and upstream updates

A template you build in your fork edits foundation areas: its folder under `templates/` and, if you activate it, the template import in `app/main.tsx` and `app/showcase.tsx`. That is outside the deck-only merge guarantee, so review upstream pulls that touch those files. Your template does not change the foundation version; choose a distinctive name so it never collides with a template shipped upstream. Template work meant to ship upstream follows the release-versioning rules in `core/AGENTS.md`.
