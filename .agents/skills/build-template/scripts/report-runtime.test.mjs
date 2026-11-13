import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captureScreenshot } from "./report-runtime.mjs";

describe("report screenshot capture", () => {
  it("reports an unsuccessful browser exit without waiting for the file timeout", async () => {
    const directory = await mkdtemp(join(tmpdir(), "template-report-capture-test-"));
    try {
      const startedAt = Date.now();
      await expect(
        captureScreenshot(
          { name: "node", engine: "chromium", executable: process.execPath },
          { htmlPath: join(directory, "report.html"), width: 1920, height: 1080 },
        ),
      ).rejects.toThrow(/Screenshot failed: node exited with/);
      expect(Date.now() - startedAt).toBeLessThan(5_000);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
