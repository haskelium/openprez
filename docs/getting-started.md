# Getting started

## Prerequisites

- Node.js `>=24`
- pnpm
- A browser capable of running the built Vite application

## Install and run locally

From the repository root:

```sh
pnpm install
pnpm dev
```

Open <http://localhost:5173>. Vite reflects source edits with live reload. The app presents the starter deck: run `pnpm dev` for this overview — it explains how to replace the starter with your own deck, and links to the showcase at [`/showcase.html`](http://localhost:5173/showcase.html).

A fresh clone presents the starter deck from `presentation/` — one slide explaining how to replace it with your own and linking to the showcase. Author your deck with a coding agent through the `/opp-*` workflow; the full lifecycle (fork, author, update) is in [Starting your deck](starting-your-deck.md).

## Present the production build

```sh
pnpm start
```

This builds the app and serves the result at <http://localhost:4173>. The production server serves the last completed build, so rebuild and restart it after changing deck source files.

## Produce a single HTML file

```sh
pnpm prez
```

This creates `dist/prez.html`. It embeds the generated JavaScript, CSS, fonts, images, and other emitted assets, so the file can be copied independently of neighboring build files. The normal `pnpm build` output is unchanged; `prez.html` is generated output and should not be edited manually. To package the showcase deck instead, run `pnpm prez:showcase`; the upstream GitHub Pages deployment uses it to publish the showcase as the demo. Each command requires a matching versioned Vite build manifest, so use the matching command rather than assembling output from another flavor. For isolated maintainer/CI outputs, set distinct directories: `OPENPREZ_BUILD_DIR=dist/prez-user pnpm prez` and `OPENPREZ_BUILD_DIR=dist/prez-showcase pnpm prez:showcase`.

## Verify a change

```sh
pnpm check
pnpm test
pnpm validate
```

`pnpm check` applies Biome formatting/lint fixes, checks resolved import boundaries, type-checks and builds. `pnpm test` runs the complete Vitest suite. `pnpm validate` is the non-mutating version of the repository gate and includes all unit tests. `pnpm test:browser` additionally exercises browser interactions and opens the standalone artifacts as local files; it requires an already installed Chromium-family browser. Documentation-only changes normally need only link and command review.
