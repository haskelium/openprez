import { describe, expect, it } from "vitest";
import { escapeHtml } from "../../../scripts/lib/html.ts";

describe("escapeHtml", () => {
  it("escapes HTML text and attribute delimiters", () => {
    expect(escapeHtml('<span title="x">&')).toBe("&lt;span title=&quot;x&quot;&gt;&amp;");
  });
});
