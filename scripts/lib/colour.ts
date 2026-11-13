// Pure colour maths for the palette report: sRGB parsing, WCAG contrast, HSL,
// colour-vision deficiency simulation and perceptual distance.

/** sRGB channels in [0, 1]. */
export type Rgb = number[];

export type Deficiency = "protanopia" | "deuteranopia" | "tritanopia";

/** Parses `#RRGGBB` or `#RGB` into sRGB channels in [0, 1], or null when unsupported. */
export function parseHex(value: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const digits =
    match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16) / 255);
}

/** Formats sRGB channels in [0, 1] as `#RRGGBB`, clamping out-of-gamut values. */
export function toHex(rgb: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(Math.max(value, 0), 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${rgb.map(channel).join("").toUpperCase()}`;
}

function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map(srgbToLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.x contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG use of a contrast ratio: body text, large text only, or decorative fills only. */
export function classifyContrast(ratio: number): "text" | "large-text" | "fill-only" {
  if (ratio >= 4.5) return "text";
  if (ratio >= 3) return "large-text";
  return "fill-only";
}

/** Hue in degrees, saturation and lightness in percent. */
export function toHsl(rgb: Rgb): { hue: number; saturation: number; lightness: number } {
  const [red, green, blue] = rgb;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness: lightness * 100 };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { hue: (hue * 60 + 360) % 360, saturation: saturation * 100, lightness: lightness * 100 };
}

// Machado, Oliveira & Fernandes (2009), severity 1.0, applied to linear RGB.
const DEFICIENCY_MATRICES: Record<Deficiency, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const DEFICIENCIES = Object.keys(DEFICIENCY_MATRICES) as Deficiency[];

/** How a colour appears with the given colour-vision deficiency (a screening approximation). */
export function simulateDeficiency(rgb: Rgb, deficiency: Deficiency): Rgb {
  const matrix = DEFICIENCY_MATRICES[deficiency];
  const linear = rgb.map(srgbToLinear);
  return matrix.map((row) =>
    linearToSrgb(row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]),
  );
}

function toLab(rgb: Rgb): [number, number, number] {
  const [red, green, blue] = rgb.map(srgbToLinear);
  // sRGB to XYZ (D65), normalised by the D65 white point.
  const x = (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047;
  const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const z = (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883;
  const f = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference; about 2.3 is just noticeable, and under about 20 small chart marks blur together. */
export function colourDistance(first: Rgb, second: Rgb): number {
  const [l1, a1, b1] = toLab(first);
  const [l2, a2, b2] = toLab(second);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
