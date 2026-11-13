/** A rigid, axis-aligned piece of slide content, in stage pixels. */
export interface Body {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  /** Visual tilt in degrees; collisions stay axis-aligned. */
  tilt: number;
  held: boolean;
}

export interface Arena {
  width: number;
  height: number;
}

const GRAVITY = 2800;
/** Bounciness: walls and the footer floor are lively, piece-on-piece contact stays calm so stacks rest. */
const WALL_RESTITUTION = 0.6;
const FLOOR_RESTITUTION = 0.62;
const BODY_RESTITUTION = 0.62;
/** Per-substep speed kept while sliding on a surface. */
const SURFACE_FRICTION = 0.985;
/** Degrees of rock per px/s of landing speed, capped, so landings feel physical. */
const LANDING_ROCK = 1 / 180;
const MAX_LANDING_ROCK = 8;
/** Below this landing speed a contact is resting, not an impact; resting pieces must not rock. */
const IMPACT_SPEED = 150;
const REST_SPEED = 30;
const MAX_TILT = 12;
/** How close a bottom edge must sit to a surface below to count as resting on it. */
const SUPPORT_TOLERANCE = 1;
/** How fast a perched piece pivots off its corner, in px/s: contact friction would stall a gentler push. */
const TOPPLE_SLIDE_SPEED = 260;
const SUBSTEP = 1 / 120;
const MAX_FRAME = 1 / 20;
const COLLISION_PASSES = 3;

/** Advance the simulation by one animation frame, in fixed substeps for stability. */
export function stepWorld(bodies: Body[], arena: Arena, frameSeconds: number): Body[] {
  let world = bodies;
  let remaining = Math.min(frameSeconds, MAX_FRAME);
  while (remaining > 0) {
    const dt = Math.min(SUBSTEP, remaining);
    world = substep(world, arena, dt);
    remaining -= dt;
  }
  return world;
}

/**
 * True when nothing moves, nothing is held and nothing is perched unstably, so the
 * animation loop may sleep. A piece leaning on a wall is a stable rest, not a perch.
 */
export function isSettled(bodies: Body[], arena: Arena): boolean {
  return bodies.every((body) => {
    if (body.held) return false;
    const support = supportUnder(body, bodies, arena);
    if (!support.contact) return false;
    if (support.tip !== 0 && !support.propped) return false;
    if (Math.abs(body.vx) >= REST_SPEED || Math.abs(body.vy) >= REST_SPEED) return false;
    // A propped piece rests tilted; every other settled piece rests flat.
    return support.propped || Math.abs(body.tilt) < 0.2;
  });
}

/** Run the simulation until it settles, for viewers who prefer no animated motion. */
export function settleWorld(bodies: Body[], arena: Arena): Body[] {
  let world = bodies;
  for (let frame = 0; frame < 600 && !isSettled(world, arena); frame += 1) {
    world = stepWorld(world, arena, MAX_FRAME);
  }
  // Resting speeds go to zero; a piece propped against a wall rests at its leaning pose.
  return world.map((body) => {
    const support = supportUnder(body, world, arena);
    return { ...body, vx: 0, vy: 0, tilt: support.propped ? support.tip * MAX_TILT : 0 };
  });
}

export function clampToArena(body: Body, arena: Arena): Body {
  return {
    ...body,
    x: Math.min(Math.max(body.x, 0), arena.width - body.width),
    y: Math.min(Math.max(body.y, 0), arena.height - body.height),
  };
}

function substep(bodies: Body[], arena: Arena, dt: number): Body[] {
  let world = bodies.map((body) => (body.held ? body : integrate(body, dt)));
  world = world.map((body) => bounceOffWalls(body, arena));
  for (let pass = 0; pass < COLLISION_PASSES; pass += 1) {
    world = resolveCollisions(world, arena);
  }
  return world.map((body) => settleBody(body, world, arena, dt));
}

function integrate(body: Body, dt: number): Body {
  const vy = body.vy + GRAVITY * dt;
  return { ...body, vy, x: body.x + body.vx * dt, y: body.y + vy * dt };
}

function bounceOffWalls(body: Body, arena: Arena): Body {
  if (body.held) return clampToArena(body, arena);
  const next = { ...body };
  if (next.x < 0) {
    next.x = 0;
    next.vx = Math.abs(next.vx) * WALL_RESTITUTION;
  } else if (next.x + next.width > arena.width) {
    next.x = arena.width - next.width;
    next.vx = -Math.abs(next.vx) * WALL_RESTITUTION;
  }
  if (next.y < 0) {
    next.y = 0;
    next.vy = Math.abs(next.vy) * WALL_RESTITUTION;
  } else if (next.y + next.height > arena.height) {
    const landingSpeed = Math.max(0, next.vy);
    next.y = arena.height - next.height;
    next.vy = settleSpeed(-Math.abs(next.vy) * FLOOR_RESTITUTION);
    next.tilt += landingRock(landingSpeed, next.vx);
    next.vx = settleSpeed(next.vx * SURFACE_FRICTION);
  }
  return next;
}

function onFloor(body: Body, arena: Arena): boolean {
  return body.y + body.height >= arena.height - 0.5;
}

/** How much of a separation each body takes: held or floor-supported bodies don't yield. */
function shares(a: Body, b: Body, immovableA: boolean, immovableB: boolean): [number, number] {
  if (a.held || (immovableA && !immovableB)) return [0, 1];
  if (b.held || (immovableB && !immovableA)) return [1, 0];
  return [0.5, 0.5];
}

function resolveCollisions(bodies: Body[], arena: Arena): Body[] {
  const world = bodies.map((body) => ({ ...body }));
  for (let i = 0; i < world.length; i += 1) {
    for (let j = i + 1; j < world.length; j += 1) {
      separatePair(world[i], world[j], arena);
    }
  }
  return world.map((body) => (body.held ? body : clampToArena(body, arena)));
}

/** Push two overlapping bodies apart along the shallower axis and exchange velocity. */
function separatePair(a: Body, b: Body, arena: Arena): void {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return;

  if (overlapX < overlapY) {
    const direction = a.x + a.width / 2 < b.x + b.width / 2 ? -1 : 1;
    const [shareA, shareB] = shares(a, b, false, false);
    a.x += direction * overlapX * shareA;
    b.x -= direction * overlapX * shareB;
    [a.vx, b.vx] = exchange(a.vx, b.vx, a.held, b.held, direction);
    return;
  }

  const aIsAbove = a.y + a.height / 2 < b.y + b.height / 2;
  const direction = aIsAbove ? -1 : 1;
  const [shareA, shareB] = shares(a, b, onFloor(a, arena), onFloor(b, arena));
  a.y += direction * overlapY * shareA;
  b.y -= direction * overlapY * shareB;
  const impactSpeed = Math.abs(a.vy - b.vy);
  [a.vy, b.vy] = exchange(a.vy, b.vy, a.held, b.held, direction);
  const upper = aIsAbove ? a : b;
  if (!upper.held) {
    upper.vx = settleSpeed(upper.vx * SURFACE_FRICTION);
    upper.tilt += landingRock(impactSpeed, upper.vx);
  }
  a.vy = settleSpeed(a.vy);
  b.vy = settleSpeed(b.vy);
}

/** 1D collision with restitution; a held body acts as infinitely heavy. */
function exchange(
  va: number,
  vb: number,
  heldA: boolean,
  heldB: boolean,
  directionOfA: number,
): [number, number] {
  const approaching = (vb - va) * directionOfA > 0;
  if (!approaching) return [va, vb];
  if (heldA) return [va, va - BODY_RESTITUTION * (vb - va)];
  if (heldB) return [vb - BODY_RESTITUTION * (va - vb), vb];
  const mean = (va + vb) / 2;
  const half = (BODY_RESTITUTION * (va - vb)) / 2;
  return [mean - half, mean + half];
}

function settleSpeed(speed: number): number {
  return Math.abs(speed) < REST_SPEED ? 0 : speed;
}

/** Tilt kick from a landing; a resting contact (below the impact speed) doesn't rock. */
function landingRock(impactSpeed: number, horizontalSpeed: number): number {
  if (impactSpeed <= IMPACT_SPEED) return 0;
  const rock = Math.min(MAX_LANDING_ROCK, impactSpeed * LANDING_ROCK);
  return horizontalSpeed >= 0 ? rock : -rock;
}

/** Where a body's bottom edge is carried: fully, by one corner only, or not at all. */
interface Support {
  /** True when the bottom edge rests on the floor or on another body's top. */
  contact: boolean;
  /** Direction the piece tips toward its overhang (-1 left, 1 right); 0 when carried or airborne. */
  tip: number;
  /** True when the overhang side is blocked by an arena wall: the piece leans on it and rests. */
  propped: boolean;
}

/** Collect what carries the body's bottom edge, if anything. */
function supportUnder(body: Body, world: Body[], arena: Arena): Support {
  const center = body.x + body.width / 2;
  const bottom = body.y + body.height;
  if (bottom >= arena.height - SUPPORT_TOLERANCE) return { contact: true, tip: 0, propped: false };
  let tip = 0;
  for (const other of world) {
    if (other === body || Math.abs(other.y - bottom) > SUPPORT_TOLERANCE) continue;
    const from = Math.max(body.x, other.x);
    const to = Math.min(body.x + body.width, other.x + other.width);
    if (to <= from) continue;
    if (center >= from && center <= to) return { contact: true, tip: 0, propped: false };
    // A corner-only contact: the piece tips toward the side its center hangs over.
    tip = center < from ? -1 : 1;
  }
  if (tip === 0) return { contact: false, tip: 0, propped: false };
  const againstWall =
    (tip < 0 && body.x <= SUPPORT_TOLERANCE) ||
    (tip > 0 && body.x + body.width >= arena.width - SUPPORT_TOLERANCE);
  return { contact: true, tip, propped: againstWall };
}

/**
 * Eases each body's tilt toward its pose, and topples corner rests: a piece whose
 * center of mass hangs off its support pivots off the carried corner at a steady
 * speed — too low and contact friction stalls the slide — until it loses contact
 * and falls. A piece whose overhang side is blocked by a wall leans on it and rests.
 */
function settleBody(body: Body, world: Body[], arena: Arena, dt: number): Body {
  if (body.held) return body;
  const support = supportUnder(body, world, arena);
  const toppling = support.tip !== 0 && !support.propped;
  const vx = toppling ? support.tip * TOPPLE_SLIDE_SPEED : body.vx;
  const resting = support.contact && Math.abs(body.vy) < REST_SPEED;
  const target = resting
    ? support.tip * MAX_TILT
    : Math.max(-MAX_TILT, Math.min(MAX_TILT, vx / 90));
  const tilt = body.tilt + (target - body.tilt) * Math.min(1, dt * 10);
  return { ...body, vx, tilt: Math.abs(tilt) < 0.05 ? 0 : tilt };
}
