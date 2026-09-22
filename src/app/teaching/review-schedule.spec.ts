import {
  REVIEWS_TO_GRADUATE,
  REVIEW_LAG_DAYS,
  addDays,
  afterMiss,
  afterReview,
  dayKey,
  dueFacts,
  isDue,
  nextDueDay,
  reviewsOf,
  waitingFacts
} from './review-schedule';
import { MissedFact } from '../services/progress.service';

/** Local midday, so nothing here depends on the test's timezone. */
function on(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0);
}

function fact(num1 = 8, num2 = 7, over: Partial<MissedFact> = {}): MissedFact {
  return { num1, num2, operation: '+', ...over };
}

describe('writing a day down', () => {
  it('writes it as a sortable day, not an instant', () => {
    expect(dayKey(on(2026, 9, 22))).toBe('2026-09-22');
    expect(dayKey(on(2026, 1, 5))).toBe('2026-01-05');
  });

  it('is the same key whatever time of day it is', () => {
    // A child who plays at 9am one day and 8am the next must not wait an
    // extra day for a reason they could never name
    const morning = new Date(2026, 8, 22, 8, 30);
    const evening = new Date(2026, 8, 22, 23, 59);

    expect(dayKey(morning)).toBe(dayKey(evening));
  });

  it('sorts as a date does, across a sweep of a year', () => {
    let previous = '';
    for (let offset = 0; offset < 400; offset++) {
      const key = dayKey(new Date(2026, 0, 1 + offset));
      expect(key > previous).toBe(true);
      previous = key;
    }
  });

  it('rolls over months and years', () => {
    expect(addDays(on(2026, 1, 31), 1)).toBe('2026-02-01');
    expect(addDays(on(2026, 12, 31), 1)).toBe('2027-01-01');
    expect(addDays(on(2028, 2, 28), 1)).toBe('2028-02-29');
  });
});

describe('when a fact is due', () => {
  const today = on(2026, 9, 22);

  it('is due on its day', () => {
    expect(isDue(fact(8, 7, { due: '2026-09-22' }), today)).toBe(true);
  });

  it('is due after its day, however long after', () => {
    expect(isDue(fact(8, 7, { due: '2026-09-01' }), today)).toBe(true);
    expect(isDue(fact(8, 7, { due: '2020-01-01' }), today)).toBe(true);
  });

  it('is not due before it', () => {
    expect(isDue(fact(8, 7, { due: '2026-09-23' }), today)).toBe(false);
  });

  it('is due now when it was stored before any of this existed', () => {
    // It was missed, and nothing says it has been seen since
    expect(isDue(fact(), today)).toBe(true);
  });
});

describe('the schedule itself', () => {
  const today = on(2026, 9, 22);

  it('puts a freshly missed fact a day out, at the beginning', () => {
    const scheduled = afterMiss(fact(), today);

    expect(scheduled.due).toBe(addDays(today, REVIEW_LAG_DAYS));
    expect(scheduled.reviews).toBe(0);
  });

  it('sends a fact back to the beginning when it is missed again', () => {
    // Getting it wrong is evidence it was not learned, whatever it had earned
    const nearlyDone = fact(8, 7, { due: '2026-09-22', reviews: REVIEWS_TO_GRADUATE - 1 });

    expect(afterMiss(nearlyDone, today).reviews).toBe(0);
  });

  it('moves a fact one step along when it is answered right', () => {
    const next = afterReview(fact(8, 7, { reviews: 0 }), today)!;

    expect(next.reviews).toBe(1);
    expect(next.due).toBe(addDays(today, REVIEW_LAG_DAYS));
  });

  it('uses the same gap every time, not an expanding one', () => {
    // Deliberate: expanding schedules are what every flashcard app reaches
    // for, and the long-term evidence does not support them over equal ones
    let current: MissedFact | undefined = afterMiss(fact(), today);
    let day = today;

    for (let review = 1; review < REVIEWS_TO_GRADUATE; review++) {
      const gap = new Date(day.getFullYear(), day.getMonth(), day.getDate() + REVIEW_LAG_DAYS);
      expect(current!.due).toBe(dayKey(gap));
      day = gap;
      current = afterReview(current!, day);
    }
  });

  it('is done with a fact retrieved right on enough separate days', () => {
    const last = fact(8, 7, { reviews: REVIEWS_TO_GRADUATE - 1 });

    expect(afterReview(last, today)).toBeUndefined();
  });

  it('graduates after exactly the stated number of reviews, never fewer', () => {
    let current: MissedFact | undefined = afterMiss(fact(), today);

    for (let review = 1; review < REVIEWS_TO_GRADUATE; review++) {
      current = afterReview(current!, today);
      expect(current).toBeDefined();
    }

    expect(afterReview(current!, today)).toBeUndefined();
  });

  it('reads a corrupt review count as none', () => {
    expect(reviewsOf(fact(8, 7, { reviews: -3 }))).toBe(0);
    expect(reviewsOf(fact(8, 7, { reviews: NaN }))).toBe(0);
    expect(reviewsOf(fact(8, 7, { reviews: 'lots' as any }))).toBe(0);
    expect(reviewsOf(fact())).toBe(0);
  });
});

describe('choosing what to ask today', () => {
  const today = on(2026, 9, 22);

  it('hands back only what is due', () => {
    const facts = [
      fact(8, 7, { due: '2026-09-22' }),
      fact(9, 6, { due: '2026-09-30' }),
      fact(7, 8, { due: '2026-09-01' })
    ];

    const due = dueFacts(facts, today, 5);
    expect(due.length).toBe(2);
    expect(due.some(f => f.num2 === 6)).toBe(false);
  });

  it('asks the longest overdue first', () => {
    const facts = [
      fact(8, 7, { due: '2026-09-22' }),
      fact(7, 8, { due: '2026-09-01' })
    ];

    expect(dueFacts(facts, today, 5)[0].num1).toBe(7);
  });

  it('hands back no more than asked for', () => {
    const facts = Array.from({ length: 9 }, (_, i) => fact(i + 2, 7, { due: '2026-09-01' }));

    expect(dueFacts(facts, today, 2).length).toBe(2);
    expect(dueFacts(facts, today, 0).length).toBe(0);
  });

  it('hands back nothing at all rather than throwing on a missing store', () => {
    expect(dueFacts(null as any, today, 2)).toEqual([]);
    expect(waitingFacts(null as any, today)).toEqual([]);
    expect(nextDueDay(null as any, today)).toBeUndefined();
  });

  it('never hands back the same fact twice on one day, over a sweep', () => {
    // The thing that was actually broken: a child playing five rounds in one
    // sitting met the same fact five times, which is massed practice
    const facts = [fact(8, 7, { due: '2026-09-22' })];
    let remaining = facts.slice();
    let served = 0;

    for (let round = 0; round < 5; round++) {
      const due = dueFacts(remaining, today, 2);
      served += due.length;
      // whatever happens next, a served fact is re-filed for a later day
      remaining = due.map(f => afterReview(f, today)!).filter(Boolean);
    }

    expect(served).toBe(1);
  });

  it('counts what is waiting and says when the soonest comes back', () => {
    const facts = [
      fact(8, 7, { due: '2026-09-22' }),
      fact(9, 6, { due: '2026-09-30' }),
      fact(7, 8, { due: '2026-09-25' })
    ];

    expect(waitingFacts(facts, today).length).toBe(2);
    expect(nextDueDay(facts, today)).toBe('2026-09-25');
  });

  it('says nothing is coming back when nothing is waiting', () => {
    expect(nextDueDay([fact(8, 7, { due: '2026-09-22' })], today)).toBeUndefined();
  });
});
