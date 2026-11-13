import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAst } from "vite";
import { describe, expect, it } from "vitest";
import { PALETTE_TOKENS, parsePaletteFile } from "./palette-file.mjs";

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

function fileText(overrides) {
  return JSON.stringify({ name: "autumn", palette, tones, ...overrides });
}

describe("palette file", () => {
  it("keeps required palette tokens aligned with the template contract", () => {
    const contractPath = fileURLToPath(
      new URL("../../../../core/template/contract.ts", import.meta.url),
    );
    const source = parseAst(readFileSync(contractPath, "utf8"), { lang: "ts" });
    const palette = source.body.find(
      (statement) =>
        statement.type === "ExportNamedDeclaration" &&
        statement.declaration?.type === "TSInterfaceDeclaration" &&
        statement.declaration.id.name === "TemplatePalette",
    )?.declaration;
    if (!palette) throw new Error("TemplatePalette interface not found in the core contract");
    const contractTokens = palette.body.body
      .filter((member) => member.type === "TSPropertySignature" && member.key.type === "Identifier")
      .map((member) => member.key.name);

    expect(PALETTE_TOKENS).toEqual(contractTokens);
  });

  it("returns the proposed template from a complete file", () => {
    const result = parsePaletteFile(fileText({}));
    expect(result).toEqual({ ok: true, template: { name: "autumn", palette, tones } });
  });

  it("lists every missing palette token and required tone", () => {
    const { accent1: _accent1, accent4: _accent4, ...partialPalette } = palette;
    const result = parsePaletteFile(
      fileText({ palette: partialPalette, tones: { base: tones.base } }),
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "palette.accent1 is missing",
      "palette.accent4 is missing",
      "tones.inverse is missing",
    ]);
  });

  it("rejects a tone without its surface pair", () => {
    const result = parsePaletteFile(
      fileText({ tones: { ...tones, accent: { surface: "#000000" } } }),
    );
    expect(result.errors).toEqual(["tones.accent must have surface and onSurface"]);
  });

  it("rejects a name that is unsafe as a report file name", () => {
    expect(parsePaletteFile(fileText({ name: "../autumn" })).ok).toBe(false);
    expect(parsePaletteFile(fileText({ name: undefined })).ok).toBe(false);
  });

  it("reports malformed JSON instead of throwing", () => {
    const result = parsePaletteFile("{ name: autumn");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/^invalid JSON: /);
  });

  it("rejects a file that is not an object", () => {
    expect(parsePaletteFile("[]").ok).toBe(false);
  });
});
