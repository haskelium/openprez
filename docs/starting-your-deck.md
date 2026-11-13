# Starting your deck

OpenPrez is a repository you own: fork it, and your presentation source lives in the same place as the foundation that presents it — with a live link to upstream for updates. This page walks the whole lifecycle: fork, author, update.

## Fork

Fork the repository on GitHub (or clone it and add the original as a remote named `upstream`). A fresh fork presents the starter deck: one slide that explains how to replace it and links to the showcase. Run it:

```sh
pnpm install
pnpm dev        # live reload at http://localhost:5173
```

While you evaluate or look for inspiration, the showcase deck is served by the development server at [`/showcase.html`](http://localhost:5173/showcase.html). It is a reference deck only: production builds and the single-file artifact contain exactly your deck, never the showcase.

## Author

Replace the starter deck with your own slides through the OpenPrez workflow with your coding agent:

- `/opp-explore` — discuss your story, audience, and direction (read-only).
- `/opp-propose` — turn an agreed change into a reviewable plan; seeds `openprez/specs/presentation.md` the first time.
- `/opp-apply` — implement and validate the change.
- `/opp-archive` — sync validated content into the canonical source and archive the change.

Slides are React components in `presentation/slides/`, registered in `presentation/deck.tsx`; assets live in `presentation/assets/`. See [Authoring slides](authoring-slides.md).

Commit your deck work. Keep every deck commit confined to `presentation/` and `openprez/` — this is what keeps your fork mergeable with upstream (below).

## Make your own template (optional)

The look — palette, fonts, footer and imagery — comes from the active template. To build your own, use the same commands: `/opp-explore` and `/opp-propose` ask whether you are building a **template** or your **slide deck**, and a template change is planned, built and archived on its own. If you want both a new look and new slides, do the template change first. See [Templates](templates.md).

A template change edits `templates/<name>/` and, when you activate it, the template import in `app/main.tsx` and `app/showcase.tsx`. Those are foundation areas, so they are outside the deck-only guarantee below: review upstream pulls that touch them. Your template does not change the foundation version.

## Update

You get foundation improvements by pulling from upstream. The version in `package.json` follows semantic versioning, published as git tags:

- **Patch and minor updates** are safe to apply: they do not require changes to deck source.
- **Major updates** may break deck code; expect a migration before your build passes again.

To update:

```sh
git pull --rebase upstream main
pnpm install
pnpm check
```

**The guarantee:** deck work confined to `presentation/` and `openprez/` rebases without conflicts — upstream never ships content in those areas that your deck commits also touch. The boundary: any commit that changes foundation files (including your own template, or something promoted from a deck into `core/` via the `promote-to-core` skill) forfeits the guarantee; review those pulls separately.

## Present

Rebuild to bundle the latest deck source, then present:

```sh
pnpm start      # builds, then serves at http://localhost:4173
pnpm prez       # single-file dist/prez.html with everything embedded
```

See [Presenting and export](presenting.md) for the player controls, the presenter window, and PDF export.
