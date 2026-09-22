import { MAX_SPELLED } from './number-words';

/**
 * The gate in front of the grown-ups' screen.
 *
 * What is behind it — the honest trend, dips included, and the facts a child
 * keeps getting wrong — is useful to an adult and harmful to the child it is
 * about. So there has to be a door, and the door has to be one a young child
 * does not walk through by accident.
 *
 * Deliberately NOT arithmetic, which is the conventional parental gate. In a
 * maths game an arithmetic gate turns a locked door into a test a child can
 * fail, on the exact skill the product exists to build confidence in. This
 * gate asks the adult to read a number written out in words and type it in
 * digits: reading fluency and place value, not calculation.
 *
 * It also fails soft. A wrong answer never says "wrong" — it simply hands
 * over a different number — because a child who wandered in must not leave
 * having been told they got something wrong.
 *
 * Kept free of the DOM so the whole challenge space can be checked directly.
 */

export interface GateChallenge {
  /** The number the adult has to type, written out for them in words. */
  value: number;
}

/** Four digits, none of them zero, so the words are never trivially short. */
export const GATE_MIN = 1111;
export const GATE_MAX = 9999;

/**
 * A fresh challenge. Every digit is drawn from 1..9, which keeps the written
 * form long — "four thousand two hundred and six" is easier to read than
 * "four thousand", and a round number would give the gate away.
 */
export function newChallenge(random: () => number = Math.random): GateChallenge {
  let value = 0;
  for (let place = 0; place < 4; place++) {
    value = value * 10 + digit(random);
  }
  return { value };
}

function digit(random: () => number): number {
  const drawn = Math.floor(random() * 9) + 1;
  // A random() of exactly 1 would push this to 10; clamp rather than trust it
  return Math.min(9, Math.max(1, drawn));
}

/**
 * The digits an adult typed, or null when there were none. Spaces and the
 * thousands separators people reach for are forgiven — the gate is testing
 * whether they can read the number, not whether they type it tidily.
 */
export function gateAnswer(raw: string): number | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const cleaned = raw.replace(/[\s.,' ]/g, '');
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed <= MAX_SPELLED ? parsed : null;
}

export function isGatePassed(challenge: GateChallenge, raw: string): boolean {
  return gateAnswer(raw) === challenge.value;
}
