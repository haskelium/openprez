# Showcase deck rules

Use this guide only when changing `showcase/`, the reference deck served by the development server at `/showcase.html` (via the `app/showcase.tsx` entry; never a production build input). The root `AGENTS.md` is the source of shared project boundaries, slide-design and shell rules, theme/assets guidance, and validation scope; this file adds only showcase-specific rules.

- **Purpose:** keep this deck a clear example of the foundation's public `@core` API and player capabilities. Do not use it as the user's own presentation; that is the starter deck in `presentation/`, replaced by the user's first change.
- **Entry point:** `showcase/deck.tsx` exports `defineDeck({ title, date?, slides })`. Its `slides` array defines order.
- **Slide files:** put one slide component per file in `showcase/slides/`, and declare it with `defineSlide({ id, steps, tone, notes, Component })` using a unique `id`.
- **Imports:** import foundation features only from `@core`; use relative imports for files inside `showcase/`. Never deep-import from `core/` or import `@template/**`.
- **Assets:** store showcase-only assets in `showcase/assets/` and import them by relative path.
