---

name: promote-to-core
description: Move a reusable component, hook or style from a deck in presentation/ or showcase/ into the reusable foundation in core/. Use when the user asks to promote or generalize deck work.
user-invocable: false
---

# Promote deck work to the foundation

Turn something built for one deck into a generic foundation feature. The result must contain no deck content, and both decks must keep working.

## 1. Confirm it's reusable

- Name the piece and the general problem it solves, independent of this deck's topic.
- If it only makes sense for the source deck's story, leave it in that deck and tell the user why.

## 2. Make it generic

- Remove all topic text, deck-specific data and deck assets. Pass them in as props instead.
- Make the variations configurable through props with sensible defaults: content, colors, steps, sizes.
- Use the theme tokens, not hard-coded colors.
- If the piece is interactive and assumes unscaled screen pixels, apply the counter-zoom pattern: read the display scale from `StageScaleContext` (or measure it against the stage dimensions, as the showcase's `InteractiveSlide` does) and divide screen pixels back into stage pixels.

## 3. Move it into `core/`

- Put it in `core/components/`, or a fitting `core/` folder.
- Export it, with its props type, from `core/index.ts`.
- Update the donating deck to import it from `@core`, and delete its implementation copy. Keep this deck integration separate from the foundation extraction so the user can carry and commit the two workstreams independently.

## 4. Document it

- Add any new public export to both the "Public `@core` API" table in the root `AGENTS.md` and `docs/core-api.md`.
- Add focused behavior tests under `tests/core/`; keep tests for the donor deck with that deck.
- If the source is the user deck in `presentation/` and the promotion also changes its content or design intent, handle that content change through a separate `/opp-*` workflow. Do not edit `openprez/specs/presentation.md` directly as part of a foundation extraction; a purely implementation-level extraction needs no canonical content change. For a `showcase/` source, follow `showcase/AGENTS.md`.

## 5. Version, verify and report

- Follow the foundation release-versioning rules in `core/AGENTS.md`: determine and apply the required semantic version increment, then propose the matching tag for the user. Never create the tag or commit.
- Follow the core dependency and validation routine in `core/AGENTS.md`, including `pnpm update --latest` for this actual foundation development, then run scoped tests; ensure the showcase and starter deck still exercise the public API.
- Check in `pnpm dev` that the donating deck still looks and behaves the same.
- Keep foundation and deck changes separable so the user can carry back or commit them independently. Never commit unless explicitly asked.
- Tell the user that the foundation changed, so it can be carried back to the bare foundation.
