import { STAGE_HEIGHT } from "../player/Stage";
import type { PresentationTemplate } from "./contract";

/** Footer band height when a template declares no `footerHeight`. */
export const DEFAULT_FOOTER_HEIGHT = 64;

/** Upper bound so a declared footer can never squeeze the slide out of the stage. */
export const MAX_FOOTER_HEIGHT = Math.floor(STAGE_HEIGHT / 2);

/**
 * Resolves the footer band height from a template: its declared `footerHeight`, or the
 * default when omitted. Throws for an out-of-range declaration, so an invalid template
 * halts before any stage renders instead of showing a broken split.
 */
export function resolveFooterHeight(template: PresentationTemplate): number {
  const declared = template.footerHeight;
  if (declared === undefined) return DEFAULT_FOOTER_HEIGHT;
  if (!Number.isInteger(declared) || declared <= 0 || declared > MAX_FOOTER_HEIGHT) {
    throw new Error(
      `Template "${template.name}": footerHeight must be a positive integer no greater than ${MAX_FOOTER_HEIGHT} stage pixels, got ${declared}`,
    );
  }
  return declared;
}
