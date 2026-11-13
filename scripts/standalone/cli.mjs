import { randomUUID } from "node:crypto";
import { readdir, readFile, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleStandaloneHtml, validateStandaloneManifest } from "./assemble.mjs";
import { STANDALONE_MANIFEST_FILE } from "./manifest.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const [flavorArgument] = process.argv.slice(2);
const flavor = flavorArgument === "showcase" ? "showcase" : "user";
const buildDirectory = resolve(ROOT, process.env.OPENPREZ_BUILD_DIR?.trim() || "dist");
const standaloneFile = join(buildDirectory, "prez.html");

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function relativeBuildPath(path) {
  const relativePath = relative(buildDirectory, path).split(sep).join("/");
  if (relativePath.startsWith("../") || relativePath === "..") {
    throw new Error(`Build output escaped its directory: ${path}`);
  }
  return relativePath;
}

function assertGeneratedPath(path) {
  const absolute = resolve(buildDirectory, path);
  const pathFromBuild = relative(buildDirectory, absolute);
  if (pathFromBuild === ".." || pathFromBuild.startsWith(`..${sep}`)) {
    throw new Error(`Refusing to remove a path outside generated output: ${path}`);
  }
  return absolute;
}

async function readBuildOutput() {
  let outputFiles;
  try {
    outputFiles = await filesIn(buildDirectory);
  } catch (error) {
    throw new Error(
      `Could not read standalone build output at ${buildDirectory}; run the matching pnpm prez command first`,
      { cause: error },
    );
  }

  const files = new Map();
  for (const file of outputFiles) {
    files.set(relativeBuildPath(file), await readFile(file));
  }
  const manifestContent = files.get(STANDALONE_MANIFEST_FILE);
  if (!manifestContent) {
    throw new Error(
      `Missing ${STANDALONE_MANIFEST_FILE}; run pnpm prez${flavor === "showcase" ? ":showcase" : ""} to create a matching build`,
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestContent.toString("utf8"));
  } catch (error) {
    throw new Error(`Could not parse ${STANDALONE_MANIFEST_FILE}`, { cause: error });
  }
  validateStandaloneManifest(manifest, flavor, files.keys());
  return { manifest, files };
}

async function publishAtomically(html) {
  const temporaryFile = join(buildDirectory, `.prez-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryFile, html, { encoding: "utf8", flag: "wx" });
    await rename(temporaryFile, standaloneFile);
  } finally {
    await rm(temporaryFile, { force: true });
  }
}

async function cleanupVerifiedOutputs(manifest) {
  const generatedFiles = [...manifest.files, STANDALONE_MANIFEST_FILE];
  const generatedDirectories = new Set();
  for (const file of generatedFiles) {
    const segments = file.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      generatedDirectories.add(segments.slice(0, index).join("/"));
    }
    await rm(assertGeneratedPath(file), { force: true });
  }

  const deepestFirst = [...generatedDirectories].sort(
    (left, right) => right.split("/").length - left.split("/").length,
  );
  for (const directory of deepestFirst) {
    await rmdir(assertGeneratedPath(directory));
  }
}

async function buildStandaloneHtml() {
  if (flavorArgument !== undefined && flavorArgument !== "user" && flavorArgument !== "showcase") {
    throw new Error(`Unknown standalone flavor: ${flavorArgument}; use "user" or "showcase"`);
  }
  const { manifest, files } = await readBuildOutput();
  const html = await assembleStandaloneHtml({ manifest, flavor, files });
  await publishAtomically(html);
  await cleanupVerifiedOutputs(manifest);
  return standaloneFile;
}

try {
  const path = await buildStandaloneHtml();
  console.log(`Standalone presentation written to ${path}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
