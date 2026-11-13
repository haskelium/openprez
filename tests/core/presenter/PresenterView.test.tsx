import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { availableActions, nextStepPosition, type Position } from "../../../core/player/navigation";
import { PresenterLayout } from "../../../core/presenter/PresenterLayout";
import { scrollTargetForStep } from "../../../core/presenter/stepNotes";
import { formatElapsed } from "../../../core/presenter/timeFormat";
import type { TimerCommand } from "../../../core/time";

const Component = () => null;
const deck = defineDeck({
  title: "Rehearsal deck",
  slides: [
    defineSlide({ id: "intro", steps: 1, Component, notes: "Welcome everyone.\nSet the scene." }),
    defineSlide({
      id: "builds",
      steps: 3,
      Component,
      notes: "Setup. [[step:1]]First reveal. [[step:2]]Current passage. [[step:3]]Later passage.",
    }),
    defineSlide({ id: "close", steps: 2, Component }),
  ],
});
const stepCounts = deck.slides.map((slide) => slide.steps);

function render(position: Position, connected = true, targetDeck = deck, paused = false) {
  const targetStepCounts = targetDeck.slides.map((slide) => slide.steps);
  return renderToStaticMarkup(
    createElement(PresenterLayout, {
      deck: targetDeck,
      position,
      elapsed: 125_000,
      paused,
      now: new Date(2026, 9, 16, 9, 5),
      connected,
      connectionMessage: connected ? null : "The presentation window is disconnected.",
      can: availableActions(targetStepCounts, position),
      dispatch: () => undefined,
      onTimerCommand: (_command: TimerCommand) => undefined,
    }),
  );
}

describe("presenter layout", () => {
  it("shows the current slide's notes in full with line breaks, plus position and timer", () => {
    const markup = render({ slide: 1, step: 1 });
    const text = markup.replace(/<[^>]*>/g, "");
    expect(markup).toContain("Welcome everyone.\nSet the scene.");
    expect(markup).toContain("whitespace-pre-wrap");
    expect(markup).toContain('data-presenter-view="true"');
    expect(markup).toContain("bg-presenter-background");
    expect(markup).toContain("presenter-view");
    expect(markup).not.toContain('data-tone="inverse"');
    expect(markup).toContain("font-sans");
    expect(text).toContain("Slide 1 / 3 · Step 1 / 1");
    expect(text).toContain("Elapsed time 02:05");
    expect(markup).toContain('aria-label="Reset timer"');
    expect(markup).toContain('aria-label="Pause timer"');
    expect(markup).not.toContain("data-presenter-timer-paused");
  });

  it("renders the timer as paused with a resume control", () => {
    const markup = render({ slide: 1, step: 1 }, true, deck, true);
    const timerMatch = markup.match(/<span[^>]*data-presenter-timer[^>]*>/)?.[0] ?? "";

    expect(markup).toContain('data-presenter-timer-paused="true"');
    expect(timerMatch).toContain("text-presenter-muted");
    expect(markup).toContain('aria-label="Resume timer"');
    expect(markup).toContain('aria-label="Reset timer"');
    expect(markup).not.toContain('aria-label="Pause timer"');
  });

  it("says when a slide has no notes", () => {
    expect(render({ slide: 3, step: 1 })).toContain("No speaker notes for this slide.");
  });

  it("warns about invalid markers and keeps their text visible but unassociated", () => {
    const warningDeck = defineDeck({
      title: "Invalid markers",
      slides: [
        defineSlide({
          id: "invalid",
          steps: 2,
          Component,
          notes: "Before [[step:3]]Out of range. [[step:nope]]Malformed.",
        }),
      ],
    });
    const markup = render({ slide: 1, step: 1 }, true, warningDeck);
    const text = markup.replace(/<[^>]*>/g, "");

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("data-presenter-note-warning");
    expect(text).toContain("[[step:3]], [[step:nope]]");
    expect(text).toContain("Out of range.");
    expect(text).toContain("Malformed.");
    expect(markup).toContain('data-step-state="unassociated"');
  });

  it("shows every tagged passage and marks the current and next steps", () => {
    const markup = render({ slide: 2, step: 2 });
    const text = markup.replace(/<[^>]*>/g, "");

    expect(text).toContain("Setup.");
    expect(text).toContain("First reveal.");
    expect(text).toContain("Current passage.");
    expect(text).toContain("Later passage.");
    expect(text).toContain("2NOW");
    expect(text).toContain("3NEXT");
    expect(markup).toContain('data-step-state="current"');
    expect(markup).toContain('data-step-state="next"');
    expect(markup).toContain('data-step-state="other"');
    const currentText = markup.match(/<span class="([^"]*bg-presenter-now-soft[^"]*)">/)?.[1] ?? "";
    const nextText = markup.match(/<span class="([^"]*bg-presenter-next-soft[^"]*)">/)?.[1] ?? "";
    const currentSegment = markup.match(/<span[^>]*data-step-state="current"[^>]*>/)?.[0] ?? "";
    expect(currentText).toContain("bg-presenter-now-soft");
    expect(currentText).toContain("box-decoration-clone");
    expect(currentText).toContain("font-semibold");
    expect(currentText).toContain("text-presenter-text");
    expect(nextText).toContain("bg-presenter-next-soft");
    expect(nextText).toContain("text-presenter-text");
    // The passage highlight covers only the text: the segment wrapper carries no highlight,
    // so the step-number badge keeps its own pill look on the pane's surface.
    expect(currentSegment).not.toContain("class=");
    expect(currentText).not.toMatch(/border|ring/);
    expect(nextText).not.toMatch(/border|ring/);
    expect(markup).toContain("bg-presenter-now text-presenter-ink");
    expect(markup).toContain("bg-presenter-next text-presenter-ink");
    expect(markup).toContain("bg-presenter-step text-presenter-ink");
    expect(markup).not.toContain("[[step:");
  });

  it("indicates the end of the deck instead of a next preview", () => {
    const markup = render({ slide: 3, step: 2 });
    expect(markup).toContain("data-presenter-end");
    expect(markup).toContain("End of deck");
    expect(render({ slide: 2, step: 2 })).not.toContain("data-presenter-end");
  });

  it("labels current and next previews and offers the six navigation buttons", () => {
    const markup = render({ slide: 2, step: 2 });
    expect(markup).toContain('aria-label="Current: slide 2, step 2"');
    expect(markup).toContain('aria-label="Next: slide 2, step 3"');
    for (const label of ["Previous slide", "Previous step", "Next step", "Next slide"]) {
      expect(markup).toContain(`aria-label="${label}"`);
    }
    expect(markup).not.toContain('aria-label="Speaker notes" aria-pressed');
  });

  it("warns when the presentation window is no longer connected", () => {
    const markup = render({ slide: 1, step: 1 }, false);
    expect(markup).toContain("data-presenter-connection");
    expect(markup).toContain("The presentation window is disconnected.");
    expect(markup).toContain('aria-label="Pause timer" title="Pause timer" disabled=""');
    expect(markup).toContain('aria-label="Reset timer" title="Reset timer" disabled=""');
  });

  it("shows the synced auto-advance countdown with its pause control", () => {
    const markup = renderToStaticMarkup(
      createElement(PresenterLayout, {
        deck,
        position: { slide: 2, step: 2 },
        elapsed: 125_000,
        paused: false,
        now: new Date(2026, 9, 16, 9, 5),
        connected: true,
        connectionMessage: null,
        can: availableActions(stepCounts, { slide: 2, step: 2 }),
        dispatch: () => undefined,
        onTimerCommand: (_command: TimerCommand) => undefined,
        autoAdvance: {
          snapshot: { startedAt: 0, pausedElapsed: 4_000 },
          totalMs: 10_000,
          onTogglePause: () => undefined,
        },
      }),
    );
    expect(markup).toContain("data-auto-advance");
    expect(markup).toContain('data-auto-advance-paused="true"');
    expect(markup).toContain('aria-label="Resume auto-advance"');
    expect(markup).toContain("6 seconds remaining");
  });

  it("shows no countdown when the step does not auto-advance", () => {
    expect(render({ slide: 1, step: 1 })).not.toContain("data-auto-advance");
  });
});

describe("presenter helpers", () => {
  it("finds the next step across slides and stops at the end", () => {
    expect(nextStepPosition(stepCounts, { slide: 2, step: 3 })).toEqual({ slide: 3, step: 1 });
    expect(nextStepPosition(stepCounts, { slide: 3, step: 2 })).toBeNull();
  });

  it("keeps a fully visible step in place and scrolls a partial step fully into view", () => {
    expect(scrollTargetForStep(120, 600, 1000, 1300, 1080, 1220)).toBe(120);
    expect(scrollTargetForStep(120, 600, 1000, 1300, 1240, 1370)).toBe(190);
    expect(scrollTargetForStep(120, 600, 1000, 1300, 900, 1050)).toBe(20);
  });

  it("aligns the beginning of an oversized step and clamps to the pane's scroll range", () => {
    expect(scrollTargetForStep(120, 600, 1000, 1300, 900, 1450)).toBe(20);
    expect(scrollTargetForStep(10, 600, 1000, 1300, 900, 1050)).toBe(0);
    expect(scrollTargetForStep(590, 600, 1000, 1300, 1250, 1400)).toBe(600);
  });

  it.each([
    [0, "00:00"],
    [59_999, "00:59"],
    [125_000, "02:05"],
    [3_725_000, "1:02:05"],
    [-5_000, "00:00"],
  ])("formats %d ms as %s", (milliseconds, expected) => {
    expect(formatElapsed(milliseconds)).toBe(expected);
  });
});
