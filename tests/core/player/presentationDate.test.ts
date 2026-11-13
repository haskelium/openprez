import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolvePdfExportDate,
  resolvePresentationDate,
} from "../../../core/player/presentationDate";

describe("resolvePresentationDate", () => {
  afterEach(() => vi.useRealTimers());

  it("uses an explicit deck date in every build", () => {
    const deckDate = new Date(2024, 3, 2);

    expect(resolvePresentationDate(deckDate, "2026-10-20")).toEqual(deckDate);
    expect(resolvePresentationDate(deckDate, "2026-10-20")).not.toBe(deckDate);
  });

  it("uses the standalone build date when no deck date is set", () => {
    expect(resolvePresentationDate(undefined, "2026-10-20")).toEqual(new Date(2026, 9, 20));
  });

  it("uses the current date outside a standalone build", () => {
    const now = new Date(2026, 9, 20, 12);
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(resolvePresentationDate(undefined, undefined)).toEqual(now);
  });

  it("freezes PDF exports to the deck date, standalone build date, or export time", () => {
    const deckDate = new Date(2024, 3, 2);
    const presentationDate = new Date(2026, 9, 14);
    const exportTime = new Date(2027, 0, 5, 12);

    expect(resolvePdfExportDate(deckDate, presentationDate, undefined, exportTime)).toEqual(
      deckDate,
    );
    expect(resolvePdfExportDate(undefined, presentationDate, "2026-10-14", exportTime)).toEqual(
      presentationDate,
    );
    expect(resolvePdfExportDate(undefined, presentationDate, undefined, exportTime)).toEqual(
      exportTime,
    );
    expect(resolvePdfExportDate(undefined, presentationDate, undefined, exportTime)).not.toBe(
      exportTime,
    );
  });
});
