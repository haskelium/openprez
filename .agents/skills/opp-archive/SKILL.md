---

name: opp-archive
description: "Archive a validated deck or template change: sync deck content into the canonical source, or check a template's style guide and credits."
argument-hint: "<change-name>"
user-invocable: true
---

# Archive with OpenPrez

Follow `.agents/skills/openprez/SKILL.md`. Require a fully implemented, validated change; otherwise stop.

Read the recorded change type and confirm all tasks are complete.

## Deck change

Require the canonical `openprez/specs/presentation.md` (seeded by `/opp-propose`). Inspect the resulting slide code. Reconcile the accepted `content.md` delta into `openprez/specs/presentation.md`, preserving unrelated content. If the canonical source changed since proposal or the merge is ambiguous, stop and resolve it with the user rather than overwrite.

For document-backed changes, follow **Document sources** in the shared guide: preserve accepted claim locators and approved reference links, check retained links resolve, and label local-only or unavailable originals accurately. Reconcile approved references only within the agreed retention scope. Archive the source inventory and coverage limitations with the change; do not delete local inputs or retain new originals.

## Template change

Do not edit `openprez/specs/presentation.md`: a template's canonical record is its own `templates/<name>/STYLEGUIDE.md`; `CREDITS.md` is needed only when third-party assets require attribution. Check the implemented template against the approved `design.md`, `palette.json` and `fonts.json`: the three font roles and hierarchy, the palette and tones, the colour-usage guidance, every asset path, and all applicable credits. If anything disagrees, stop and resolve it with the user rather than archive.

## Archive

Move the complete change folder to `openprez/changes/archive/YYYY-MM-DD-<change-name>/` using the archive date and original change name. Verify the sync or check and the archive; do not discard artifacts or commit unless explicitly asked.
