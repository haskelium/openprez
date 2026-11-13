import { describe, expect, it } from "vitest";
import { fontFamilies, parseFontFile } from "./font-file.mjs";

function definition() {
  return {
    name: "autumn",
    fonts: {
      body: '"Trebuchet MS", Arial, sans-serif',
      display: "Georgia, serif",
      mono: "ui-monospace, monospace",
    },
  };
}

describe("font proposal file", () => {
  it("preserves all three proposed role stacks", () => {
    const input = definition();
    expect(parseFontFile(JSON.stringify(input))).toEqual({ ok: true, definition: input });
  });

  it("reports all missing roles together", () => {
    expect(parseFontFile('{"name":"probe","fonts":{}}')).toEqual({
      ok: false,
      errors: [
        "fonts.body must be a non-empty CSS font-family stack",
        "fonts.display must be a non-empty CSS font-family stack",
        "fonts.mono must be a non-empty CSS font-family stack",
      ],
    });
  });

  it.each([null, [], { name: "probe" }, { name: "probe", fonts: [] }])(
    "rejects malformed structures: %j",
    (value) => expect(parseFontFile(JSON.stringify(value)).ok).toBe(false),
  );

  it.each(["Bad Name", "-probe", "probe-", "a--b", ""])("rejects invalid names: %s", (name) => {
    expect(parseFontFile(JSON.stringify({ ...definition(), name })).ok).toBe(false);
  });

  it.each([
    undefined,
    null,
    32,
    "",
    "   ",
    "Arial,, serif",
    '"Arial',
    "Arial; color:red",
    "Arial !important",
    "Arial,",
    '"Arial" trailing',
  ])("rejects malformed stacks: %j", (body) => {
    const input = definition();
    input.fonts.body = body;
    expect(parseFontFile(JSON.stringify(input)).ok).toBe(false);
  });

  it("reports invalid JSON as an input error", () => {
    expect(parseFontFile("{").ok).toBe(false);
  });
});

describe("family lists", () => {
  it("preserves quoted commas in font family names", () => {
    expect(fontFamilies('"Example, Display", Georgia, serif')).toEqual([
      '"Example, Display"',
      "Georgia",
      "serif",
    ]);
  });

  it("preserves escaped quotes in family names", () => {
    expect(fontFamilies(String.raw`"Example \"Face\"", serif`)).toEqual([
      String.raw`"Example \"Face\""`,
      "serif",
    ]);
  });
});
