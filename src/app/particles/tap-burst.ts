/**
 * The maths behind a tap: a small scatter of the field's particles at the
 * point of contact, kept free of the DOM so it can be tested directly.
 *
 * It is the second of the field's two vocabularies. A REWARD swells the whole
 * ring and lasts ~450ms (see PULSE_HALF_LIFE); a TAP stays under the finger
 * and is gone in 300ms. Small areas move for less time than large ones, so
 * the two read as different gestures of the same surface rather than one
 * effect at two sizes — if they ever look alike, the reward has lost its
 * meaning.
 *
 * Every burst lives in a fixed pool allocated once. A child mashing the
 * keypad recycles the oldest burst instead of growing anything.
 */

import { angleToHueMix, fieldColour } from './particle-field';

/** A burst is spent inside this many seconds. */
export const BURST_LIFE = 0.3;
export const SPARKS_PER_BURST = 12;
/** At most this many bursts at once; a new tap replaces the oldest. */
export const MAX_BURSTS = 6;
/** How quickly a spark loses its speed, per second. High, so it stops close. */
export const SPARK_DRAG = 9;
/** Spark launch speed, CSS px per second. */
export const SPARK_SPEED_MIN = 260;
export const SPARK_SPEED_MAX = 560;
/** The ring that marks the point of contact grows to this radius, CSS px. */
export const RIPPLE_RADIUS = 30;

/**
 * What counts as something a child tapped ON rather than past. The field
 * answers the thing that did something, not every touch of the screen.
 */
export const TAP_TARGETS = 'button, a[href], [role="button"], [role="tab"]';
/** A control that is there but refuses the tap gets no answer from the field. */
export const TAP_REFUSED = ':disabled, [aria-disabled="true"]';

export interface Burst {
  live: boolean;
  x: number;
  y: number;
  age: number;
  /** 0 at the field's blue end, 1 at its magenta end. */
  hueMix: number;
  angles: number[];
  speeds: number[];
  sizes: number[];
}

function emptyBurst(): Burst {
  return {
    live: false, x: 0, y: 0, age: 0, hueMix: 0,
    angles: new Array(SPARKS_PER_BURST).fill(0),
    speeds: new Array(SPARKS_PER_BURST).fill(0),
    sizes: new Array(SPARKS_PER_BURST).fill(0)
  };
}

/**
 * How far a spark has travelled after `age` seconds. Speed bleeds off
 * exponentially, so it flies out fast and settles: never further than
 * speed / SPARK_DRAG however long it lives.
 */
export function sparkDistance(speed: number, age: number): number {
  if (age <= 0) {
    return 0;
  }
  return (speed / SPARK_DRAG) * (1 - Math.exp(-SPARK_DRAG * age));
}

/** Fully bright at contact, gone at BURST_LIFE, easing out. */
export function burstAlpha(age: number): number {
  if (age <= 0) {
    return 1;
  }
  const left = 1 - age / BURST_LIFE;
  return left <= 0 ? 0 : left * left;
}

/** The ripple grows fast then slows, so contact reads as immediate. */
export function rippleRadius(age: number): number {
  const t = Math.min(Math.max(age / BURST_LIFE, 0), 1);
  return RIPPLE_RADIUS * (1 - (1 - t) * (1 - t));
}

/**
 * The ring's own colour at the bearing of the tap from the centre of the
 * screen — so a burst is the field under the finger, not a new colour.
 */
export function tapHueMix(x: number, y: number, width: number, height: number): number {
  return angleToHueMix(Math.atan2(y - height / 2, x - width / 2));
}

export function sparkColour(burst: Burst, alpha: number): string {
  const { r, g, b } = fieldColour(burst.hueMix);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export class BurstPool {
  /** Allocated once. Nothing is added to or removed from it afterwards. */
  readonly bursts: Burst[] = Array.from({ length: MAX_BURSTS }, emptyBurst);
  private next = 0;

  constructor(private random: () => number = Math.random) {}

  /** Starts a burst at (x, y), reusing the oldest slot. */
  burst(x: number, y: number, hueMix: number) {
    const burst = this.bursts[this.next];
    this.next = (this.next + 1) % MAX_BURSTS;

    burst.live = true;
    burst.x = x;
    burst.y = y;
    burst.age = 0;
    burst.hueMix = hueMix;
    // Spread evenly around the point with a little jitter, so a burst reads
    // as a scatter and never as a clump off to one side
    const step = (Math.PI * 2) / SPARKS_PER_BURST;
    const turn = this.random() * step;
    for (let i = 0; i < SPARKS_PER_BURST; i++) {
      burst.angles[i] = turn + i * step + (this.random() - 0.5) * step * 0.6;
      burst.speeds[i] = SPARK_SPEED_MIN + this.random() * (SPARK_SPEED_MAX - SPARK_SPEED_MIN);
      burst.sizes[i] = 1.4 + this.random() * 1.8;
    }
  }

  /** Ages every burst; returns how many are still alive. */
  step(seconds: number): number {
    let alive = 0;
    for (const burst of this.bursts) {
      if (!burst.live) {
        continue;
      }
      burst.age += Math.max(0, seconds);
      if (burst.age >= BURST_LIFE) {
        burst.live = false;
      } else {
        alive++;
      }
    }
    return alive;
  }

  get alive(): number {
    return this.bursts.filter(burst => burst.live).length;
  }

  /** Forgets every burst — when motion is turned off mid-flight. */
  clear() {
    this.bursts.forEach(burst => { burst.live = false; });
  }
}
