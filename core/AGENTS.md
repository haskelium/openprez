# Foundation (`core/`) rules

You are editing the **application foundation**, which is reused by every future deck. This guide governs reusable player/runtime code, not slide-story or visual-design decisions; use the presentation workflow and deck instructions referenced in the root `AGENTS.md` for deck work.

## TypeScript implementation principles

These principles apply to foundation TypeScript and React code. Apply them to runtime code in `app/` and `templates/` as well, as directed by the root guide.

- **Prefer pure functions.** For a given input, a function should return the same output without changing external state. Keep calculations, decisions, and data transformations pure; isolate I/O, browser APIs, and other effects at clear boundaries.
- **Give each function one clear responsibility.** Use names that state the function's purpose, with explicit inputs and outputs. Separate parsing, validation, decisions, transformations, rendering, and effects when they are distinct responsibilities.
- **Keep functions and components small enough to understand at a glance.** Compose named helpers instead of accumulating unrelated branches, state updates, transformations, and effects in one place. Do not write god functions, oversized event handlers, or monster JSX/components. If a body needs comments or section dividers to explain a sequence of different jobs, decompose it. Avoid splitting code into tiny helpers that obscure rather than clarify the flow; there is no arbitrary line-count target.
- **Keep React components focused on UI composition.** Move substantial calculations and business rules into pure helpers. Use hooks for actual stateful or lifecycle behavior; derive values directly when they are pure, rather than adding effects to synchronize redundant state.
- **Make state and mutation visible.** Prefer immutable transformations and explicit data flow. Keep necessary mutation and state at the effectful boundary; avoid hidden shared state and surprising side effects.
- **Compose small units into explicit flows.** Orchestration may coordinate helpers, but should not absorb all their responsibilities. Keep modules cohesive and split them when they take on distinct jobs.

These are design rules, not a demand to abstract every expression. Prefer the simplest decomposition that makes responsibilities obvious and behavior easy to test.

## Foundation constraints

- **Keep it generic.** Never add topic text, slides, deck-specific images or data.
- **Keep the deck-facing API stable.** Decks import only from `@core` (`core/index.ts`). Prefer additive changes: new optional props and new exports. If a breaking change is unavoidable, update `showcase/` and the starter deck in `presentation/` in the same change.
- **Never import deck or template code.** Biome enforces this: the whole foundation imports neither `@presentation/**`, `@showcase/**` nor `@template/**`. The composition entries in `app/` (outside `core/`) are the only modules that import a deck and the template and hand them to the generic player: `app/main.tsx` for the user deck, and the development-only `app/showcase.tsx` for the showcase reference entry.
- **Template contract:** the foundation defines what a template must provide (`core/template/contract.ts`) and applies its palette/font variables (`core/template/style.ts`); it never hardcodes a concrete template's colors or footers.
- **Protect the shell invariants:** the player-owned footer (rendered from the active template), six navigation buttons plus the Speaker notes and PDF export actions, their keyboard mappings, the presenter window (notes only there, never on the stage or in PDF), the key-frame and step models, the fixed 1920x1080 stage, and the logo rules. Any foundation change must keep them working.
- **Scaling:** the stage scales with CSS `zoom`, and the current scale is exported as `StageScaleContext` for components that need it.
- **Footer safety:** the slide area uses `contain: layout paint` so fixed-position slide content can't cover the footer. Keep it.
- **Motion:** the player wraps everything in `MotionConfig reducedMotion="user"`. Any new motion that isn't a transform (path drawing, looping effects, CSS animations) must handle reduced motion and static PDF export mode.
- **Theme:** the active template provides the palette and font values, and declares the named `tones` surface pairs; the player resolves a slide's tone onto the `--surface`/`--on-surface` variables (`core/template/style.ts`); `core/theme/theme.css` maps the stable token names onto them and owns the presenter chrome and structural styles. Add reusable tokens there rather than hard-coding colors in components.

## Dependency and validation routine

For actual reusable application-foundation changes in `core/`, shared startup/composition in `app/`, or root build configuration, run `pnpm update --latest` once per coherent batch and then `pnpm check`. Apply the same routine when dependency changes are explicitly in scope. This refresh is not required for user-deck or user-template authoring, report/tooling work, or documentation-only changes that leave the foundation and dependencies unchanged. Run the tests relevant to the changed foundation behavior.

## Release versioning

The foundation is distributed through the upstream Git repository and its `package.json` version is a live semantic-versioning contract; each release is published as a git tag matching that version. Deck owners rely on it: minor and patch updates apply without touching their deck source, and only a major update may break deck code.

After completing a change that touches the foundation (`core/`, `templates/`, composition entries, build or root config, the dependency manifest), determine the next version from the nature of the change and update the `package.json` version accordingly:

- **Major:** breaking changes — anything that would stop a deck or a fork from building or behaving as before (public `@core` API breaks, deck-structure changes, changed shell invariants).
- **Minor:** new capabilities that existing decks work through without changes (new exports, new optional props, new behavior elsewhere in the player).
- **Patch:** fixes and internal improvements with no externally visible behavior change.

Then propose a git tag matching the new version (e.g. `v1.3.0`) for the user to apply with the commit. Never commit or create the tag yourself. Deck-only changes (`presentation/`, `showcase/`, `openprez/`, docs) do not bump the version; when a change mixes deck work with foundation work, bump once for the foundation part. A template built through the `/opp-*` workflow does not bump the version or propose a tag either; shipping a template upstream is a separate foundation change that does.
