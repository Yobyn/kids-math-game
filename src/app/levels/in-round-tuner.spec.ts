import {
  MIN_QUESTIONS_LEFT,
  MISSES_IN_A_ROW,
  difficultiesWithSomethingEasier,
  easierThan,
  missesInARow,
  shouldOfferEasier,
  OfferState
} from './in-round-tuner';
import { DIFFICULTY_ORDER } from './difficulty-tuner';

const TOTAL = 10;

/** A run of answers, written as a string: 'xxo' is wrong, wrong, right. */
function results(pattern: string): boolean[] {
  return pattern.split('').map(mark => mark === 'o');
}

function state(pattern: string, over: Partial<OfferState> = {}): OfferState {
  return {
    results: results(pattern),
    difficulty: 'medium',
    totalQuestions: TOTAL,
    spent: false,
    ...over
  };
}

describe('counting a run of misses', () => {
  it('counts only the run at the end', () => {
    expect(missesInARow(results('xxo'))).toBe(0);
    expect(missesInARow(results('oxx'))).toBe(2);
    expect(missesInARow(results('xoxxx'))).toBe(3);
  });

  it('counts nothing before anything has been answered', () => {
    expect(missesInARow([])).toBe(0);
  });

  it('counts a whole round of misses', () => {
    expect(missesInARow(results('xxxxxxxxxx'))).toBe(10);
  });

  it('is reset by a single right answer, over a sweep', () => {
    // One right answer means the child is not drowning right now, whatever
    // came before it
    for (let before = 0; before <= 8; before++) {
      expect(missesInARow(results('x'.repeat(before) + 'o'))).toBe(0);
    }
  });
});

describe('one rung easier', () => {
  it('steps down the ladder', () => {
    expect(easierThan('hard')).toBe('medium');
    expect(easierThan('medium')).toBe('easy');
  });

  it('has nothing below the bottom rung', () => {
    expect(easierThan('easy')).toBeUndefined();
  });

  it('refuses a setting that is not one', () => {
    expect(easierThan('impossible')).toBeUndefined();
    expect(easierThan('')).toBeUndefined();
  });

  it('agrees with the ladder the rest of the game uses', () => {
    expect(difficultiesWithSomethingEasier())
      .toEqual(DIFFICULTY_ORDER.slice(1));
  });
});

describe('when the game asks', () => {
  it('asks after a run of misses', () => {
    expect(shouldOfferEasier(state('xxx'))).toBe(true);
  });

  it('says nothing before the run is long enough', () => {
    // Two misses is a bad patch; a rate over ten questions is too noisy to
    // read this early
    expect(shouldOfferEasier(state('xx'))).toBe(false);
    expect(shouldOfferEasier(state('oxox'))).toBe(false);
  });

  it('says nothing once a right answer has broken the run', () => {
    expect(shouldOfferEasier(state('xxxo'))).toBe(false);
  });

  it('asks again later in the same round if the drowning comes back', () => {
    // Until it has been answered, that is — see below
    expect(shouldOfferEasier(state('ooxxx'))).toBe(true);
  });

  it('never asks twice in a round', () => {
    // The offer is a question about the round, and a question asked twice is
    // a nag about the child
    expect(shouldOfferEasier(state('xxxxx', { spent: true }))).toBe(false);
  });

  it('has nothing to ask on the easiest setting', () => {
    expect(shouldOfferEasier(state('xxxxx', { difficulty: 'easy' }))).toBe(false);
  });

  it('has nothing to ask at a setting it does not recognise', () => {
    expect(shouldOfferEasier(state('xxxxx', { difficulty: 'nonsense' }))).toBe(false);
  });

  it('does not ask when the round is nearly over', () => {
    // Making the last two questions easier buys nothing and costs a nag
    const nearlyDone = 'o'.repeat(TOTAL - MIN_QUESTIONS_LEFT) + 'xxx';
    expect(shouldOfferEasier(state(nearlyDone))).toBe(false);
  });

  it('still asks with exactly enough questions left to matter', () => {
    const answered = TOTAL - MIN_QUESTIONS_LEFT;
    const pattern = 'o'.repeat(answered - MISSES_IN_A_ROW) + 'x'.repeat(MISSES_IN_A_ROW);
    expect(pattern.length).toBe(answered);
    expect(shouldOfferEasier(state(pattern))).toBe(true);
  });

  it('never asks on a round that is going well, over every length', () => {
    // A child getting them right must never be asked whether they want it
    // easier: the question itself would be a verdict
    for (let answered = 0; answered <= TOTAL; answered++) {
      expect(shouldOfferEasier(state('o'.repeat(answered)))).toBe(false);
    }
  });

  it('never asks before three questions have gone wrong, over every pattern', () => {
    // Sweep every possible run of up to eight answers: the offer must never
    // appear without MISSES_IN_A_ROW misses at the end of it
    for (let length = 0; length <= 8; length++) {
      for (let bits = 0; bits < (1 << length); bits++) {
        let pattern = '';
        for (let index = 0; index < length; index++) {
          pattern += (bits >> index) & 1 ? 'o' : 'x';
        }

        const asked = shouldOfferEasier(state(pattern));
        if (asked) {
          expect(missesInARow(results(pattern))).toBeGreaterThanOrEqual(MISSES_IN_A_ROW);
          expect(TOTAL - length).toBeGreaterThanOrEqual(MIN_QUESTIONS_LEFT);
        }
      }
    }
  });

  it('asks at every setting that has something easier below it', () => {
    difficultiesWithSomethingEasier().forEach(difficulty => {
      expect(shouldOfferEasier(state('xxx', { difficulty }))).toBe(true);
    });
  });
});
