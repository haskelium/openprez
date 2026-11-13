# OpenPrez

OpenPrez is the markdown-first workflow for planning and implementing the user's own changes. One set of commands handles two kinds of change:

- **Deck change** — builds or changes the slide deck in `presentation/`, using an existing template. The repository ships `presentation/` as a starter deck — its single seed slide is guidance replaced by the user's first change — so there is no scaffolding step: the first deck `/opp-propose` seeds the canonical source in `openprez/specs/presentation.md` if it is still the placeholder.
- **Template change** — builds or reworks a runtime template in `templates/<name>/`: palette, tones, font roles, footer and imagery. Its canonical record is the template's `STYLEGUIDE.md` and `CREDITS.md`.

`/opp-explore` and `/opp-propose` ask which kind of change you are making; the answer is recorded in the change and followed by the later commands. Wanting both a new look and slides that use it means two changes, the template first. The workflow does not target `showcase/`.

## Commands

- `/opp-explore [whole presentation | slide or section | template idea]` — discuss the deck, a scoped part, or a template direction without editing files.
- `/opp-propose [change name or description]` — confirm the change type and create a reviewable plan: a content delta for a deck change, or a validated palette and visual-system design for a template change. Does not edit slides or templates.
- `/opp-apply <change-name>` — implement the agreed change (slides in `presentation/`, or the template in `templates/<name>/`) and validate it.
- `/opp-archive <change-name>` — for a deck change, sync completed content into the canonical presentation document; for a template change, check the template's style guide and credits against the plan. Then archive the change artifacts.

## Files

- `specs/presentation.md` is the living, complete source document for the deck.
- `../sources/` (at the repository root) is your local, Git-ignored document inbox; only its `.gitkeep` is tracked so it exists in a fresh clone.
- `specs/references/<source-name>.md` optionally holds an approved, curated analysis of source documents.
- `specs/sources/` optionally holds selected originals you explicitly choose to version.
- `changes/<change-name>/` holds an in-progress change; its `proposal.md` starts with the change type.
- `changes/archive/<change-name>/` retains completed change artifacts after their accepted content is synced or, for a template change, checked.

Speaker notes are concise delivery aids derived from the richer presentation source; they are not the canonical content.

## Build from reference documents

1. Provide the agent with attachments, accessible file paths, or documents placed in `sources/` at the repository root. PDFs, PowerPoints, Word documents, Markdown, text, spreadsheets and other formats are usable when your agent can read them. OpenPrez itself does not parse or upload documents.
2. Use `/opp-explore` to agree on the audience, story and relevant sources. The agent discusses findings, citations and extraction gaps without writing files. For unreadable or partially extracted documents, supply an accessible export or clarify the missing information.
3. Choose what may persist before `/opp-propose` writes document-derived material: just the agreed deck content and planning artifacts, a curated Markdown reference, selected originals, or both. These are separate choices: permission to read is not permission to retain or commit. Originals stay local by default; references are optional, not mandatory.
4. `/opp-propose` records source IDs, page/slide/section or sheet/cell locators, limitations and retention decisions in the content delta. If approved, it writes concise analyses under `openprez/specs/references/` and copies only selected originals into `openprez/specs/sources/`, leaving local inputs untouched.
5. `/opp-apply` builds or enhances the deck from the agreed narrative and verifies source-backed claims. `/opp-archive` syncs accepted content and reference links into `specs/presentation.md` and preserves the source inventory with the archived change.

References capture useful evidence, caveats and provenance, not full document dumps or a second presentation source. When originals are not retained, the record says they are local-only or attachment-only, so later agents know when to ask for them again. Review references and originals before any explicitly requested commit; summaries can still contain confidential information.

The inbox is ignored recursively, including nested folders and extraction files. Do not force-add it or change the ignore rule to retain documents: use the explicit retained-source location instead. Git ignore is not access control or encryption and does not prevent a development server from serving files. Keep highly sensitive inputs outside the repository, use only authorized agent tools, and never put source documents in `public/` or import them into the app. Material deliberately included in slides or speaker notes will be bundled in the presentation.

A template change in a fork edits the template folder and, if the template becomes active, the template import in `app/main.tsx` and `app/showcase.tsx`. That is outside the deck-only merge guarantee described in [Starting your deck](../docs/starting-your-deck.md), and it does not change the foundation version.
