import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createStandaloneFixtures } from "../standalone/fixtures.mjs";
import { evaluate, navigate, ROOT, waitForPage } from "./browser.mjs";

/** Real-Vite fixture builds: embedded assets, bundled dynamic imports and raw-text payloads. */
export async function checkStandaloneFixtures(client) {
  const fixtures = await createStandaloneFixtures();
  try {
    for (const [flavor, file] of [
      ["user", fixtures.userFile],
      ["showcase", fixtures.showcaseFile],
    ]) {
      await navigate(client, pathToFileURL(file).href);
      await waitForPage(
        client,
        "Boolean(window.__standaloneFixture && document.querySelector('#fixture-image')?.complete)",
        30_000,
      );
      const state = await evaluate(
        client,
        `(() => {
          const surface = document.querySelector("#fixture-surface");
          return {
            ...window.__standaloneFixture,
            imageWidth: document.querySelector("#fixture-image").naturalWidth,
            backgroundImage: getComputedStyle(surface).backgroundImage,
            styleContent: getComputedStyle(surface, "::after").content,
            externalScripts: document.querySelectorAll("script[src]").length,
            externalStylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
          };
        })()`,
      );
      assert.equal(state.flavor, flavor);
      assert.equal(state.proseAsset, "assets/diagram.png");
      assert.equal(state.codeExample, "import('demo')");
      assert.equal(state.scriptEnd, "</SCRIPT   >");
      assert.equal(state.templateEnd, "</sCrIpT\t>");
      assert.equal(state.replacementPatterns, ["$$typeof", "$&", "$`", "$'", "$1"].join("|"));
      assert.ok(state.imageUrl.startsWith("data:image/svg+xml"));
      assert.equal(state.imageWidth, 48);
      assert.ok(state.backgroundImage.includes("data:image/svg+xml"));
      assert.equal(state.styleContent, '"</StYlE   >"');
      assert.equal(state.externalScripts, 0);
      assert.equal(state.externalStylesheets, 0);
      assert.equal(await evaluate(client, "window.loadFixtureChunk()"), "dynamic-import-bundled");
    }
    console.log("Standalone fixtures: both flavors render locally with authored values intact.");
  } finally {
    await fixtures.cleanup();
  }
}

/**
 * The real `prez.html` artifacts must open from a local file and render the deck without
 * script errors. CI passes the artifacts it built; locally they are built in isolation.
 */
export async function checkStandaloneArtifacts(client) {
  const provided = process.env.OPENPREZ_STANDALONE_ARTIFACTS?.split(",").filter(Boolean);
  const built = provided ? null : await buildRealArtifacts();
  try {
    for (const file of provided ?? built.files) await checkArtifactRenders(client, file);
    console.log("Standalone artifacts: the real user and showcase prez.html files render offline.");
  } finally {
    await built?.cleanup();
  }
}

async function checkArtifactRenders(client, file) {
  const errors = [];
  const unsubscribe = client.on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  });
  try {
    await navigate(client, pathToFileURL(file).href);
    try {
      await waitForPage(
        client,
        "Boolean(document.querySelector('[data-slide-area] [data-slide]') && document.querySelector('[data-footer]'))",
        30_000,
      );
    } catch (error) {
      const detail = errors.length > 0 ? `; script errors: ${errors.join(" | ")}` : "";
      throw new Error(`${file} did not render its first slide${detail}`, { cause: error });
    }
    assert.deepEqual(errors, [], `${file} threw while loading`);
    assert.equal(await evaluate(client, "document.querySelectorAll('script[src]').length"), 0);
  } finally {
    unsubscribe();
  }
}

async function buildRealArtifacts() {
  const directory = await mkdtemp(join(tmpdir(), "openprez-real-artifacts-"));
  try {
    const files = [];
    for (const [script, flavor] of [
      ["prez", "user"],
      ["prez:showcase", "showcase"],
    ]) {
      const outDir = join(directory, flavor);
      await run("pnpm", [script], { OPENPREZ_BUILD_DIR: outDir });
      files.push(join(outDir, "prez.html"));
    }
    return { files, cleanup: () => rm(directory, { recursive: true, force: true }) };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (data) => {
      stderr += data;
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed:\n${stderr}`)),
    );
  });
}
