import { MissedFact } from '../services/progress.service';
import { dayKey } from './review-schedule';

/**
 * The facts that stuck, kept free of the DOM so the window can be tested
 * against any date rather than only today's.
 *
 * WHAT WAS MISSING WAS A PAST TENSE. A missed fact is tracked carefully while
 * it is live — it comes back a day later, and the grown-ups' screen says how
 * far it has got ("Right so far: 1 / 3"). Then it is answered right on a
 * third separate day, `afterReview` returns undefined, and it vanishes. The
 * queue is the only record there has ever been, and a queue can only say
 * what is still wrong.
 *
 * So an adult doing the short scripted practice that screen asks for was
 * never once told it worked. That is the gap this closes.
 *
 * WHY IT MATTERS HERE RATHER THAN BEING A NICE EXTRA: that screen's whole
 * design rests on an adult keeping to a small, bounded, scripted activity
 * instead of improvising. Maloney et al. (Psychological Science, 2015) is
 * why — the harm in their data travelled through anxious, frequent,
 * unstructured helping, and the protective factor in the follow-up work is
 * structure. A plan whose results you never see is a plan you stop doing,
 * and the thing that would decay is precisely the structure.
 * (There is a 2022 Early Childhood Research Quarterly paper on parent
 * practice WITH FEEDBACK as the instructional strategy that actually moves
 * parent behaviour — 10.1016/j.ecresq.2022.09.010 — but its abstract was not
 * readable from here, so it is named rather than leaned on.)
 *
 * IT IS NOT A SCORE AND NOT A STREAK. It is a short list of facts with the
 * day each one stuck, and it empties itself as those days age out. Nothing
 * here counts up, nothing compares weeks, and a quiet week says so plainly
 * rather than reading as a failure.
 */

/** How far back "recently" reaches. A week is the unit a parent plans in. */
export const LEARNED_WINDOW_DAYS = 7;

/**
 * Kept at all. Beyond this the oldest go, because this is a record of recent
 * work rather than an archive — and because it shares a child's storage with
 * everything else.
 */
export const MAX_LEARNED = 30;

export interface LearnedFact {
  /** The fact itself, so it can be written out the way it was asked. */
  fact: MissedFact;
  /** The day it was learned, as YYYY-MM-DD. */
  on: string;
  /**
   * The caller's own identity for the fact, used to replace rather than
   * duplicate when the same fact is learned again after being missed again.
   * Supplied from outside because the one function that can compute it lives
   * in the service that stores this, and importing it here would close a
   * cycle at runtime.
   */
  key: string;
}

/**
 * Adds a fact that has just been learned. Newest first. A fact learned,
 * missed again and learned a second time appears ONCE, with the later day:
 * two entries would read as two different facts and quietly inflate the
 * list.
 */
export function rememberLearned(
  existing: LearnedFact[],
  entry: LearnedFact,
  limit = MAX_LEARNED
): LearnedFact[] {
  const rest = (existing || []).filter(item => item && item.key !== entry.key);
  return [entry, ...rest].slice(0, Math.max(0, limit));
}

/**
 * Anything a store hands back, made safe. A half-written entry is dropped
 * rather than patched: a fact with no numbers in it cannot be written out,
 * and an adult reading "stuck this week" must be reading real ones.
 */
export function parseLearned(raw: any): LearnedFact[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(item => item && typeof item === 'object')
    .filter(item => typeof item.on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.on))
    .filter(item => typeof item.key === 'string' && item.key)
    .filter(item => item.fact && typeof item.fact === 'object')
    .filter(item => !!item.fact.money
      || (Number.isFinite(Number(item.fact.num1)) && Number.isFinite(Number(item.fact.num2))))
    .map(item => ({ fact: item.fact as MissedFact, on: item.on as string, key: item.key as string }))
    .slice(0, MAX_LEARNED);
}
