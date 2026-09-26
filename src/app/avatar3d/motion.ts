import { NO_ITEM } from '../avatar/avatar-model';

/**
 * How the character moves on the dressing-up screen, as numbers over time:
 * breathing, blinking, and a wave when something new is put on. Pure
 * arithmetic, no three.js, so each rule below is checked in a test; rig.ts
 * puts the numbers on the model.
 *
 * Small on purpose. The character is there to be looked at and dressed, so
 * the idle moves are the ones a real person makes standing still — a breath
 * every few seconds, a blink now and then — and never anything that pulls
 * the eye away from what is being chosen. None of it runs under reduced
 * motion (the stage's rule, not this file's).
 */

/** Seconds per breath: a calm, resting rate. */
export const BREATH_SECONDS = 4;
/** How far the chest, shoulders and head rise on a breath, in units (one head height is 2). */
export const BREATH_RISE = 0.05;
/** How far the arms swing out on a breath, in radians. */
export const BREATH_ARMS = 0.025;

/** A blink, eyes closing and opening, in seconds. */
export const BLINK_SECONDS = 0.16;
/** Blinks come this far apart, give or take BLINK_JITTER. */
export const BLINK_GAP = 3.6;
export const BLINK_JITTER = 1.6;

/** A wave, from the arm leaving the side to it being back, in seconds. */
export const WAVE_SECONDS = 1.7;
/** The character's right arm waves (on the viewer's left, facing them); a pet sits on the other side. */
export const WAVING_SIDE = -1;
/** The upper arm out from the side at the top of a wave, in radians: about level with the shoulder. */
export const WAVE_LIFT = 1.3;
/** The forearm bent up at the elbow while waving, in radians: pointing up. */
export const WAVE_BEND = 1.4;
/** How far the hand swings each way, and how many times, at the top of a wave. */
export const WAVE_SWING = 0.35;
export const WAVE_SWINGS = 3;

/** 0 at rest (breathed out), 1 breathed in: a smooth rise and fall. */
export function breath(seconds: number): number {
  return (1 - Math.cos((seconds / BREATH_SECONDS) * Math.PI * 2)) / 2;
}

/**
 * How open the eyes are: 1 open, 0 shut. Blinks come at uneven gaps, as a
 * person's do; a blink every so many seconds on the dot looks mechanical.
 * The gaps come from a fixed sequence, so the same moment always gives the
 * same answer (and a test can find the blinks).
 */
export function eyesOpen(seconds: number): number {
  let start = BLINK_GAP * 0.5;
  for (let i = 0; start <= seconds; i++) {
    const into = seconds - start;
    if (into < BLINK_SECONDS) {
      // Shut quickly, open a little slower
      const t = into / BLINK_SECONDS;
      return t < 0.4 ? 1 - t / 0.4 : (t - 0.4) / 0.6;
    }
    start += BLINK_GAP + BLINK_JITTER * jitter(i);
  }
  return 1;
}

/** A fixed, even spread of numbers from -1 to 1: the golden-ratio sequence. */
function jitter(i: number): number {
  const golden = 0.6180339887;
  return ((i + 1) * golden % 1) * 2 - 1;
}

export interface ArmPose {
  /** The upper arm lifted out from the side, radians (0 hanging). */
  lift: number;
  /** The forearm bent up at the elbow, radians (0 straight). */
  bend: number;
}

/**
 * The waving arm `seconds` into a wave: up, three swings of the hand, down.
 * At rest at both ends, so a wave never starts or finishes with a jump.
 */
export function wave(seconds: number): ArmPose {
  if (seconds <= 0 || seconds >= WAVE_SECONDS) {
    return { lift: 0, bend: 0 };
  }
  const up = 0.35;
  const down = 0.35;
  const top = WAVE_SECONDS - up - down;
  let raised: number;
  if (seconds < up) {
    raised = ease(seconds / up);
  } else if (seconds > WAVE_SECONDS - down) {
    raised = ease((WAVE_SECONDS - seconds) / down);
  } else {
    raised = 1;
  }
  // The swings happen while the arm is up, and fade in and out with it
  const swingTime = Math.min(Math.max(seconds - up, 0), top);
  const swing = Math.sin((swingTime / top) * Math.PI * 2 * WAVE_SWINGS) * WAVE_SWING * raised;
  return { lift: WAVE_LIFT * raised, bend: WAVE_BEND * raised + swing };
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** The wardrobe slots: something new in one of these is worth a wave (a new pet, a cape, a hello). */
const WORN = ['hat', 'glasses', 'top', 'pet', 'back'] as const;

/**
 * Whether going from `before` to `after` put something new on: a hat,
 * glasses or a top that was not there before. Taking something off, or
 * changing a face or hair, is not a new item.
 */
export function putOnSomethingNew(
  before: { [slot in typeof WORN[number]]?: string } | undefined,
  after: { [slot in typeof WORN[number]]?: string }
): boolean {
  if (!before) {
    return false;
  }
  return WORN.some(slot => {
    const now = after[slot];
    return !!now && now !== NO_ITEM && now !== before[slot];
  });
}

/** A pet wags in bursts, as pets do: this long, every TAIL_EVERY seconds. */
export const TAIL_BURST = 1.6;
export const TAIL_EVERY = 5;
/** How far the tail swings each way, radians, and how fast (seconds a swing and back). */
export const TAIL_SWING = 0.45;
export const TAIL_BEAT = 0.4;
/** The dragon's wings: a slow flap, this far each way, this long a beat. */
export const WING_FLAP = 0.2;
export const WING_BEAT = 2.2;

/**
 * The pet's tail, `seconds` in: still, then a burst of wagging that swells
 * and fades, then still again. The first burst comes a moment after arrival.
 */
export function tailWag(seconds: number): number {
  // Counted from a second in; before that the count wraps round into the
  // rest at the end of a cycle, so the tail is still on arrival too
  const into = ((seconds - 1) % TAIL_EVERY + TAIL_EVERY) % TAIL_EVERY;
  if (into >= TAIL_BURST) {
    return 0;
  }
  const swell = Math.sin((into / TAIL_BURST) * Math.PI);
  return Math.sin((into / TAIL_BEAT) * Math.PI * 2) * TAIL_SWING * swell;
}

/** The dragon's wings, `seconds` in: a slow, even flap, open and back. */
export function wingFlap(seconds: number): number {
  return Math.sin((seconds / WING_BEAT) * Math.PI * 2) * WING_FLAP;
}
