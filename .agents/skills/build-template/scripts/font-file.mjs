export const FONT_ROLES = ["body", "display", "mono"];

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Splits CSS family lists without splitting commas inside quoted family names. */
export function fontFamilies(stack) {
  if (typeof stack !== "string" || /[;{}<>\n\r]/.test(stack)) return null;
  const families = [];
  let family = "";
  let quote = null;
  let escaped = false;
  for (const character of stack) {
    if (escaped) {
      family += character;
      escaped = false;
    } else if (character === "\\") {
      family += character;
      escaped = true;
    } else if (quote) {
      family += character;
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
      family += character;
    } else if (character === ",") {
      if (!family.trim()) return null;
      families.push(family.trim());
      family = "";
    } else {
      family += character;
    }
  }
  if (quote || escaped || !family.trim()) return null;
  families.push(family.trim());
  const familyPattern = /^(?:"(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+'|[-_\p{L}][\p{L}\p{N}_ -]*)$/u;
  if (families.some((value) => !familyPattern.test(value))) return null;
  return families;
}

/** Validates externally supplied font roles, returning all input errors together. */
export function validateFontDefinition(data) {
  if (!isObject(data)) {
    return { ok: false, errors: ["the input must be an object { name, fonts }"] };
  }
  const errors = [];
  if (typeof data.name !== "string" || !NAME_PATTERN.test(data.name)) {
    errors.push('name must be a lowercase kebab-case string, such as "autumn"');
  }
  if (!isObject(data.fonts)) {
    errors.push("fonts must be an object with body, display and mono stacks");
  } else {
    for (const role of FONT_ROLES) {
      if (!fontFamilies(data.fonts[role])) {
        errors.push(`fonts.${role} must be a non-empty CSS font-family stack`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    definition: {
      name: data.name,
      fonts: Object.fromEntries(FONT_ROLES.map((role) => [role, data.fonts[role].trim()])),
    },
  };
}

/** Parses a planning-time { name, fonts: { body, display, mono } } JSON file. */
export function parseFontFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [`invalid JSON: ${error.message}`] };
  }
  return validateFontDefinition(data);
}
