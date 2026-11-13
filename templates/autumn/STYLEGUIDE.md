# Autumn template style guide

This is the agent-facing visual reference for slides using the autumn template. Use semantic font utilities and theme tokens; do not copy template implementation or assets into slide code.

## Typography roles

| Role           | Stack                                                                                                | Use                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `font-body`    | `"Trebuchet MS", "Segoe UI", "DejaVu Sans", Arial, sans-serif`                                       | Paragraphs, labels, footer text and general copy                             |
| `font-display` | `"Trebuchet MS", "Segoe UI", "DejaVu Sans", Arial, sans-serif`                                       | Slide and section headings; distinguish it through scale, weight and spacing |
| `font-mono`    | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` | Code, commands, identifiers and tabular data                                 |

`fontSans` remains equal to `fonts.body` for older template consumers. Body and display share one family for a coherent voice; hierarchy comes from size and weight. All stacks use installed system faces: no font files are bundled, and nothing is fetched at runtime. Trebuchet MS ships with Windows and macOS; on Linux the stack falls back to Segoe UI, then DejaVu Sans, then Arial — accepted for this template. Use regular 400 for body and bold 700 for titles and labels; Trebuchet MS has no 800 weight, so avoid weights above 700 for projected text. The `@core` Logo wordmark remains Arial, so it does not use the template's display face.

## Example hierarchy (stage pixels)

These are stage-space reference values, not fixed layouts.

| Use              | Role           | Size and weight | Line height | Spacing cues                                     |
| ---------------- | -------------- | --------------- | ----------- | ------------------------------------------------ |
| Slide title      | `font-display` | 80px, 700       | 1.05        | 12px after a kicker; 24px before supporting copy |
| Body copy        | `font-body`    | 30px, 400       | 1.375       | 24px before a paragraph after a title            |
| Kicker / label   | `font-body`    | 22px, 700       | 1.5         | uppercase, 0.2em tracking; 12px before title     |
| Section label    | `font-body`    | 24px, 700       | 1.5         | 48px before section; 20px before its list        |
| Code / data chip | `font-mono`    | 28px, 700       | 1.5         | 20px horizontal, 8px vertical padding            |

The footer uses 18px body text. Create rhythm with spacing, line height and weight rather than adding font families.

## Visual language and palette

The template's identity is a walk in autumn woods: a deep-bark base with cream text, maple-red and pumpkin-orange accents, a goldenrod glow, and spruce teal as the single cool counterpoint. The token names are fixed contract slots, not colour names: here `onPrimary` is bark (`#2A1A12`), `primary` is cream (`#F3E3C7`), `accent1` is chestnut, `accent2` is maple red, `accent3` is pumpkin, `accent4` is spruce teal, `neutral` is mushroom, `data1` is moss and `data2` is goldenrod. Use `theme-*` utilities for accents and `surface` / `on-surface` for tone-aware surfaces and text. Do not hardcode shared slide or footer colours.

| Token       | Value     | Role                                                                |
| ----------- | --------- | ------------------------------------------------------------------- |
| `onPrimary` | `#2A1A12` | Bark; primary background and deep panels                            |
| `primary`   | `#F3E3C7` | Cream; primary foreground (body text)                               |
| `accent1`   | `#82503A` | Chestnut; panels and data series                                    |
| `accent2`   | `#C4501E` | Maple red; decorative accent, large text only on base and inverse   |
| `accent3`   | `#E08A2E` | Pumpkin; warm accent and labels on base                             |
| `accent4`   | `#5A9296` | Spruce teal; the cool counterpoint, lead data series                |
| `accent5`   | `#FEFAEE` | Near-white warm highlight                                           |
| `neutral`   | `#B39B80` | Mushroom neutral; secondary text on base                            |
| `data1`     | `#7C8F3A` | Moss; data colour                                                   |
| `data2`     | `#E8B33A` | Goldenrod; data colour and highlight                                |
| `data3`     | `#5C6BB2` | Indigo; cool third data series, large text only on base and inverse |

## Tones and colour use

Every tone's default text meets 4.5:1; base and inverse far exceed the 7:1 projector target.

| Tone      | Surface   | Text (`onSurface`) | Text contrast |
| --------- | --------- | ------------------ | ------------: |
| `base`    | `#2A1A12` | `#F3E3C7`          |       13.25:1 |
| `inverse` | `#F3E3C7` | `#2A1A12`          |       13.25:1 |
| `maple`   | `#8C3B1F` | `#FBF1DF`          |        6.79:1 |
| `moss`    | `#3E4A22` | `#F3E3C7`          |        7.53:1 |

On each tone, accents split into text-safe, large-text-only (≥ 3:1, for 24px+ or 19px+ bold text) and **fill-only**. A fill-only accent is a decorative fill — never use it as text on that tone.

- **base (bark):** text — cream, accent5, goldenrod, pumpkin, mushroom, spruce, moss; large text only — maple, indigo (`data3`, 3.35:1); fill-only — chestnut. Chestnut panels and borders on base reach 2.52:1, above the 1.5:1 projector bar, so chestnut works for dark panels.
- **inverse (cream):** text — bark, chestnut; large text only — maple, indigo (3.96:1); fill-only — pumpkin, spruce, accent5, mushroom, moss, goldenrod. Never use those as text on inverse.
- **maple (rust):** text — accent5; large text only — goldenrod; fill-only — everything else, including the maple accent (1.64:1, near-invisible on its own tone family), indigo (1.52:1) and chestnut (1.14:1, below the panel bar — no chestnut panels on maple).
- **moss (deep olive):** text — accent5, goldenrod; large text only — pumpkin, mushroom; fill-only — chestnut (1.43:1, below the panel bar — no chestnut panels on moss), spruce, moss (2.65:1, near-invisible on its own tone family), indigo (1.90:1).

### Colour-vision deficiency

The warm family collapses under red-green deficiency; these near-pairs are accepted with role rationales, and none may serve together as bare data series:

- `primary ~ accent5` (ΔE 12.1, all vision modes) — cream foreground versus accent5 highlight, different roles.
- protanopia: `accent2 ~ data1` (14.5), `accent3 ~ data1` (12.0), `accent3 ~ data2` (15.9); deuteranopia: `accent2 ~ accent3` (17.1), `accent2 ~ data1` (13.0), `accent3 ~ data2` (10.7) — decorative maple/pumpkin accents versus moss/goldenrod data, or the intentional analogous decorative family.
- Advisory tritanopia: `primary ~ accent5` (11.1).

**Recommended data series**, separated by lightness rather than hue: lead with spruce teal (`accent4`), goldenrod (`data2`) and chestnut (`accent1`), with indigo (`data3`) as the fourth and moss (`data1`) as the fifth. The all-data-slot triple goldenrod → indigo → moss also clears the 20 ΔE76 target in every mode (minimums 41.3 normal, 26.9 protanopia, 32.7 deuteranopia, 23.4 tritanopia) when a chart should stay in the data tokens. Under advisory tritanopia, indigo converges with spruce teal (ΔE 14.9) and moss (23.4), so add direct labels whenever indigo appears beside spruce or moss in a chart. Rely on colour alone for at most three series; add direct labels or patterns beyond three, and whenever a confusable pair (maple/pumpkin against moss or goldenrod) appears together in a chart — a role rationale never exempts data use. Passing the distinctness review does not certify full accessibility; keep the labels coming.

## Visual motifs

- **Maple-leaf drift** — nine botanical sycamore-maple leaves in varied sizes across the footer: one very large and three large crowns, three medium, and two small whole leaves. Large leaves are far taller than the footer and cropped by the SVG's own bounds to their most recognizable slice: the central lobe flanked by both side lobes and their V-shaped sinuses. Very light transparent fill (8%) and a fine 1.5px serrated outline in maple red that keeps its width at any scale. Leaves may sit behind the brand and date text: one outline over text keeps at least 5:1 contrast on every tone, so no two leaves cross each other anywhere (two crossing outlines drop to 4.3:1 on moss). The action buttons stay clear. Decorative and aria-hidden; nothing renders into slide areas.
- **Maple-to-goldenrod border** — a 2px gradient rule (maple red → pumpkin → goldenrod) along the footer's top edge, replacing a plain hairline.

## Asset references

- `templates/autumn/FooterLeaves.tsx` — the leaf drift: placement and styling.
- `templates/autumn/mapleLeaf.ts` — the sycamore-maple silhouette path (CC0) and its tip-up transform. Copy the path into the deck's own `assets/` to reuse the leaf on a slide; never import from `templates/`.

## Credits

[`CREDITS.md`](./CREDITS.md) records the maple-leaf silhouette's file, title, creator, source URL, CC0 1.0 licence and modifications. No attribution is required (CC0), and the template bundles no fonts, so there is nothing else to credit.
