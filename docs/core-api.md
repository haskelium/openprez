# Core API

Decks import foundation features from `@core`, whose public exports are collected in [`core/index.ts`](../core/index.ts). Do not deep-import foundation internals from deck code.

## Deck model

- `defineDeck` validates and normalizes a deck declaration, including the optional `defaultAutoAdvance` fallback.
- `defineSlide` declares a slide, its build steps, key frames, tone, notes, auto-advance durations, and component.
- `useStep` reads the current build step inside a slide.
- `SlideProps` describes the props supplied to slide components.

## Stage and export

- `STAGE_WIDTH` and `SLIDE_AREA_HEIGHT` describe the fixed stage dimensions.
- `StageScaleContext` exposes the current display scale for components that need it.
- `useExportMode` identifies static PDF/export rendering.

## Shared visual components

- `Logo` renders the OpenPrez mark and wordmark.
- `FlowLine` draws a step-aware SVG flow line with optional motion.
- `AutoAdvanceIndicator` renders the current step's auto-advance countdown with its pause/play button, and nothing when the step has no duration. Its `AutoAdvanceControls.disabled` option prevents pause/play input while an authoritative remote session is reconnecting.

## Template contract

Templates use the exported `PresentationTemplate` and related palette, tone, footer, and style types. The generic player supplies navigation state and actions; templates arrange the presentation of those controls but do not replace navigation behavior.

See [`core/index.ts`](../core/index.ts) and the component source for exact TypeScript signatures. Update this page when a public export is added or its behavior changes.
