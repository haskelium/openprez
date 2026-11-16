/** One clickable overlay on an exported PDF page: a rectangle in stage pixels, relative to the capture element. */
export interface ExportLinkRect {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
}

/** URI schemes of a PDF link annotation; relative and fragment-only targets cannot open from a PDF. */
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function exportableUri(anchor: Element): string | null {
  const href = (anchor.getAttribute("href") ?? "").trim();
  if (!href) return null;
  try {
    const { protocol } = new URL(href);
    return LINK_PROTOCOLS.has(protocol) ? href : null;
  } catch {
    return null;
  }
}

function isRendered(anchor: Element): boolean {
  if (anchor.getClientRects().length === 0) return false;
  const style = getComputedStyle(anchor);
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  const opacity = style.opacity;
  if (opacity !== "" && Number.parseFloat(opacity) <= 0) return false;
  return true;
}

function clippedRelativeRect(
  anchor: Element,
  bounds: DOMRect,
): { x: number; y: number; width: number; height: number } | null {
  const rect = anchor.getBoundingClientRect();
  const x = Math.max(rect.left - bounds.left, 0);
  const y = Math.max(rect.top - bounds.top, 0);
  const right = Math.min(rect.right - bounds.left, bounds.width);
  const bottom = Math.min(rect.bottom - bounds.top, bounds.height);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Collects clickable hotspots for the exported page: the visible `a[href]` anchors inside
 * the capture element, as rectangles in stage pixels (page points are half that). Only
 * absolute http(s) and mailto URIs qualify; hidden, non-rendered and out-of-bounds anchors
 * are skipped, so the hotspots match what the page shows.
 */
export function collectExportLinks(captureElement: HTMLElement): ExportLinkRect[] {
  const bounds = captureElement.getBoundingClientRect();
  const links: ExportLinkRect[] = [];
  for (const anchor of captureElement.querySelectorAll("a[href]")) {
    const url = exportableUri(anchor);
    if (!url || !isRendered(anchor)) continue;
    const rect = clippedRelativeRect(anchor, bounds);
    if (rect) links.push({ ...rect, url });
  }
  return links;
}
