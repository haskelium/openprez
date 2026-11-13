# Architecture

OpenPrez keeps composition separate from the reusable player and the two decks:

```text
app/
  ├─ bootstrap.tsx (shared player/presenter startup)
  ├─ main.tsx (user deck + active template)
  └─ showcase.tsx (dev-only showcase entry)
core/ (generic player, presenter, navigation, export)
presentation/ (user deck; ships as a starter)
showcase/ (reference deck; dev server only)
templates/ (runtime visual templates)
scripts/
  ├─ standalone/ (manifest, artifact assembly, CLI and fixtures)
  └─ lib/ (shared script utilities and project aliases)
tests/ (foundation and script tests, mirroring source paths)
```

## Runtime boundaries

| Area                  | Responsibility                                                                                                                                                                       | May import                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `core/`               | Player, stage, navigation, presenter view, export support, shared components, theme plumbing, and contracts.                                                                         | Foundation code only.                                      |
| `templates/`          | Palette, typography, named tones, and footer rendering.                                                                                                                              | `@core` and its own files.                                 |
| `presentation/`       | The user's own deck; ships as a starter deck, presented by the main entry.                                                                                                           | `@core` and relative paths within the deck.                |
| `showcase/`           | The OpenPrez showcase deck: a reference for foundation capabilities, presented by the development-only `app/showcase.tsx` entry at `/showcase.html`; never a production build input. | `@core` and relative paths within the deck.                |
| `app/`                | Shared bootstrap and composition entries.                                                                                                                                            | Deck, template and public player API for composition only. |
| `scripts/standalone/` | Manifest, assembly, CLI and fixture builder for self-contained artifacts.                                                                                                            | Build tooling only.                                        |
| `scripts/lib/`        | Project aliases and pure utilities shared by scripts and tests.                                                                                                                      | Build tooling and tests only.                              |

The foundation must remain generic. It must not import the active deck, the showcase deck or a concrete template. `app/main.tsx` is the deliberate boundary where the application selects both: it presents the user deck from `presentation/`, which ships as a starter deck. The `app/showcase.tsx` entry mirrors the composition for the showcase deck on the development server only; production builds contain only the main entry.

`pnpm boundaries` checks these ownership rules against resolved import destinations, including aliases, relative paths, type-only imports, re-exports, literal dynamic imports and symlinks. It scans every shipped template, not just the selected one. Deck and template code may import the public `@core` entry and local files within their own area; deep `core/` imports and cross-deck/template imports are rejected. Everything under `tests/` is test-only: template and deck test files may import shared support from `tests/support/`, but runtime modules never may. `pnpm check` and `pnpm validate` run this checker.

## Player model

The player renders one deck as an ordered list of slides. Each slide has an id, a component, an optional tone, notes, and a number of build steps. Navigation can move by step, key frame, or slide. The URL stores the current slide and step so a reload can restore the position.

The stage is fixed at `1920x1080`: slides occupy `1920x1016`, and the template-owned footer occupies the remaining `64px`. The stage scales to the available window; slide components should use stage pixels rather than responsive breakpoints.

PDF orchestration lives in the player's `usePdfExport` hook. It captures through an owned stage ref, lazy-loads capture libraries, and scopes asynchronous work to an export generation so failures and unmounts cannot contaminate later downloads. The offscreen export host is inert and hidden from assistive technology while retaining its settled visual content for capture.

## Presenter session

The presentation window is the sole authority for slide position, rehearsal time and auto-advance. Its session controller transitions these values together using one captured wall-clock time; a navigation command and the landed step's countdown restart therefore form one coherent state. The presenter window sends commands and only renders full snapshots from the main window. Versioned messages carry the session, connection generation, snapshot revision and command id: every handshake starts a new generation, so commands from a superseded connection are rejected, and snapshots older than the last accepted revision are ignored rather than echoed. Messages are validated once, at the channel boundary.

The rehearsal timer belongs to the main presentation session: it starts when the app loads and continues across presenter open/close. BroadcastChannel is required for synchronized notes. Without it, the Speaker notes action explains the limitation instead of opening misleading unsynchronized notes. A missed heartbeat leaves notes open but marks them reconnecting and disables remote controls; any later sign of main-window liveness, or the window regaining focus or visibility, starts a fresh handshake, and the resulting authoritative snapshot restores controls. Explicit main-window shutdown, or the presenter confirming through `window.opener` that its main window closed, ends notes.

## Showcase deck

`showcase/` holds the OpenPrez sample deck: a browsable reference of what the foundation can do, served by the development server at `/showcase.html` via its own entry (`app/showcase.tsx`). It follows the shared deck-authoring rules in the root `AGENTS.md` and adds showcase-specific rules in `showcase/AGENTS.md`; it is never part of the default production build, so `pnpm build` and `pnpm prez` contain exactly the user's deck, while the explicit `pnpm prez:showcase` flavor packages it on demand for demo deployments such as GitHub Pages.

## Your own deck

`presentation/` ships in the repository as a starter deck: a minimal one-slide deck whose title slide explains how to replace it and links to the showcase. Personalizing it is ordinary deck work — your first `/opp-*` change replaces the guidance slide — and the first `/opp-propose` seeds the canonical presentation source. See [Starting your deck](starting-your-deck.md) for the fork, author, and update lifecycle.
