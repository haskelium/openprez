import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STANDALONE_MANIFEST_FILE } from "../../../scripts/standalone/manifest.ts";

const ASSEMBLER = fileURLToPath(new URL("../../../scripts/standalone/cli.mjs", import.meta.url));

function runAssembler(directory) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [ASSEMBLER], {
      env: { ...process.env, OPENPREZ_BUILD_DIR: directory },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (data) => (stdout += data));
    child.stderr.setEncoding("utf8").on("data", (data) => (stderr += data));
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code, stdout, stderr }));
  });
}

async function withBuildDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), "openprez-standalone-failure-"));
  try {
    await mkdir(join(directory, "assets"));
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function manifest(files) {
  return JSON.stringify({ version: 1, flavor: "user", entry: "index.html", files });
}

describe("standalone filesystem orchestration", () => {
  it("leaves required build inputs and prior output untouched when provenance is missing", async () => {
    await withBuildDirectory(async (directory) => {
      await writeFile(join(directory, "index.html"), "<html>old entry</html>");
      await writeFile(join(directory, "prez.html"), "previous complete artifact");
      const result = await runAssembler(directory);

      expect(result.code).not.toBe(0);
      expect(result.stdout).not.toContain("Standalone presentation written");
      expect(result.stderr).toContain(STANDALONE_MANIFEST_FILE);
      expect(await readFile(join(directory, "index.html"), "utf8")).toBe("<html>old entry</html>");
      expect(await readFile(join(directory, "prez.html"), "utf8")).toBe(
        "previous complete artifact",
      );
    });
  });

  it("does not publish over an occupied target or remove inputs after atomic rename fails", async () => {
    await withBuildDirectory(async (directory) => {
      const entry = '<!doctype html><script type="module" src="/assets/app.js"></script>';
      const code = "window.ready = true;";
      const occupiedTarget = join(directory, "prez.html");
      await mkdir(occupiedTarget);
      await writeFile(join(occupiedTarget, "marker.txt"), "existing target");
      await writeFile(join(directory, "index.html"), entry);
      await writeFile(join(directory, "assets/app.js"), code);
      await writeFile(
        join(directory, STANDALONE_MANIFEST_FILE),
        manifest(["assets/app.js", "index.html", "prez.html/marker.txt"]),
      );
      const result = await runAssembler(directory);

      expect(result.code).not.toBe(0);
      expect(result.stdout).not.toContain("Standalone presentation written");
      expect(await readFile(join(directory, "index.html"), "utf8")).toBe(entry);
      expect(await readFile(join(directory, "assets/app.js"), "utf8")).toBe(code);
      expect(await readFile(join(occupiedTarget, "marker.txt"), "utf8")).toBe("existing target");
      expect((await readdir(directory)).sort()).toEqual([
        "assets",
        "index.html",
        STANDALONE_MANIFEST_FILE,
        "prez.html",
      ]);
    });
  });

  it("does not publish a partial artifact or remove inputs when emitted code is invalid", async () => {
    await withBuildDirectory(async (directory) => {
      const entry = '<!doctype html><script type="module" src="/assets/app.js"></script>';
      const code = "const = invalid javascript";
      await writeFile(join(directory, "index.html"), entry);
      await writeFile(join(directory, "assets/app.js"), code);
      await writeFile(
        join(directory, STANDALONE_MANIFEST_FILE),
        manifest(["assets/app.js", "index.html"]),
      );
      const result = await runAssembler(directory);

      expect(result.code).not.toBe(0);
      expect(result.stdout).not.toContain("Standalone presentation written");
      expect(await readFile(join(directory, "index.html"), "utf8")).toBe(entry);
      expect(await readFile(join(directory, "assets/app.js"), "utf8")).toBe(code);
      expect((await readdir(directory)).sort()).toEqual([
        "assets",
        "index.html",
        STANDALONE_MANIFEST_FILE,
      ]);
      await expect(readFile(join(directory, "prez.html"))).rejects.toThrow();
    });
  });
});
