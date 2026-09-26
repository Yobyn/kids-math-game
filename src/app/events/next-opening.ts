import { SEASONAL_EVENTS, SeasonalEvent, isEventOn } from './seasonal-events';

/*
 * Only the dressing-up screen asks these, to say when a missed event's item
 * comes back; here rather than in seasonal-events.ts, which is in the first
 * load, so they load with that screen.
 */

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
