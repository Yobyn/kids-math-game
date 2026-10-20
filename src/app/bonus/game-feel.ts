/**
 * What the three bonus games share in how they feel (Yobyn, 2026-10-13:
 * "improving the game play of the games and the look and feel"): a 3-2-1
 * after Start, so the first moment of a game is never a surprise, and a
 * "+1" that floats up where a point is scored.
 *
 * Free of the DOM, so both can be tested straight.
 */

/** Seconds counted down after Start before anything moves. */
export const COUNTDOWN = 3;
/** How long a "+1" floats, in seconds, and how far it rises in that time. */
export const FLOAT_LIFE = 0.8;
export const FLOAT_RISE = 36;

/** The number a countdown shows with this many seconds left: 3, 2, 1, then 0 once it is over. */
export function countdownShown(left: number): number {
  return left > 0 ? Math.ceil(left - 1e-9) : 0;
}

export interface FloatUp {
  x: number;
  y: number;
  /** Seconds since the point was scored. */
  age: number;
  text: string;
}

export function newFloat(x: number, y: number, text = '+1'): FloatUp {
  return { x, y, age: 0, text };
}

/** Where a "+1" is and how clear, at its age: rising and fading, or only fading when calm. */
export function floatAt(float: FloatUp, calm = false): { x: number; y: number; alpha: number } {
  const t = Math.min(1, Math.max(0, float.age / FLOAT_LIFE));
  const rise = calm ? 0 : FLOAT_RISE * (1 - (1 - t) * (1 - t));
  return { x: float.x, y: float.y - rise, alpha: 1 - t * t };
}

/** The "+1"s this much later: older, and gone once faded. */
export function ageFloats(floats: FloatUp[], seconds: number): FloatUp[] {
  return floats
    .map(float => ({ ...float, age: float.age + Math.max(0, seconds) }))
    .filter(float => float.age < FLOAT_LIFE);
}

/** A short glow where something was struck (Balspel's walls), fading in this many seconds. */
export const FLASH_LIFE = 0.35;

export interface Flash {
  x: number;
  y: number;
  age: number;
}

/** The glows this much later: older, and gone once faded (after `life` seconds). */
export function ageFlashes(flashes: Flash[], seconds: number, life = FLASH_LIFE): Flash[] {
  return flashes
    .map(flash => ({ ...flash, age: flash.age + Math.max(0, seconds) }))
    .filter(flash => flash.age < life);
}

/**
 * A ball squashed for a moment as it lands or is struck, the same in every
 * game: this long, a quarter wider and flatter at first, easing back.
 */
export const SQUASH_TIME = 0.16;
export const SQUASH = 0.25;

/** How much wider (x) and flatter (y) a ball is with this much squash time left. */
export function squashScale(left: number): { x: number; y: number } {
  const amount = Math.min(1, Math.max(0, left / SQUASH_TIME)) * SQUASH;
  return { x: 1 + amount, y: 1 - amount };
}

/**
 * What the phone feels in the bonus games, through SoundService.vibrate, so
 * nothing when the child has turned sound off; the same as in a round
 * (2026-10-20: the games were the only part of the game that never buzzed).
 * A tick for a point, like a key's, and a right answer's double pulse when a
 * game with points ends. A balloon getting away is a soft nudge, gentler
 * than a wrong answer's buzz: a bonus game never tells a child off.
 */
export const POINT_BUZZ = 10;
export const END_BUZZ = [0, 30, 40, 30];
export const MISS_BUZZ = 40;
