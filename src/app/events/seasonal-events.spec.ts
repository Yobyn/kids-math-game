import {
  SEASONAL_EVENTS,
  activeEvent,
  isEventOn
} from './seasonal-events';
import { findEvent, nextOpening } from './next-opening';

/** Local midnight, so the comparisons never depend on the test's timezone. */
function on(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('when an event is on', () => {
  const winter = findEvent('winter')!;
  const spring = findEvent('spring')!;

  it('is on inside its window', () => {
    expect(isEventOn(spring, on(2026, 3, 25))).toBe(true);
  });

  it('is on at both ends of it', () => {
    expect(isEventOn(spring, on(2026, 3, 20))).toBe(true);
    expect(isEventOn(spring, on(2026, 4, 5))).toBe(true);
  });

  it('is off on either side', () => {
    expect(isEventOn(spring, on(2026, 3, 19))).toBe(false);
    expect(isEventOn(spring, on(2026, 4, 6))).toBe(false);
  });

  it('handles a window that wraps the end of the year', () => {
    // The case a naive start <= today <= end gets wrong
    expect(isEventOn(winter, on(2026, 12, 20))).toBe(true);
    expect(isEventOn(winter, on(2026, 12, 31))).toBe(true);
    expect(isEventOn(winter, on(2027, 1, 1))).toBe(true);
    expect(isEventOn(winter, on(2027, 1, 5))).toBe(true);
  });

  it('is off in the gap either side of the wrapped window', () => {
    expect(isEventOn(winter, on(2026, 12, 14))).toBe(false);
    expect(isEventOn(winter, on(2027, 1, 6))).toBe(false);
    expect(isEventOn(winter, on(2026, 6, 1))).toBe(false);
  });

  it('comes round again the following year', () => {
    expect(isEventOn(spring, on(2026, 3, 25))).toBe(true);
    expect(isEventOn(spring, on(2027, 3, 25))).toBe(true);
    expect(isEventOn(spring, on(2030, 3, 25))).toBe(true);
  });
});

describe('the calendar as a whole', () => {
  it('never has two events on at once, on any day of the year', () => {
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= 31; day++) {
        const date = on(2026, month, day);
        if (date.getMonth() + 1 !== month) {
          continue; // skipped a day that month does not have
        }

        const on_ = SEASONAL_EVENTS.filter(event => isEventOn(event, date));
        expect(on_.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('finds whichever event is on, and none when none is', () => {
    expect(activeEvent(on(2026, 12, 20))!.id).toBe('winter');
    expect(activeEvent(on(2026, 3, 25))!.id).toBe('spring');
    expect(activeEvent(on(2026, 10, 31))!.id).toBe('autumn');
    expect(activeEvent(on(2026, 9, 22))).toBeUndefined();
  });

  it('leaves most of the year with no event at all', () => {
    // Special has to mean rare; an event that is always on is just an item
    let onDays = 0;
    for (let day = 0; day < 365; day++) {
      const date = new Date(2026, 0, 1 + day);
      if (activeEvent(date)) {
        onDays++;
      }
    }

    expect(onDays).toBeGreaterThan(20);
    expect(onDays).toBeLessThan(80);
  });

  it('gives every event an id of its own', () => {
    const ids = SEASONAL_EVENTS.map(event => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('when an event comes back', () => {
  const spring = findEvent('spring')!;
  const winter = findEvent('winter')!;

  it('says today while it is on', () => {
    const today = on(2026, 3, 25);

    expect(nextOpening(spring, today).getTime()).toBe(today.getTime());
  });

  it('says later this year when it is still ahead', () => {
    const opening = nextOpening(spring, on(2026, 1, 10));

    expect(opening.getFullYear()).toBe(2026);
    expect(opening.getMonth() + 1).toBe(3);
    expect(opening.getDate()).toBe(20);
  });

  it('says next year once it has passed', () => {
    // The point of the whole design: it comes back, so nothing is lost
    const opening = nextOpening(spring, on(2026, 9, 22));

    expect(opening.getFullYear()).toBe(2027);
    expect(opening.getMonth() + 1).toBe(3);
  });

  it('never says a date in the past, on any day of the year', () => {
    for (let day = 0; day < 365; day++) {
      const today = new Date(2026, 0, 1 + day);

      SEASONAL_EVENTS.forEach(event => {
        expect(nextOpening(event, today).getTime()).toBeGreaterThanOrEqual(today.getTime());
      });
    }
  });

  it('is never more than a year away', () => {
    for (let day = 0; day < 365; day += 7) {
      const today = new Date(2026, 0, 1 + day);

      SEASONAL_EVENTS.forEach(event => {
        const wait = nextOpening(event, today).getTime() - today.getTime();
        expect(wait / (1000 * 60 * 60 * 24)).toBeLessThanOrEqual(366);
      });
    }
  });

  it('counts the wrapped window from the right side of the year', () => {
    const opening = nextOpening(winter, on(2026, 12, 1));

    expect(opening.getFullYear()).toBe(2026);
    expect(opening.getMonth() + 1).toBe(12);
    expect(opening.getDate()).toBe(15);
  });
});
