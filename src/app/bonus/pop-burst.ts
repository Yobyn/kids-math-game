/**
 * A balloon bursting into pieces, in Ballonnen (balloons.component.ts): the
 * skin flies apart from where it was, slows, drops a little and fades, all
 * in under half a second. Only for drawing: the game's rules (balloons.ts)
 * are done with a balloon the moment it is popped.
 *
 * Free of the DOM, so the pieces' paths can be tested.
 */

export interface Burst {
  x: number;
  y: number;
  radius: number;
  /** The balloon's place in the field's colours, 0 to 1. */
  hue: number;
  /** Seconds since it burst. */
  age: number;
  /** Where the first piece flies, so no two bursts look the same. */
  turn: number;
}

export interface Piece {
  x: number;
  y: number;
  /** Which way the piece points, in radians. */
  angle: number;
  size: number;
  alpha: number;
}

/** How long the pieces last, in seconds. */
export const BURST_LIFE = 0.45;
/** How many pieces a balloon bursts into. */
export const PIECES = 8;
/** How far the pieces fly, in balloon radii, by the time they fade. */
export const SPREAD = 2.2;
/** How far they drop by then, in balloon radii. */
export const DROP = 0.6;

export function newBurst(x: number, y: number, radius: number, hue: number, turn = 0): Burst {
  return { x, y, radius, hue, age: 0, turn };
}

/** The pieces of a burst at its age: flying out fast, then slowing, dropping and fading. */
export function piecesOf(burst: Burst): Piece[] {
  const t = Math.min(1, Math.max(0, burst.age / BURST_LIFE));
  // Fast at first, then slowing: the skin snaps away and drifts
  const out = 1 - (1 - t) * (1 - t);
  const pieces: Piece[] = [];
  for (let i = 0; i < PIECES; i++) {
    const angle = burst.turn + (i / PIECES) * Math.PI * 2;
    const reach = burst.radius * (0.6 + SPREAD * out);
    pieces.push({
      x: burst.x + Math.cos(angle) * reach,
      y: burst.y + Math.sin(angle) * reach + burst.radius * DROP * t * t,
      angle: angle + t * 2,
      size: burst.radius * 0.35 * (1 - 0.4 * t),
      alpha: 1 - t
    });
  }
  return pieces;
}

/** The bursts this much later: older, and gone once their pieces have faded. */
export function ageBursts(bursts: Burst[], seconds: number): Burst[] {
  return bursts
    .map(burst => ({ ...burst, age: burst.age + Math.max(0, seconds) }))
    .filter(burst => burst.age < BURST_LIFE);
}
