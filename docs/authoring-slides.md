# Authoring slides

Your deck lives in `presentation/`, which ships as a starter deck — one guidance slide you replace with your first change; the lifecycle is in [Starting your deck](starting-your-deck.md). Put slide components in `presentation/slides/` and deck assets in `presentation/assets/`.

## Deck and slide shape

A deck is declared with `defineDeck({ title, date?, copyrightNotice?, defaultAutoAdvance?, slides })`. The title must contain non-whitespace text; no arbitrary title length cap is imposed. `copyrightNotice` sets the footer text for live slides, PDF pages, and standalone HTML exports; when omitted, the template's default is used. An explicit empty string suppresses copyright text. Whitespace-only notices are invalid; nonempty source notices are limited to 256 characters and expanded notices to 512. Notices support `{year}` (four-digit year), `{date}` (ISO `YYYY-MM-DD`), and `{longDate}` (for example, `14 October 2026`). Use these tokens with braces; they are expanded globally from the presentation date. HTML exports use their build date, and PDF exports freeze the date when export starts (standalone presentations retain their build date); an explicit deck `date` takes precedence. Unknown placeholders remain unchanged. The text is rendered as text, not HTML; placeholders do not evaluate expressions or arbitrary code. Invalid deck metadata fails when `defineDeck` is called, before the player renders. Each slide is declared with `defineSlide({ id, steps?, keyFrames?, tone?, notes?, autoAdvance?, Component })` and appears in the order listed by the deck.

Use unique, descriptive slide ids. Keep one main component per slide and compose smaller visual components beside it when a slide has a distinct internal responsibility.

## Build steps and key frames

Steps are 1-based. The slide component receives the current `step` and total `steps`; nested components can use `useStep()`. Reveal or animate content by step, and make sure moving backward removes every later build.

`keyFrames` identifies exported/static checkpoints. If omitted, the final step is the only key frame. Use key frames when a long build has meaningful intermediate states that presenters may want to revisit quickly.

## Auto-advance

`autoAdvance` declares, in seconds, how long each build step holds before the player advances automatically: one number applies to every step, an array gives one duration per step in step order. Durations must be positive finite numbers that convert to finite milliseconds. Steps beyond the array use the deck's `defaultAutoAdvance`; steps with neither never auto-advance. The footer shows a small circular countdown for the current step, with a pause/play button at its center; `P` pauses and resumes. Auto-advance stops at the end of the deck.

## Visual and export rules

- Render within the fixed `1920x1016` slide area; never cover the footer.
- Use the active template's named tones rather than hardcoding shared surface colors.
- Prefer SVG-native shapes and text for diagrams that must export cleanly.
- Use `useExportMode()` for custom animation that needs a settled PDF state.
- Honor reduced motion for looping effects and non-transform animation.
- Keep all assets local so the deck works without a network connection.
- Do not capture navigation keys unless an input inside the slide has focus.

Slides should be designed around their story rather than assembled from a mandatory layout pattern. The showcase deck in `showcase/` contains examples of build sequences, flow lines, diagrams, split layouts, and interactive panels.

## Speaker notes

Add concise notes to every created or substantially changed slide. For multi-step delivery notes, use `[[step:N]]` markers so the presenter view can associate passages with builds. Notes are bundled into the application and never belong on the slide, in the footer, or in the PDF; do not put secrets in them.
