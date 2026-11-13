import { describe, expect, it } from "vitest";
import { defineDeck, defineSlide, type Slide } from "../../../core/player/deck";

const Component = () => null;

function declared(definition: Parameters<typeof defineSlide>[0]): Slide {
  return defineSlide(definition);
}

function deckSlides(definition: Parameters<typeof defineDeck>[0]): Array<Slide> {
  return defineDeck(definition).slides;
}

describe("deck metadata validation", () => {
  it("rejects empty and whitespace-only titles but does not impose a length cap", () => {
    for (const title of ["", " \n\t"]) {
      expect(() => defineDeck({ title, slides: [declared({ id: "only", Component })] })).toThrow(
        /Deck title must contain visible text/,
      );
    }

    const longTitle = "A".repeat(1024);
    expect(
      defineDeck({ title: longTitle, slides: [declared({ id: "only", Component })] }).title,
    ).toBe(longTitle);
  });

  it("preserves an explicitly empty copyright notice and rejects whitespace-only text", () => {
    const empty = defineDeck({
      title: "Deck",
      copyrightNotice: "",
      slides: [declared({ id: "only", Component })],
    });
    expect(empty.copyrightNotice).toBe("");

    expect(() =>
      defineDeck({
        title: "Deck",
        copyrightNotice: " \t",
        slides: [declared({ id: "only", Component })],
      }),
    ).toThrow(/Copyright notice must contain visible text/);
  });

  it("validates copyright length and placeholder expansion before player rendering", () => {
    expect(() =>
      defineDeck({
        title: "Deck",
        copyrightNotice: "x".repeat(257),
        slides: [declared({ id: "only", Component })],
      }),
    ).toThrow(/Copyright notice must not exceed 256 characters/);

    const date = new Date(2026, 9, 14);
    const notice = "© {longDate} · {date}";
    const deck = defineDeck({
      title: "Deck",
      date,
      copyrightNotice: notice,
      slides: [declared({ id: "only", Component })],
    });
    expect(deck.copyrightNotice).toBe(notice);
  });

  it("validates an explicit presentation date at definition", () => {
    expect(() =>
      defineDeck({
        title: "Deck",
        date: "2026-02-30",
        slides: [declared({ id: "only", Component })],
      }),
    ).toThrow(/not a real calendar date/);
  });
});

describe("auto-advance declaration", () => {
  it("applies a single duration to every step", () => {
    const slide = declared({ id: "title", steps: 3, autoAdvance: 5, Component });
    expect(slide.autoAdvance).toEqual([5, 5, 5]);
  });

  it("expands a per-step array to one entry per step, undefined where not declared", () => {
    const slide = declared({ id: "build", steps: 3, autoAdvance: [3, 7], Component });
    expect(slide.autoAdvance).toEqual([3, 7, undefined]);
  });

  it("leaves the field off slides that declare nothing", () => {
    const slide = declared({ id: "plain", Component });
    expect(slide.autoAdvance).toBeUndefined();
  });
});

describe("auto-advance declaration validation", () => {
  it("rejects durations that are not positive finite numbers", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_VALUE]) {
      expect(() => declared({ id: "bad", autoAdvance: value, Component })).toThrow(
        /Slide "bad": autoAdvance durations must be positive finite seconds/,
      );
      expect(() => declared({ id: "bad", steps: 2, autoAdvance: [1, value], Component })).toThrow(
        /Slide "bad": autoAdvance durations must be positive finite seconds/,
      );
    }
  });

  it("rejects an empty per-step array", () => {
    expect(() => declared({ id: "empty", steps: 2, autoAdvance: [], Component })).toThrow(
      /Slide "empty": autoAdvance must declare at least one duration/,
    );
  });

  it("rejects an array longer than the slide's step count", () => {
    expect(() => declared({ id: "long", steps: 2, autoAdvance: [1, 2, 3], Component })).toThrow(
      /Slide "long": autoAdvance declares 3 durations but the slide has 2 steps/,
    );
  });

  it("rejects an invalid deck default", () => {
    for (const value of [0, -2, Number.NaN, Number.MAX_VALUE]) {
      expect(() =>
        deckSlides({
          title: "Deck",
          defaultAutoAdvance: value,
          slides: [declared({ id: "only", Component })],
        }),
      ).toThrow(/defaultAutoAdvance must be positive finite seconds/);
    }
  });
});

describe("auto-advance resolution against the deck default", () => {
  it("fills undeclared steps from the deck default", () => {
    const [partial, full] = deckSlides({
      title: "Deck",
      defaultAutoAdvance: 10,
      slides: [
        declared({ id: "partial", steps: 3, autoAdvance: [3, 7], Component }),
        declared({ id: "none", steps: 2, Component }),
      ],
    });
    expect(partial.autoAdvance).toEqual([3, 7, 10]);
    expect(full.autoAdvance).toEqual([10, 10]);
  });

  it("leaves undeclared steps without auto-advance when the deck has no default", () => {
    const [partial] = deckSlides({
      title: "Deck",
      slides: [declared({ id: "partial", steps: 2, autoAdvance: [3], Component })],
    });
    expect(partial.autoAdvance).toEqual([3, undefined]);
  });

  it("keeps fully declared slides unchanged", () => {
    const slide = declared({ id: "full", steps: 2, autoAdvance: [4, 8], Component });
    const [resolved] = deckSlides({
      title: "Deck",
      defaultAutoAdvance: 10,
      slides: [slide],
    });
    expect(resolved.autoAdvance).toEqual([4, 8]);
  });
});
