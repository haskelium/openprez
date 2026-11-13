// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineDeck, defineSlide } from "../../../core/player/deck";
import type { ExportLibraries } from "../../../core/player/exportLibraries";
import { Player } from "../../../core/player/Player";
import type { FooterRenderProps, PresentationTemplate } from "../../../core/template/contract";

// The player must import the export libraries only through the loader seam; these tests
// observe and replace that seam without ever loading the real heavy modules. The mock
// memoizes like the real loader, so a counted load reflects an actual dynamic import.
const state = vi.hoisted(() => ({
  load: undefined as undefined | (() => Promise<ExportLibraries>),
  cached: null as null | Promise<ExportLibraries>,
}));

vi.mock("../../../core/player/exportLibraries", () => ({
  loadExportLibraries: () => {
    if (!state.load) throw new Error("no loader behavior configured");
    state.cached ??= state.load().catch((error) => {
      state.cached = null;
      throw error;
    });
    return state.cached;
  },
}));

afterEach(() => {
  cleanup();
  state.load = undefined;
  state.cached = null;
  FakePdf.saveFailuresRemaining = 0;
});

// jsdom has no layout engine or font loading; the stage only needs these APIs to exist.
if (typeof ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
if (typeof document.fonts === "undefined") {
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
}
if (typeof requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    setTimeout(
      () => callback(performance.now()),
      0,
    ) as unknown as number) as typeof requestAnimationFrame;
}

class FakePdf {
  static instances: FakePdf[] = [];
  static saved: string[] = [];
  static saveFailuresRemaining = 0;
  images: string[] = [];
  addedPages = 0;

  constructor() {
    FakePdf.instances.push(this);
  }

  addPage() {
    this.addedPages += 1;
  }

  addImage(image: string) {
    this.images.push(image);
  }

  save(name: string) {
    if (FakePdf.saveFailuresRemaining > 0) {
      FakePdf.saveFailuresRemaining -= 1;
      throw new Error("PDF save failed");
    }
    FakePdf.saved.push(name);
  }
}

interface CaptureRecord {
  slide: string;
  marker: string;
  pixelRatio?: number;
  quality?: number;
}

/** The slide id lives on the stage's inner slide area, not the capture root. */
const slideIdOf = (element: HTMLElement) =>
  element.querySelector("[data-slide]")?.getAttribute("data-slide") ?? "";

function librariesWith(
  captures: CaptureRecord[],
  options?: { holdCapture?: boolean; failFirstCapture?: boolean },
) {
  let loadCalls = 0;
  let releaseCapture: (() => void) | undefined;
  const toJpeg = (
    element: HTMLElement,
    captureOptions: { pixelRatio?: number; quality?: number },
  ) => {
    captures.push({
      slide: slideIdOf(element),
      marker: element.textContent ?? "",
      pixelRatio: captureOptions.pixelRatio,
      quality: captureOptions.quality,
    });
    if (options?.failFirstCapture && captures.length === 1) {
      return Promise.reject(new Error("JPEG capture failed"));
    }
    // Only the first capture holds; later frames resolve immediately so the run completes.
    if (!options?.holdCapture || captures.length > 1) {
      return Promise.resolve(`data:image/jpeg;base64,frame-${captures.length}`);
    }
    return new Promise<string>((resolve) => {
      releaseCapture = () => resolve(`data:image/jpeg;base64,frame-${captures.length}`);
    });
  };
  const load = () => {
    loadCalls += 1;
    return Promise.resolve({ jsPDF: FakePdf, toJpeg } as unknown as ExportLibraries);
  };
  return {
    load,
    get loadCalls() {
      return loadCalls;
    },
    get captureHeld() {
      return releaseCapture !== undefined;
    },
    releaseHeldCapture: () => releaseCapture?.(),
  };
}

function Footer({ controls }: FooterRenderProps) {
  return (
    <div>
      <button type="button" data-export onClick={controls.onExportPdf}>
        Export
      </button>
      {controls.exporting ? <span data-exporting /> : null}
      {controls.exportError != null ? <span data-export-error>{controls.exportError}</span> : null}
    </div>
  );
}

const template: PresentationTemplate = {
  name: "lazy-export-test",
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
  ExportFooter: () => <span />,
};

const deck = defineDeck({
  title: "Lazy Export Deck",
  slides: [
    defineSlide({
      id: "builds",
      steps: 3,
      keyFrames: [2, 3],
      Component: ({ step }) => <span>{`Slide A / step ${step}`}</span>,
    }),
    defineSlide({
      id: "single",
      steps: 1,
      Component: () => <span>Slide B / step 1</span>,
    }),
  ],
});

describe("Player PDF export lazy loading", () => {
  it("does not load the export libraries until export is activated", async () => {
    const libs = librariesWith([]);
    state.load = libs.load;
    render(<Player deck={deck} template={template} />);

    // Flush all mount effects; nothing may import the export libraries.
    await act(async () => {});

    expect(libs.loadCalls).toBe(0);
    expect(document.querySelector("[data-exporting]")).toBeNull();
  });

  it("loads on first activation and exports every key frame in order", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures);
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));

    expect(libs.loadCalls).toBe(1);
    expect(captures.map((capture) => capture.slide)).toEqual(["builds", "builds", "single"]);
    expect(captures.map((capture) => capture.marker)).toEqual([
      "Slide A / step 2",
      "Slide A / step 3",
      "Slide B / step 1",
    ]);
    // Compact stage captures: 1x pixel ratio, JPEG at 0.9 quality.
    expect(captures.every((capture) => capture.pixelRatio === 1 && capture.quality === 0.9)).toBe(
      true,
    );

    expect(FakePdf.instances).toHaveLength(1);
    expect(FakePdf.instances[0]?.images).toHaveLength(3);
    expect(FakePdf.instances[0]?.addedPages).toBe(2);
    expect(document.querySelector("[data-exporting]")).toBeNull();
  });

  it("shows a load failure as a recoverable export error and succeeds on retry", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures);
    FakePdf.instances = [];
    FakePdf.saved = [];
    let attempt = 0;
    state.load = () => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new Error("chunk unavailable"));
      return libs.load();
    };
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(screen.getByText("chunk unavailable")).toBeTruthy());
    expect(document.querySelector("[data-exporting]")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));
    expect(attempt).toBe(2);
  });

  it("recovers from a capture failure and retries from a fresh PDF document", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures, { failFirstCapture: true });
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(screen.getByText("JPEG capture failed")).toBeTruthy());
    expect(FakePdf.instances[0]?.images).toHaveLength(0);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));
    expect(FakePdf.instances).toHaveLength(2);
    expect(captures).toHaveLength(4);
  });

  it("recovers from a save failure and discards the partial document on retry", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures);
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    FakePdf.saveFailuresRemaining = 1;
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(screen.getByText("PDF save failed")).toBeTruthy());
    expect(FakePdf.instances[0]?.images).toHaveLength(3);
    expect(FakePdf.saved).toEqual([]);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));
    expect(FakePdf.instances).toHaveLength(2);
  });

  it("keeps live navigation and footer export state independent during static capture", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures, { holdCapture: true });
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(libs.captureHeld).toBe(true));
    const liveSlide = document.querySelector<HTMLElement>(
      '[data-stage]:not([data-exporting]) [data-slide="builds"]',
    );
    expect(liveSlide?.textContent).toContain("Slide A / step 1");

    await act(async () => {
      fireEvent.keyDown(window, { key: "ArrowRight" });
    });
    await waitFor(() => expect(liveSlide?.textContent).toContain("Slide A / step 2"));
    expect(document.querySelector("[data-exporting]")).not.toBeNull();

    libs.releaseHeldCapture();
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));
    expect(captures.map((capture) => capture.marker)).toEqual([
      "Slide A / step 2",
      "Slide A / step 3",
      "Slide B / step 1",
    ]);
  });

  it("does not add pages or download when an in-flight capture finishes after unmount", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures, { holdCapture: true });
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    const view = render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(libs.captureHeld).toBe(true));

    view.unmount();
    await act(async () => {
      libs.releaseHeldCapture();
      await Promise.resolve();
    });

    expect(FakePdf.instances[0]?.images).toHaveLength(0);
    expect(FakePdf.saved).toEqual([]);
  });

  it("ignores repeated activation while an export is in progress", async () => {
    const captures: CaptureRecord[] = [];
    const libs = librariesWith(captures, { holdCapture: true });
    state.load = libs.load;
    FakePdf.instances = [];
    FakePdf.saved = [];
    render(<Player deck={deck} template={template} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    await waitFor(() => expect(libs.captureHeld).toBe(true));

    // A second click while the first run holds its capture must not start another run.
    await act(async () => {
      fireEvent.click(screen.getByText("Export"));
    });
    expect(libs.loadCalls).toBe(1);

    libs.releaseHeldCapture();
    await waitFor(() => expect(FakePdf.saved).toEqual(["lazy-export-deck.pdf"]));
    expect(libs.loadCalls).toBe(1);
    expect(FakePdf.instances).toHaveLength(1);
  });
});
