import { RoundResult } from '../services/progress.service';
import { EarnedEvent, EarnedItem } from './earned';

export { readEarnedEvents, readEarnedItems } from './earned';
export type { EarnedEvent, EarnedItem } from './earned';

/**
 * The game's memory of itself, kept free of the DOM so what goes in it and
 * in what order can be checked without a screen.
 *
 * WHAT WAS MISSING WAS NOT A PAGE, IT WAS THE DATA. The roadmap asked for
 * "which events a child has been present for as a set, and which items came
 * from where and when" — and nothing had ever written down the WHEN. Earned
 * events were a list of bare ids; items were not recorded at all, only
 * derived from the level a child happens to be at now. So the first half of
 * this is storage, and only the second half is a page.
 *
 * THE DATES BEFORE TODAY ARE GONE, and this says so rather than inventing
 * them. A child who earned the winter item last year gets an entry with no
 * date on it, because a made-up date in a book of what really happened is
 * worse than an honest gap.
 *
 * WHAT IT IS NOT: a set to complete. The collecting literature is mostly
 * about what makes adults keep buying, and this project has already turned
 * down the countdown version of that (see seasonal-events.ts) on the grounds
 * that a thing which punishes you for walking away is not entertainment.
 * Habgood and Ainsworth (Journal of the Learning Sciences, 2011) found
 * children learned more from a game whose reward WAS the subject — and spent
 * seven times longer at it freely — than from one where the reward sat
 * alongside the learning. So this is a record of the maths a child did and
 * what it won them, in the order it happened. It never shows how many are
 * left, and there is nothing here to complete.
 */

/** What kind of thing happened. */
export type KeepsakeKind = 'event' | 'item' | 'best' | 'first';

export interface Keepsake {
  kind: KeepsakeKind;
  /** The event or item id, or '' for a milestone that is not a thing. */
  id: string;
  /** ISO date, or null where it was never written down. */
  date: string | null;
  /** A number the entry is about, for the milestones that have one. */
  value?: number;
}

export interface ScrapbookSource {
  events: EarnedEvent[];
  items: EarnedItem[];
  history: RoundResult[];
}

/** A day, for grouping and for showing. Undated entries sort to the end. */
export function dayOf(date: string | null | undefined): string | null {
  if (!date || typeof date !== 'string') {
    return null;
  }
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? date.slice(0, 10) : null;
}

/**
 * Everything worth remembering, newest first, with the entries that never
 * had a date last — they happened, the book just cannot say when.
 */
export function scrapbookOf(source: ScrapbookSource | null | undefined): Keepsake[] {
  if (!source) {
    return [];
  }

  const entries: Keepsake[] = [];

  (source.events || []).forEach(event => {
    if (event && event.id) {
      entries.push({ kind: 'event', id: event.id, date: dayOf(event.date) });
    }
  });

  (source.items || []).forEach(item => {
    if (item && item.id) {
      entries.push({ kind: 'item', id: item.id, date: dayOf(item.date) });
    }
  });

  firstRound(source.history).forEach(entry => entries.push(entry));
  bestRound(source.history).forEach(entry => entries.push(entry));

  return entries.sort(newestFirst);
}

/**
 * The day a child started, from the oldest round still kept. History is
 * capped at twenty rounds, so for a child who has played more this is the
 * oldest round REMEMBERED rather than the first ever — which is why the
 * entry is worded as the earliest round the book still has.
 */
function firstRound(history: RoundResult[] | null | undefined): Keepsake[] {
  const dated = (history || []).filter(round => round && dayOf(round.date));
  if (!dated.length) {
    return [];
  }
  const oldest = dated.reduce((earliest, round) =>
    round.date < earliest.date ? round : earliest);
  return [{ kind: 'first', id: '', date: dayOf(oldest.date) }];
}

/** The best round in what is remembered, and the day it happened. */
function bestRound(history: RoundResult[] | null | undefined): Keepsake[] {
  const dated = (history || []).filter(round => round && dayOf(round.date));
  if (!dated.length) {
    return [];
  }
  const best = dated.reduce((top, round) =>
    (round.percentage || 0) > (top.percentage || 0) ? round : top);
  return [{
    kind: 'best',
    id: '',
    date: dayOf(best.date),
    value: Math.round(best.percentage || 0)
  }];
}

/** Newest first; anything undated goes to the end, in the order it arrived. */
function newestFirst(a: Keepsake, b: Keepsake): number {
  if (a.date && b.date) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  }
  if (a.date) {
    return -1;
  }
  return b.date ? 1 : 0;
}
