# OpenPrez repository agent guide

This is the shared entry point for coding agents in a local, player-only presentation app. It covers repository boundaries and shared requirements; it does not make app development and presentation authoring the same responsibility. The app presents **one** slide deck, with no in-app editing, backend, or LLM integration.

## Choose the right workstream

- **App and foundation development:** work on the player, stage, navigation, presenter, export, shared components, or reusable APIs. Keep the code generic and follow `core/AGENTS.md` for TypeScript implementation principles. Apply those same principles to runtime TypeScript in `app/` and `templates/`.
- **Presentation authoring:** work on the deck's story, slide content, visuals, notes, or deck assets—not the reusable player. Use the `/opp-*` workflow listed under Skills for the user's deck in `presentation/`; it does not target the sample `showcase/`. `presentation/` ships as a starter deck: its single seed slide is guidance, replaced by the user's first change; the first `/opp-propose` seeds the canonical source in `openprez/specs/presentation.md`. Deck work commits stay confined to `presentation/` and `openprez/`, so a user fork can pull upstream updates without conflicts. Use `presentation/AGENTS.md` for any deck-specific additions to the shared rules below. Do not put deck content in `core/`.
- **Showcase deck:** this is the reference deck served by the development server at `/showcase.html`. Follow `showcase/AGENTS.md`; change it only when the task concerns the showcase.
- **Templates:** these are runtime presentation skins, not slide content. A user builds or reworks one through the same `/opp-*` workflow as a template change, planned and built with the `build-template` skill. Follow the template contract and boundaries below when implementing one.

Presentation-specific sections in this guide apply only while authoring or reviewing a deck. For the OpenPrez workflow, invoke the relevant `/opp-*` skill rather than treating this guide as a slide-planning process. Supporting and foundation skills live in `.agents/skills/`.

Nested guides are additive: keep shared rules here and put only path-specific additions in `core/AGENTS.md` (foundation implementation), `presentation/AGENTS.md` (the user deck, which ships as the starter deck), and `showcase/AGENTS.md` (the showcase deck).

## Stack

TypeScript, React, Vite, Tailwind CSS v4, Motion (`motion/react`), Lucide icons, Biome, pnpm.

## Running the app

| Command              | Does                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`           | Dev server with live reload at `http://localhost:5173`.                                                               |
| `pnpm start`         | Builds, then serves the production build at `http://localhost:4173`. This is the way to present.                      |
| `pnpm build`         | Production build only, into `dist/`.                                                                                  |
| `pnpm typecheck`     | TypeScript check (`tsc --noEmit`) without emitting files.                                                             |
| `pnpm lint`          | Biome check without fixes (lint and format verification).                                                             |
| `pnpm format`        | Apply Biome formatting fixes.                                                                                         |
| `pnpm boundaries`    | Check resolved import ownership rules only.                                                                           |
| `pnpm prez`          | Builds a self-contained single-file presentation at `dist/prez.html`, with all assets embedded.                       |
| `pnpm prez:showcase` | Same single-file artifact, built from the showcase deck (for demo deployments such as GitHub Pages).                  |
| `pnpm test`          | Complete Vitest suite, including maintained report-tool tests.                                                        |
| `pnpm test:browser`  | Focused Chromium interaction, export and local-file standalone checks; requires an installed Chromium-family browser. |
| `pnpm check`         | Biome lint and format (with fixes), resolved import boundaries, type check, then build.                               |
| `pnpm validate`      | Non-mutating CI gate with Biome verification, boundaries, type check, all unit tests and build.                       |

Granular commands: `pnpm typecheck` runs the type check alone, `pnpm lint` verifies Biome without fixing files (fix via `pnpm format` plus `pnpm check`), and `pnpm boundaries` runs only the import-ownership checker also covered by `pnpm check` and `pnpm validate`.

Deck changes are bundled at build time: rebuild and restart `pnpm start` to see them there. The dev server doesn't need to hide edits from the screen; the presenter simply doesn't edit a deck they want to keep unchanged, and rolls back if they do.

## Repository areas

| Area            | Holds                                                                                                                                                  | Rule                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `app/`          | Shared player bootstrap and composition entries for the user deck and showcase.                                                                        | Composition only; keep reusable logic in `core/`.                                                                          |
| `core/`         | The reusable foundation: player, stage, navigation, theme plumbing, template contract, shared components.                                              | Generic only. Never add topic text, slides or deck assets.                                                                 |
| `presentation/` | The user's own deck: `deck.tsx`, `slides/`, `assets/`. Ships as a starter deck; the first change replaces its guidance slide.                          | All deck work happens here.                                                                                                |
| `showcase/`     | The OpenPrez showcase deck: a reference presented by the dev server at `/showcase.html`, never part of a production build.                             | Follow `showcase/AGENTS.md`; keep showcase work separate from the user's deck.                                             |
| `scripts/`      | Repository automation, standalone packaging, and shared script utilities.                                                                              | Build-time tooling only; runtime app modules must not depend on scripts.                                                   |
| `tests/`        | Foundation and script tests, with shared support in `tests/support/`.                                                                                  | Test-only; template and deck tests stay in their own folders.                                                              |
| `templates/`    | Runtime visual templates: the active template supplies the palette and the footer presentation, as React components checked and bundled like app code. | One template per branch, selected in `app/main.tsx` through `@template/<name>`; may import `@core` and its own files only. |

Biome provides early import feedback; `pnpm boundaries` enforces resolved ownership, including symlinks and unselected templates. Both `pnpm check` and `pnpm validate` run the boundary checker:

- Deck code (`presentation/` and `showcase/`) imports the foundation only through `@core`, and its own files only through relative paths inside its own deck folder.
- Templates import only `@core` and their own sibling files; never deck content or deep core internals.
- Foundation code never imports deck or template code. The `app/main.tsx` composition entry imports the user deck (`@presentation/deck`) and the active template (`@template/default`) and hands both to the generic player. The `app/showcase.tsx` entry mirrors it for the showcase deck (`@showcase/deck`): a development-only reference served at `/showcase.html`, never a production build input.
- Templates never change navigation behavior: they arrange the player-controlled state and actions (`NavigationControls`), they do not replace them.

## Template layer

The active template owns the presentation's visual identity: palette, typography and the footer format and copy, for both live slides and exported PDF pages. The default template lives in `templates/default/`; a new template is a folder under `templates/`, resolvable as `@template/<name>` with no alias configuration, selected by pointing the template import in `app/main.tsx` and `app/showcase.tsx` at it. When building or adjusting a template:

- Implement the `PresentationTemplate` contract from `@core`: `palette` values, `tones` (the named surface pairs slides select from; `base` and `inverse` are required, extra names are free), font roles, and `Footer`/`ExportFooter` components receiving the player's `NavigationControls`/counters. The font-role rules (body, display, mono and the `fontSans` compatibility field) are in `docs/templates.md`.
- Reuse the generic shell parts from `@core` (`NavigationButtons`, `ActionButton`, `Logo`); keep the eight actions, their order, tooltips and the auto-hide behavior (`footer-actions`) intact.
- Adapt to the template's tones through the shared `surface`/`on-surface` tokens; never hardcode a slide's colors.
- Keep template images and font files inside the template folder. Fonts may be acquired during authoring only after verifying they are no-cost and licensed for embedding and redistribution; bundle them locally with required license notices and credits. Never load fonts or images at runtime.
- Give each created or reworked template a `STYLEGUIDE.md` describing its font roles and hierarchy, visual motifs, reusable local image/SVG references, applicable credits and colour-usage guidance. Slide authors read the active guide as a reference; they never import template code or assets.
- A template built through the `/opp-*` workflow never bumps the foundation version or edits shared documentation; it is outside the deck-only merge guarantee. Shipping a template upstream is a separate foundation change that follows the release-versioning rules in `core/AGENTS.md`.

## Presentation authoring rules (deck work only)

These constraints govern slide implementation, not app architecture. Use the `/opp-*` skills above for presentation changes and follow the applicable deck guide. Design every slide around its story. Don't reach for stock layouts (title plus bullets, two columns): build a bespoke React composition, with animation and interactivity where they help the message. Core components are optional tools, never required patterns.

- **Active template reference:** Before planning typography or visual styling, resolve the template selected in `app/main.tsx` and read `templates/<name>/STYLEGUIDE.md`. Prioritize its font roles, palette, tones and visual references. The guide is not an import path: copy or recreate reusable template artwork in the deck's own `assets/` folder, retain required credits there, and never import from `templates/`.

- **Stage:** every slide renders into a fixed **1920x1016** slide area, above a 64px footer, on a 1920x1080 stage that the player scales to fit the window. Size things in stage pixels. Don't add responsive or mobile layouts. `position: fixed` inside a slide is confined to the slide area, so it can never cover the footer.
- **Build steps and key frames:** `defineSlide({ steps, keyFrames })` declares a slide's build steps and the 1-based steps exported as key frames. If `keyFrames` is omitted, the final step is the only key frame. The slide component receives `{ step, steps }`, and nested components can call `useStep()`. Steps start at 1. Reveal or animate by step.
- **Speaker notes:** write concise notes in each slide's `notes` field when you create or substantially change it. The player shows them only in the presenter window, which the presenter opens with the Speaker notes button or `N`; never on the stage, footer, or PDF export. They are still bundled into the built JavaScript, so never put secrets in them, and don't share a build of a sensitive deck.
- **Tones:** declare `tone` as one of the active template's declared names (default "base") — the player resolves the template's surface pair for it, so the footer, slide background and text colors follow the template, not the slide. `inverse` is the inverted contrast pair for slides that need the flip.
- **Reduced motion:** the player honors the viewer's reduced-motion setting for transform animations. For other motion that would still run, such as SVG `pathLength` draws or looping animation, check `useReducedMotion()` from `motion/react` and skip or shorten it.
- **Diagrams:** compose diagrams from local SVG and React elements, not a third-party diagram library that adds attribution requirements or projected-slide navigation. Use `FlowLine` for step-revealed connectors; build nodes and layout bespoke to the slide. Build steps are the guided path, while slide interactions stay within the slide and never take over player navigation. Do not add internal pan, zoom, selection, or navigation. Honor reduced motion and static PDF export for animation; use SVG-native shapes and text for export-critical content, avoiding `<foreignObject>`.
- **PDF export:** pages capture at 1920x1080 and encode as JPEG at quality 0.9. Use SVG-native shapes and text for diagram content; avoid `<foreignObject>`, whose HTML may be omitted or mislaid by browser PDF capture. Custom animated slide content should use `useExportMode()` from `@core` to render its settled state without transient or looping motion.

## Shell invariants (slides must not override or remove)

- The footer rendered by the active template on every slide: logo, copyright copy, six navigation buttons, the Speaker notes action and the PDF export action, then the presentation date and `n / total` at the right. The template owns the format and copy; the player owns the actions and the decision to render the footer. PDF pages retain the footer and omit all eight actions.
- The six navigation buttons (Previous slide, Previous key frame, Previous step, Next step, Next key frame, Next slide), the Speaker notes action (opens or closes the synced presenter window) and the PDF export action. The action group reveals on hover or keyboard focus and remains visible on touch devices.
- Keyboard mapping: Left/Right for previous/next step, Up/Down for previous/next slide, Shift+Left/Shift+Right for previous/next key frame, Space for next step, Home/End for first/last slide, N for the speaker notes window, and F for fullscreen. Page Up/Down do not navigate.
- The step model and the fixed stage. Slides render only inside the slide area, never over the footer.
- The logo: prominent on the first slide, and small in the footer of every slide.
- A slide that captures keys must not take over the navigation keys unless an input inside it has focus.
- Touch swipes on the slide area navigate (horizontal for steps, vertical for slides, two-finger horizontal for key frames). Slide content with its own touch gestures (drag, draw, pan) owns them by calling `preventDefault()` in its `pointerdown` handler or by carrying `data-swipe-ignore` on the gesture element; either covers its descendants. Never disable swipes for a whole slide. A two-finger pinch-out enters fullscreen and pinch-in exits; if a gesture qualifies as both a pinch and a two-finger key-frame swipe, pinch takes precedence.
- When slide layout or collision geometry depends on rendered text metrics, wait for `document.fonts.ready` and measure the text actually rendered, including local fallback faces. Cancel initialization after unmount or supersession, use the current `StageScaleContext` to convert screen measurements to stage pixels, and avoid revealing elements in provisional positions before measurement completes.

## Active template theme

- The active template supplies the palette and semantic `body`, `display` and `mono` font roles; the foundation exposes them as theme tokens and CSS variables so slides, SVG and components all render the same values. Before styling or describing a deck, resolve the selected template in `app/main.tsx` and read `templates/<name>/STYLEGUIDE.md`; never treat one template's values as foundation defaults. The shipped default is the espresso template with bundled Atkinson Hyperlegible roles, while the OpenPrez logo wordmark keeps its independent Arial face. Select roles with `font-body`, `font-display` and `font-mono`; default text and `font-sans` are body.
- The template's `primary` and `onPrimary` tokens are the primary colors; use the secondary accents (`accent1`–`accent5`), the `neutral` and the `data1`/`data2`/`data3` data colors for depth and highlights. The template chooses every palette value freely for the atmosphere it wants to build; the token names are stable slots, not an ordered scale.
- Maintain strong contrast for all text and controls.
- Use theme variables for SVG strokes and other inline styles; use reference hex values for slide-specific accents unless a reusable token is added in `core/theme/theme.css`.

## Public `@core` API

| Export                                                                                                                                                 | Use                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defineDeck`, `defineSlide`                                                                                                                            | Declare the deck (`title`, optional `date` override as `"YYYY-MM-DD"`, `slides`) and each slide (`id`, `steps`, optional `keyFrames`, `tone`, `notes`, `Component`).                                                            |
| `useStep()`, `SlideProps`                                                                                                                              | Read the current step inside a slide.                                                                                                                                                                                           |
| `useExportMode()`                                                                                                                                      | Detect when a slide is being rendered as a static PDF page.                                                                                                                                                                     |
| `FlowLine`                                                                                                                                             | An SVG path that draws itself when its step is reached, with flowing pulses. Place it inside an `<svg>`.                                                                                                                        |
| `useMotionAllowance`, `stepTransition`, `EASE_OUT`                                                                                                     | Low-level motion helpers that coordinate entrance and ambient animation with reduced-motion preferences and static PDF export.                                                                                                  |
| `Logo`                                                                                                                                                 | The OpenPrez logo (brackets around a play mark, then the wordmark); it takes its color from the surrounding text color. `animated` plays a one-time entrance for a title slide, settled in PDF export and under reduced motion. |
| `STAGE_WIDTH`, `SLIDE_AREA_HEIGHT`                                                                                                                     | Slide-area dimensions in stage pixels.                                                                                                                                                                                          |
| `StageScaleContext`                                                                                                                                    | Current zoom factor from stage pixels to screen pixels, for components that need the stage's display scale.                                                                                                                     |
| `PresentationTemplate`, `TemplateFontRoles`, `TemplatePalette`, `TemplateTones`, `TemplateSurfacePair`, `FooterRenderProps`, `ExportFooterRenderProps` | The template contract (templates only): palette values, named tones, required compatibility `fontSans`, optional body/display/mono font roles, and live/export footer renderers.                                                |
| `templateStyleVariables`, `toneStyleVariables`                                                                                                         | Map the template's palette and font roles onto the CSS variables the theme reads (composition entry), and resolve one tone's surface pair (player/export/presenter).                                                            |
| `NavigationButtons`, `ActionButton`                                                                                                                    | The six player navigation buttons, and one icon-only action with tooltip and pressed state, for composing a template footer.                                                                                                    |

## Assets: local-first

Keep assets local: deck assets in the deck's own `assets/` folder (`presentation/assets/`, `showcase/assets/`), shared brand assets in `core/`, and template assets in their template folder. Thematic images and fonts may be acquired during authoring only after verifying that the license permits the intended redistribution and retaining required attribution. Bundle fonts locally with their license notices; never load remote fonts or add runtime asset fetches. Use local files in the slide, and provide a local fallback such as a screenshot when live web content cannot be copied.

## Reference documents for deck authoring

Users may supply attachments, accessible file paths, or documents in `sources/` at the repository root, the Git-ignored local inbox (only `.gitkeep` is tracked). PDFs, slide decks, word-processing documents, Markdown, text and spreadsheets are source material, not runtime assets. Read the **Document sources** section of `.agents/skills/openprez/SKILL.md` before using them. Follow its analysis, provenance, safety and explicit retention-consent rules through the `/opp-*` phases. No new runtime ingestion, upload service or parser dependency is required; use the agent's available document capabilities and report anything unreadable.

## Dependencies: always latest

- Add dependencies with `pnpm add <pkg>@latest` (`-D` for tooling). Take versions from the registry; never write a version number from memory.
- When an application-foundation or explicit dependency update is in scope, upgrade with `pnpm update --latest`.
- If an upgrade breaks something, adapt the code to the new API. Don't downgrade or pin.

## Keep workstreams separable

- Keep foundation changes (`app/`, `core/`, `templates/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, root config) separate from deck changes (`presentation/`, `showcase/`) so the user can commit or carry them independently. Never commit unless the user explicitly asks.
- A user fork receives foundation updates by pulling the upstream remote and running `pnpm install` and `pnpm check`; deck work confined to `presentation/` and `openprez/` rebases without conflicts, and only a major version increment may require deck migration.
- Tell the user whenever the foundation changes, so it can be carried back to the bare foundation.
- After any change to the `@core` API, the showcase deck and the user deck in `presentation/` (starter or authored) must still pass `pnpm check`.

## Agent routine

- For actual application-foundation work (`core/`, shared app composition in `app/`, or root build/dependency configuration), and for explicit dependency changes, run `pnpm update --latest` once per coherent batch, then run `pnpm check`.
- For deck authoring, user-template authoring, scripts/report tooling, or other code that does not change the application foundation or dependencies, run `pnpm check` and the relevant focused tests without refreshing dependencies.
- Documentation- or instruction-only changes do not require builds or runtime tests.

Fix every check failure before reporting code work as done.

### Validation scope

- Run the applicable routine once after a coherent batch of changes, not after every intermediate edit. `pnpm update --latest` is limited to application-foundation or explicit dependency work; it is not a default prerequisite for every code change.
- `pnpm check` is lint/format, type checking, and a production build; it does not run the unit-test suite. Do not add a full `pnpm test` run to every change.
- Run only tests relevant to the changed behavior, selecting test files or cases. Expand to a broader suite only for cross-cutting changes, evidence of wider regressions, or an explicit user request.
- For slide edits, preview only the affected slide and changed states or interactions. Do not repeat a full-deck walkthrough for local text, style, or layout adjustments.
- Do not run PDF export as a routine slide check. Test it only when the change affects the export pipeline, `useExportMode()` or settled export state, export-specific rendering, or capture-sensitive assets/constructs, or when the user requests it. Changes to ordinary text, colors, spacing, or chart values do not by themselves require a PDF export.
- When export validation is needed, prefer checking the affected slide's static export rendering. Run a full PDF generation/download check only when the end-to-end export path is affected or explicitly requested.
- Scope planned validation tasks to the change too; do not create a blanket requirement to rerun every test or PDF export. Record what was checked and any relevant limitations without treating unrelated checks as blockers.

## Skills and workflow entry points

### User-deck workflow (`presentation/`)

- `/opp-explore`: discuss the whole deck, a scoped change, or a template direction, settling whether it is a deck or template change; read-only.
- `/opp-propose`: confirm the change type and turn the agreed change into a reviewable plan with the matching skill; no slide or template edits.
- `/opp-apply`: implement the approved plan (slides or template) and validate the affected work.
- `/opp-archive`: sync validated deck content to the canonical source, or check a template's style guide and credits, then archive the change.

Use the matching `/opp-*` command for its phase. Shared workflow rules, including the two change types, live in `.agents/skills/openprez/SKILL.md`; command-specific instructions live in each `opp-*/SKILL.md`.

### Supporting skills

- `build-slide`: plan and build user-deck slides for a deck change; loaded by `/opp-propose` and `/opp-apply`, using the active template's `STYLEGUIDE.md` as a reference.
- `build-template`: plan and build a runtime template for a template change; loaded by `/opp-propose` and `/opp-apply`. Covers local font and image guidance, a `STYLEGUIDE.md`, a palette report (also run on a proposed `palette.json` before any code exists), and per-template contrast and footer tests.
- `promote-to-core`: assess and move reusable deck work into the foundation as a separate workstream.
