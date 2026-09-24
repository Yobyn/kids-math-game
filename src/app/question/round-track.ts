import { stepColour } from '../theme/palette';

/**
 * Where a child is in the round, as a row of pips: one per question, each in
 * the colour of its step along the particle ring, blue at the first question
 * and magenta at the last.
 *
 * It replaced a header that said "Score: 0" and "Question 1 of 10" over a
 * thin grey bar that was empty — and looked broken — on the first question
 * of every round. A pip is something a child can SEE fill in; "1 of 10" is
 * an "out of" they have to decode, in front of them the whole round.
 *
 * What it deliberately does NOT show: which answers were right. A row of
 * ticks and crosses would be a running tally of mistakes on the one screen
 * where a child is working. Every question the child has been through lights
 * the same way, right or wrong.
 */

export type PipState = 'done' | 'current' | 'ahead';

export interface Pip {
  /** 1-based, as the question a child would call it. */
  step: number;
  state: PipState;
  /** The ring's colour at this step, as `#rrggbb`. */
  colour: string;
}

/**
 * The pips for a round of `total` questions of which `answered` are done.
 * The one after the last done is the current question; once all are done
 * there is none.
 */
export function roundPips(answered: number, total: number): Pip[] {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const done = Number.isFinite(answered) ? Math.min(Math.max(Math.floor(answered), 0), count) : 0;
  return Array.from({ length: count }, (_, i) => {
    const step = i + 1;
    const state: PipState = step <= done ? 'done' : step === done + 1 ? 'current' : 'ahead';
    return { step, state, colour: stepColour(step, count) };
  });
}

/** The question the child is on, for assistive tech: 1-based, never past the end. */
export function currentStep(answered: number, total: number): number {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (count === 0) {
    return 0;
  }
  const done = Number.isFinite(answered) ? Math.max(Math.floor(answered), 0) : 0;
  return Math.min(done + 1, count);
}
