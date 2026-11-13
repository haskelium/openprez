// Parses a proposed palette file ({ name, palette, tones }) so a template plan can be
// validated before any template code exists. Colour values are checked by the analysis.

export const PALETTE_TOKENS = [
  "primary",
  "onPrimary",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "neutral",
  "data1",
  "data2",
  "data3",
];
export const REQUIRED_TONES = ["base", "inverse"];

const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nameErrors(name) {
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    return ['name must be a lowercase kebab-case string, such as "autumn"'];
  }
  return [];
}

function paletteErrors(palette) {
  if (!isPlainObject(palette)) return ['palette must be an object of token: "#RRGGBB"'];
  return PALETTE_TOKENS.filter((token) => !(token in palette)).map(
    (token) => `palette.${token} is missing`,
  );
}

function toneErrors(tones) {
  if (!isPlainObject(tones)) return ["tones must be an object of name: { surface, onSurface }"];
  const errors = REQUIRED_TONES.filter((tone) => !(tone in tones)).map(
    (tone) => `tones.${tone} is missing`,
  );
  for (const [tone, pair] of Object.entries(tones)) {
    if (!isPlainObject(pair) || !("surface" in pair) || !("onSurface" in pair)) {
      errors.push(`tones.${tone} must have surface and onSurface`);
    }
  }
  return errors;
}

/**
 * Parses palette-file text. Returns { ok: true, template } with name, palette and tones,
 * or { ok: false, errors } listing every problem found.
 */
export function parsePaletteFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${error.message}`] };
  }
  if (!isPlainObject(data)) {
    return { ok: false, errors: ["the file must contain an object { name, palette, tones }"] };
  }
  const errors = [
    ...nameErrors(data.name),
    ...paletteErrors(data.palette),
    ...toneErrors(data.tones),
  ];
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, template: { name: data.name, palette: data.palette, tones: data.tones } };
}
