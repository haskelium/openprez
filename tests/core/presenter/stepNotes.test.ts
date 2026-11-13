import { describe, expect, it } from "vitest";
import { parseStepNotes } from "../../../core/presenter/stepNotes";

describe("parseStepNotes", () => {
  it("keeps unmarked notes as one unassociated passage", () => {
    expect(parseStepNotes("First line.\nSecond line.", 3)).toEqual({
      segments: [{ step: null, text: "First line.\nSecond line.", startOffset: 0 }],
      invalidMarkers: [],
    });
  });

  it("associates phrases between markers with their steps and preserves whitespace", () => {
    expect(parseStepNotes("Opening. [[step:1]]Reveal the chart. [[step:2]]Explain it.", 3)).toEqual(
      {
        segments: [
          { step: null, text: "Opening. ", startOffset: 0 },
          { step: 1, text: "Reveal the chart. ", startOffset: 19 },
          { step: 2, text: "Explain it.", startOffset: 47 },
        ],
        invalidMarkers: [],
      },
    );
  });

  it("keeps separate passages associated with the same step", () => {
    expect(parseStepNotes("[[step:2]]First phrase. [[step:2]]Second phrase.", 3)).toEqual({
      segments: [
        { step: 2, text: "First phrase. ", startOffset: 10 },
        { step: 2, text: "Second phrase.", startOffset: 34 },
      ],
      invalidMarkers: [],
    });
  });

  it.each([
    ["[[step:0]]", 3],
    ["[[step:4]]", 3],
    ["[[step:nope]]", 3],
    ["[[step:2", 3],
  ])("keeps malformed or out-of-range marker %s visible and unassociated", (marker, steps) => {
    const notes = `Before ${marker} after.`;
    const parsed = parseStepNotes(notes, steps);

    expect(parsed.segments.every((segment) => segment.step === null)).toBe(true);
    expect(parsed.segments.map((segment) => segment.text).join("")).toBe(notes);
    expect(parsed.invalidMarkers).toEqual([marker]);
  });

  it("recovers after an invalid marker followed by a valid marker", () => {
    expect(parseStepNotes("[[step:9]]Unassigned. [[step:2]]Current.", 3)).toEqual({
      segments: [
        { step: null, text: "[[step:9]]", startOffset: 0 },
        { step: null, text: "Unassigned. ", startOffset: 10 },
        { step: 2, text: "Current.", startOffset: 32 },
      ],
      invalidMarkers: ["[[step:9]]"],
    });
  });
});
