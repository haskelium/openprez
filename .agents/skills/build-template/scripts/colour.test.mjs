import { describe, expect, it } from "vitest";
import {
  classifyContrast,
  colourDistance,
  contrastRatio,
  parseHex,
  simulateDeficiency,
  toHex,
  toHsl,
} from "./colour.mjs";

describe("hex parsing", () => {
  it("reads six- and three-digit hex colours", () => {
    expect(toHex(parseHex("#2a1a12"))).toBe("#2A1A12");
    expect(toHex(parseHex("#fff"))).toBe("#FFFFFF");
  });

  it("rejects other colour formats", () => {
    expect(parseHex("rgb(0, 0, 0)")).toBe(null);
    expect(parseHex("#12345")).toBe(null);
  });
});

describe("WCAG contrast", () => {
  it("spans 21:1 from black to white", () => {
    expect(contrastRatio(parseHex("#000000"), parseHex("#FFFFFF"))).toBeCloseTo(21, 5);
  });

  it("matches a hand-computed ratio and is symmetric", () => {
    const bark = parseHex("#2A1A12");
    const cream = parseHex("#F3E3C7");
    expect(contrastRatio(bark, cream)).toBeCloseTo(13.25, 2);
    expect(contrastRatio(cream, bark)).toBeCloseTo(13.25, 2);
  });

  it("classifies ratios by WCAG thresholds", () => {
    expect(classifyContrast(4.5)).toBe("text");
    expect(classifyContrast(3.68)).toBe("large-text");
    expect(classifyContrast(2.1)).toBe("fill-only");
  });
});

describe("HSL", () => {
  it("reports hue, saturation and lightness in degrees and percent", () => {
    const { hue, saturation, lightness } = toHsl(parseHex("#C4501E"));
    expect(Math.round(hue)).toBe(18);
    expect(Math.round(saturation)).toBe(73);
    expect(Math.round(lightness)).toBe(44);
  });
});

describe("colour-vision deficiency simulation", () => {
  it("keeps neutral greys unchanged", () => {
    const grey = parseHex("#808080");
    for (const deficiency of ["protanopia", "deuteranopia", "tritanopia"]) {
      expect(toHex(simulateDeficiency(grey, deficiency))).toBe("#808080");
    }
  });

  it("collapses a red-green pair under deuteranopia", () => {
    const red = parseHex("#C4501E");
    const green = parseHex("#7C8F3A");
    const normal = colourDistance(red, green);
    const simulated = colourDistance(
      simulateDeficiency(red, "deuteranopia"),
      simulateDeficiency(green, "deuteranopia"),
    );
    expect(simulated).toBeLessThan(normal / 2);
  });
});
