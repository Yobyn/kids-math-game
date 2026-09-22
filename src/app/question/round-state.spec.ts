import {
  QUESTIONS_IN_ROUND,
  RESUME_WINDOW_MS,
  ROUND_VERSION,
  SavedRound,
  isResumable,
  parseRound,
  resumeQuestionNumber,
  roundAge,
  serialiseRound
} from './round-state';

const NOW = Date.parse('2026-09-22T18:00:00Z');

function round(overrides: Partial<SavedRound> = {}): SavedRound {
  return {
    version: ROUND_VERSION,
    savedAt: NOW,
    grade: 3,
    difficulty: 'medium',
    eased: false,
    questionsAnswered: 5,
    correctAnswers: 4,
    score: 7,
    streak: 2,
    results: [true, true, false, true, true],
    question: { num1: 7, num2: 8, operation: '+' },
    isReplay: false,
    missed: [],
    offerSpent: false,
    answered: false,
    wrongAttempts: 0,
    ...overrides
  };
}

describe('round-state', () => {
  describe('a round survives the trip through storage', () => {
    it('comes back exactly as it went in', () => {
      const original = round({
        eased: true,
        offerSpent: true,
        answered: true,
        wrongAttempts: 1,
        isReplay: true,
        question: { num1: 0, num2: 0, operation: 'money', money: {
      shape: 'count', prompt: 'money-count', values: {},
      pile: [50, 20, 5], answer: 75, unit: 'cents', answerCents: 75,
      worked: '50c + 20c = 70c → 70c + 5c = 75c',
      answerText: '75c', summary: '50c + 20c + 5c'
    } },
        reviewing: { num1: 3, num2: 4, operation: '-', due: '2026-09-21', reviews: 1 },
        missed: [{
          question: { num1: 9, num2: 9, operation: '*' },
          dueAfter: 7,
          reviewOf: { num1: 9, num2: 9, operation: '*', reviews: 2 }
        }]
      });

      expect(parseRound(serialiseRound(original))).toEqual(original);
    });

    it('writes back out exactly what it read in', () => {
      const written = serialiseRound(round());

      expect(serialiseRound(parseRound(written)!)).toBe(written);
    });

    it('keeps the queued replays in the order they were queued', () => {
      const original = round({
        missed: [
          { question: { num1: 1, num2: 1, operation: '+' }, dueAfter: 6 },
          { question: { num1: 2, num2: 2, operation: '+' }, dueAfter: 8 }
        ]
      });

      const back = parseRound(serialiseRound(original));

      expect(back!.missed.map(item => item.dueAfter)).toEqual([6, 8]);
    });
  });

  describe('nothing to come back to reads as nothing, never as an error', () => {
    // Every one of these means the same thing to a child: play a fresh round.
    const nothings: { [name: string]: string | null } = {
      'nothing stored': null,
      'an empty string': '',
      'unreadable JSON': '{not json',
      'a bare string': '"hello"',
      'a list': '[1, 2, 3]',
      'null': 'null',
      'a round from an older version': JSON.stringify({ ...round(), version: 0 }),
      'a round with no version': JSON.stringify({ ...round(), version: undefined }),
      'a round with no question': JSON.stringify({ ...round(), question: undefined }),
      'a question with no operation': JSON.stringify({
        ...round(), question: { num1: 1, num2: 2 }
      }),
      'a question with text where a number should be': JSON.stringify({
        ...round(), question: { num1: 'seven', num2: 2, operation: '+' }
      }),
      'a round with no timestamp': JSON.stringify({ ...round(), savedAt: undefined })
    };

    Object.keys(nothings).forEach(name => {
      it(`reads ${name} as no round`, () => {
        expect(parseRound(nothings[name])).toBeNull();
      });
    });
  });

  describe('a half-corrupt round is repaired rather than thrown away', () => {
    it('falls back on a grade that is not a number', () => {
      const parsed = parseRound(JSON.stringify({ ...round(), grade: 'three' }));

      expect(parsed!.grade).toBe(1);
    });

    it('falls back on a difficulty that is not a string', () => {
      const parsed = parseRound(JSON.stringify({ ...round(), difficulty: 9 }));

      expect(parsed!.difficulty).toBe('medium');
    });

    it('reads a negative count as nothing done, never as a negative', () => {
      const parsed = parseRound(JSON.stringify({
        ...round(), questionsAnswered: -4, score: -1, correctAnswers: -2, streak: -3
      }));

      expect(parsed!.questionsAnswered).toBe(0);
      expect(parsed!.score).toBe(0);
      expect(parsed!.correctAnswers).toBe(0);
      expect(parsed!.streak).toBe(0);
    });

    it('reads results that are not a list as no results', () => {
      expect(parseRound(JSON.stringify({ ...round(), results: 'true' }))!.results).toEqual([]);
    });

    it('keeps only the entries of a results list that are really answers', () => {
      const parsed = parseRound(JSON.stringify({
        ...round(), results: [true, 'yes', false, null, 1]
      }));

      expect(parsed!.results).toEqual([true, false, false, false, false]);
    });

    it('drops a queued replay that has no question left in it', () => {
      const parsed = parseRound(JSON.stringify({
        ...round(),
        missed: [
          { dueAfter: 6 },
          { question: { num1: 2, num2: 2, operation: '+' }, dueAfter: 8 }
        ]
      }));

      expect(parsed!.missed.length).toBe(1);
      expect(parsed!.missed[0].dueAfter).toBe(8);
    });

    it('drops a review fact that is not a fact, leaving the round playable', () => {
      const parsed = parseRound(JSON.stringify({ ...round(), reviewing: { num1: 3 } }));

      expect('reviewing' in parsed!).toBe(false);
      expect(parsed!.question).toEqual({ num1: 7, num2: 8, operation: '+' });
    });
  });

  describe('how old is too old', () => {
    it('is resumable the moment it is saved', () => {
      expect(isResumable(round(), NOW)).toBe(true);
    });

    it('is still resumable at the very edge of the window', () => {
      expect(isResumable(round({ savedAt: NOW - RESUME_WINDOW_MS }), NOW)).toBe(true);
    });

    it('is not resumable a millisecond past it', () => {
      expect(isResumable(round({ savedAt: NOW - RESUME_WINDOW_MS - 1 }), NOW)).toBe(false);
    });

    it('is not resumable the next morning', () => {
      expect(isResumable(round({ savedAt: NOW - 14 * 60 * 60 * 1000 }), NOW)).toBe(false);
    });

    it('survives a clock that moved backwards', () => {
      // A device whose time was corrected must not lose a round over it
      const future = round({ savedAt: NOW + 60 * 60 * 1000 });

      expect(roundAge(future, NOW)).toBe(0);
      expect(isResumable(future, NOW)).toBe(true);
    });

    it('covers the interruptions it exists for', () => {
      const minutes = (count: number) => round({ savedAt: NOW - count * 60 * 1000 });

      // a phone call, the school run, dinner, a flat battery and a recharge
      expect(isResumable(minutes(5), NOW)).toBe(true);
      expect(isResumable(minutes(30), NOW)).toBe(true);
      expect(isResumable(minutes(90), NOW)).toBe(true);
      expect(isResumable(minutes(239), NOW)).toBe(true);
    });
  });

  describe('what is worth offering back', () => {
    it('has nothing to offer when there is no round at all', () => {
      expect(isResumable(null, NOW)).toBe(false);
    });

    it('does not offer a round with nothing answered', () => {
      // "Carry on from question 1" is starting; a choice that makes no
      // difference is worse than no choice.
      expect(isResumable(round({ questionsAnswered: 0 }), NOW)).toBe(false);
    });

    it('offers a round from the very first answer on', () => {
      expect(isResumable(round({ questionsAnswered: 1 }), NOW)).toBe(true);
    });

    it('offers a round right up to the last question', () => {
      expect(isResumable(round({ questionsAnswered: QUESTIONS_IN_ROUND - 1 }), NOW)).toBe(true);
    });

    it('does not offer a finished round, which belongs on the result screen', () => {
      expect(isResumable(round({ questionsAnswered: QUESTIONS_IN_ROUND }), NOW)).toBe(false);
    });

    it('does not offer a round counted past the end of itself', () => {
      expect(isResumable(round({ questionsAnswered: 99 }), NOW)).toBe(false);
    });

    it('sweeps every answered count against the window', () => {
      for (let answered = 0; answered <= QUESTIONS_IN_ROUND + 1; answered++) {
        const fresh = round({ questionsAnswered: answered });
        const stale = round({ questionsAnswered: answered, savedAt: NOW - RESUME_WINDOW_MS - 1 });
        const inPlay = answered >= 1 && answered < QUESTIONS_IN_ROUND;

        expect(isResumable(fresh, NOW)).toBe(inPlay);
        // Stale is never resumable, whatever was answered
        expect(isResumable(stale, NOW)).toBe(false);
      }
    });
  });

  describe('the number the child is shown', () => {
    it('counts from one, so five answered means question six', () => {
      expect(resumeQuestionNumber(round({ questionsAnswered: 5 }))).toBe(6);
    });

    it('says the same thing whether or not they had answered it yet', () => {
      // A round saved mid-answer resumes AT that question; one saved with the
      // answer showing resumes at the next. Both land on the same number.
      expect(resumeQuestionNumber(round({ questionsAnswered: 5, answered: false }))).toBe(6);
      expect(resumeQuestionNumber(round({ questionsAnswered: 5, answered: true }))).toBe(6);
    });

    it('never names a question past the end of the round', () => {
      expect(resumeQuestionNumber(round({ questionsAnswered: QUESTIONS_IN_ROUND })))
        .toBe(QUESTIONS_IN_ROUND);
    });

    it('sweeps every resumable count for a number a child could check', () => {
      for (let answered = 1; answered < QUESTIONS_IN_ROUND; answered++) {
        const shown = resumeQuestionNumber(round({ questionsAnswered: answered }));

        expect(shown).toBe(answered + 1);
        expect(shown).toBeGreaterThan(1);
        expect(shown).toBeLessThanOrEqual(QUESTIONS_IN_ROUND);
      }
    });
  });
});
