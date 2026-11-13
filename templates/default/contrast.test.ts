import { describe, it } from "vitest";
import { assertTemplateToneContrast } from "../../tests/support/contrast";
import template from "./index";

describe("tone contrast", () => {
  it("keeps every declared default-template tone at 4.5:1 for body text", () => {
    assertTemplateToneContrast(template.tones);
  });
});
