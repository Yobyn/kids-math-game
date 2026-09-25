import { stepColour } from '../theme/palette';

/**
 * The three difficulties as three climbs: a low hill, two rising hills, a
 * tall peak with a flag. Drawn rather than labelled, and never with stars —
 * stars are what a round EARNS, so three of them on the hardest card read as
 * "the best result" instead of "the biggest climb". The heights are the
 * whole design, so they live here, where a test can hold them in order.
 */

export type ClimbLevel = 'easy' | 'medium' | 'hard';

/** Peak heights as a fraction of the drawing, left to right. */
export const CLIMBS: { [level in ClimbLevel]: number[] } = {
  easy: [0.4],
  medium: [0.5, 0.72],
  hard: [0.45, 1, 0.6]
};

const W = 60;
const H = 40;

/**
 * One closed path of humps along the bottom of a 60x40 box, one per peak,
 * each rising to its fraction of the height (with a little room left above
 * the tallest for a flag).
 */
export function hillPath(peaks: number[]): string {
  if (!peaks.length) {
    return '';
  }
  const span = W / peaks.length;
  let d = `M0 ${H}`;
  peaks.forEach((peak, i) => {
    const top = round(H - Math.min(Math.max(peak, 0), 1) * (H - 8));
    d += `Q${round(span * i + span / 2)} ${round(2 * top - H)} ${round(span * (i + 1))} ${H}`;
  });
  return d + 'Z';
}

/** Where the flag goes: on the tallest peak, if the climb has one. */
export function flagAt(peaks: number[]): { x: number; y: number } | null {
  if (peaks.length < 3) {
    return null;
  }
  const tallest = peaks.indexOf(Math.max(...peaks));
  const span = W / peaks.length;
  return { x: round(span * tallest + span / 2), y: round(H - peaks[tallest] * (H - 8)) };
}

export interface Climb {
  level: ClimbLevel;
  colour: string;
  path: string;
  flag: { x: number; y: number } | null;
}

/** The three climbs, easiest first, each in the ring's colour for its place. */
export function climbs(): Climb[] {
  const order: ClimbLevel[] = ['easy', 'medium', 'hard'];
  return order.map((level, i) => ({
    level,
    colour: stepColour(i + 1, order.length),
    path: hillPath(CLIMBS[level]),
    flag: flagAt(CLIMBS[level])
  }));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
