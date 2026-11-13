import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { findBrowser } from "../../../scripts/browser-tests/findBrowser.mjs";

describe("findBrowser", () => {
  it("fails clearly when no executable exists on the path", async () => {
    await assert.rejects(
      findBrowser("/nonexistent", undefined),
      /No Chromium-family browser found/,
    );
  });

  it("fails clearly when the OPENPREZ_BROWSER override is not executable", async () => {
    await assert.rejects(
      findBrowser("/nonexistent", "/nonexistent/chromium"),
      /OPENPREZ_BROWSER is set to/,
    );
  });

  it("resolves a known executable name from PATH without downloading", async () => {
    const directory = await mkdtemp(join(tmpdir(), "openprez-browser-fixture-"));
    try {
      const executable = join(directory, "chromium");
      await writeFile(executable, "#!/bin/sh\nexit 0\n");
      await chmod(executable, 0o755);
      assert.equal(await findBrowser(directory, undefined), executable);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a non-executable file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "openprez-browser-fixture-"));
    try {
      const executable = join(directory, "chromium");
      await writeFile(executable, "not executable\n");
      await assert.rejects(findBrowser(directory, undefined), /No Chromium-family browser found/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
