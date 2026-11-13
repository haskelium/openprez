import { describe, expect, it } from "vitest";
import { analyseTemplate, renderReportHtml, renderSummary, reportHeight } from "./report.mjs";

const template = {
  name: "probe",
  palette: {
    primary: "#F3E3C7",
    onPrimary: "#2A1A12",
    accent2: "#C4501E",
    data1: "#7C8F3A",
    accent5: "#FBF1DF",
  },
  tones: {
    base: { surface: "#2A1A12", onSurface: "#F3E3C7" },
    inverse: { surface: "#F3E3C7", onSurface: "#2A1A12" },
  },
};

function analysed(source) {
  const result = analyseTemplate(source);
  if (!result.ok) throw new Error(result.errors.join(", "));
  return result.analysis;
}

describe("palette analysis", () => {
  it("separates the primary pair from the accents", () => {
    const analysis = analysed(template);
    expect(analysis.accents.map((accent) => accent.token)).toEqual(["accent2", "data1", "accent5"]);
  });

  it("classifies each accent on each tone surface", () => {
    const accent2 = analysed(template).accentContrast.find((accent) => accent.token === "accent2");
    expect(accent2.cells.map((cell) => cell.class)).toEqual(["large-text", "large-text"]);
  });

  it("flags near-identical swatches", () => {
    expect(analysed(template).closePairs).toEqual([
      expect.objectContaining({ first: "primary", second: "accent5" }),
    ]);
  });

  it("reports unsupported colour values instead of guessing", () => {
    const result = analyseTemplate({
      ...template,
      tones: { base: { surface: "rgb(0 0 0)", onSurface: "#FFFFFF" } },
    });
    expect(result).toEqual({ ok: false, errors: ["tones.base.surface = rgb(0 0 0)"] });
  });
});

describe("report rendering", () => {
  it("renders the four sections offline at the computed height", () => {
    const analysis = analysed(template);
    const html = renderReportHtml(analysis);
    for (const heading of [
      "Palette",
      "Tones with accents",
      "Colour-vision simulations",
      "Contrast",
    ]) {
      expect(html).toContain(`<h2>${heading}`);
    }
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain(`<body style="height:${reportHeight(analysis)}px">`);
  });

  it("grows the page with more tones", () => {
    const fewTones = reportHeight(analysed(template));
    const manyTones = reportHeight(
      analysed({
        ...template,
        tones: Object.fromEntries(
          ["a", "b", "c", "d", "e"].map((name) => [name, template.tones.base]),
        ),
      }),
    );
    expect(manyTones).toBeGreaterThan(fewTones);
  });

  it("summarises tone contrast and colour-vision collapse as text", () => {
    const summary = renderSummary(analysed(template));
    expect(summary).toContain("base     #F3E3C7 on #2A1A12  13.25  text");
    expect(summary).toMatch(/deuteranopia: .*accent2 ~ data1/);
  });
});
