import type { FooterBrandProps, NavigationControls } from "@core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExportFooter, Footer } from "./Footer";

const controls: NavigationControls = {
  slide: 1,
  total: 3,
  can: {
    prevSlide: false,
    prevKeyFrame: false,
    prevStep: false,
    nextStep: true,
    nextKeyFrame: true,
    nextSlide: true,
  },
  dispatch: () => undefined,
  onExportPdf: () => undefined,
  exporting: false,
  exportError: null,
  notesOpen: false,
  onToggleNotes: () => undefined,
  notesError: null,
};

const Brand = ({ className }: FooterBrandProps) =>
  createElement("img", { className, src: "/brand.svg", alt: "Custom brand" });

describe("presentation footers", () => {
  it("defaults to the OpenPrez mark in live and PDF footers", () => {
    for (const markup of [
      renderToStaticMarkup(createElement(Footer, { controls, date: new Date(2026, 9, 14) })),
      renderToStaticMarkup(
        createElement(ExportFooter, { date: new Date(2026, 9, 14), page: 4, total: 9 }),
      ),
    ]) {
      expect(markup).toContain('aria-label="OpenPrez"');
    }
  });

  it("uses the configured mark with template sizing in live and PDF footers", () => {
    for (const markup of [
      renderToStaticMarkup(createElement(Footer, { controls, date: new Date(2026, 9, 14), Brand })),
      renderToStaticMarkup(
        createElement(ExportFooter, { date: new Date(2026, 9, 14), page: 4, total: 9, Brand }),
      ),
    ]) {
      expect(markup).toContain('alt="Custom brand"');
      expect(markup).toContain('class="h-6 shrink-0"');
      expect(markup).not.toContain('aria-label="OpenPrez"');
      expect(markup).toContain("Copyright © 2026 Haskelium");
    }
  });

  it("uses the configured copyright notice verbatim in live and PDF footers", () => {
    const copyrightNotice = "Example Corp.";
    for (const markup of [
      renderToStaticMarkup(
        createElement(Footer, { controls, date: new Date(2026, 9, 14), copyrightNotice }),
      ),
      renderToStaticMarkup(
        createElement(ExportFooter, {
          date: new Date(2026, 9, 14),
          page: 4,
          total: 9,
          copyrightNotice,
        }),
      ),
    ]) {
      expect(markup).toContain("Example Corp.");
      expect(markup).not.toContain("Copyright © 2026 Haskelium");
    }
  });

  it("renders copyright text as text, not markup", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, {
        controls,
        date: new Date(2026, 9, 14),
        copyrightNotice: "<script>2026</script>",
      }),
    );
    expect(markup).toContain("&lt;script&gt;2026&lt;/script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("renders all eight named actions in footer order", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, { controls, date: new Date(2026, 9, 14) }),
    );
    const labels = [
      "Previous slide",
      "Previous key frame",
      "Previous step",
      "Next step",
      "Next key frame",
      "Next slide",
      "Speaker notes",
      "Export PDF",
    ];
    const positions = labels.map((label) => markup.indexOf(`aria-label="${label}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(markup).toContain('aria-label="Previous slide" disabled=""');
    expect(markup).toContain('aria-label="Speaker notes" aria-pressed="false"');
    expect(markup).toContain("Copyright © 2026 Haskelium");
  });

  it("marks the speaker notes action pressed while the presenter window is open", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, {
        controls: { ...controls, notesOpen: true },
        date: new Date(2026, 9, 14),
      }),
    );
    expect(markup).toContain('aria-label="Speaker notes" aria-pressed="true"');
  });

  it("shows a blocked pop-up message as an alert", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, {
        controls: { ...controls, notesError: "Allow pop-ups to open speaker notes" },
        date: new Date(2026, 9, 14),
      }),
    );
    const alertIndex = markup.indexOf('<span role="alert"');
    expect(alertIndex).toBeGreaterThan(0);
    expect(markup.slice(0, alertIndex).trimEnd()).toMatch(/<\/div>$/);
    expect(markup).toMatch(
      /role="alert" class="[^"]*bg-on-surface[^"]*whitespace-normal[^"]*text-surface/,
    );
    expect(markup).toContain("Allow pop-ups to open speaker notes");
  });

  it("keeps the PDF footer branded and free of player controls", () => {
    const markup = renderToStaticMarkup(
      createElement(ExportFooter, { date: new Date(2026, 9, 14), page: 4, total: 9 }),
    );
    expect(markup).toContain("data-pdf-footer");
    expect(markup).toContain("Copyright © 2026 Haskelium");
    expect(markup).toContain("4 / 9");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("data-auto-advance");
    expect(markup).not.toContain("Speaker notes");
  });

  it("renders the countdown indicator in the right zone when the step auto-advances", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, {
        controls: {
          ...controls,
          autoAdvance: {
            snapshot: { startedAt: 0, pausedElapsed: 4_000 },
            totalMs: 10_000,
            onTogglePause: () => undefined,
          },
        },
        date: new Date(2026, 9, 14),
      }),
    );
    expect(markup).toContain("data-auto-advance");
    expect(markup).toContain('aria-label="Resume auto-advance"');
    expect(markup).toContain("6 seconds remaining");
    // The indicator sits in the right zone, before the presentation date.
    expect(markup.indexOf("data-auto-advance")).toBeLessThan(markup.indexOf("data-date"));
  });

  it("shows no countdown when the step does not auto-advance", () => {
    const markup = renderToStaticMarkup(
      createElement(Footer, { controls, date: new Date(2026, 9, 14) }),
    );
    expect(markup).not.toContain("data-auto-advance");
  });
});
