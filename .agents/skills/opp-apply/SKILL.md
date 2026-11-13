---

name: opp-apply
description: "Implement and validate an approved deck or template change, following the matching skill."
argument-hint: "<change-name>"
user-invocable: true
---

# Apply with OpenPrez

Follow the shared workflow and preconditions in `.agents/skills/openprez/SKILL.md`. Require an existing approved change folder; otherwise stop and suggest `/opp-propose`.

Read every artifact in `openprez/changes/<change-name>/` and use the change type recorded in `proposal.md`. Implement only the approved scope, work through `tasks.md`, and record completed tasks and actual validation results.

## Template change

Load `.agents/skills/build-template/SKILL.md` and follow its **Implement** section for the named template, using the approved `design.md`, `palette.json` and `fonts.json`. Change the template imports in `app/main.tsx` and `app/showcase.tsx` only when the approved design activates it. Do not edit slides or `openprez/specs/presentation.md`. If the approved plan proves unworkable, stop and ask rather than deviating.

## Deck change

Require the canonical `openprez/specs/presentation.md` (seeded by `/opp-propose` if the change is the first); otherwise stop and suggest `/opp-propose`. Read the canonical source, affected slide code, and `presentation/AGENTS.md` when present. Implement only the approved change in `presentation/`, and keep the canonical document unchanged until archive.

For document-backed changes, follow **Document sources** in the shared guide. Read the approved source inventory and references, verify material claims and calculations against available evidence, and report missing sources or extraction gaps. Do not add references, retain originals or change retention choices during Apply; seek a revised proposal for new evidence or decisions.

Before planning typography or visual styling, resolve the active template from `app/main.tsx` and read its `STYLEGUIDE.md` in full. Then follow `.agents/skills/build-slide/SKILL.md` — its **Plan** section for slides the change adds or substantially redesigns, and its **Implement** section for all slide work, including speaker notes and preview scope. Changes to existing code or content that need no new visual design proceed directly from the approved artifacts.

Do not archive the change. Report remaining tasks or blockers. Never commit unless the user explicitly asks.
