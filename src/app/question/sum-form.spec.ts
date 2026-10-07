import { MissedFact, ProgressService, factSignature } from '../services/progress.service';
import { factText } from '../adults/practice-plan';
import { ROUND_VERSION, SavedRound, parseRound, serialiseRound } from './round-state';
import { SUM_FORMS, readForm } from './sum-form';

/**
 * A sum asked as 7 + ? = 10 is the same sum as 10 - 7, but not the same
 * thing to know. Wherever a question is kept (a round put down halfway, a
 * fact missed for another day) it has to come back the way it was asked.
 */
describe('a written form travels with its sum (sum-form.ts)', () => {
  const aanvullen = { num1: 10, num2: 7, operation: '-', form: 'aanvullen' as const };

  afterEach(() => localStorage.clear());

  it('reads back only the forms there are: anything else is shown as a plain sum', () => {
    SUM_FORMS.forEach(form => expect(readForm(form)).toBe(form));
    ['backwards', '', 7, null, undefined, {}].forEach(raw => expect(readForm(raw)).withContext(String(raw)).toBeUndefined());
  });

  it('comes back from a round put down halfway: the question on screen, the ones waiting to come back, and a fact under review', () => {
    const fact: MissedFact = { num1: 8, num2: 5, operation: '-', form: 'splitsen', due: '2026-10-06', reviews: 1 };
    const saved: SavedRound = {
      version: ROUND_VERSION, savedAt: Date.now(), grade: 1, difficulty: 'hard', eased: false,
      questionsAnswered: 3, correctAnswers: 2, score: 2, streak: 0, results: [true, false, true],
      question: aanvullen, isReplay: true, reviewing: fact,
      missed: [{ question: { num1: 16, num2: 2, operation: '/', form: 'helft' }, dueAfter: 5, reviewOf: fact }],
      offerSpent: false, answered: false, wrongAttempts: 1
    };
    const back = parseRound(serialiseRound(saved))!;
    expect(back.question).toEqual(aanvullen);
    expect(back.reviewing!.form).toBe('splitsen');
    expect(back.missed[0].question.form).toBe('helft');
    expect(back.missed[0].reviewOf!.form).toBe('splitsen');
  });

  it('drops a form it does not know rather than the round, so an odd save still resumes', () => {
    const raw = JSON.parse(serialiseRound({
      version: ROUND_VERSION, savedAt: Date.now(), grade: 1, difficulty: 'hard', eased: false,
      questionsAnswered: 1, correctAnswers: 1, score: 1, streak: 1, results: [true],
      question: aanvullen, isReplay: false, missed: [], offerSpent: false, answered: false, wrongAttempts: 0
    }));
    raw.question.form = 'backwards';
    const back = parseRound(JSON.stringify(raw))!;
    expect(back).not.toBeNull();
    expect(back.question).toEqual({ num1: 10, num2: 7, operation: '-' });
  });

  it('is its own fact to learn: 7 + ? = 10 missed is not 10 - 7 missed', () => {
    expect(factSignature(aanvullen)).not.toBe(factSignature({ num1: 10, num2: 7, operation: '-' }));
    expect(factSignature(aanvullen)).not.toBe(factSignature({ ...aanvullen, form: 'splitsen' }));
    expect(factSignature(aanvullen)).toBe(factSignature({ ...aanvullen }));
    // A fact kept before forms existed keeps its identity
    expect(factSignature({ num1: 10, num2: 7, operation: '-' })).toBe('10-7');
  });

  it('is kept for another day the way it was missed', () => {
    localStorage.setItem('guest', 'true');
    const progress = new ProgressService();
    progress.recordMissed(aanvullen);
    progress.recordMissed({ num1: 10, num2: 7, operation: '-' });
    const kept = progress.getMissedFacts();
    expect(kept.length).toBe(2);
    expect(kept.map(fact => fact.form)).toContain('aanvullen');
  });

  it('shows the grown-ups the fact as it was asked', () => {
    expect(factText(aanvullen)).toBe('7 + ? = 10');
    expect(factText({ num1: 8, num2: 5, operation: '-', form: 'splitsen' })).toBe('8 = 5 + ?');
    expect(factText({ num1: 20, num2: 4, operation: '/', form: 'deel' })).toBe('¼ × 20');
    expect(factText({ num1: 23, num2: 4, operation: '%', form: 'rest' })).toBe('23 : 4 = 5 r ?');
    expect(factText({ num1: 3, num2: 100, operation: '*', form: 'm-cm' })).toBe('3 m = ? cm');
    expect(factText({ num1: 347, num2: 10, operation: '≈', form: 'afronden' })).toBe('347 ≈ ? (10)');
    expect(factText({ num1: 5, num2: 3, operation: '*', form: 'van-4' })).toBe('¾ × 20');
    expect(factText({ num1: 3, num2: 3, operation: '*', form: 'gelijk-4' })).toBe('¾ = ?/12');
    expect(factText({ num1: 6, num2: 4, operation: '*', form: 'oppervlakte' })).toBe('6 m × 4 m = ? m²');
    expect(factText({ num1: 24, num2: 8, operation: '-', form: 'tienden' })).toBe('2,4 − 0,8');
    expect(factText({ num1: 350, num2: 10, operation: '/', form: 'procent-10' })).toBe('10% × 350');
    expect(factText({ num1: 345, num2: 100, operation: '*', form: 'komma-2' })).toBe('3,45 × 100');
    expect(factText({ num1: 25, num2: 1000, operation: '*', form: 'komma-km-m' })).toBe('2,5 km = ? m');
    expect(factText({ num1: 2, num2: 60, operation: '*', form: 'uur-min' })).toBe('2 h = ? min');
    expect(factText({ num1: 10, num2: 7, operation: '-' })).toBe('10 − 7');
  });
});
