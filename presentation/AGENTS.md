# User deck (`presentation/`) rules

This guide adds only user-deck-specific instructions. The repository root `AGENTS.md` is the source for shared slide-design, stage, shell, theme, asset, and validation rules.

- **Entry point:** `presentation/deck.tsx` exports `defineDeck({ title, date?, slides })`; array order determines slide order. This folder ships as a starter deck; the first deck change replaces the starter slide's guidance with the user's own content.
- **Slide files:** put slide components in `presentation/slides/` and register each with `defineSlide({ id, steps, tone, notes, Component })` using a unique `id`.
- **Workflow:** use `/opp-explore`, `/opp-propose`, `/opp-apply`, and `/opp-archive` for the matching phases. Keep `openprez/specs/presentation.md` as the richer canonical source; slide notes are delivery aids derived from it.
- **Imports and assets:** import foundation APIs only from `@core`, use relative paths within this deck, and store deck assets in `presentation/assets/`.
