import { describe, expect, it } from "vitest";
import template from "./index";

const GENERIC_FAMILIES = ["sans-serif", "serif", "monospace", "system-ui", "ui-monospace"];

describe("font roles", () => {
  it("keeps fontSans equal to the body role", () => {
    expect(template.fontSans).toBe(template.fonts?.body);
  });

  it.each(["body", "display", "mono"] as const)("%s stack ends in a generic family", (role) => {
    const families = template.fonts?.[role].split(",").map((family) => family.trim()) ?? [];
    expect(GENERIC_FAMILIES).toContain(families.at(-1));
  });
});
