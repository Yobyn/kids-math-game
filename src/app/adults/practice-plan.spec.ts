import { FACTS_TO_PRACTISE, factAnswer, operationSymbol, practicePlan } from './practice-plan';
import { MissedFact, RoundResult } from '../services/progress.service';

function round(date: string, correctAnswers: number, total = 10): RoundResult {
  return {
    date,
    correctAnswers,
    total,
    percentage: Math.round((correctAnswers / total) * 100),
    score: correctAnswers * 10,
    grade: 3
  };
}

function fact(num1: number, num2: number, operation: string): MissedFact {
  return { num1, num2, operation };
}

describe('the trend an adult is shown', () => {
  it('runs oldest to newest, whichever way history was stored', () => {
    // History is kept newest first; a line is read left to right
    const plan = practicePlan([
      round('2026-09-20T10:00:00.000Z', 9),
      round('2026-09-19T10:00:00.000Z', 4),
      round('2026-09-18T10:00:00.000Z', 7)
    ], []);

    expect(plan.trend.map(point => point.percentage)).toEqual([70, 40, 90]);
  });

  it('keeps rounds that share a timestamp in the order they were played', () => {
    // Two rounds finished in the same millisecond have the same date, and a
    // sort alone would then hand them back in storage order, which is
    // backwards. History is newest first; a line is not.
    const same = '2026-09-20T10:00:00.000Z';
    const plan = practicePlan([
      { ...round(same, 9) },
      { ...round(same, 4) },
      { ...round(same, 1) }
    ], []);

    expect(plan.trend.map(point => point.percentage)).toEqual([10, 40, 90]);
  });

  it('keeps the dips', () => {
    // The whole reason this screen exists: the honest line, which the child
    // never sees and the adult needs
    const plan = practicePlan([round('2026-09-19T10:00:00.000Z', 2)], []);

    expect(plan.trend[0].percentage).toBe(20);
  });

  it('is empty before anything has been played', () => {
    const plan = practicePlan([], []);

    expect(plan.trend).toEqual([]);
    expect(plan.accuracy).toBeNull();
  });

  it('ignores a stored round that has no percentage to plot', () => {
    const broken = { date: '2026-09-19T10:00:00.000Z' } as any;
    const plan = practicePlan([broken, round('2026-09-20T10:00:00.000Z', 5)], []);

    expect(plan.trend.length).toBe(1);
  });

  it('never plots a point outside the chart', () => {
    const odd = [
      { ...round('2026-09-01T10:00:00.000Z', 5), percentage: 140 },
      { ...round('2026-09-02T10:00:00.000Z', 5), percentage: -20 },
      { ...round('2026-09-03T10:00:00.000Z', 5), percentage: 66.6 }
    ];

    practicePlan(odd, []).trend.forEach(point => {
      expect(point.percentage).toBeGreaterThanOrEqual(0);
      expect(point.percentage).toBeLessThanOrEqual(100);
      expect(Math.floor(point.percentage)).toBe(point.percentage);
    });
  });
});

describe('the accuracy an adult is shown', () => {
  it('counts answers rather than averaging percentages', () => {
    // A ten-question round and a two-question one are not equal evidence
    const plan = practicePlan([
      round('2026-09-20T10:00:00.000Z', 10, 10),
      round('2026-09-19T10:00:00.000Z', 0, 2)
    ], []);

    expect(plan.accuracy).toBe(83);
  });

  it('is never outside 0 to 100, over a sweep of round shapes', () => {
    for (let correct = 0; correct <= 10; correct++) {
      for (let total = 1; total <= 10; total++) {
        const plan = practicePlan(
          [round('2026-09-20T10:00:00.000Z', Math.min(correct, total), total)], []);
        expect(plan.accuracy).toBeGreaterThanOrEqual(0);
        expect(plan.accuracy).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('the facts an adult is asked to practise', () => {
  it('is a short, finishable list however many are stored', () => {
    // An adult handed twelve facts does one of two things, and neither is
    // three. The bound is the intervention, not a display limit.
    const missed = Array.from({ length: 12 }, (_, i) => fact(i + 2, 7, '+'));

    expect(practicePlan([], missed).facts.length).toBe(FACTS_TO_PRACTISE);
  });

  it('takes the most recently missed first', () => {
    const plan = practicePlan([], [fact(8, 7, '+'), fact(6, 5, '-'), fact(3, 4, '*')]);

    expect(plan.facts[0].question).toBe('8 + 7');
  });

  it('writes each operation the way an adult reads it', () => {
    const plan = practicePlan([], [fact(8, 7, '+'), fact(9, 4, '-'), fact(3, 4, '*')]);

    expect(plan.facts[0].question).toBe('8 + 7');
    expect(plan.facts[1].question).toBe('9 − 4');
    expect(plan.facts[2].question).toBe('3 × 4');
    expect(operationSymbol('/')).toBe('÷');
  });

  it('gives the answer to every fact it lists', () => {
    const plan = practicePlan([], [fact(8, 7, '+'), fact(9, 4, '-'), fact(42, 6, '/')]);

    expect(plan.facts.map(item => item.answer)).toEqual(['15', '5', '7']);
  });

  it('carries the worked line, so nobody has to invent one on the spot', () => {
    // The point of the research: the harm travels through anxious, improvised
    // helping, not through the information
    const plan = practicePlan([], [fact(8, 7, '+')]);

    expect(plan.facts[0].worked).toBe('8 + 2 = 10 → 10 + 5 = 15');
  });

  it('leaves the line off a fact that has no method worth showing', () => {
    const plan = practicePlan([], [fact(2, 3, '+')]);

    expect(plan.facts[0].worked).toBeUndefined();
  });

  it('shows a money question by its wording, and never invents a method for it', () => {
    const money: MissedFact = { num1: 4, num2: 3, operation: '+', moneyPrompt: 'You buy a toy for €4 and a book for €3. How much altogether?' };
    const plan = practicePlan([], [money]);

    expect(plan.facts[0].question).toBe(money.moneyPrompt!);
    expect(plan.facts[0].answer).toBe('€7');
    expect(plan.facts[0].worked).toBeUndefined();
  });

  it('drops a stored fact that is not a fact', () => {
    const plan = practicePlan([], [{ num1: NaN, num2: 3, operation: '+' }, fact(8, 7, '+')]);

    expect(plan.facts.length).toBe(1);
    expect(plan.facts[0].question).toBe('8 + 7');
  });

  it('answers every listed fact correctly, over a sweep', () => {
    for (let num1 = 0; num1 <= 12; num1++) {
      for (let num2 = 1; num2 <= 12; num2++) {
        ['+', '-', '*'].forEach(operation => {
          const plan = practicePlan([], [fact(num1, num2, operation)]);
          expect(Number(plan.facts[0].answer)).toBe(factAnswer(fact(num1, num2, operation)));
        });
      }
    }
  });

  it('never divides by zero', () => {
    expect(factAnswer(fact(8, 0, '/'))).toBe(0);
    expect(practicePlan([], [fact(8, 0, '/')]).facts[0].answer).toBe('0');
  });
});

describe('the pattern an adult is told about', () => {
  it('names the operation missed most', () => {
    const plan = practicePlan([], [
      fact(8, 7, '*'), fact(6, 7, '*'), fact(9, 8, '*'), fact(3, 4, '+')
    ]);

    expect(plan.weakest).toBe('*');
  });

  it('says nothing when one mistake is all there is', () => {
    // One miss is not a pattern, and calling it one sends an adult to help
    // with something that is not wrong
    expect(practicePlan([], [fact(8, 7, '*')]).weakest).toBeUndefined();
    expect(practicePlan([], []).weakest).toBeUndefined();
  });

  it('leaves money questions out of the count', () => {
    const money = { num1: 4, num2: 3, operation: '+', moneyPrompt: 'a shop' };
    const plan = practicePlan([], [money, { ...money }, { ...money }]);

    expect(plan.weakest).toBeUndefined();
  });
});

describe('a store that cannot be read', () => {
  it('still produces a plan', () => {
    const plan = practicePlan(null as any, null as any);

    expect(plan.trend).toEqual([]);
    expect(plan.facts).toEqual([]);
    expect(plan.accuracy).toBeNull();
  });
});
