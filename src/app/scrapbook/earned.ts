/**
 * What the scrapbook is made from, as it is kept in storage: the events a
 * child was here for and the items they won, each with its day. Apart from
 * scrapbook.ts because the progress service reads and writes these on every
 * screen, and the book itself is only built on its own (lazy) screen.
 */

/** An event a child was here for, with the day it happened if it is known. */
export interface EarnedEvent {
  id: string;
  date?: string;
}

/** An item a child won, and when. */
export interface EarnedItem {
  id: string;
  date?: string;
}

/** Reads whatever is in storage as events, however old its shape. */
export function readEarnedEvents(raw: any[]): EarnedEvent[] {
  return readEarned(raw);
}

export function readEarnedItems(raw: any[]): EarnedItem[] {
  return readEarned(raw);
}

/**
 * Entries used to be bare id strings with no date at all. One of those still
 * means "this happened", so it is kept — with no date, which is the truth
 * about it.
 */
function readEarned(raw: any[]): EarnedEvent[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const earned: EarnedEvent[] = [];
  raw.forEach(entry => {
    let id: string | null = null;
    let date: string | undefined;
    if (typeof entry === 'string') {
      id = entry;
    } else if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
      id = entry.id;
      date = typeof entry.date === 'string' ? entry.date : undefined;
    }
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    earned.push(date ? { id, date } : { id });
  });
  return earned;
}
