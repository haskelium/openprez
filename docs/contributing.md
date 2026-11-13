# Contributing and checks

## Before changing files

Read the repository instructions that apply to the area you will touch:

- [`AGENTS.md`](../AGENTS.md) for global workflow and style rules.
- [`core/AGENTS.md`](../core/AGENTS.md) for foundation changes.
- [`showcase/AGENTS.md`](../showcase/AGENTS.md) for showcase deck changes, and the shipped [`presentation/AGENTS.md`](../presentation/AGENTS.md) for your own deck.

Keep foundation changes (`core/`, templates, composition, package/config files) separate from deck changes (`presentation/`, `showcase/`). Never commit generated `dist/` output as source, and never add secrets to source or speaker notes.

## Checks

```sh
pnpm check
pnpm test
pnpm test:browser
pnpm validate
```

- `pnpm check` runs Biome with fixes, resolved import-boundary validation, TypeScript and the production build. It does not run the full unit suite.
- `pnpm test` runs all maintained Vitest suites, including report-tool tests under `.agents/skills/`; no second invocation is needed.
- `pnpm test:browser` runs focused Chromium checks through Node's built-in WebSocket/CDP support: showcase interactions, footer alerts, one PDF download, two-window presenter synchronization and recovery, and local-file standalone checks. The standalone checks open both real-Vite fixture builds and the real user and showcase `prez.html` artifacts; set `OPENPREZ_STANDALONE_ARTIFACTS` to a comma-separated list of artifacts to check existing files (CI does this for the files it deploys), otherwise they are built in a temporary directory. Scenarios live one per module in `scripts/browser-tests/` and locate showcase slides by id. It never downloads a browser. Install Chromium (or another compatible Chromium-family executable), or set `OPENPREZ_BROWSER` to its path. Browser tests stay separate from the ordinary unit suite.
- `pnpm validate` is the non-mutating repository gate: Biome verification, import boundaries, TypeScript, all unit tests and the production build. CI runs it with frozen dependency installation, builds both standalone flavors in separate output directories, runs the focused browser suite, then deploys only the validated showcase artifact from the same main-branch revision.

Run the narrowest relevant tests while developing, then broader checks when a change crosses component boundaries. For focused Vitest coverage, use `pnpm vitest run <test-file>`; the complete unit command remains `pnpm test`. Reusable pure calculations belong in `scripts/lib/`, written in TypeScript that Node runs directly (Node 24 strips types), so scripts and tests share them without hand-written declaration files. Foundation and script tests live in `tests/`, mirroring the source tree (`tests/core/player/session.test.ts` tests `core/player/session.ts`; standalone tests live in `tests/scripts/standalone/`), with shared test-only helpers in `tests/support/`. Template and deck tests stay inside their own folder so each template and deck remains self-contained; they may import `tests/support/`, and runtime modules never import anything under `tests/`.

For documentation-only changes, verify Markdown links, command examples and paths against the repository. No dependency update, build or runtime preview is required unless the documentation change also changes application behavior.

## Workflows

Presentation-content planning lives under [`openprez/`](../openprez/). Use the workflow requested by the project owner; do not create planning artifacts as a substitute for implementation approval.

The repository does not use this documentation folder as an instruction mechanism. Operational agent rules remain in `AGENTS.md` files.
