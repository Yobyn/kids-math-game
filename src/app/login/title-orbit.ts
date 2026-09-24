import { stepColour } from '../theme/palette';

/**
 * The maths symbols that circle the character on the title screen, placed
 * here rather than hand-positioned in CSS so the arrangement is arithmetic
 * that can be tested: evenly round the ring, on its edge, and each in the
 * ring's own colour for its place — the same `stepColour` the grade cards
 * and the round track use, so the first screen a child sees is already the
 * game's palette.
 */

/** Operators first: this is a maths game, and they read as that at a glance. */
export const ORBIT_SYMBOLS = ['+', '−', '×', '÷', '=', '7'];

export interface OrbitMark {
  symbol: string;
  /** Centre of the mark, as a percentage of the ring's box (0–100). */
  x: number;
  y: number;
  colour: string;
  /** Seconds to offset its bob by, so the marks do not move in lockstep. */
  delay: number;
}

/**
 * `count` marks spaced evenly round a circle of `radius` (a percentage of the
 * box, where 50 is the ring's own edge), starting at the top right so the
 * first one never sits on the character's head.
 */
export function orbitMarks(count = ORBIT_SYMBOLS.length, radius = 58): OrbitMark[] {
  const n = Math.max(0, Math.min(Math.floor(count), ORBIT_SYMBOLS.length));
  const start = -Math.PI / 3;
  return Array.from({ length: n }, (_, i) => {
    const angle = start + (i * 2 * Math.PI) / n;
    return {
      symbol: ORBIT_SYMBOLS[i],
      x: round(50 + radius * Math.cos(angle)),
      y: round(50 + radius * Math.sin(angle)),
      colour: stepColour(i + 1, n),
      delay: round(i * 0.35)
    };
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
