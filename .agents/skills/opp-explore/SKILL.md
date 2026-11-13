---

name: opp-explore
description: "Explore and discuss the user's presentation, a proposed deck direction, or a template direction without editing files."
argument-hint: "[whole presentation | slide or section | template idea]"
user-invocable: true
---

# Explore with OpenPrez

Follow the shared rules in `.agents/skills/openprez/SKILL.md`.

**Settle the change type.** If the user's intent is not already clearly one type, ask the change-type question from the shared guide, and apply its rule for requests that need both a template and slides. Carry the answer into your discussion and summary.

**Deck direction.** `presentation/` always exists: a fresh clone presents the starter deck, whose single seed slide is guidance to be replaced by the user's first change. If the deck is still the untouched starter, discuss the prospective deck freely; do not treat `showcase/` as the user's deck. If the deck is already authored, read `openprez/specs/presentation.md`, relevant slide code, `presentation/AGENTS.md`, and the active template's `STYLEGUIDE.md`. Discuss the whole deck or requested scope: clarify audience, narrative, content, evidence, visual direction, and trade-offs as useful.

When documents inform the deck, follow **Document sources** in the shared guide: inspect only agreed inputs, discuss extraction gaps and retention choices, and keep analysis in the conversation. Explore never writes reference summaries, copies originals or saves extraction files.

**Template direction.** Read `docs/templates.md`, the existing templates under `templates/`, and the shared rules of `.agents/skills/build-template/SKILL.md`. Discuss the atmosphere, colour direction, typography, footer imagery, and whether the template should become active.

This command is discussion-only. Do not create or edit files, change slides or templates, or create a change folder. Summarize decisions, including the change type, and, once a concrete change is agreed, suggest `/opp-propose`.
