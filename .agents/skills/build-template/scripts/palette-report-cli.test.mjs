import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPaletteReport } from "./palette-report.mjs";

const palette = {
  primary: "#F3E3C7",
  onPrimary: "#2A1A12",
  accent1: "#5A3521",
  accent2: "#C4501E",
  accent3: "#E08A2E",
  accent4: "#3F6F73",
  accent5: "#FBF1DF",
  neutral: "#B39B80",
  data1: "#7C8F3A",
  data2: "#E8B33A",
  data3: "#5C6BB2",
};
const tones = {
  base: { surface: "#2A1A12", onSurface: "#F3E3C7" },
  inverse: { surface: "#F3E3C7", onSurface: "#2A1A12" },
};

async function withPalette(operation) {
  const directory = await mkdtemp(join(tmpdir(), "palette-report-test-"));
  try {
    const source = join(directory, "palette.json");
    const htmlPath = join(directory, "report.html");
    await writeFile(source, JSON.stringify({ name: "probe", palette, tones }));
    await operation({ source, htmlPath, directory });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("palette report CLI", () => {
  it("writes the offline report and prints the summary and output path", async () => {
    await withPalette(async ({ source, htmlPath }) => {
      const output = [];
      const result = await runPaletteReport([source, "--out", htmlPath], {
        log: (line) => output.push(line),
      });
      expect(result).toEqual({ ok: true, htmlPath });
      expect(await readFile(htmlPath, "utf8")).toContain("Palette report · probe");
      expect(output.join("\n")).toContain("Tone text contrast:");
      expect(output.join("\n")).toContain(`Report: ${htmlPath}`);
    });
  });

  it("writes the report and succeeds when screenshot browser discovery finds nothing", async () => {
    await withPalette(async ({ source, htmlPath }) => {
      const output = [];
      const result = await runPaletteReport([source, "--out", htmlPath, "--screenshot"], {
        log: (line) => output.push(line),
        browserSystem: { platform: "linux", env: { PATH: "" }, exists: () => false },
      });
      expect(result).toEqual({ ok: true, htmlPath });
      expect(await readFile(htmlPath, "utf8")).toContain("Palette report · probe");
      expect(output.join("\n")).toContain("No screenshot taken");
    });
  });

  it("reports an unavailable explicit browser as a failure", async () => {
    await withPalette(async ({ source, htmlPath }) => {
      const result = await runPaletteReport(
        [source, "--out", htmlPath, "--screenshot", "--browser", "firefox"],
        {
          log: () => {},
          browserSystem: { platform: "linux", env: { PATH: "" }, exists: () => false },
        },
      );
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Firefox was not found");
    });
  });

  it("normalizes argument and input failures into result values", async () => {
    expect((await runPaletteReport([])).ok).toBe(false);
    await withPalette(async ({ directory }) => {
      const missing = await runPaletteReport([join(directory, "missing.json")], { log: () => {} });
      expect(missing.ok).toBe(false);
      expect(missing.error).toContain("Could not read");

      const malformedPath = join(directory, "invalid.json");
      await writeFile(malformedPath, "{ name: probe");
      const malformed = await runPaletteReport([malformedPath], { log: () => {} });
      expect(malformed.ok).toBe(false);
      expect(malformed.error).toContain("Invalid palette file");
    });
  });
});
