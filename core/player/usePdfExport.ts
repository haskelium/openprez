import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Deck } from "./deck";
import { type ExportFrame, pdfFileName, selectExportFrames } from "./exportFrames";
import { type ExportLibraries, loadExportLibraries } from "./exportLibraries";
import { resolvePdfExportDate } from "./presentationDate";

const PDF_PAGE_WIDTH = 960;
const PDF_PAGE_HEIGHT = 540;
const PDF_CAPTURE_PIXEL_RATIO = 1;
const PDF_IMAGE_QUALITY = 0.9;

type PdfDocument = InstanceType<ExportLibraries["jsPDF"]>;

/** One export run; its asynchronous work counts only while it is still the active run. */
interface ExportRun {
  document: PdfDocument | null;
}

type ExportLifecycle =
  | { status: "idle" }
  | { status: "running"; run: ExportRun; frameIndex: number; date: Date }
  | { status: "failed"; error: string };

interface PdfExportOptions {
  deck: Deck;
  presentationDate: Date;
  standaloneBuildDate?: string;
  captureRef: RefObject<HTMLDivElement | null>;
}

interface PdfExportResult {
  frame: ExportFrame | null;
  frameIndex: number | null;
  total: number;
  date: Date | null;
  exporting: boolean;
  error: string | null;
  start: () => void;
}

/** Owns one PDF export at a time, from preparation through download or recoverable failure. */
export function usePdfExport({
  deck,
  presentationDate,
  standaloneBuildDate,
  captureRef,
}: PdfExportOptions): PdfExportResult {
  const frames = useMemo(() => selectExportFrames(deck), [deck]);
  const [lifecycle, setLifecycle] = useState<ExportLifecycle>({ status: "idle" });
  // The active run, or null; unmounting or finishing clears it, orphaning in-flight work.
  const activeRunRef = useRef<ExportRun | null>(null);

  const start = useCallback(() => {
    if (activeRunRef.current) return;
    const run: ExportRun = { document: null };
    activeRunRef.current = run;
    setLifecycle({
      status: "running",
      run,
      frameIndex: 0,
      date: resolvePdfExportDate(deck.date, presentationDate, standaloneBuildDate),
    });
  }, [deck.date, presentationDate, standaloneBuildDate]);

  useEffect(
    () => () => {
      activeRunRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (lifecycle.status !== "running") return;
    const { run, frameIndex } = lifecycle;
    let cancelled = false;
    const isCurrent = () => !cancelled && activeRunRef.current === run;
    const finish = (next: ExportLifecycle) => {
      activeRunRef.current = null;
      setLifecycle(next);
    };
    const fail = (error: unknown) => {
      if (!isCurrent()) return;
      finish({
        status: "failed",
        error: error instanceof Error ? error.message : "PDF export failed",
      });
    };

    const captureFrame = async () => {
      try {
        const { jsPDF: JsPdf, toJpeg } = await loadExportLibraries();
        if (!isCurrent()) return;
        run.document ??= new JsPdf({
          orientation: "landscape",
          unit: "pt",
          format: [PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT],
        });

        await document.fonts?.ready;
        // Two painted frames, as before extraction: the stage mounts, then settles before capture.
        await nextPaint();
        await nextPaint();
        const element = captureRef.current;
        if (!isCurrent()) return;
        if (!element) throw new Error("The PDF export stage is not ready");

        const image = await toJpeg(element, {
          pixelRatio: PDF_CAPTURE_PIXEL_RATIO,
          quality: PDF_IMAGE_QUALITY,
        });
        if (!isCurrent()) return;
        if (frameIndex > 0) run.document.addPage();
        run.document.addImage(image, "JPEG", 0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);
        setLifecycle({ ...lifecycle, frameIndex: frameIndex + 1 });
      } catch (error) {
        fail(error);
      }
    };

    if (frameIndex < frames.length) {
      void captureFrame();
    } else {
      try {
        if (!run.document) throw new Error("The PDF export document is not ready");
        run.document.save(`${pdfFileName(deck.title)}.pdf`);
        finish({ status: "idle" });
      } catch (error) {
        fail(error);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [captureRef, deck.title, frames, lifecycle]);

  const running = lifecycle.status === "running" ? lifecycle : null;
  return {
    frame: running ? (frames[running.frameIndex] ?? null) : null,
    frameIndex: running?.frameIndex ?? null,
    total: frames.length,
    date: running?.date ?? null,
    exporting: running !== null,
    error: lifecycle.status === "failed" ? lifecycle.error : null,
    start,
  };
}

/** Resolves after the browser has laid out and painted the current frame. */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}
