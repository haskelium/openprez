import { describe, expect, it } from "vitest";
import type { Arena, Body } from "./physics";
import { isSettled, settleWorld, stepWorld } from "./physics";

const ARENA: Arena = { width: 800, height: 600 };

function makeBody(overrides: Partial<Body>): Body {
  return { x: 0, y: 0, width: 160, height: 80, vx: 0, vy: 0, tilt: 0, held: false, ...overrides };
}

/** A 200x100 pedestal resting on the floor: its top edge sits at y = 500. */
const pedestal = makeBody({ x: 300, y: 500, width: 200, height: 100 });

describe("supported settling", () => {
  it("does not settle a zero-velocity piece with no physical support", () => {
    const airborne = makeBody({ x: 300, y: 120 });

    expect(isSettled([airborne], ARENA)).toBe(false);
    expect(settleWorld([airborne], ARENA)[0].y).toBeGreaterThan(airborne.y);
  });
});

describe("corner rests", () => {
  it("keeps a piece flat and still when its center of mass sits over its support", () => {
    // Overlap 360..500 with the pedestal; the piece's center (440) is carried.
    const carried = makeBody({ x: 360, y: 420 });
    let world = [pedestal, carried];
    for (let frame = 0; frame < 30; frame += 1) {
      world = stepWorld(world, ARENA, 1 / 60);
    }
    expect(world[1].x).toBeCloseTo(360, 0);
    expect(world[1].tilt).toBe(0);
  });

  it("tips and slides a piece toward the overhang it rests a corner on", () => {
    // Only 460..500 carries the piece; its center (540) hangs past the pedestal's edge.
    const overhanging = makeBody({ x: 460, y: 420 });
    let world = [pedestal, overhanging];
    let tipped = false;
    for (let frame = 0; frame < 120; frame += 1) {
      world = stepWorld(world, ARENA, 1 / 60);
      tipped ||= world[1].tilt > 0;
    }
    expect(tipped).toBe(true);
    expect(world[1].x).toBeGreaterThan(460);
  });

  it("lets a corner-resting piece topple off its support and land on the floor", () => {
    const overhanging = makeBody({ x: 460, y: 420 });
    const settled = settleWorld([pedestal, overhanging], ARENA);
    expect(isSettled(settled, ARENA)).toBe(true);
    expect(settled[1].x).toBeGreaterThan(500);
    expect(settled[1].y).toBeCloseTo(ARENA.height - overhanging.height, 0);
  });

  it("rests a corner-perched piece leaning on the wall that blocks its overhang", () => {
    // The piece is jammed against the left wall; only its right corner rests on the pedestal.
    const wallPedestal = makeBody({ x: 120, y: 500, width: 200, height: 100 });
    const propped = makeBody({ x: 0, y: 420 });
    const settled = settleWorld([wallPedestal, propped], ARENA);
    expect(isSettled(settled, ARENA)).toBe(true);
    expect(settled[1].x).toBeCloseTo(0, 0);
    expect(settled[1].tilt).toBeLessThan(0);
  });
});
