# Default template style guide

This is the agent-facing visual reference for slides using the default template. Use semantic font utilities and theme tokens; do not copy template implementation or assets into slide code.

## Typography roles

| Role           | Stack                                                                                                           | Use                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `font-body`    | `"Atkinson Hyperlegible Next", Arial, Helvetica, sans-serif`                                                    | Paragraphs, labels, footer text and general copy                             |
| `font-display` | `"Atkinson Hyperlegible Next", Arial, Helvetica, sans-serif`                                                    | Slide and section headings; distinguish it through scale, weight and spacing |
| `font-mono`    | `"Atkinson Hyperlegible Mono", ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace` | Code, commands, identifiers and tabular data                                 |

`fontSans` remains equal to `fonts.body` for older template consumers. Body and display share one family for a coherent voice; hierarchy comes from size and weight. The bundled variable fonts provide weights 200–800. Prefer 400 for body and 700 for titles and labels; 800 is available for brief hero titles. Avoid weights below 400 for projected text. The mono face shares the Atkinson design language and has distinct `I`/`l`/`1` and `O`/`0` forms (the zero is slashed).

Both fonts are normal-style WOFF2s, subsetted into latin and latin-ext. Latin covers the required `œ`/`Œ`, `€`, curly quotes, en and em dashes and ellipsis; latin-ext adds broader European glyph coverage. No italic files are bundled. Body falls back to Arial then Helvetica; mono falls back to common installed monospace faces. Arial is chosen for width similarity. If a bundled face fails to load, text may reflow slightly. The `@core` Logo wordmark remains Arial, so it does not use the template's display face.

Font files and their OFL 1.1 licence notices live in `fonts/`. See [`CREDITS.md`](./CREDITS.md) for file URLs, versions, licence and copyright details. Files are unmodified; only their filenames were changed.

## Example hierarchy (stage pixels)

These are stage-space reference values, not fixed layouts.

| Use              | Role           | Size and weight                      | Line height | Spacing cues                                     |
| ---------------- | -------------- | ------------------------------------ | ----------- | ------------------------------------------------ |
| Slide title      | `font-display` | 80px, 700; 800 for brief hero titles | 1.05        | 12px after a kicker; 24px before supporting copy |
| Body copy        | `font-body`    | 30px, 400                            | 1.375       | 24px before a paragraph after a title            |
| Kicker / label   | `font-body`    | 22px, 700                            | 1.5         | uppercase, 0.2em tracking; 12px before title     |
| Section label    | `font-body`    | 24px, 700                            | 1.5         | 48px before section; 20px before its list        |
| Code / data chip | `font-mono`    | 28px, 700                            | 1.5         | 20px horizontal, 8px vertical padding            |

The footer uses 18px body text. Use larger type for projection where content permits, and create rhythm with spacing and line height rather than adding font families. `tabular-nums` is used for counters; Chromium showed near-equal digit advances at 32px (20.234–20.25px, within subpixel rounding), compared with proportional advances from 13.03px to 20.75px.

## Visual language and palette

The template's identity is warm and earthy: an espresso-brown base, beige text and cream headings, a caramel-taupe lead, orange for kickers, labels and touches, with teal as the cool accent and gold and red for emphasis and data. The inverse tone is a lighter taupe; a deep-teal tone marks section breaks. The token names are fixed contract slots, not colour names: here `onPrimary` is espresso (`#1D1612`), `primary` is beige, `accent2` is caramel, `accent3` is orange, `accent4` is teal and `data1` is red. Use `theme-*` utilities for accents and `surface` / `on-surface` for tone-aware surfaces and text. Do not hardcode shared slide or footer colours.

| Token       | Value     | Role                                                               |
| ----------- | --------- | ------------------------------------------------------------------ |
| `onPrimary` | `#1D1612` | Espresso; primary background, deep panels, and text on light fills |
| `primary`   | `#EBDDC9` | Beige; primary foreground (body text)                              |
| `accent1`   | `#43362C` | Brown panel on base                                                |
| `accent2`   | `#E0A86E` | Caramel-taupe lead; buttons, highlight surfaces, key fills         |
| `accent3`   | `#FF8A3D` | Orange; kickers, labels, glows and highlight tints                 |
| `accent4`   | `#2EC4B0` | Teal; cool accent, borders and rings, data series                  |
| `accent5`   | `#FBF5EC` | Cream; headings and highlights                                     |
| `neutral`   | `#A8978A` | Taupe neutral; secondary text                                      |
| `data1`     | `#EF4B3C` | Red; data series, badges and alerts (`theme-data1` renders red)    |
| `data2`     | `#FFC93C` | Gold; data series and highlights                                   |
| `data3`     | `#5A5FA8` | Indigo; third data series, large text only on base                 |

**Text on light fills:** `accent2` (caramel), `accent5`, `data2` and `accent3` are light. Put espresso text (`text-theme-on-primary`) on them, never cream: espresso on caramel is 8.50:1, cream on caramel only about 1.9:1. For highlight rows inside dark panels, use an orange tint (`bg-theme-accent3/20`, cream text 7.6:1, gold keys 5.4:1).

### Tones and colour use

Every tone's default text meets 4.5:1; base and inverse exceed the 7:1 projector target.

| Tone      | Surface   | Text (`onSurface`) | Text contrast |
| --------- | --------- | ------------------ | ------------: |
| `base`    | `#1D1612` | `#EBDDC9`          |       13.37:1 |
| `inverse` | `#4B3E34` | `#F3E9DA`          |        8.58:1 |
| `teal`    | `#1F4E4A` | `#F3E9DA`          |        7.78:1 |

Accent classes describe contrast on each tone's surface: **TEXT** ≥ 4.5:1; **LARGE** ≥ 3:1; **FILL** < 3:1. Fill-only accents are decorative fills, never text on that tone.

| Accent              | Base       | Inverse    | Teal       |
| ------------------- | ---------- | ---------- | ---------- |
| `accent1`           | 1.53 FILL  | 1.13 FILL  | 1.25 FILL  |
| `accent2` (caramel) | 8.50 TEXT  | 4.91 TEXT  | 4.45 LARGE |
| `accent3` (orange)  | 7.62 TEXT  | 4.39 LARGE | 3.99 LARGE |
| `accent4` (teal)    | 8.20 TEXT  | 4.73 TEXT  | 4.29 LARGE |
| `accent5`           | 16.48 TEXT | 9.51 TEXT  | 8.62 TEXT  |
| `neutral`           | 6.34 TEXT  | 3.66 LARGE | 3.32 LARGE |
| `data1` (red)       | 4.88 TEXT  | 2.82 FILL  | 2.56 FILL  |
| `data2`             | 11.63 TEXT | 6.71 TEXT  | 6.08 TEXT  |
| `data3` (indigo)    | 3.09 LARGE | 1.78 FILL  | 1.62 FILL  |

Red passes as text on espresso; on `inverse` and `teal` it is a fill only. On `inverse`, small coloured labels may use `accent5`, `data2`, caramel or teal; orange and neutral are large-text only. On `teal`, use `accent5` or `data2` for small labels; caramel, orange, teal and neutral are large-text only. Cream icons on red badges reach 3.37:1 (graphics only, not text).

### Charts and data series

Recommended series on `base`, in order: **gold (`data2`) → indigo (`data3`) → red (`data1`)**, with teal (`accent4`) as the strongest fourth (teal/red ΔE 38.8 protanopia). Pairwise CIE76 ΔE:

| Vision simulation     | gold / indigo | gold / red | indigo / red | Result |
| --------------------- | ------------: | ---------: | -----------: | ------ |
| Normal vision         |         120.4 |       68.3 |         96.0 | ≥ 20   |
| Protanopia            |         122.3 |       56.5 |         71.7 | ≥ 20   |
| Deuteranopia          |         120.9 |       33.0 |         93.0 | ≥ 20   |
| Tritanopia (advisory) |          59.2 |       65.1 |        105.1 | ≥ 20   |

These three series can rely on colour alone. Orange is a label and touch colour, not a series colour: it is close to gold (ΔE 16.5) and red (16.6) under deuteranopia, so never use it as a colour-only series beside them. A fourth series needs direct labels or patterns. On `inverse` and `teal`, limit colour-only charts to gold fills with labels (indigo and red are fill-only there); prefer `base` for richer charts.

These comparisons are a design check, not an accessibility certification; keep direct labels where the meaning matters.

### Near-pairs and limitations

Pairs below ΔE 20, kept for their roles (accepted during planning; none is a chart-series pair):

- **`primary` ~ `accent5`** (10.4 normal): beige body text versus cream headings; distinguish by size and weight.
- **`onPrimary` ~ `accent1`** (16.5): surface and panel; panel contrast still clears 1.5:1 on base.
- **`primary` ~ `accent4`** (14.6 protanopia): body text versus teal accent; teal marks borders and highlights, never meaning on its own.
- **`accent2` ~ `accent3`** (19.1 protanopia), **`accent2` ~ `data1`** (17.6 deuteranopia): caramel lead versus orange labels and red data; caramel and orange are never chart series.
- **`accent3` ~ `data2`** (16.5 deuteranopia) and **`accent3` ~ `data1`** (16.6 deuteranopia): orange labels versus the gold and red data colours; orange never as a series beside them.
- **`accent4` ~ `neutral`** (12.5 protanopia, 15.3 deuteranopia): teal accent versus taupe neutral; never paired as series.
- **`accent2` ~ `data2`** (10.6 tritanopia, advisory): caramel lead versus gold highlight.

Indigo (`data3`) has no near-pairs in the whole palette, in any vision mode.

### Panels and borders

On `base`, `accent1` panels reach 1.53:1 against the surface, above the 1.5:1 projector-visibility target; teal (`accent4`) borders and rings reach 8.20:1, and 5.35:1 against a accent1 panel. On `inverse`, `accent1` (1.13) fails: use espresso (`onPrimary`) panels at 1.73:1 and teal borders at 4.73:1. On `teal`, use espresso panels at 1.91:1.

## Footer and reusable visual references

The live and export footers use a three-zone grid, a fine top rule and consistent spacing. The footer uses surface tokens so it follows the active tone. Live presentations show the current date and year; HTML exports use their build date and PDF exports freeze the date when export starts (standalone presentations retain their build date). By default, copyright reads `Copyright © {year} Haskelium`; custom `copyrightNotice` text supports `{year}`, `{date}` (ISO `YYYY-MM-DD`) and `{longDate}` (for example, `14 October 2026`) placeholders, expanded from the relevant presentation/export date. Unknown tokens are left unchanged; notices are limited to 256 characters before expansion and 512 after. These tokens are literal text substitutions, not expressions or HTML. Keep the logo, copyright line, date, counter, six navigation controls, Speaker notes and Export PDF actions, `footer-actions` auto-hide behavior, status/alert roles, and the auto-advance indicator before the date. The export footer retains branding and `page / total`, with no actions or auto-advance indicator.

The shared `Logo` component from `@core` is the brand reference. Footer icons use `NotebookText` and `FileDown` from `lucide-react`; their line-icon style is an optional reference for deck-local icons. This template has no reusable local photo or SVG artwork. Keep slide-specific artwork in the deck's own `assets/` folder; never import from `templates/`.

For bundled font sources, versions, copyright and required licence notices, see [`CREDITS.md`](./CREDITS.md) and the licence texts in `fonts/`.
