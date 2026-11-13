import { describe, expect, it } from "vitest";
import type { PresentationTemplate } from "../../../core/template/contract";
import { templateStyleVariables, toneStyleVariables } from "../../../core/template/style";

const footer = () => null;
const baseTemplate = {
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
};

function variables(template: PresentationTemplate): Record<string, string> {
  return templateStyleVariables(template) as Record<string, string>;
}

describe("tone variable resolution", () => {
  it("falls back to base for unknown and inherited property names", () => {
    const inheritedPair = { surface: "#123456", onSurface: "#abcdef" };
    const tones = Object.assign(
      Object.create({
        toString: inheritedPair,
        constructor: inheritedPair,
      }) as PresentationTemplate["tones"],
      baseTemplate.tones,
    );
    const template = { ...baseTemplate, tones } satisfies PresentationTemplate;
    const base = {
      "--surface": baseTemplate.tones.base.surface,
      "--on-surface": baseTemplate.tones.base.onSurface,
    };

    expect(toneVariables(template, "misspelled")).toEqual(base);
    expect(toneVariables(template, "toString")).toEqual(base);
    expect(toneVariables(template, "constructor")).toEqual(base);
    expect(toneVariables(template, "__proto__")).toEqual(base);
  });

  it("resolves explicitly declared custom names even when they are inherited keys", () => {
    const custom = { surface: "#123456", onSurface: "#abcdef" };
    const tones = Object.assign(Object.create(null), baseTemplate.tones);
    Object.defineProperty(tones, "toString", { value: custom, enumerable: true });
    Object.defineProperty(tones, "constructor", { value: custom, enumerable: true });
    Object.defineProperty(tones, "__proto__", { value: custom, enumerable: true });
    const template = { ...baseTemplate, tones } satisfies PresentationTemplate;
    const expected = { "--surface": custom.surface, "--on-surface": custom.onSurface };

    expect(toneVariables(template, "toString")).toEqual(expected);
    expect(toneVariables(template, "constructor")).toEqual(expected);
    expect(toneVariables(template, "__proto__")).toEqual(expected);
  });
});

function toneVariables(template: PresentationTemplate, tone: string): Record<string, string> {
  const result = toneStyleVariables(template, tone) as Record<string, string>;
  return { "--surface": result["--surface"], "--on-surface": result["--on-surface"] };
}

describe("template font variables", () => {
  it("uses all explicit template roles and mirrors body to the legacy CSS variable", () => {
    const template = {
      ...baseTemplate,
      fontSans: '"Body face", sans-serif',
      fonts: {
        body: '"Body face", sans-serif',
        display: '"Display face", serif',
        mono: '"Mono face", monospace',
      },
    } satisfies PresentationTemplate;

    expect(variables(template)).toMatchObject({
      "--template-font-sans": '"Body face", sans-serif',
      "--template-font-body": '"Body face", sans-serif',
      "--template-font-display": '"Display face", serif',
      "--template-font-mono": '"Mono face", monospace',
    });
  });

  it("maps a legacy fontSans to body without reusing it for display or mono", () => {
    const template = {
      ...baseTemplate,
      fontSans: '"Legacy body", sans-serif',
    } satisfies PresentationTemplate;
    const result = variables(template);

    expect(result["--template-font-sans"]).toBe('"Legacy body", sans-serif');
    expect(result["--template-font-body"]).toBe('"Legacy body", sans-serif');
    expect(result["--template-font-display"]).toContain("serif");
    expect(result["--template-font-mono"]).toContain("monospace");
    expect(result["--template-font-display"]).not.toBe(template.fontSans);
    expect(result["--template-font-mono"]).not.toBe(template.fontSans);
  });
});
