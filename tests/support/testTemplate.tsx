import type { PresentationTemplate } from "../../core/template/contract";

/** Minimal valid template for tests; tests override the field under inspection. */
export function testTemplate(overrides?: Partial<PresentationTemplate>): PresentationTemplate {
  const footer = () => null;
  return {
    name: "test",
    fontSans: "sans-serif",
    palette: {
      primary: "#FFFFFF",
      onPrimary: "#000000",
      accent1: "#111111",
      accent2: "#222222",
      accent3: "#333333",
      accent4: "#444444",
      accent5: "#555555",
      neutral: "#666666",
      data1: "#777777",
      data2: "#888888",
      data3: "#999999",
    },
    tones: {
      base: { surface: "#000000", onSurface: "#FFFFFF" },
      inverse: { surface: "#FFFFFF", onSurface: "#000000" },
    },
    Footer: footer,
    ExportFooter: footer,
    ...overrides,
  };
}
