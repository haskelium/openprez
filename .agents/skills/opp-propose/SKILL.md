---

name: opp-propose
description: "Create planning artifacts for an agreed deck or template change, using the matching skill, without editing slides or templates."
argument-hint: "[change name or description]"
user-invocable: true
---

# Propose with OpenPrez

Follow the shared workflow and preconditions in `.agents/skills/openprez/SKILL.md`.

## 1. Confirm the change type

Before writing anything, confirm the type with the user, even when exploration already settled it: state the type you understood and ask the user to confirm, or ask the question from the shared guide when it is unclear. If the request needs both a template and slides, propose only the template change now and tell the user to propose the deck change once the template exists. Resolve other material ambiguities with the user before writing.

## 2. Plan with the matching skill

Create `openprez/changes/<kebab-case-name>/` with the artifacts the shared guide defines for the confirmed type. Begin `proposal.md` with the `## Change type` section. Keep the proposal specific.

**Deck change.** Load `.agents/skills/build-slide/SKILL.md` and follow its **Plan** section, which starts from the active template's `STYLEGUIDE.md`. Read `openprez/specs/presentation.md`, relevant slide code, and `presentation/AGENTS.md`. If the canonical source is still the unseeded placeholder, seed it as part of creating the change: replace it with the deck title and a first outline of the slides this change introduces (audience, narrative intent, one line per slide). Afterwards it is the delta base for this and later changes; never reseed an already-seeded source. Write the proposal, content delta, design direction, and ordered implementation/validation tasks. Identify affected slides and source needs, and preserve the canonical document unchanged.

For document-backed content, follow **Document sources** in the shared guide. Resolve retention consent before persisting source-derived material; record the source inventory, locators, coverage, retention choices and unresolved facts in `content.md`. Write curated references or copy selected originals only when explicitly approved. Include evidence verification in the scoped tasks; do not require retaining originals to proceed.

**Template change.** Load `.agents/skills/build-template/SKILL.md` and follow its **Plan** section: choose the template name and whether it becomes active; decide the visual system; verify font and image licences; write `palette.json` and `fonts.json`, run the palette and font reports, and resolve report findings with the user before finalizing the design and ordered tasks. Include both files in the change so Archive can check the implemented palette and font roles against the approved plan. Do not create `content.md`, and do not seed or edit `openprez/specs/presentation.md`.

## 3. Stop

This is planning only. Do not edit slide code, template code, configuration or runtime assets; approved source-reference retention follows the shared guide. Beyond seeding the unseeded placeholder for a deck change, do not edit the canonical presentation source. Palette reports are written under `dist/` and are not artifacts. Stop after creating the artifacts and summarize them, including the change type and any retained references/originals, and suggest `/opp-apply <change-name>`.
