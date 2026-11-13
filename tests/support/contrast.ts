import type { TemplateTones } from "@core";
import { expect } from "vitest";
import { contrastRatio, parseHex } from "../../scripts/lib/colour.ts";

/** Assert every declared template tone meets the WCAG body-text contrast threshold. */
export function assertTemplateToneContrast(tones: TemplateTones): void {
  for (const [name, tone] of Object.entries(tones)) {
    if (!/^#[0-9a-f]{6}$/i.test(tone.surface) || !/^#[0-9a-f]{6}$/i.test(tone.onSurface)) {
      throw new Error(`${name} tone colors must use #RRGGBB values`);
    }
    const surface = parseHex(tone.surface);
    const onSurface = parseHex(tone.onSurface);
    if (!surface || !onSurface) {
      throw new Error(`${name} tone colors could not be parsed`);
    }
    expect(contrastRatio(surface, onSurface), `${name} tone text contrast`).toBeGreaterThanOrEqual(
      4.5,
    );
  }
}
