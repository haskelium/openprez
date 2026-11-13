import { describe, expect, it } from "vitest";
import {
  formatCopyrightNotice,
  validateCopyrightNotice,
} from "../../../core/player/copyrightNotice";

describe("formatCopyrightNotice", () => {
  const date = new Date(2026, 9, 14);

  it("expands year, ISO date, and long date placeholders", () => {
    expect(formatCopyrightNotice("© {year}; issued {date} ({longDate})", date)).toBe(
      "© 2026; issued 2026-10-14 (14 October 2026)",
    );
  });

  it("expands repeated placeholders and preserves unknown placeholders", () => {
    expect(formatCopyrightNotice("{year} / {year} / {owner}", date)).toBe("2026 / 2026 / {owner}");
  });

  it("preserves an explicitly empty notice as an opt-out and rejects whitespace-only text", () => {
    expect(formatCopyrightNotice("", date)).toBe("");
    expect(() => validateCopyrightNotice("", date)).not.toThrow();
    expect(() => validateCopyrightNotice(" \t", date)).toThrow(
      /Copyright notice must contain visible text or be an empty string/,
    );
  });

  it("preserves custom text with no placeholders and leaves an omitted notice unset", () => {
    expect(formatCopyrightNotice("Example Corp. All rights reserved.", date)).toBe(
      "Example Corp. All rights reserved.",
    );
    expect(formatCopyrightNotice(undefined, date)).toBeUndefined();
  });

  it("limits both source and expanded notices", () => {
    expect(() => validateCopyrightNotice("x".repeat(257), date)).toThrow(
      "Copyright notice must not exceed 256 characters",
    );
    // The longest notice the current placeholders allow still fits the expanded limit.
    expect(() => validateCopyrightNotice("{date}".repeat(42), date)).not.toThrow();
    expect(() => validateCopyrightNotice(null as unknown as string, date)).toThrow(
      "Copyright notice must be text",
    );
    expect(() => validateCopyrightNotice("x", new Date(Number.NaN))).toThrow(
      "Copyright notice date is invalid",
    );
  });

  it("does not interpret markup-like text or unknown token names", () => {
    expect(formatCopyrightNotice("<script>{year}</script> {constructor}", date)).toBe(
      "<script>2026</script> {constructor}",
    );
  });
});
