// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { collectExportLinks } from "../../../core/player/exportLinks";

afterEach(() => {
  vi.restoreAllMocks();
});

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const CAPTURE_SIZE = { left: 0, top: 0, width: 1920, height: 1080 };

function domRect({ left, top, width, height }: Rect): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as unknown as DOMRect;
}

/**
 * Geometry registry for one measure pass: each entry describes one element the collector
 * reads. Anchors without clientRects count as not rendered, matching a hidden element.
 */
interface Geometry {
  rect: Rect;
  clientRects: number;
  visibility?: string;
  opacity?: string;
}

function stubGeometry(
  capture: HTMLElement,
  captureRect: Rect = CAPTURE_SIZE,
  geometry: Map<Element, Geometry> = new Map(),
): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if (this === capture) return domRect(captureRect);
    return domRect(geometry.get(this)?.rect ?? { left: 0, top: 0, width: 0, height: 0 });
  });
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return globalThis.Array.from({ length: geometry.get(this)?.clientRects ?? 0 }, () => ({
      item: () => null,
      length: 1,
    })) as unknown as DOMRectList;
  });
  vi.spyOn(window, "getComputedStyle").mockImplementation((element: Element) => {
    const entry = geometry.get(element);
    return {
      visibility: entry?.visibility ?? "",
      opacity: entry?.opacity ?? "",
    } as unknown as CSSStyleDeclaration;
  });
}

function link(
  capture: HTMLElement,
  attrs: Record<string, string>,
  geometry: Partial<Geometry> & Pick<Geometry, "rect">,
): void {
  const anchor = document.createElement("a");
  for (const [key, value] of Object.entries(attrs)) anchor.setAttribute(key, value);
  capture.appendChild(anchor);
  stubs.set(anchor, {
    rect: geometry.rect,
    clientRects: geometry.clientRects ?? (geometry.rect.width > 0 ? 1 : 0),
    visibility: geometry.visibility,
    opacity: geometry.opacity,
  });
}

const stubs = new Map<Element, Geometry>();

function collect(
  capture: HTMLElement,
  captureRect: Rect = CAPTURE_SIZE,
): { x: number; y: number; width: number; height: number; url: string }[] {
  stubGeometry(capture, captureRect, stubs);
  return collectExportLinks(capture);
}

describe("collectExportLinks", () => {
  afterEach(() => {
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    stubs.clear();
  });

  it("collects a visible anchor's rect relative to the capture element", () => {
    const capture = document.createElement("div");
    document.body.appendChild(capture);
    stubs.set(capture, {
      rect: { left: 400, top: 100, width: 1920, height: 1080 },
      clientRects: 1,
    });
    link(
      capture,
      { href: "https://example.com/" },
      { rect: { left: 700, top: 300, width: 300, height: 40 } },
    );

    expect(collect(capture, { left: 400, top: 100, width: 1920, height: 1080 })).toEqual([
      { x: 300, y: 200, width: 300, height: 40, url: "https://example.com/" },
    ]);
  });

  it("keeps absolute http, https and mailto targets and skips everything else", () => {
    const capture = document.createElement("div");
    document.body.appendChild(capture);
    const rect = { left: 0, top: 0, width: 100, height: 20 };
    link(capture, { href: "http://example.com/a" }, { rect });
    link(
      capture,
      { href: "https://example.com/b" },
      { rect: { left: 10, top: 0, width: 90, height: 20 } },
    );
    link(
      capture,
      { href: "mailto:someone@example.com" },
      { rect: { left: 20, top: 0, width: 80, height: 20 } },
    );
    link(capture, { href: "./relative" }, { rect: { left: 30, top: 0, width: 70, height: 20 } });
    link(capture, { href: "#section" }, { rect: { left: 40, top: 0, width: 60, height: 20 } });
    link(
      capture,
      { href: "javascript:void(0)" },
      { rect: { left: 50, top: 0, width: 50, height: 20 } },
    );

    expect(collect(capture).map((entry) => entry.url)).toEqual([
      "http://example.com/a",
      "https://example.com/b",
      "mailto:someone@example.com",
    ]);
  });

  it("skips anchors that are not visibly rendered", () => {
    const capture = document.createElement("div");
    document.body.appendChild(capture);
    const rect = { left: 0, top: 0, width: 100, height: 20 };
    link(capture, { href: "https://example.com/none" }, { rect, clientRects: 0 });
    link(capture, { href: "https://example.com/hidden" }, { rect, visibility: "hidden" });
    link(capture, { href: "https://example.com/collapse" }, { rect, visibility: "collapse" });
    link(capture, { href: "https://example.com/transparent" }, { rect, opacity: "0" });

    expect(collect(capture)).toEqual([]);
  });

  it("ignores non-anchor interactive elements", () => {
    const capture = document.createElement("div");
    document.body.appendChild(capture);
    stubGeometry(capture);
    const button = document.createElement("button");
    button.setAttribute("href", "https://example.com/not-an-anchor");
    capture.appendChild(button);
    stubs.set(button, { rect: CAPTURE_SIZE, clientRects: 1 });

    expect(collect(capture)).toEqual([]);
  });

  it("clips anchors at the capture bounds and skips fully outside content", () => {
    const capture = document.createElement("div");
    document.body.appendChild(capture);
    link(
      capture,
      { href: "https://example.com/overhang" },
      { rect: { left: 1800, top: 100, width: 500, height: 40 } },
    );
    link(
      capture,
      { href: "https://example.com/outside" },
      { rect: { left: 5000, top: 0, width: 200, height: 20 } },
    );

    expect(collect(capture)).toEqual([
      { x: 1800, y: 100, width: 120, height: 40, url: "https://example.com/overhang" },
    ]);
  });
});
