import { MissedFact } from '../services/progress.service';

/**
 * When a missed fact comes back, kept free of the DOM so the schedule can be
 * tested against any date rather than only today's.
 *
 * The obvious design is an expanding schedule — a day, then three, then a
 * week — and that is what every flashcard app reaches for. The evidence does
 * not support it. Karpicke and Roediger (Psychonomic Bulletin & Review, 2014)
 * compared expanding against equal-interval retrieval over the long term and
 * found no reliable advantage for expanding; Logan and Balota (2008) found
 * the expanding advantage shows up during the learning session and is GONE
 * after a day, with expanded items at a disadvantage for younger learners.
 * What the meta-analytic work does support is the absolute gap: spacing
 * beats massing, and the size of the lag is what does the work — not the
 * shape of the ladder.
 *
 * So the intervals here are EQUAL, and the thing that was actually broken is
 * fixed instead. A missed fact used to come back "next round", whether that
 * was a month later or ninety seconds later. Ninety seconds later is massed
 * practice, which is the one thing the literature is unambiguous about. A
 * fact is now due in DAYS, so a child playing five rounds in one sitting
 * meets it in none of them, and meets it tomorrow.
 *
 * A fact retrieved correctly on three separate days has been learned, and
 * leaves the queue. Getting it wrong puts it back at the beginning, because
 * it plainly has not been.
 */

/** The gap between reviews, in days. Equal at every stage, on purpose. */
export const REVIEW_LAG_DAYS = 1;

/** Correct retrievals, on separate days, before a fact is done with. */
export const REVIEWS_TO_GRADUATE = 3;

/**
 * A day, as YYYY-MM-DD in the child's own timezone. Day granularity rather
 * than a timestamp because the question is "has a night passed", and because
 * a stored instant would make a child who plays at 9am one day and 8am the
 * next wait an extra day for no reason they could name.
 */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `days` after the given day, as another day key. */
export function addDays(from: Date, days: number): string {
  const moved = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return dayKey(moved);
}

/**
 * How many times this fact has been answered right since it was last missed.
 * A fact stored before any of this existed has none, which is the truth.
 */
export function reviewsOf(fact: MissedFact): number {
  const parsed = Number(fact.reviews);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * True when the fact is ready to be asked again. A fact with no due date at
 * all — stored before the schedule existed — is due now: it was missed, and
 * nothing says it has been seen since.
 */
export function isDue(fact: MissedFact, now: Date): boolean {
  return !fact.due || fact.due <= dayKey(now);
}

/** A freshly missed fact: back at the beginning, due after the gap. */
export function afterMiss(fact: MissedFact, now: Date): MissedFact {
  return { ...fact, due: addDays(now, REVIEW_LAG_DAYS), reviews: 0 };
}

/**
 * A fact just answered right, or undefined once it has been answered right
 * on enough separate days to be done with.
 */
export function afterReview(fact: MissedFact, now: Date): MissedFact | undefined {
  const reviews = reviewsOf(fact) + 1;
  if (reviews >= REVIEWS_TO_GRADUATE) {
    return undefined;
  }
  return { ...fact, due: addDays(now, REVIEW_LAG_DAYS), reviews };
}

/** The facts ready to be asked today, oldest due first, at most `limit`. */
export function dueFacts(facts: MissedFact[], now: Date, limit: number): MissedFact[] {
  return (facts || [])
    .filter(fact => fact && isDue(fact, now))
    .sort((a, b) => ((a.due || '') < (b.due || '') ? -1 : (a.due || '') > (b.due || '') ? 1 : 0))
    .slice(0, Math.max(0, limit));
}

/** Facts waiting for their day to come round. */
export function waitingFacts(facts: MissedFact[], now: Date): MissedFact[] {
  return (facts || []).filter(fact => fact && !isDue(fact, now));
}

/** The next day anything is due, or undefined when nothing is waiting. */
export function nextDueDay(facts: MissedFact[], now: Date): string | undefined {
  const days = waitingFacts(facts, now)
    .map(fact => fact.due as string)
    .sort();
  return days[0];
}
