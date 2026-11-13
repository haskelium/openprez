import { describe, expect, it } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { pdfFileName, selectExportFrames } from "../../../core/player/exportFrames";

const Component = () => null;

describe("export frame selection", () => {
  it("selects slide key frames in deck order", () => {
    const deck = defineDeck({
      title: "Frames",
      slides: [
        defineSlide({ id: "first", steps: 3, keyFrames: [3, 1], Component }),
        defineSlide({ id: "second", steps: 2, keyFrames: [1, 2], Component }),
      ],
    });

    expect(selectExportFrames(deck).map(({ slide, step }) => [slide.id, step])).toEqual([
      ["first", 1],
      ["first", 3],
      ["second", 1],
      ["second", 2],
    ]);
  });
});

describe("PDF filename", () => {
  it("normalizes accents and punctuation to a lowercase basename", () => {
    expect(pdfFileName("Équipe: a deck! 2026")).toBe("equipe-a-deck-2026");
  });

  it("preserves the existing empty basename behavior for titles without ASCII letters or digits", () => {
    expect(pdfFileName("✨")).toBe("");
  });
});
