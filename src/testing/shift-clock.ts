/**
 * Moves the clock a long way forward, for a second run of the same suite.
 *
 * A test that hard-codes today's date passes on the day it was written and
 * fails later, for nobody's mistake. That is not hypothetical here: a test
 * asserting two facts were "missed today" was written with
 * `new Date(2026, 8, 22)` and broke the build at midnight, because the facts
 * were compared against the machine's real clock and had become due.
 *
 * A test may read the real clock — plenty of them do, and should. What it may
 * not do is assume the real clock reads any particular date. Running the whole
 * suite again with `Date` moved on by more than a year is what tells the two
 * apart: anything that survives both runs is genuinely date-independent, and
 * anything that fails the second run would have failed on its own one day
 * later, on a branch nobody had touched.
 *
 * The shift is not a whole number of years, so a test cannot accidentally
 * survive it by landing on the same day in a later year, and it crosses a
 * leap day.
 */
export const SHIFT_DAYS = 400;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Replaces the global `Date` with one whose idea of "now" is `days` ahead.
 * Dates built from explicit arguments are untouched — a test that says
 * "2026-09-22" still means it.
 */
export function shiftClock(days: number): void {
  const NativeDate = Date;
  const offset = days * DAY_MS;

  class ShiftedDate extends NativeDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(NativeDate.now() + offset);
      } else {
        // Every other shape of the constructor means an explicit moment
        super(...(args as []));
      }
    }

    static now(): number {
      return NativeDate.now() + offset;
    }
  }

  (window as any).Date = ShiftedDate;
}
