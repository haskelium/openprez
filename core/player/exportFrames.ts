import type { Deck, Slide } from "./deck";

export interface ExportFrame {
  slide: Slide;
  step: number;
}

/** Select one static PDF page for each slide key frame, preserving deck order. */
export function selectExportFrames(deck: Deck): ExportFrame[] {
  return deck.slides.flatMap((slide) => slide.keyFrames.map((step) => ({ slide, step })));
}

/** Turn a deck title into the existing stable, filesystem-friendly PDF basename. */
export function pdfFileName(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
