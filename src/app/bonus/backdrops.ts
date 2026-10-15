/**
 * A background of its own for each bonus game (Yobyn, 2026-10-13: the
 * games' "look and feel"): far-off hills behind Springbal, a court marked
 * out under Balspel, soft clouds drifting behind Ballonnen. Faint, and
 * drawn on the see-through board, so the particle field still shows through
 * every one of them.
 *
 * The shapes are worked out here, free of the DOM, so they can be tested;
 * the drawing is in drawing.ts.
 */

export interface Point {
  x: number;
  y: number;
}

/** How faint a background is: it sits behind the game and the particle field shows through it. */
export const BACKDROP_ALPHA = 0.12;
/** Springbal's two rows of hills: the far one moves more slowly as the world goes by. */
export const HILL_LAYERS: Array<{ speed: number; height: number; wave: number }> = [
  { speed: 0.15, height: 0.3, wave: 0.9 },
  { speed: 0.35, height: 0.18, wave: 0.55 }
];

/**
 * A row of hills along the ground, as a line across the board from left to
 * right: `travelled` is how far the world has gone by, so the hills slide
 * past slower than the obstacles (far away), and repeat without a seam.
 */
export function hillLine(width: number, ground: number, travelled: number, layer: number, steps = 32): Point[] {
  const { speed, height, wave } = HILL_LAYERS[layer];
  const span = width * wave;
  const shift = (travelled * speed) % span;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (width * i) / steps;
    const phase = ((x + shift) / span) * Math.PI * 2;
    // Two waves together, the second twice as often so the row repeats: rounded hills of different sizes
    const rise = 0.6 + 0.3 * Math.sin(phase) + 0.1 * Math.sin(phase * 2 + 1);
    points.push({ x, y: ground - ground * height * rise });
  }
  return points;
}

/** Balspel's court: an inset outline, a half-way line and a circle in the middle, like a pitch seen from above. */
export function courtLines(width: number, height: number): { inset: number; middle: number; circle: number } {
  const inset = Math.max(10, Math.round(Math.min(width, height) * 0.05));
  return { inset, middle: height / 2, circle: Math.min(width, height) * 0.16 };
}

export interface Cloud {
  x: number;
  y: number;
  size: number;
}

/**
 * Ballonnen's clouds, drifting slowly sideways across the sky and coming
 * round again: the same few clouds, placed by their number, so the sky is
 * the same every game. Still under reduced motion.
 */
export function cloudsAt(width: number, height: number, seconds: number, calm: boolean): Cloud[] {
  const clouds: Cloud[] = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const size = width * (0.16 + 0.06 * (i % 3));
    const lane = height * (0.12 + 0.22 * i);
    const speed = 6 + 3 * i;
    const start = ((i * 0.37) % 1) * (width + size * 2);
    const travelled = calm ? 0 : seconds * speed;
    const x = ((start + travelled) % (width + size * 2)) - size;
    clouds.push({ x, y: lane, size });
  }
  return clouds;
}
