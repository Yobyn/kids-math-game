import { LEARNED_WINDOW_DAYS, LearnedFact } from './learned';
import { dayKey } from './review-schedule';

/*
 * Only the grown-ups' screen reads what stuck over a window of days; here
 * rather than in learned.ts, which is in the first load, so it loads with
 * that screen.
 */

/** What stuck within the last `days` days, newest first. */
export function learnedSince(
  learned: LearnedFact[],
  now: Date,
  days = LEARNED_WINDOW_DAYS
): LearnedFact[] {
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.max(0, days - 1));
  const from = dayKey(earliest);
  const today = dayKey(now);

  return (learned || [])
    .filter(item => item && typeof item.on === 'string' && item.on >= from && item.on <= today)
    .sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
}
