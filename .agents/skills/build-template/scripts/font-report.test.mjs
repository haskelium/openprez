import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { embedFontCss } from "./font-assets.mjs";
import {
  fallbackStack,
  fontReportHeight,
  renderFontReport,
  renderFontSlide,
  renderFontSummary,
} from "./font-specimens.mjs";

function definition() {
  return {
    name: "probe",
    fonts: {
      display: '"Example, Display", Georgia, serif',
      body: "Arial, Helvetica, sans-serif",
      mono: "ui-monospace, monospace",
    },
  };
}

function documentFor(input = definition()) {
  return new JSDOM(renderFontReport(input)).window.document;
}

describe("font specimens", () => {
  it.each(["display", "body", "mono"])("renders primary and fallback specimens for %s", (role) => {
    const document = documentFor();
    expect(document.querySelectorAll(`article[data-role="${role}"]`)).toHaveLength(2);
    const specimens = document.querySelector(
      `article[data-role="${role}"][data-view="primary"] .specimens`,
    );
    expect(specimens.style.fontFamily).toBe(definition().fonts[role]);
  });

  it("renders real stage sizes at regular and bold weights", () => {
    const document = documentFor();
    const samples = [...document.querySelectorAll(".specimen")];
    for (const size of [112, 72, 48, 36, 40]) {
      for (const weight of [400, 700]) {
        expect(
          samples.some(
            (sample) =>
              sample.style.fontSize === `${size}px` && sample.style.fontWeight === String(weight),
          ),
        ).toBe(true);
      }
    }
  });

  it("expands the report and display section for long family stacks", () => {
    const input = definition();
    const defaultHeight = fontReportHeight(input);
    input.fonts.display = `${"A very long display family ".repeat(20)}, Georgia, serif`;

    const height = fontReportHeight(input);
    const document = documentFor(input);
    const styles = document.querySelector("style:last-of-type").textContent;
    const displayHeight = Number(/section\.display \{ height: (\d+)px; \}/.exec(styles)?.[1]);

    expect(height).toBeGreaterThan(defaultHeight);
    expect(Number(document.body.style.height.replace("px", ""))).toBe(height);
    expect(displayHeight).toBeGreaterThan(1160);
    expect(document.querySelector('[data-role="display"] .stack').textContent).toBe(
      input.fonts.display,
    );
  });

  it("clearly separates small stress tests from the recommended hierarchy", () => {
    const document = documentFor();
    const stress = document.querySelector(".stress-tests");
    expect(stress.textContent).toContain("not the recommended slide hierarchy");
    expect(
      [...stress.querySelectorAll(".specimen")].map((element) => element.style.fontSize),
    ).toEqual(["22px", "28px", "32px"]);
  });

  it("renders a separate 1920×1080 slide composition with all three roles", () => {
    const document = new JSDOM(renderFontSlide(definition())).window.document;
    expect(document.body.className).toBe("slide");
    expect(document.querySelector(".pairing-title").textContent).toBe("Ideas that travel");
    expect(document.querySelector(".pairing-copy").style.fontFamily).toBe(definition().fonts.body);
    expect(document.querySelector(".pairing-code").style.fontFamily).toBe(definition().fonts.mono);
    expect(document.querySelectorAll(".role")).toHaveLength(0);
    expect(document.querySelector("style:last-of-type").textContent).toContain("height:1080px");
  });

  it("includes ambiguous characters, numerals and French punctuation", () => {
    const text = documentFor().querySelector(".glyphs").parentElement.textContent;
    for (const sample of ["I l 1", "O 0", "0123456789", "œ", "Œ", "“", "‘", "–", "—", "€"]) {
      expect(text).toContain(sample);
    }
  });

  it("composes the three roles together for harmony review", () => {
    const document = documentFor();
    const fonts = definition().fonts;
    expect(document.querySelector(".pairing-title").style.fontFamily).toBe(fonts.display);
    expect(document.querySelector(".pairing-copy").style.fontFamily).toBe(fonts.body);
    expect(document.querySelector(".pairing-code").style.fontFamily).toBe(fonts.mono);
  });

  it("removes only the primary family in the fallback view", () => {
    const document = documentFor();
    expect(
      document.querySelector('[data-role="display"][data-view="fallback"] .specimens').style
        .fontFamily,
    ).toBe("Georgia, serif");
    expect(fallbackStack('"Example, Display", Georgia, serif')).toBe("Georgia, serif");
  });

  it("explains a generic-only stack without making it blank", () => {
    const input = definition();
    input.fonts.mono = "monospace";
    const element = documentFor(input).querySelector('[data-role="mono"][data-view="fallback"]');
    expect(element.textContent).toContain("No second family");
    expect(element.querySelector(".specimens").style.fontFamily).toBe("monospace");
  });

  it("escapes report metadata rather than injecting HTML", () => {
    const input = definition();
    input.name = "<img src=x>";
    const document = documentFor(input);
    expect(document.querySelector("h1").textContent).toContain("<img src=x>");
    expect(document.querySelector("img")).toBeNull();
  });

  it("includes a font-settling indicator and offline-only resource policy", () => {
    const document = documentFor();
    expect(document.querySelector("#font-state")).not.toBeNull();
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]').content).toContain(
      "font-src data:",
    );
    expect(document.querySelector("script").textContent).toContain("document.fonts.ready");
  });

  it("prints role stacks, fallback stacks and review limitations", () => {
    const summary = renderFontSummary(definition(), ["body alias differs"]);
    expect(summary).toContain("display:");
    expect(summary).toContain("fallback: Georgia, serif");
    expect(summary).toContain("body alias differs");
    expect(summary).toContain("not an automated font-quality score");
  });
});

describe("bundled font CSS", () => {
  it("embeds WOFF2, preserving weight, style and unicode-range", async () => {
    const css =
      '@font-face { font-family:"Probe"; src:local("Probe"), url("./fonts/probe.woff2") format("woff2"); font-weight:400 700; font-style:normal; unicode-range:U+0000-00FF; }';
    const result = await embedFontCss(css, async (path) => ({
      ok: true,
      bytes: Buffer.from(path),
    }));
    expect(result.ok).toBe(true);
    expect(result.css).toContain(
      `data:font/woff2;base64,${Buffer.from("./fonts/probe.woff2").toString("base64")}`,
    );
    expect(result.css).not.toContain("local(");
    expect(result.css).toContain("font-weight:400 700");
    expect(result.css).toContain("font-style:normal");
    expect(result.css).toContain("unicode-range:U+0000-00FF");
  });

  it("embeds all subsets and preserves multiple faces", async () => {
    const result = await embedFontCss(
      "@font-face { src:url('latin.ttf'); } @font-face { src:url(latin-ext.otf); }",
      async () => ({ ok: true, bytes: Buffer.from("font") }),
    );
    expect(result.faceCount).toBe(2);
    expect(result.css).toContain("data:font/ttf;base64,");
    expect(result.css).toContain("data:font/otf;base64,");
  });

  it.each(["https://example.org/a.woff2", "//example.org/a.ttf", "/absolute/font.woff2"])(
    "rejects nonlocal sources: %s",
    async (url) => {
      const result = await embedFontCss(`@font-face { src:url("${url}"); }`, async () => ({
        ok: true,
        bytes: Buffer.alloc(0),
      }));
      expect(result.ok).toBe(false);
      expect(result.error).toContain("template-local");
    },
  );

  it("reports unreadable font files instead of silently omitting them", async () => {
    const result = await embedFontCss("@font-face { src:url(missing.woff2); }", async () => ({
      ok: false,
      error: "File not found",
    }));
    expect(result).toEqual({ ok: false, error: "File not found" });
  });

  it("rejects CSS imports rather than fetching remote styles", async () => {
    const result = await embedFontCss('@import "https://example.org/font.css";', async () => ({
      ok: true,
      bytes: Buffer.alloc(0),
    }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain("no @import");
  });
});
