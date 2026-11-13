import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadFontCss } from "./font-assets.mjs";
import { runFontReport } from "./font-report.mjs";
import { fontReportHeight } from "./font-specimens.mjs";

async function withProposal(operation) {
  const directory = await mkdtemp(join(tmpdir(), "font-report-test-"));
  try {
    const source = join(directory, "fonts.json");
    await writeFile(
      source,
      JSON.stringify({
        name: "probe",
        fonts: { body: "Arial, sans-serif", display: "Georgia, serif", mono: "monospace" },
      }),
    );
    await operation({ source, directory, htmlPath: join(directory, "report.html") });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("font report CLI", () => {
  it("writes HTML and prints roles and the path for a font proposal", async () => {
    await withProposal(async ({ source, htmlPath }) => {
      const output = [];
      const result = await runFontReport([source, "--out", htmlPath], {
        log: (line) => output.push(line),
      });
      expect(result).toEqual({
        ok: true,
        htmlPath,
        slideHtmlPath: htmlPath.replace(".html", "-slide.html"),
      });
      expect(await readFile(result.slideHtmlPath, "utf8")).toContain('class="slide"');
      expect(await readFile(htmlPath, "utf8")).toContain("Font report · probe");
      expect(output.join("\n")).toContain("body: Arial, sans-serif");
      expect(output.join("\n")).toContain(`Report: ${htmlPath}`);
    });
  });

  it("sizes captures from long role stacks and the rendered report height", async () => {
    await withProposal(async ({ source, htmlPath }) => {
      const definition = {
        name: "probe",
        fonts: {
          body: "Arial, Helvetica, sans-serif",
          display: `"${"An unusually long display family ".repeat(18)}", Georgia, serif`,
          mono: "ui-monospace, monospace",
        },
      };
      await writeFile(source, JSON.stringify(definition));
      const capturedHeights = [];
      const result = await runFontReport(
        [source, "--out", htmlPath, "--screenshot", "--browser", "/opt/chromium"],
        {
          log: () => {},
          browserSystem: { platform: "linux", env: { PATH: "" }, exists: () => true },
          capture: async (_browser, report) => {
            capturedHeights.push(report.height);
            return `${report.htmlPath}.png`;
          },
        },
      );

      expect(result.ok).toBe(true);
      expect(capturedHeights).toEqual([fontReportHeight(definition), 1080]);
      const html = await readFile(htmlPath, "utf8");
      expect(html).toContain(`body class="report" style="height:${capturedHeights[0]}px"`);
      const displayLines = Math.ceil(definition.fonts.display.length / 80);
      const displaySectionHeight = 1160 + Math.max(0, displayLines - 2) * 24;
      expect(html).toContain(`section.display { height: ${displaySectionHeight}px; }`);
    });
  });

  it("still writes the report and succeeds when browser discovery finds nothing", async () => {
    await withProposal(async ({ source, htmlPath }) => {
      const output = [];
      const result = await runFontReport([source, "--out", htmlPath, "--screenshot"], {
        log: (line) => output.push(line),
        browserSystem: { platform: "linux", env: { PATH: "" }, exists: () => false },
      });
      expect(result.ok).toBe(true);
      expect(await readFile(htmlPath, "utf8")).toContain("Requested stack");
      expect(output.join("\n")).toContain("No screenshot taken");
      expect(result.pngPath).toBeUndefined();
    });
  });

  it("reports an unavailable explicit browser as an error, not as a skipped screenshot", async () => {
    await withProposal(async ({ source, htmlPath }) => {
      const result = await runFontReport(
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

  it("reports invalid arguments without performing file I/O", async () => {
    expect((await runFontReport([])).ok).toBe(false);
    expect((await runFontReport(["--bogus"])).ok).toBe(false);
  });

  it("reports missing input files as errors", async () => {
    await withProposal(async ({ directory }) => {
      const result = await runFontReport([join(directory, "missing.json")]);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("ENOENT");
    });
  });

  it("loads a template module and embeds its font faces into the offline report", async () => {
    await withProposal(async ({ directory, htmlPath }) => {
      await mkdir(join(directory, "fonts"));
      await writeFile(
        join(directory, "index.ts"),
        `
        export default {
          name: "probe", fontSans: '"Probe", Arial, sans-serif',
          fonts: { body: '"Probe", Arial, sans-serif', display: "Georgia, serif", mono: "monospace" }
        };`,
      );
      await writeFile(
        join(directory, "fonts.css"),
        '@font-face { font-family:"Probe"; src:url("./fonts/probe.woff2"); font-weight:400 700; }',
      );
      await writeFile(join(directory, "fonts/probe.woff2"), Buffer.from("font fixture"));
      const result = await runFontReport([directory, "--out", htmlPath], { log: () => {} });
      expect(result.ok).toBe(true);
      const html = await readFile(htmlPath, "utf8");
      expect(html).toContain("1 embedded @font-face rule(s)");
      expect(html).toContain("data:font/woff2;base64,");
      expect(html).not.toContain('url("./fonts/');
      const slideHtml = await readFile(result.slideHtmlPath, "utf8");
      expect(slideHtml).toContain("data:font/woff2;base64,");
    });
  });

  it("warns when the compatibility alias differs from the body role", async () => {
    await withProposal(async ({ directory, htmlPath }) => {
      await writeFile(
        join(directory, "index.ts"),
        `export default {
        name: "probe", fontSans: "Arial",
        fonts: { body: "Georgia, serif", display: "Georgia, serif", mono: "monospace" }
      };`,
      );
      const output = [];
      const result = await runFontReport([directory, "--out", htmlPath], {
        log: (line) => output.push(line),
      });
      expect(result.ok).toBe(true);
      expect(output.join("\n")).toContain("fontSans differs");
    });
  });
});

describe("template-local font assets", () => {
  it("handles a template that uses only installed fonts", async () => {
    await withProposal(async ({ directory }) => {
      expect(await loadFontCss(directory)).toEqual({ ok: true, css: "", faceCount: 0 });
    });
  });

  it("rejects a relative asset outside the template folder", async () => {
    await withProposal(async ({ directory }) => {
      await mkdir(join(directory, "template"));
      await writeFile(join(directory, "outside.woff2"), "font");
      await writeFile(
        join(directory, "template/fonts.css"),
        '@font-face { src:url("../outside.woff2"); }',
      );
      const result = await loadFontCss(join(directory, "template"));
      expect(result.ok).toBe(false);
      expect(result.error).toContain("leaves the template folder");
    });
  });

  it("reports missing referenced assets instead of producing a misleading report", async () => {
    await withProposal(async ({ directory }) => {
      await writeFile(join(directory, "fonts.css"), "@font-face { src:url(missing.woff2); }");
      const result = await loadFontCss(directory);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Could not read font");
    });
  });
});
