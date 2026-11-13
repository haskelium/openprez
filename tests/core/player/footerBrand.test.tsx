// @vitest-environment jsdom
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import { ExportStage } from "../../../core/player/ExportStage";
import { useExportMode } from "../../../core/player/export-context";
import { Player } from "../../../core/player/Player";
import type {
  ExportFooterRenderProps,
  FooterBrandProps,
  FooterRenderProps,
  PresentationTemplate,
} from "../../../core/template/contract";

function Brand({ className }: FooterBrandProps) {
  const exporting = useExportMode();
  return (
    <span className={className} data-custom-brand data-static={exporting}>
      Custom brand
    </span>
  );
}

function Footer({ Brand: Mark, copyrightNotice }: FooterRenderProps | ExportFooterRenderProps) {
  return (
    <>
      {Mark ? <Mark className="footer-mark" /> : <span>Default mark</span>}
      <span data-copyright>{copyrightNotice}</span>
    </>
  );
}

const template: PresentationTemplate = {
  name: "test",
  palette: {
    primary: "#FFFFFF",
    onPrimary: "#000000",
    accent1: "#111111",
    accent2: "#222222",
    accent3: "#333333",
    accent4: "#444444",
    accent5: "#555555",
    neutral: "#666666",
    data1: "#777777",
    data2: "#888888",
    data3: "#999999",
  },
  tones: {
    base: { surface: "#000000", onSurface: "#FFFFFF" },
    inverse: { surface: "#FFFFFF", onSurface: "#000000" },
  },
  fontSans: "Arial",
  Footer,
  ExportFooter: Footer,
};
const slide = defineSlide({ id: "test", Component: () => <span>Slide content</span> });
const deck = defineDeck({ title: "Test", slides: [slide] });
const customCopyrightDeck = defineDeck({
  title: "Test",
  date: "2026-10-14",
  copyrightNotice: "© {year} Example Corp.; issued {date} ({longDate}).",
  slides: [slide],
});

describe("footer brand wiring", () => {
  it("passes the configured mark to the live footer without export mode", () => {
    const markup = renderToStaticMarkup(
      <Player deck={deck} template={{ ...template, FooterBrand: Brand }} />,
    );
    expect(markup).toContain('class="footer-mark" data-custom-brand="true" data-static="false"');
    expect(markup).toContain("Slide content");
  });

  it("passes the same mark to the PDF footer in static export mode", () => {
    const markup = renderToStaticMarkup(
      <ExportStage
        slide={slide}
        step={1}
        date={new Date(2026, 9, 14)}
        page={1}
        total={1}
        template={{ ...template, FooterBrand: Brand }}
        captureRef={createRef<HTMLDivElement>()}
      />,
    );
    expect(markup).toContain('class="footer-mark" data-custom-brand="true" data-static="true"');
    expect(markup).toContain('aria-hidden="true" inert=""');
    expect(markup).toContain('data-exporting="true" data-export-capture="true"');
    expect(markup).toContain("width:1920px;height:1080px");
    expect(markup).toContain("Slide content");
    expect(markup).not.toContain("footer-actions");
    expect(markup).not.toContain("Export PDF");
    expect(markup).not.toContain("Speaker notes");
  });

  it("expands the live notice and renders it in the PDF footer", () => {
    const notice = "© 2026 Example Corp.; issued 2026-10-14 (14 October 2026).";
    const liveMarkup = renderToStaticMarkup(
      <Player deck={customCopyrightDeck} template={template} />,
    );
    const pdfMarkup = renderToStaticMarkup(
      <ExportStage
        slide={slide}
        step={1}
        date={new Date(2026, 9, 14)}
        copyrightNotice={notice}
        page={1}
        total={1}
        template={template}
        captureRef={createRef<HTMLDivElement>()}
      />,
    );
    expect(liveMarkup).toContain(`<span data-copyright="true">${notice}</span>`);
    expect(pdfMarkup).toContain(`<span data-copyright="true">${notice}</span>`);
  });

  it("supports existing templates without a configured mark", () => {
    expect(renderToStaticMarkup(<Player deck={deck} template={template} />)).toContain(
      "Default mark",
    );
    expect(
      renderToStaticMarkup(
        <ExportStage
          slide={slide}
          step={1}
          date={new Date(2026, 9, 14)}
          page={1}
          total={1}
          template={template}
          captureRef={createRef<HTMLDivElement>()}
        />,
      ),
    ).toContain("Default mark");
  });
});
