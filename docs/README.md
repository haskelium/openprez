# OpenPrez documentation

This is the documentation index for OpenPrez, a code-authored presentation foundation. The repository presents one active React/TypeScript deck through a reusable player and a selected visual template.

## Start here

- [Getting started](getting-started.md) — install dependencies, run the app, and produce a presentation build.
- [Starting your deck](starting-your-deck.md) — fork, author, and keep your fork current: the user lifecycle, the commit discipline, and the semver update contract.
- [Architecture](architecture.md) — understand the runtime composition and repository boundaries.
- [Authoring slides](authoring-slides.md) — create decks, slides, build steps, notes, and local assets.
- [Core API](core-api.md) — orientation to the public exports from `@core`.
- [Templates](templates.md) — create or change the visual identity without changing navigation behavior.
- [Presenting and export](presenting.md) — use the player, presenter window, static build, and PDF export.
- [Contributing and checks](contributing.md) — repository conventions and validation commands.

## Source of truth

The documentation describes the project at a high level. For implementation rules, read the applicable `AGENTS.md` file:

- [`AGENTS.md`](../AGENTS.md) — repository-wide workflow and coding rules.
- [`core/AGENTS.md`](../core/AGENTS.md) — foundation invariants.
- [`showcase/AGENTS.md`](../showcase/AGENTS.md) — showcase-specific rules. The shipped [`presentation/AGENTS.md`](../presentation/AGENTS.md) adds user-deck-specific details; both rely on the shared rules in the root `AGENTS.md`.

The public foundation API is exported from [`core/index.ts`](../core/index.ts). The active composition is in [`app/main.tsx`](../app/main.tsx): it presents your deck in [`presentation/deck.tsx`](../presentation/deck.tsx), which ships as a starter deck. The showcase deck has its own development-only entry at [`app/showcase.tsx`](../app/showcase.tsx), served at `/showcase.html`; it is never part of a production build.

## Documentation roadmap

These pages are intentionally short and linkable. Expand a page when a behavior becomes important enough that a new contributor or coding agent should not have to infer it from source code.
