import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "vite";
import { PROJECT_NAMESPACES, projectAliases } from "./lib/aliases.ts";

/**
 * Read-only import-ownership checker for the governed runtime areas: the foundation
 * (`core/`), the composition entries, both decks and every template folder. It parses
 * real source files before transpilation, resolves every import to its real destination
 * (following symlinks), and applies a pure ownership matrix. It never executes the
 * modules it scans and never writes anything.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Extensions the bundler could resolve for a JS/TS import, in resolution order. */
const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

const SOURCE_EXTENSIONS = new Set([...CODE_EXTENSIONS]);

/**
 * The ownership area of a real path. Repository files outside the governed areas are
 * "outside": deck, template and foundation code may not reach them by relative path.
 */
function areaOf(realPath, root) {
  const rel = relative(root, realPath);
  if (rel === ".." || rel.startsWith(`..${sep}`)) return { kind: "outside", name: "outside", root };
  const parts = rel.split(sep);
  if (parts[0] === "core") return { kind: "core", name: "core", root: join(root, "core") };
  if (parts[0] === "presentation")
    return { kind: "deck", name: "presentation", root: join(root, "presentation") };
  if (parts[0] === "showcase")
    return { kind: "deck", name: "showcase", root: join(root, "showcase") };
  if (parts[0] === "templates" && parts.length > 1) {
    return { kind: "template", name: parts[1], root: join(root, "templates", parts[1]) };
  }
  // The whole tests/ tree is test-only code; governed runtime code must never import it.
  if (parts[0] === "tests") return { kind: "testing", name: "tests", root: join(root, "tests") };
  // app/ holds the shared bootstrap that the composition entries delegate to.
  if (parts[0] === "app") {
    return { kind: "composition", name: "composition", root };
  }
  if (parts[0] === "node_modules") return { kind: "package", name: "package", root };
  return { kind: "outside", name: "outside", root };
}

/** Every import edge in a source file: static imports, re-exports and literal dynamic imports. */
export function collectImports(source, lang) {
  const program = parseAst(source, { lang });
  const specifiers = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node.type === "ImportDeclaration" && node.source?.value) {
      specifiers.push(node.source.value);
    } else if (
      (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
      node.source?.value
    ) {
      specifiers.push(node.source.value);
    } else if (node.type === "TSImportType" && typeof node.source?.value === "string") {
      // `import("…").Type` in a type position is an import edge that erases at build time.
      specifiers.push(node.source.value);
    } else if (node.type === "ImportExpression") {
      // Only literal dynamic imports are classified; computed targets stay runtime data.
      if (node.source?.type === "Literal" && typeof node.source.value === "string") {
        specifiers.push(node.source.value);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "type" || key === "start" || key === "end") continue;
      visit(node[key]);
    }
  };
  visit(program);
  return specifiers;
}

function langFor(fileName) {
  if (fileName.endsWith(".tsx")) return "tsx";
  if (fileName.endsWith(".ts") || fileName.endsWith(".mts") || fileName.endsWith(".cts")) {
    return "ts";
  }
  return "js";
}

/**
 * Resolve one import specifier the way the bundler would: project aliases first (expanding
 * their capture groups), then extension and directory-index resolution for local paths.
 * Returns null for external packages and throws for project-namespace specifiers that no
 * configured alias resolves.
 */
export async function resolveSpecifier(specifier, importerPath, aliases, root) {
  for (const { find, replacement } of aliases) {
    const match = specifier.match(find);
    if (match) {
      const expanded = replacement.replace(/\$(\d)/g, (_, index) => match[Number(index)] ?? "");
      return await resolveLocal(expanded, specifier, root);
    }
  }
  if (specifier.startsWith(".")) {
    return await resolveLocal(join(dirname(importerPath), specifier), specifier, root);
  }
  const namespace = specifier.split("/")[0].slice(1);
  if (specifier.startsWith("@") && PROJECT_NAMESPACES.includes(namespace)) {
    throw new Error(`Project import "${specifier}" does not match any configured alias`);
  }
  return null; // An external package: always permitted, never resolved.
}

async function resolveLocal(base, specifier, root) {
  const attempts = [base];
  for (const extension of CODE_EXTENSIONS) {
    attempts.push(base + extension, join(base, `index${extension}`));
  }
  for (const attempt of attempts) {
    const real = await existingRealFile(attempt);
    if (real) return real;
  }
  throw new Error(
    `Import "${specifier}" does not resolve to an existing local file (${relative(root, base)})`,
  );
}

async function existingRealPath(path) {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}

/** A real path, but only when it is a file: directory names must resolve through an index. */
async function existingRealFile(path) {
  const real = await existingRealPath(path);
  if (!real) return null;
  try {
    return (await stat(real)).isFile() ? real : null;
  } catch {
    return null;
  }
}

function isTestImporter(path) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
}

const AREA_LABELS = {
  core: "Foundation code",
  deck: "Deck code",
  template: "Template code",
};

/**
 * The pure ownership matrix: may `importerArea` import a destination with the given real
 * path? Returns a violation message, or null when the edge is permitted. Composition entries
 * and test support deliberately reach across areas; everything else stays in its own area
 * apart from the public `@core` entry and, for test files, the shared test support.
 */
export function checkEdge(
  importerPath,
  importerArea,
  destinationPath,
  destinationArea,
  root,
  specifier,
) {
  const label = AREA_LABELS[importerArea.kind];
  if (!label) return null;
  const owned =
    destinationArea.kind === importerArea.kind && destinationArea.name === importerArea.name;
  if (owned) return null;

  const importer = relative(root, importerPath);
  const destination = relative(root, destinationPath);
  const forbid = (rule, kind = "") =>
    `${label} ${rule}: "${importer}" imports ${kind}"${destination}"`;
  switch (destinationArea.kind) {
    case "core":
      return destination === join("core", "index.ts") && specifier === "@core"
        ? null
        : forbid('may import the public "@core" entry only', "core internal ");
    case "testing":
      return isTestImporter(importerPath)
        ? null
        : forbid("must not import test support at runtime");
    case "template":
      return forbid(
        importerArea.kind === "template"
          ? "must not import another template"
          : "must not import templates",
      );
    case "deck":
      return forbid(
        importerArea.kind === "deck"
          ? "may only import files inside its own deck folder"
          : "must not import deck content",
      );
    case "composition":
      return forbid("must not import a composition entry");
    default:
      return forbid("must not import files outside its own area");
  }
}

async function listSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      files.push(...(await listSourceFiles(path)));
    } else if (SOURCE_EXTENSIONS.has(`.${entry.name.split(".").pop()}`)) {
      files.push(path);
    }
  }
  return files;
}

/** Scan every governed runtime source file and return all ownership violations. */
export async function scanProject(root, { aliases = projectAliases(root) } = {}) {
  const governedRoots = ["app", "core", "presentation", "showcase", "templates"];
  const files = (
    await Promise.all(governedRoots.map((dir) => listSourceFiles(join(root, dir))))
  ).flat();
  const violations = [];
  for (const file of files) {
    const importerReal = await existingRealPath(file);
    if (!importerReal) continue;
    const importerArea = areaOf(importerReal, root);
    if (importerArea.kind === "outside" || importerArea.kind === "package") continue;
    const source = await readFile(file, "utf8");
    let specifiers;
    try {
      specifiers = collectImports(source, langFor(file));
    } catch (error) {
      violations.push(`${relative(root, file)}: could not parse imports: ${error.message}`);
      continue;
    }
    for (const specifier of specifiers) {
      let destinationReal;
      try {
        destinationReal = await resolveSpecifier(specifier, importerReal, aliases, root);
      } catch (error) {
        violations.push(`${relative(root, file)}: ${error.message}`);
        continue;
      }
      if (!destinationReal) continue; // External package.
      const destinationArea = areaOf(destinationReal, root);
      const violation = checkEdge(
        importerReal,
        importerArea,
        destinationReal,
        destinationArea,
        root,
        specifier,
      );
      if (violation) violations.push(violation);
    }
  }
  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const violations = await scanProject(ROOT);
    if (violations.length > 0) {
      for (const violation of violations) console.error(violation);
      console.error(`Import boundaries: ${violations.length} violation(s) found.`);
      process.exitCode = 1;
    } else {
      console.log("Import boundaries: all governed imports respect ownership rules.");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
