import type { ComponentType } from "react";
import { validateCopyrightNotice } from "./copyrightNotice";

/** Name of a surface tone declared by the active template; "base" and "inverse" always exist. */
export type Tone = string;

export interface SlideProps {
  /** Current build step, starting at 1. */
  step: number;
  /** Total build steps of this slide. */
  steps: number;
}

export interface SlideDefinition {
  /** Stable identifier, unique within the deck. */
  id: string;
  /** Number of build steps; defaults to 1. */
  steps?: number;
  /** Build steps to export as key frames; defaults to the final step. */
  keyFrames?: number[];
  /** Surface tone from the active template's declared names; defaults to "base". */
  tone?: Tone;
  /** Speaker notes for the presenter; shown only in the presenter window, never on the stage or in PDF export. */
  notes?: string;
  /**
   * Seconds each build step holds before the player advances automatically; a single number
   * applies to every step, an array gives one duration per step in step order. Steps beyond
   * the array use the deck's defaultAutoAdvance, and steps with neither never auto-advance.
   */
  autoAdvance?: number | number[];
  Component: ComponentType<SlideProps>;
}

export interface Slide {
  id: string;
  steps: number;
  keyFrames: number[];
  tone: Tone;
  notes?: string;
  /** Resolved per-step auto-advance durations in seconds; undefined entries never auto-advance. */
  autoAdvance?: Array<number | undefined>;
  Component: ComponentType<SlideProps>;
}

export interface DeckDefinition {
  title: string;
  /** Presentation date override, as a Date or "YYYY-MM-DD"; defaults to the day the deck is opened. */
  date?: Date | string;
  /** Footer copyright notice; supports {year}, {date}, and {longDate} placeholders. */
  copyrightNotice?: string;
  /** Deck-wide auto-advance duration in seconds for steps a slide does not give their own. */
  defaultAutoAdvance?: number;
  slides: [Slide, ...Slide[]];
}

export interface Deck {
  title: string;
  date?: Date;
  copyrightNotice?: string;
  slides: [Slide, ...Slide[]];
}

export function defineSlide(definition: SlideDefinition): Slide {
  if (definition.steps !== undefined && !Number.isFinite(definition.steps)) {
    throw new Error(
      `Slide "${definition.id}": steps must be a finite number, got ${definition.steps}`,
    );
  }
  const steps = Math.max(1, Math.floor(definition.steps ?? 1));
  const keyFrames = definition.keyFrames ?? [steps];
  if (!Array.isArray(keyFrames) || keyFrames.length === 0) {
    throw new Error(`Slide "${definition.id}": keyFrames must contain at least one step`);
  }
  const uniqueKeyFrames = new Set<number>();
  for (const keyFrame of keyFrames) {
    if (!Number.isInteger(keyFrame) || keyFrame < 1 || keyFrame > steps) {
      throw new Error(
        `Slide "${definition.id}": key frame ${keyFrame} must be an integer between 1 and ${steps}`,
      );
    }
    if (uniqueKeyFrames.has(keyFrame)) {
      throw new Error(`Slide "${definition.id}": duplicate key frame ${keyFrame}`);
    }
    uniqueKeyFrames.add(keyFrame);
  }
  return {
    ...definition,
    steps,
    keyFrames: [...keyFrames].sort((left, right) => left - right),
    tone: definition.tone ?? "base",
    autoAdvance: resolveAutoAdvance(definition.id, steps, definition.autoAdvance),
  };
}

/** Expands a slide's auto-advance declaration to one entry per step, undefined where not declared. */
function resolveAutoAdvance(
  slideId: string,
  steps: number,
  declaration: number | number[] | undefined,
): Array<number | undefined> | undefined {
  if (declaration === undefined) return undefined;
  const values =
    typeof declaration === "number" ? Array<number>(steps).fill(declaration) : declaration;
  if (values.length === 0) {
    throw new Error(`Slide "${slideId}": autoAdvance must declare at least one duration`);
  }
  if (values.length > steps) {
    throw new Error(
      `Slide "${slideId}": autoAdvance declares ${values.length} durations but the slide has ${steps} steps`,
    );
  }
  for (const value of values) {
    if (!isValidAutoAdvanceDuration(value)) {
      throw new Error(
        `Slide "${slideId}": autoAdvance durations must be positive finite seconds representable in milliseconds, got ${value}`,
      );
    }
  }
  return [...values, ...Array<number | undefined>(steps - values.length).fill(undefined)];
}

function isValidAutoAdvanceDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    Number.isFinite(value * 1000)
  );
}

function parseDate(value: Date | string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Deck date is an invalid Date");
    return value;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Deck date must be "YYYY-MM-DD", got "${value}"`);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  // The Date constructor rolls impossible dates over (31 February becomes 3 March), so compare back.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Deck date "${value}" is not a real calendar date`);
  }
  return date;
}

export function defineDeck(definition: DeckDefinition): Deck {
  if (typeof definition.title !== "string" || definition.title.trim().length === 0) {
    throw new TypeError("Deck title must contain visible text");
  }
  const date = definition.date === undefined ? undefined : parseDate(definition.date);
  validateCopyrightNotice(definition.copyrightNotice, date);

  const ids = new Set<string>();
  for (const slide of definition.slides) {
    if (ids.has(slide.id)) throw new Error(`Duplicate slide id "${slide.id}"`);
    ids.add(slide.id);
  }
  const defaultAutoAdvance = definition.defaultAutoAdvance;
  if (defaultAutoAdvance !== undefined && !isValidAutoAdvanceDuration(defaultAutoAdvance)) {
    throw new Error(
      `defaultAutoAdvance must be positive finite seconds representable in milliseconds, got ${defaultAutoAdvance}`,
    );
  }
  const [first, ...rest] = definition.slides;
  const slides: [Slide, ...Slide[]] = [
    applyDefaultAutoAdvance(first, defaultAutoAdvance),
    ...rest.map((slide) => applyDefaultAutoAdvance(slide, defaultAutoAdvance)),
  ];
  return {
    title: definition.title,
    date,
    copyrightNotice: definition.copyrightNotice,
    slides,
  };
}

/** Fills steps without their own duration from the deck's default, resolving once for the player. */
function applyDefaultAutoAdvance(slide: Slide, defaultAutoAdvance: number | undefined): Slide {
  const declared = slide.autoAdvance;
  if (defaultAutoAdvance === undefined) return slide;
  if (declared === undefined) {
    return { ...slide, autoAdvance: Array<number>(slide.steps).fill(defaultAutoAdvance) };
  }
  if (declared.every((value) => value !== undefined)) return slide;
  return { ...slide, autoAdvance: declared.map((value) => value ?? defaultAutoAdvance) };
}
