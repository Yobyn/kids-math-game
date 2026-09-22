/**
 * Events that come round with the seasons, kept free of the DOM so the
 * calendar can be tested against any date rather than only today's.
 *
 * The product direction asks for events granting items "obtainable no other
 * way". Research on children and time-limited rewards argues hard against the
 * usual reading of that: a window that closes forever is the FOMO pattern,
 * it is tied to anxiety and urgency in children, and regulators have begun
 * treating countdown pressure as a consumer-protection problem rather than a
 * design choice. The line that separates fair from unfair is the exit — a
 * thing you can walk away from is entertainment, a thing that punishes you
 * for walking away is not.
 *
 * So these events RECUR. An item is only earned by playing while its event is
 * on, which is what makes it special and what makes it a record of when a
 * child was here. But the event returns the following year, so a child who
 * was ill, or on holiday, or simply not playing yet has lost nothing
 * permanent. Nothing counts down at them, and nothing is ever taken away
 * once earned.
 */

export interface SeasonalEvent {
  id: string;
  /** The window, as a day in the year. Recurs annually. */
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

/**
 * Three a year, spread across the seasons and across the wardrobe's slots so
 * no one slot fills with event items.
 */
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  // Deliberately wraps the year end, which is the case most calendars get wrong
  { id: 'winter', startMonth: 12, startDay: 15, endMonth: 1, endDay: 5 },
  { id: 'spring', startMonth: 3, startDay: 20, endMonth: 4, endDay: 5 },
  { id: 'autumn', startMonth: 10, startDay: 25, endMonth: 11, endDay: 2 }
];

/** A day of the year as a comparable number, so windows are easy to reason about. */
function dayOfYear(month: number, day: number): number {
  return month * 100 + day;
}

export function isEventOn(event: SeasonalEvent, now: Date): boolean {
  const today = dayOfYear(now.getMonth() + 1, now.getDate());
  const start = dayOfYear(event.startMonth, event.startDay);
  const end = dayOfYear(event.endMonth, event.endDay);

  // A window that wraps the year end is two windows: start-to-December and
  // January-to-end
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end;
}

/** Whichever event is on today, if any. Windows are written not to overlap. */
export function activeEvent(now: Date): SeasonalEvent | undefined {
  return SEASONAL_EVENTS.find(event => isEventOn(event, now));
}

export function findEvent(id: string): SeasonalEvent | undefined {
  return SEASONAL_EVENTS.find(event => event.id === id);
}

/**
 * When this event next opens — today if it is already on, otherwise its next
 * start. Used to tell a child when something comes back rather than how long
 * they have left, which is the whole point.
 */
export function nextOpening(event: SeasonalEvent, now: Date): Date {
  if (isEventOn(event, now)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const thisYear = new Date(now.getFullYear(), event.startMonth - 1, event.startDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return thisYear >= today
    ? thisYear
    : new Date(now.getFullYear() + 1, event.startMonth - 1, event.startDay);
}
