import { type Arena, type Body, clampToArena, isSettled, settleWorld, stepWorld } from "./physics";

export interface Point {
  x: number;
  y: number;
}

/** composed: pieces sit where the slide places them; falling: physics runs; rebuilding: pieces fly home. */
export type PlaygroundMode = "composed" | "falling" | "rebuilding";

/** Drives the slide pieces and paints them straight to their elements, outside React renders. */
export interface Playground {
  attach(index: number, element: HTMLElement | null): void;
  stop(): void;
  grab(index: number, point: Point, time: number): void;
  drag(point: Point, time: number): void;
  release(time: number): void;
  collapse(): void;
  rebuild(): void;
}

interface Sample extends Point {
  time: number;
}

const MAX_THROW_SPEED = 4200;
const THROW_WINDOW_MS = 90;
const REBUILD_MS = 750;

export function bodyTransform(body: Body): string {
  return `translate(${body.x}px, ${body.y}px) rotate(${body.tilt}deg)`;
}

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * `home` is the composed slide layout. `animate` false skips the animation loop:
 * pieces drop or return instantly, for PDF export and reduced-motion viewers.
 */
export function createPlayground(
  arena: Arena,
  home: Body[],
  animate: boolean,
  onModeChange: (mode: PlaygroundMode) => void,
): Playground {
  let bodies = home;
  let mode: PlaygroundMode = "composed";
  const elements: (HTMLElement | null)[] = [];
  let frame: number | null = null;
  // Null until the first animation frame: its timestamp can precede performance.now().
  let lastTime: number | null = null;
  let rebuildFrom: Body[] = home;
  let rebuildStart: number | null = null;
  let grabbed: { index: number; offset: Point } | null = null;
  let samples: Sample[] = [];

  function setMode(next: PlaygroundMode) {
    mode = next;
    onModeChange(next);
  }

  function paint() {
    bodies.forEach((body, index) => {
      const element = elements[index];
      if (element) element.style.transform = bodyTransform(body);
    });
  }

  function stepRebuild(time: number): boolean {
    if (rebuildStart === null) rebuildStart = time;
    const progress = Math.min(1, (time - rebuildStart) / REBUILD_MS);
    const eased = easeOutCubic(progress);
    bodies = rebuildFrom.map((from, index) => ({
      ...home[index],
      x: lerp(from.x, home[index].x, eased),
      y: lerp(from.y, home[index].y, eased),
      tilt: lerp(from.tilt, 0, eased),
    }));
    return progress >= 1;
  }

  function tick(time: number) {
    if (lastTime === null) {
      lastTime = time;
      frame = requestAnimationFrame(tick);
      return;
    }
    const seconds = Math.max(0, time - lastTime) / 1000;
    lastTime = time;

    let finished: boolean;
    if (mode === "rebuilding") {
      finished = stepRebuild(time);
      if (finished) setMode("composed");
    } else {
      bodies = stepWorld(bodies, arena, seconds);
      finished = isSettled(bodies, arena);
    }
    paint();
    frame = finished ? null : requestAnimationFrame(tick);
  }

  function wake() {
    if (!animate || frame !== null) return;
    lastTime = null;
    frame = requestAnimationFrame(tick);
  }

  function throwVelocity(): Point {
    if (samples.length < 2) return { x: 0, y: 0 };
    const first = samples[0];
    const last = samples[samples.length - 1];
    const seconds = (last.time - first.time) / 1000;
    if (seconds <= 0) return { x: 0, y: 0 };
    const clamp = (speed: number) => Math.max(-MAX_THROW_SPEED, Math.min(MAX_THROW_SPEED, speed));
    return { x: clamp((last.x - first.x) / seconds), y: clamp((last.y - first.y) / seconds) };
  }

  function recentSamples(time: number): Sample[] {
    return samples.filter((sample) => time - sample.time <= THROW_WINDOW_MS);
  }

  function replaceBody(index: number, body: Body) {
    bodies = bodies.map((current, bodyIndex) => (bodyIndex === index ? body : current));
  }

  function collapse() {
    if (mode === "falling") return;
    setMode("falling");
    if (animate) {
      wake();
    } else {
      bodies = settleWorld(bodies, arena);
      paint();
    }
  }

  return {
    attach(index, element) {
      elements[index] = element;
      if (element) element.style.transform = bodyTransform(bodies[index]);
    },
    stop() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    },
    grab(index, point, time) {
      // Touching the composed slide is what breaks it.
      if (mode !== "falling") setMode("falling");
      const body = bodies[index];
      grabbed = { index, offset: { x: point.x - body.x, y: point.y - body.y } };
      samples = [{ ...point, time }];
      replaceBody(index, { ...body, held: true, vx: 0, vy: 0 });
      wake();
    },
    drag(point, time) {
      if (!grabbed) return;
      samples = recentSamples(time).concat({ ...point, time });
      const velocity = throwVelocity();
      const held = bodies[grabbed.index];
      replaceBody(
        grabbed.index,
        clampToArena(
          {
            ...held,
            x: point.x - grabbed.offset.x,
            y: point.y - grabbed.offset.y,
            vx: velocity.x,
            vy: velocity.y,
          },
          arena,
        ),
      );
      if (animate) wake();
      else paint();
    },
    release(time) {
      if (!grabbed) return;
      samples = recentSamples(time);
      const velocity = throwVelocity();
      const held = bodies[grabbed.index];
      replaceBody(grabbed.index, { ...held, held: false, vx: velocity.x, vy: velocity.y });
      grabbed = null;
      samples = [];
      if (animate) {
        wake();
      } else {
        bodies = settleWorld(bodies, arena);
        paint();
      }
    },
    collapse,
    rebuild() {
      grabbed = null;
      if (!animate) {
        bodies = home;
        paint();
        setMode("composed");
        return;
      }
      rebuildFrom = bodies;
      rebuildStart = null;
      setMode("rebuilding");
      wake();
    },
  };
}
