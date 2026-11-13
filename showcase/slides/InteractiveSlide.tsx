import {
  SLIDE_AREA_HEIGHT,
  STAGE_WIDTH,
  StageScaleContext,
  useExportMode,
  useMotionAllowance,
} from "@core";
import { ArrowDownToLine, RotateCcw } from "lucide-react";
import {
  type Dispatch,
  type MutableRefObject,
  type PointerEvent,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Arena, Body } from "./physics";
import { createPlayground, type Playground, type PlaygroundMode, type Point } from "./playground";

const ARENA: Arena = { width: STAGE_WIDTH, height: SLIDE_AREA_HEIGHT };
const LEFT_MARGIN = 128;
const CARD_TOP = 430;
const CARD_WIDTH = 360;
const CARD_HEIGHT = 310;
const CARD_GAP = 75;

/** A line of text whose words are separate physical pieces, laid out as one line when composed. */
interface TextLine {
  id: string;
  text: string;
  origin: Point;
  /** Space between words, in stage pixels. */
  wordGap: number;
  className: string;
}

const TITLE_CLASS = "text-[80px] leading-[1.05] font-bold tracking-tight";
const SUBLINE_CLASS = "text-[30px] leading-snug text-theme-neutral";

const TITLE = "If JavaScript can do it, your slide can do it.";

const textLines: TextLine[] = [
  {
    id: "title-1",
    text: "If JavaScript can do it,",
    origin: { x: LEFT_MARGIN, y: 96 },
    wordGap: 20,
    className: TITLE_CLASS,
  },
  {
    id: "title-2",
    text: "your slide can do it.",
    origin: { x: LEFT_MARGIN, y: 180 },
    wordGap: 20,
    className: TITLE_CLASS,
  },
  {
    id: "subline",
    text: "This slide runs a physics engine right now. Grab any piece and throw it.",
    origin: { x: LEFT_MARGIN, y: 304 },
    wordGap: 8,
    className: SUBLINE_CLASS,
  },
];

interface WordPiece {
  kind: "word";
  id: string;
  line: TextLine;
  text: string;
}

interface CardPiece {
  kind: "card";
  id: string;
  home: Point;
  className: string;
  content: ReactNode;
}

type Piece = WordPiece | CardPiece;

interface Size {
  width: number;
  height: number;
}

const cardX = (column: number) => LEFT_MARGIN + column * (CARD_WIDTH + CARD_GAP);

const cards: CardPiece[] = [
  {
    kind: "card",
    id: "physics",
    home: { x: cardX(0), y: CARD_TOP },
    className: "rounded-3xl bg-theme-accent2 p-8 text-theme-on-primary shadow-2xl",
    content: (
      <Card label="physics">
        <p className="text-[40px] leading-[1.1] font-bold">Gravity, collisions, throws.</p>
        <p className="mt-auto text-[22px] leading-snug opacity-85">Running in this slide.</p>
      </Card>
    ),
  },
  {
    kind: "card",
    id: "live",
    home: { x: cardX(1), y: CARD_TOP },
    className:
      "rounded-3xl bg-theme-accent1 p-8 text-theme-accent5 shadow-2xl ring-2 ring-theme-accent4",
    content: (
      <Card label="live state">
        <LiveClock />
        <p className="mt-auto text-[22px] leading-snug text-theme-neutral">
          Updated every second by JavaScript.
        </p>
      </Card>
    ),
  },
  {
    kind: "card",
    id: "charts",
    home: { x: cardX(2), y: CARD_TOP },
    className:
      "rounded-3xl bg-theme-accent1 p-8 text-theme-accent5 shadow-2xl ring-2 ring-theme-accent4",
    content: (
      <Card label="charts & data">
        <BarChart />
      </Card>
    ),
  },
  {
    kind: "card",
    id: "packages",
    home: { x: cardX(3), y: CARD_TOP },
    className: "rounded-3xl bg-theme-primary p-8 text-theme-on-primary shadow-2xl",
    content: (
      <Card label="any npm package">
        <div className="font-mono text-[22px] leading-[1.6]">
          <p>
            <span className="font-bold">import</span> {"{ motion }"}
          </p>
          <p>
            <span className="font-bold">from</span> "motion/react";
          </p>
        </div>
        <p className="mt-auto text-[22px] leading-snug">Bundled locally. No network needed.</p>
      </Card>
    ),
  },
];

/** Words first, then cards: every one of them is a separate physical piece. */
const pieces: Piece[] = [
  ...textLines.flatMap((line) =>
    line.text
      .split(" ")
      .map((text, index): WordPiece => ({ kind: "word", id: `${line.id}-${index}`, line, text })),
  ),
  ...cards,
];

/** Composed positions: each line's words side by side from its origin, cards at their homes. */
function composeLayout(sizes: Size[]): Body[] {
  const cursors = new Map<string, number>();
  return pieces.map((piece, index) => {
    const { width, height } = sizes[index];
    let home: Point;
    if (piece.kind === "word") {
      const x = cursors.get(piece.line.id) ?? piece.line.origin.x;
      cursors.set(piece.line.id, x + width + piece.line.wordGap);
      home = { x, y: piece.line.origin.y };
    } else {
      home = piece.home;
    }
    return { ...home, width, height, vx: 0, vy: 0, tilt: 0, held: false };
  });
}

function useFontMeasuredPlayground(
  arenaRef: MutableRefObject<HTMLDivElement | null>,
  elements: MutableRefObject<(HTMLDivElement | null)[]>,
  ambient: boolean,
  stageScale: number,
  setMode: Dispatch<SetStateAction<PlaygroundMode>>,
): Playground | null {
  const [setup, setSetup] = useState<{
    ambient: boolean;
    stageScale: number;
    playground: Playground;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: Playground | null = null;

    async function initialize() {
      if (typeof document.fonts !== "undefined") await document.fonts.ready;
      if (cancelled) return;

      const arena = arenaRef.current;
      if (!arena || !Number.isFinite(stageScale) || stageScale <= 0) return;
      if (elements.current.some((element) => element === null)) return;

      const sizes = elements.current.map((element) => {
        const rect = element?.getBoundingClientRect();
        return {
          width: rect ? rect.width / stageScale : 0,
          height: rect ? rect.height / stageScale : 0,
        };
      });
      created = createPlayground(ARENA, composeLayout(sizes), ambient, setMode);
      if (cancelled) {
        created.stop();
        return;
      }
      setSetup({ ambient, stageScale, playground: created });
    }

    void initialize();
    return () => {
      cancelled = true;
      created?.stop();
    };
  }, [ambient, stageScale, arenaRef, elements, setMode]);

  return setup?.ambient === ambient && setup.stageScale === stageScale && stageScale > 0
    ? setup.playground
    : null;
}

export function InteractiveSlide() {
  const { ambient } = useMotionAllowance();
  const exportMode = useExportMode();
  const stageScale = useContext(StageScaleContext);
  const arenaRef = useRef<HTMLDivElement>(null);
  const elements = useRef<(HTMLDivElement | null)[]>([]);
  const [mode, setMode] = useState<PlaygroundMode>("composed");
  const playground = useFontMeasuredPlayground(arenaRef, elements, ambient, stageScale, setMode);

  function toStage(event: PointerEvent): Point {
    const arena = arenaRef.current;
    if (!arena) return { x: 0, y: 0 };
    const rect = arena.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / stageScale,
      y: (event.clientY - rect.top) / stageScale,
    };
  }

  function grab(index: number, event: PointerEvent<HTMLDivElement>) {
    if (!playground) return;
    // Stop the browser from starting a text selection or a native drag of selected content,
    // which shows a ghost image of the slide and steals the pointer.
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    event.currentTarget.setPointerCapture(event.pointerId);
    playground.grab(index, toStage(event), event.timeStamp);
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      playground?.drag(toStage(event), event.timeStamp);
    }
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    playground?.release(event.timeStamp);
  }

  const composed = mode === "composed";

  return (
    <div ref={arenaRef} className="relative h-full overflow-hidden select-none">
      <h2 className="sr-only">{TITLE}</h2>

      {!exportMode && playground && (
        <div className="absolute top-28 right-32 z-20 flex flex-col items-end gap-3">
          <button
            type="button"
            className="flex items-center gap-3 rounded-full bg-theme-data2 px-7 py-3 text-[24px] font-bold text-theme-on-primary shadow-xl"
            onClick={() => (composed ? playground?.collapse() : playground?.rebuild())}
          >
            {composed ? (
              <ArrowDownToLine aria-hidden="true" className="size-7" />
            ) : (
              <RotateCcw aria-hidden="true" className="size-7" />
            )}
            {composed ? "Let it fall" : "Rebuild the slide"}
          </button>
          <p className="text-[20px] text-theme-neutral">or grab any piece and throw it</p>
        </div>
      )}

      {pieces.map((piece, index) => (
        <div
          key={piece.id}
          ref={(element) => {
            elements.current[index] = element;
            playground?.attach(index, element);
          }}
          aria-hidden={piece.kind === "word" && piece.line.id.startsWith("title")}
          data-swipe-ignore=""
          className={`absolute top-0 left-0 z-10 cursor-grab touch-none whitespace-nowrap active:cursor-grabbing ${playground ? "visible" : "invisible"} ${
            piece.kind === "word" ? piece.line.className : piece.className
          }`}
          style={piece.kind === "card" ? { width: CARD_WIDTH, height: CARD_HEIGHT } : undefined}
          onPointerDown={(event) => grab(index, event)}
          onPointerMove={drag}
          onPointerUp={release}
          onPointerCancel={release}
          onLostPointerCapture={release}
        >
          {piece.kind === "word" ? piece.text : piece.content}
        </div>
      ))}
    </div>
  );
}

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col whitespace-normal">
      <p className="mb-5 font-mono text-[20px] font-bold tracking-wide uppercase opacity-80">
        {label}
      </p>
      {children}
    </div>
  );
}

function LiveClock() {
  const exportMode = useExportMode();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (exportMode) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [exportMode]);

  return (
    <time
      dateTime={now.toISOString()}
      className="font-mono text-[56px] leading-none font-bold text-theme-data2 tabular-nums"
    >
      {now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })}
    </time>
  );
}

function BarChart() {
  const bars = [70, 120, 95, 160];
  return (
    <svg aria-hidden="true" viewBox="0 0 300 190" className="w-full flex-1">
      {bars.map((height, index) => (
        <rect
          key={height}
          x={20 + index * 70}
          y={180 - height}
          width="48"
          height={height}
          rx="6"
          fill={
            index === bars.length - 1 ? "var(--color-theme-data2)" : "var(--color-theme-accent3)"
          }
        />
      ))}
      <line x1="6" y1="181" x2="294" y2="181" stroke="var(--color-theme-primary)" strokeWidth="3" />
    </svg>
  );
}
