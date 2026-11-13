import type { CSSProperties } from "react";
import type { PresentationTemplate } from "./contract";

const SYSTEM_DISPLAY_FONT = 'ui-serif, Georgia, Cambria, "Times New Roman", serif';
const SYSTEM_MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Maps a template's palette and font onto the CSS variables the shared theme reads.
 * Applied once by the app composition entry, so the live stage, the export stage and the
 * presenter previews all resolve the same values.
 */
export function templateStyleVariables(template: PresentationTemplate): CSSProperties {
  const fonts = template.fonts ?? {
    body: template.fontSans,
    display: SYSTEM_DISPLAY_FONT,
    mono: SYSTEM_MONO_FONT,
  };

  return {
    "--template-color-primary": template.palette.primary,
    "--template-color-on-primary": template.palette.onPrimary,
    "--template-color-accent1": template.palette.accent1,
    "--template-color-accent2": template.palette.accent2,
    "--template-color-accent3": template.palette.accent3,
    "--template-color-accent4": template.palette.accent4,
    "--template-color-accent5": template.palette.accent5,
    "--template-color-neutral": template.palette.neutral,
    "--template-color-data1": template.palette.data1,
    "--template-color-data2": template.palette.data2,
    "--template-color-data3": template.palette.data3,
    "--template-font-sans": fonts.body,
    "--template-font-body": fonts.body,
    "--template-font-display": fonts.display,
    "--template-font-mono": fonts.mono,
  } as CSSProperties;
}

/**
 * Resolves the surface pair of one of the template's declared tones onto the CSS
 * variables the theme reads. Unknown tone names fall back to "base".
 */
export function toneStyleVariables(template: PresentationTemplate, tone: string): CSSProperties {
  const pair = Object.hasOwn(template.tones, tone) ? template.tones[tone] : template.tones.base;
  return {
    "--surface": pair.surface,
    "--on-surface": pair.onSurface,
  } as CSSProperties;
}
