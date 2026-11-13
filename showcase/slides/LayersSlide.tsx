import type { SlideProps } from "@core";
import { stepTransition, useMotionAllowance } from "@core";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, type SVGProps, useEffect, useRef, useState } from "react";

const SWAP_STEP = 4;
const PLANE_WIDTH = 600;
const PLANE_HEIGHT = 338;
const FOOTER_TOP = 290;
const SCENE_CENTER = { x: 500, y: 720 };
const LAYER_GAP = 190;
const DEFAULT_VIEW: View = { spin: 0, tilt: 60 };
/** The single frame shown without motion (PDF export, reduced motion): a turned moment of the sway. */
const STILL_VIEW: View = { spin: 14, tilt: 60 };
/** A slow, autonomous turntable sway around the centred view: amplitude in degrees, period in seconds. */
const SWAY = { spin: 22, spinPeriod: 12, tilt: 4, tiltPeriod: 15 };
/**
 * Pinhole camera on the stack's axis. The on-axis scale (focal / eye ≈ 0.87)
 * keeps today's framing, while the eye distance keeps the perspective subtle:
 * nearer corners draw about a tenth larger than farther ones, and higher
 * layers sit slightly closer to the camera than lower ones.
 */
const CAMERA = { eye: 2600, focal: 2262 };
/** Chord counts for the only curves in the scene; straight edges project exactly. */
const CORNER_SEGMENTS = 6;
const CIRCLE_SEGMENTS = 28;

interface View {
  /** Turntable rotation of the stack around its vertical axis, in degrees; 0 faces the viewer. */
  spin: number;
  /** How far the stack is tipped toward the viewer, in degrees; seen from above while positive. */
  tilt: number;
}

interface Layer {
  folder: string;
  freedom: "Fixed" | "Fixed per deck" | "Free";
  role: string;
  detail: string;
}

/** Bottom-up: the order the layers stack and appear. */
const layers: Layer[] = [
  {
    folder: "core/",
    freedom: "Fixed",
    role: "The player",
    detail: "Stage, steps, key frames, presenter window, PDF export. Generic: never deck content.",
  },
  {
    folder: "templates/",
    freedom: "Fixed per deck",
    role: "The look",
    detail: "Palette, tones, typography and the footer. One active template at a time.",
  },
  {
    folder: "presentation/",
    freedom: "Free",
    role: "Your story",
    detail: "Slides, speaker notes and local assets. The only folder a deck change touches.",
  },
];

interface MiniPalette {
  name: string;
  surface: string;
  text: string;
  bars: [string, string, string];
}

const defaultLook: MiniPalette = {
  name: "default",
  surface: "var(--color-theme-accent5)",
  text: "var(--color-theme-on-primary)",
  bars: ["var(--color-theme-accent2)", "var(--color-theme-accent3)", "var(--color-theme-accent4)"],
};

/** A hypothetical second template in cool hues, so the swap reads at a glance against the warm default. */
const altLook: MiniPalette = {
  name: "aurora",
  surface: "#E6EEFA",
  text: "#0F1E3A",
  bars: ["#2F6FE4", "#7C4DFF", "#E0457B"],
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

interface ProjectedPoint {
  x: number;
  y: number;
}

interface Projector {
  /** Screen position of a point given in the plane's own 600x338 drawing coordinates. */
  point(u: number, v: number): ProjectedPoint;
  /** Affine approximation of the projection around (u, v), accurate over text-sized spans. */
  textMatrix(u: number, v: number): string;
}

/**
 * Perspective projection of one layer plane: each plane spins about its own
 * normal, then the whole stack tips toward the viewer, and a camera on the
 * stack's axis projects the result. Straight edges stay straight under
 * perspective, so rects project exactly as polygons; only corner arcs and
 * circles are sampled. All output is plain SVG paths: SVG-native and PDF-safe.
 */
function makeProjector(view: View, depth: number): Projector {
  const spin = toRadians(view.spin);
  const tilt = toRadians(view.tilt);
  const cosSpin = Math.cos(spin);
  const sinSpin = Math.sin(spin);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  const point = (u: number, v: number): ProjectedPoint => {
    const across = u - PLANE_WIDTH / 2;
    const down = v - PLANE_HEIGHT / 2;
    const spunAcross = across * cosSpin - down * sinSpin;
    const spunDown = across * sinSpin + down * cosSpin;
    // World axes: y up, z toward the camera. The layer offset lifts the plane
    // up the stack (y) and brings it closer to the camera (z).
    const y = -spunDown * cosTilt + depth * sinTilt;
    const z = spunDown * sinTilt + depth * cosTilt;
    const scale = CAMERA.focal / (CAMERA.eye - z);
    return { x: SCENE_CENTER.x + spunAcross * scale, y: SCENE_CENTER.y - y * scale };
  };

  const textMatrix = (u: number, v: number): string => {
    const origin = point(u, v);
    const alongU = point(u + 1, v);
    const alongV = point(u, v + 1);
    return `matrix(${alongU.x - origin.x} ${alongU.y - origin.y} ${alongV.x - origin.x} ${alongV.y - origin.y} ${origin.x} ${origin.y})`;
  };

  return { point, textMatrix };
}

type PlanePoint = [u: number, v: number];

function polygonPath(projector: Projector, points: PlanePoint[]): string {
  const commands = points.map(([u, v], index) => {
    const p = projector.point(u, v);
    return `${index === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  });
  return `${commands.join(" ")} Z`;
}

/** Perimeter of a rounded rect as plane points, clockwise from the top edge. */
function roundedRectPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): PlanePoint[] {
  if (radius <= 0) {
    return [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
    ];
  }
  const corners: Array<[number, number, number]> = [
    [x + width - radius, y + radius, -Math.PI / 2],
    [x + width - radius, y + height - radius, 0],
    [x + radius, y + height - radius, Math.PI / 2],
    [x + radius, y + radius, Math.PI],
  ];
  const points: PlanePoint[] = [];
  for (const [cx, cy, startAngle] of corners) {
    for (let segment = 0; segment <= CORNER_SEGMENTS; segment++) {
      const angle = startAngle + (segment / CORNER_SEGMENTS) * (Math.PI / 2);
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  return points;
}

function circlePoints(cx: number, cy: number, radius: number): PlanePoint[] {
  return Array.from({ length: CIRCLE_SEGMENTS + 1 }, (_, segment) => {
    const angle = (segment / CIRCLE_SEGMENTS) * 2 * Math.PI;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as PlanePoint;
  });
}

interface ShapePaint {
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  vectorEffect?: "non-scaling-stroke";
}

interface PRectProps extends ShapePaint {
  projector: Projector;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

function PRect({ projector, x, y, width, height, radius = 0, ...paint }: PRectProps) {
  return (
    <path d={polygonPath(projector, roundedRectPoints(x, y, width, height, radius))} {...paint} />
  );
}

interface PCircleProps extends ShapePaint {
  projector: Projector;
  cx: number;
  cy: number;
  r: number;
}

function PCircle({ projector, cx, cy, r, ...paint }: PCircleProps) {
  return <path d={polygonPath(projector, circlePoints(cx, cy, r))} {...paint} />;
}

interface PTextProps extends SVGProps<SVGTextElement> {
  projector: Projector;
  /** Baseline anchor in the plane's own coordinates; text renders from there. */
  x: number;
  y: number;
  children: ReactNode;
}

function PText({ projector, x, y, children, ...text }: PTextProps) {
  return (
    <g transform={projector.textMatrix(x, y)}>
      <text x={0} y={0} {...text}>
        {children}
      </text>
    </g>
  );
}

/** Just right of the plane's rightmost corner, level with its centre. */
function labelAnchor(projector: Projector) {
  const corners = [
    projector.point(0, 0),
    projector.point(PLANE_WIDTH, 0),
    projector.point(0, PLANE_HEIGHT),
    projector.point(PLANE_WIDTH, PLANE_HEIGHT),
  ];
  const centre = projector.point(PLANE_WIDTH / 2, PLANE_HEIGHT / 2);
  return { x: Math.max(...corners.map((corner) => corner.x)), y: centre.y };
}

/** Eases a number toward its target each frame; jumps straight to it when motion is off. */
function useEased(target: number, animate: boolean): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (!animate) {
      current.current = target;
      setValue(target);
      return;
    }
    let frame = requestAnimationFrame(function step() {
      const next = current.current + (target - current.current) * 0.12;
      const done = Math.abs(target - next) < 0.05;
      current.current = done ? target : next;
      setValue(current.current);
      if (!done) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);

  return value;
}

/** Sways the stack slowly on its own around the centred view; holds a still frame when motion is off. */
function useSwayingView(animate: boolean): View {
  const [view, setView] = useState(animate ? DEFAULT_VIEW : STILL_VIEW);

  useEffect(() => {
    if (!animate) {
      setView(STILL_VIEW);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(time) {
      const seconds = (time - start) / 1000;
      setView({
        spin: DEFAULT_VIEW.spin + SWAY.spin * Math.sin((2 * Math.PI * seconds) / SWAY.spinPeriod),
        tilt: DEFAULT_VIEW.tilt + SWAY.tilt * Math.sin((2 * Math.PI * seconds) / SWAY.tiltPeriod),
      });
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  return view;
}

export function LayersSlide({ step }: SlideProps) {
  const allowance = useMotionAllowance();
  const focusedLayer = step >= SWAP_STEP ? 1 : step - 1;
  const look = step >= SWAP_STEP ? altLook : defaultLook;
  const view = useSwayingView(allowance.ambient);
  const depths = [
    useEased(0, allowance.ambient),
    useEased(step >= 2 ? LAYER_GAP : 0, allowance.ambient),
    useEased(step >= 3 ? 2 * LAYER_GAP : LAYER_GAP, allowance.ambient),
  ];

  return (
    <div className="relative h-full">
      <h2 className="absolute top-20 left-32 text-[64px] leading-[1.05] font-bold tracking-tight">
        Free where it matters.
        <br />
        Fixed where it counts.
      </h2>

      <svg viewBox="0 0 1920 1016" className="absolute inset-0 h-full w-full" role="img">
        <title>This slide exploded into its core, templates and presentation layers</title>
        {layers.map((layer, index) => {
          const visible = step >= index + 1;
          const depth = depths[index];
          const projector = makeProjector(view, depth);
          const label = labelAnchor(projector);
          return (
            <motion.g
              key={layer.folder}
              initial={false}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={stepTransition(allowance, 0.4)}
            >
              <LayerPlane projector={projector} index={index} look={look} />
              <PRect
                projector={projector}
                x={0}
                y={0}
                width={PLANE_WIDTH}
                height={PLANE_HEIGHT}
                radius={14}
                fill="none"
                stroke="var(--color-theme-data2)"
                strokeWidth={5}
                vectorEffect="non-scaling-stroke"
                opacity={index === focusedLayer ? 1 : 0}
              />
              <text
                x={label.x + 30}
                y={label.y + 10}
                fontSize="26"
                fontWeight="700"
                fontFamily="ui-monospace, Menlo, Consolas, monospace"
                fill={
                  index === focusedLayer ? "var(--color-theme-data2)" : "var(--color-theme-accent3)"
                }
              >
                {layer.folder}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <div className="absolute top-[300px] right-32 w-[700px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step >= SWAP_STEP ? "swap" : layers[focusedLayer].folder}
            initial={allowance.ambient ? { opacity: 0, x: 40 } : false}
            animate={{ opacity: 1, x: 0 }}
            exit={allowance.ambient ? { opacity: 0, x: -40 } : { opacity: 0 }}
            transition={stepTransition(allowance, 0.35)}
          >
            {step >= SWAP_STEP ? <TemplateSwap /> : <LayerCard layer={layers[focusedLayer]} />}
          </motion.div>
        </AnimatePresence>
        <p className="mt-12 text-[24px] text-theme-neutral">
          Lint rules enforce the seams: decks import only <code className="font-mono">@core</code>.
        </p>
      </div>
    </div>
  );
}

/** One layer of this very slide, drawn in its own flat 600x338 coordinates. */
function LayerPlane({
  projector,
  index,
  look,
}: {
  projector: Projector;
  index: number;
  look: MiniPalette;
}) {
  if (index === 0) return <CorePlane projector={projector} />;
  if (index === 1) return <TemplatePlane projector={projector} look={look} />;
  return <ContentPlane projector={projector} look={look} />;
}

function CorePlane({ projector }: { projector: Projector }) {
  return (
    <g>
      <PRect
        projector={projector}
        x={0}
        y={0}
        width={PLANE_WIDTH}
        height={PLANE_HEIGHT}
        radius={14}
        fill="var(--color-theme-accent1)"
        stroke="var(--color-theme-accent3)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <PRect
        projector={projector}
        x={18}
        y={18}
        width={PLANE_WIDTH - 36}
        height={FOOTER_TOP - 30}
        radius={8}
        fill="none"
        stroke="var(--color-theme-accent4)"
        strokeWidth={2}
        strokeDasharray="10 8"
        vectorEffect="non-scaling-stroke"
      />
      <PText
        projector={projector}
        x={300}
        y={160}
        textAnchor="middle"
        fontSize={24}
        fill="var(--color-theme-neutral)"
      >
        1920 × 1080 stage
      </PText>
      <PRect
        projector={projector}
        x={0}
        y={FOOTER_TOP}
        width={PLANE_WIDTH}
        height={PLANE_HEIGHT - FOOTER_TOP}
        fill="var(--color-theme-on-primary)"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((dot) => (
        <PCircle
          key={dot}
          projector={projector}
          cx={216 + dot * 24}
          cy={FOOTER_TOP + 24}
          r={6}
          fill={dot < 6 ? "var(--color-theme-accent3)" : "var(--color-theme-data2)"}
        />
      ))}
      <PText
        projector={projector}
        x={572}
        y={FOOTER_TOP + 31}
        textAnchor="end"
        fontSize={18}
        fill="var(--color-theme-neutral)"
      >
        6 / 11
      </PText>
    </g>
  );
}

function TemplatePlane({ projector, look }: { projector: Projector; look: MiniPalette }) {
  return (
    <g>
      <PRect
        projector={projector}
        x={0}
        y={0}
        width={PLANE_WIDTH}
        height={PLANE_HEIGHT}
        radius={14}
        fill="var(--color-theme-accent4)"
        opacity={0.45}
        stroke="var(--color-theme-accent3)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {[look.surface, look.text, ...look.bars].map((color, swatch) => (
        <PCircle
          key={color}
          projector={projector}
          cx={60 + swatch * 70}
          cy={80}
          r={26}
          fill={color}
        />
      ))}
      <PText
        projector={projector}
        x={60}
        y={210}
        fontSize={96}
        fontWeight={700}
        fill={look.surface}
      >
        Aa
      </PText>
      <PText projector={projector} x={230} y={200} fontSize={22} fill="var(--color-theme-accent5)">
        templates/{look.name}
      </PText>
      <PRect
        projector={projector}
        x={0}
        y={FOOTER_TOP}
        width={PLANE_WIDTH}
        height={PLANE_HEIGHT - FOOTER_TOP}
        fill={look.bars[0]}
        opacity={0.85}
      />
    </g>
  );
}

function ContentPlane({ projector, look }: { projector: Projector; look: MiniPalette }) {
  return (
    <g>
      <PRect
        projector={projector}
        x={0}
        y={0}
        width={PLANE_WIDTH}
        height={FOOTER_TOP}
        radius={14}
        fill={look.surface}
        opacity={0.94}
        stroke="var(--color-theme-accent3)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <PText projector={projector} x={40} y={78} fontSize={48} fontWeight={700} fill={look.text}>
        The pitch
      </PText>
      {look.bars.map((color, bar) => (
        <PRect
          key={color}
          projector={projector}
          x={40 + bar * 130}
          y={130 - bar * 20}
          width={100}
          height={120 + bar * 20}
          radius={10}
          fill={color}
        />
      ))}
      <PCircle projector={projector} cx={500} cy={180} r={56} fill={look.bars[0]} opacity={0.85} />
    </g>
  );
}

function LayerCard({ layer }: { layer: Layer }) {
  return (
    <div>
      <div className="flex items-center gap-6">
        <p className="font-mono text-[40px] font-bold text-theme-accent3">{layer.folder}</p>
        <span
          className={`rounded-full px-5 py-1 text-[24px] font-bold ${
            layer.freedom === "Free"
              ? "bg-theme-data1 text-theme-on-primary"
              : "bg-theme-accent4 text-theme-accent5"
          }`}
        >
          {layer.freedom}
        </span>
      </div>
      <p className="mt-4 text-[64px] leading-none font-bold">{layer.role}</p>
      <p className="mt-8 text-[32px] leading-snug text-theme-accent5">{layer.detail}</p>
    </div>
  );
}

function TemplateSwap() {
  return (
    <div>
      <p className="text-[56px] leading-tight font-bold">
        Swap the template.
        <br />
        Keep the deck.
      </p>
      <div className="mt-10 flex items-center gap-6">
        <MiniSlide look={defaultLook} />
        <ArrowRight aria-hidden="true" className="size-12 shrink-0 text-theme-data2" />
        <MiniSlide look={altLook} />
      </div>
    </div>
  );
}

function MiniSlide({ look }: { look: MiniPalette }) {
  return (
    <figure className="flex-1">
      <div
        aria-hidden="true"
        className="flex aspect-video flex-col rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: look.surface, color: look.text }}
      >
        <span className="text-[30px] leading-none font-bold">The pitch</span>
        <div className="mt-4 grid flex-1 grid-cols-3 gap-3">
          {look.bars.map((color) => (
            <span key={color} className="rounded-md" style={{ backgroundColor: color }} />
          ))}
        </div>
      </div>
      <figcaption className="mt-3 font-mono text-[20px] text-theme-neutral">
        templates/{look.name}
      </figcaption>
    </figure>
  );
}
