import { describe, expect, it } from "vitest";
import { STAGE_HEIGHT } from "../../../core/player/Stage";
import {
  DEFAULT_FOOTER_HEIGHT,
  MAX_FOOTER_HEIGHT,
  resolveFooterHeight,
} from "../../../core/template/footer-height";
import { testTemplate } from "../../support/testTemplate";

describe("resolveFooterHeight", () => {
  it("returns the default height when the template declares none", () => {
    expect(resolveFooterHeight(testTemplate())).toBe(DEFAULT_FOOTER_HEIGHT);
    expect(DEFAULT_FOOTER_HEIGHT).toBe(64);
  });

  it("returns the declared height", () => {
    expect(resolveFooterHeight(testTemplate({ footerHeight: 120 }))).toBe(120);
  });

  it("accepts the maximum allowed declaration", () => {
    expect(MAX_FOOTER_HEIGHT).toBe(Math.floor(STAGE_HEIGHT / 2));
    expect(resolveFooterHeight(testTemplate({ footerHeight: MAX_FOOTER_HEIGHT }))).toBe(
      MAX_FOOTER_HEIGHT,
    );
  });

  it.each([
    ["zero", 0],
    ["negative", -64],
    ["non-integer", 64.5],
    ["non-finite", Number.POSITIVE_INFINITY],
    ["above the stage", 1080],
    ["above the cap", MAX_FOOTER_HEIGHT + 1],
  ])("rejects a %s declaration", (_label, footerHeight) => {
    expect(() => resolveFooterHeight(testTemplate({ footerHeight }))).toThrow(
      `footerHeight must be a positive integer no greater than ${MAX_FOOTER_HEIGHT} stage pixels`,
    );
  });

  it("names the rejecting template in the error", () => {
    expect(() => resolveFooterHeight(testTemplate({ name: "cramped", footerHeight: 0 }))).toThrow(
      'Template "cramped":',
    );
  });
});
