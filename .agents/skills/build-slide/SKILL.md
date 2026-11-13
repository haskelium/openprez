---

name: build-slide
description: Plan and build a bespoke slide for the user's presentation using its active template's typography and visual references. Loaded by /opp-propose (Plan) and /opp-apply (Implement) for deck changes.
user-invocable: false
---

# Build a slide

This skill guides slide design and implementation in the user's `presentation/` deck. It does not replace the `/opp-*` workflow or authorize unplanned edits. The workflow loads it for a change whose proposal records `Type: deck`: `/opp-propose` follows **Plan**, and `/opp-apply` follows both sections, implementing only the approved change. Never use this skill to author the `showcase/` deck.

## Plan

### 1. Read the active template reference first

Before planning typography or visual styling:

1. Read `app/main.tsx` and resolve its active template import to `templates/<name>/`.
2. Read that template's `STYLEGUIDE.md` in full. Use its font roles, palette, tones, motifs and asset references before introducing other styles.
3. If the active template or guide cannot be resolved, or the guide is missing, stop before visual planning and ask for the template/reference to be clarified or created through a template change in `/opp-propose` (see `.agents/skills/build-template/SKILL.md`). Do not guess that the default template is active.

Read `AGENTS.md`, `presentation/AGENTS.md`, the change artifacts (approved ones when applying), and the relevant deck source and slide code. The template guide is a design reference only: deck code must not import from `templates/`.

### 2. Frame the slide's message

- State the single audience takeaway in one sentence and place it in the deck's narrative, accounting for what comes before and after it.
- Use the approved change and canonical presentation source for facts, scope and intended transitions. If a claim, source or content requirement is unclear, stop and ask rather than inventing it.
- Decide what the audience should see first, what can be revealed later, and what belongs in concise speaker notes.

### 3. Choose a visual idea

Choose a bespoke visual form that makes the message obvious. Use the showcase as an example of foundation capabilities, not as a source of stock layouts.

| Message                       | Possible visual direction                                               |
| ----------------------------- | ----------------------------------------------------------------------- |
| Something flows or transforms | `FlowLine` paths between bespoke stations                               |
| A system or process           | A custom SVG composition with local nodes and `FlowLine` connectors     |
| A contrast                    | Opposing compositions or distinct template tones                        |
| A few key numbers             | Large figures revealed one per build step                               |
| Detail on demand              | Clickable cards that open a panel without taking over player navigation |

- Make the visual form serve the message. Prefer a bespoke React/SVG composition over stock title-and-bullet or two-column layouts; existing components are optional behavior primitives, not required layouts. Compose the visual metaphor, nodes and spacing for the message.
- Follow the active template's visual references and color guidance. Use declared tone names and shared surface tokens (`surface` and `on-surface`) for slide backgrounds and foregrounds. Use palette theme tokens for accents rather than hardcoding replacements for the template palette.
- Use the template's font roles through `font-body`, `font-display` and `font-mono` where appropriate. Establish hierarchy with size, weight, line height and spacing. Never request fonts at runtime.
- Keep all slide content within the fixed 1920x1016 slide area above the 64px footer. Use stage pixels; do not add responsive or mobile layouts. A slide's fixed-position elements stay inside its slide area and must not cover the footer.
- Use build steps to guide attention, not to hide necessary context: reveal one idea at a time and keep each build coherent. Keep the declared step count, `useStep()` usage and `keyFrames` consistent so forward and reverse navigation restore the intended states.
- Keep diagrams and interactions within the slide. Do not take over player navigation or add internal pan, zoom, selection or diagram-canvas navigation. A slide that listens for keys must not capture player navigation keys unless an input inside it has focus.

## Implement

### 4. Keep artwork local and credited

- Put slide components under `presentation/slides/` and slide assets under `presentation/assets/`. Import foundation APIs only from `@core`, and use relative imports only within `presentation/`.
- When reusing artwork documented in the active template guide, copy the source file or recreate the artwork under `presentation/assets/`. Never import a file, component or deep module from `templates/`. Use shared foundation components only through their public `@core` exports.
- Confirm that source terms allow the intended redistribution and retain required attribution. Add or update `presentation/assets/CREDITS.md` with the asset path, title/creator, source, license, modifications and required credit. If terms or provenance are unclear, do not use the asset until resolved.
- Keep SVG diagrams local and export-safe: use SVG-native shapes and text for essential content, avoid `<foreignObject>`, and provide accessible labels for meaningful graphics. Use active theme CSS variables for theme-colored strokes and fills.
- For custom motion, use `useMotionAllowance()`, `stepTransition()` and `EASE_OUT` from `@core` where appropriate, honor reduced-motion preferences, and use `useExportMode()` to render settled content for static PDF capture. Do not rely on remote images, remote fonts, or runtime asset fetching.

### `FlowLine`

- Import it from `@core` and render it inside an SVG.
- Pass SVG path data through `d`; use `step` to choose when the connector draws.
- Optional `color`, `width`, `duration`, and `flowing` props control its treatment.
- It draws and retracts with step navigation, disables pulses for reduced motion, and settles for static PDF export. It does not arrange nodes or choose a diagram structure.

### 5. Implement and validate

- Put each slide in `presentation/slides/` and register it in `presentation/deck.tsx` with a unique ID, the approved `steps`, relevant `keyFrames`, selected tone, concise `notes` and its component.
- Derive concise speaker notes from the approved content and note intent; for multi-step slides, use `[[step:N]]` markers and keep all passages visible. Keep the richer narrative in `openprez/specs/presentation.md`.
- Preview the affected slide and changed steps or interactions, including step progression and rewind; do not repeat a full-deck walkthrough. Check typography, contrast, cropping, footer clearance and the active template references at presentation scale.
- After slide-code changes, run `pnpm check` and focused tests relevant to the changed behavior. Do not refresh dependencies for deck authoring; `pnpm update --latest` is reserved for actual application-foundation or explicit dependency work, as described in `core/AGENTS.md`. Generate a PDF only when export-sensitive rendering, settled animation, capture-sensitive assets or the export path changed, or when requested.
- Keep any foundation work separate from deck work. If the slide requires a reusable `core/` change, surface that as a separate foundation change rather than importing template internals or silently expanding the approved deck scope.
- Do not commit. Report what changed, what was validated and any unresolved content or visual question.
