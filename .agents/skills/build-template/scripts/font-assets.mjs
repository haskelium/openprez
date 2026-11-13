import { readFile, realpath } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";

const MIME_TYPES = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

function localFontReference(reference) {
  if (/^(?:[a-z][a-z0-9+.-]*:|[\\/])/i.test(reference)) {
    return {
      ok: false,
      error: `Font URLs must be template-local, not remote or absolute: ${reference}`,
    };
  }
  let path;
  try {
    path = decodeURIComponent(reference.split(/[?#]/)[0]);
  } catch {
    return { ok: false, error: `Malformed font URL: ${reference}` };
  }
  const mime = MIME_TYPES[extname(path).toLowerCase()];
  if (!mime) return { ok: false, error: `Unsupported font file: ${reference}` };
  return { ok: true, path, mime };
}

/** Rewrites local font URLs through the supplied resolver, preserving face descriptors. */
export async function embedFontCss(css, resolveAsset) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const faces = [...clean.matchAll(/@font-face\s*\{([^{}]*)\}/gi)];
  if (clean.replace(/@font-face\s*\{[^{}]*\}/gi, "").trim()) {
    return {
      ok: false,
      error: "fonts.css must contain only @font-face rules (no @import or other styles).",
    };
  }
  const embedded = [];
  for (const [, body] of faces) {
    // local() could mask a broken bundled file with a different installed version.
    let declarations = body.replace(/local\([^)]*\)\s*,?\s*/gi, "").replace(/,\s*;/g, ";");
    const urls = [...declarations.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)];
    if (!urls.length)
      return { ok: false, error: "Each @font-face must reference a bundled font URL." };
    for (const match of urls) {
      const reference = (match[1] ?? match[2] ?? match[3]).trim();
      if (/^data:(?:font\/[\w-]+|application\/[\w-]+);base64,[a-z0-9+/=]+$/i.test(reference))
        continue;
      const local = localFontReference(reference);
      if (!local.ok) return local;
      const asset = await resolveAsset(local.path);
      if (!asset.ok) return asset;
      const dataUri = `data:${local.mime};base64,${asset.bytes.toString("base64")}`;
      declarations = declarations.replace(match[0], `url("${dataUri}")`);
    }
    embedded.push(`@font-face {${declarations}}`);
  }
  return { ok: true, css: embedded.join("\n"), faceCount: faces.length };
}

function isInside(directory, path) {
  const remainder = relative(directory, path);
  return (
    remainder !== ".." &&
    !remainder.startsWith("../") &&
    !remainder.startsWith("..\\") &&
    !isAbsolute(remainder)
  );
}

/** Embeds only files inside the template, resolving symlinks before enforcing that boundary. */
export async function loadFontCss(templateDirectory) {
  const directory = await realpath(templateDirectory);
  const cssPath = resolve(directory, "fonts.css");
  let css;
  try {
    const realCss = await realpath(cssPath);
    if (!isInside(directory, realCss))
      return { ok: false, error: "fonts.css must be inside the template." };
    css = await readFile(realCss, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { ok: true, css: "", faceCount: 0 };
    return { ok: false, error: `Could not read ${cssPath}: ${error.message}` };
  }
  return embedFontCss(css, async (path) => {
    try {
      const file = await realpath(resolve(dirname(cssPath), path));
      if (!isInside(directory, file)) {
        return { ok: false, error: `Font asset leaves the template folder: ${path}` };
      }
      return { ok: true, bytes: await readFile(file) };
    } catch (error) {
      return { ok: false, error: `Could not read font ${path}: ${error.message}` };
    }
  });
}
