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

  it('shows a fact missed in a written form as it was asked, with the fact that form is taught through', () => {
    // 10 - 7 alone has no method worth showing; 7 + ? = 10 is worked out by taking away
    const plan = practicePlan([], [{ ...fact(10, 7, '-'), form: 'aanvullen' }, { ...fact(7, 7, '+'), form: 'dubbel' }]);

    expect(plan.facts.map(item => item.question)).toEqual(['7 + ? = 10', '7 + 7']);
    expect(plan.facts.map(item => item.worked)).toEqual(['10 − 7 = 3', '7 + 7 = 14']);
  });

  it('gives the grown-ups the answer to a remainder as what is left over', () => {
    const plan = practicePlan([], [{ ...fact(23, 4, '%'), form: 'rest' }]);

    expect(plan.facts[0].question).toBe('23 : 4 = 5 r ?');
    expect(plan.facts[0].answer).toBe('3');
    expect(plan.facts[0].worked).toBe('4 × 5 = 20 → 23 − 20 = 3');
  });

  it('gives the grown-ups the answer to a rounding as the nearest ten or hundred', () => {
    const plan = practicePlan([], [{ ...fact(347, 10, '≈'), form: 'afronden' }, { ...fact(2438, 100, '≈'), form: 'afronden' }]);

    expect(plan.facts.map(item => item.question)).toEqual(['347 ≈ ? (10)', '2438 ≈ ? (100)']);
    expect(plan.facts.map(item => item.answer)).toEqual(['350', '2400']);
    expect(plan.facts[0].worked).toBe('347: 7 ≥ 5 → 350');
  });

  it('gives the grown-ups ¾ van 20 as the parts taken, with the way to it', () => {
    const plan = practicePlan([], [{ ...fact(5, 3, '*'), form: 'van-4' }]);

    expect(plan.facts[0].question).toBe('¾ × 20');
    expect(plan.facts[0].answer).toBe('15');
    expect(plan.facts[0].worked).toBe('20 : 4 = 5 → 3 × 5 = 15');
  });

  it('gives the grown-ups a sum in tenths as it is written: 1,5 + 2,7 = 4,2', () => {
    const plan = practicePlan([], [{ ...fact(15, 27, '+'), form: 'tienden' }]);

    expect(plan.facts[0].question).toBe('1,5 + 2,7');
    expect(plan.facts[0].answer).toBe('4,2');
    expect(plan.facts[0].worked).toBe('15 + 27 = 42 → 1,5 + 2,7 = 4,2');
    // and a taking away is worked as one
    const away = practicePlan([], [{ ...fact(24, 8, '-'), form: 'tienden' }]);
    expect(away.facts[0].answer).toBe('1,6');
    expect(away.facts[0].worked).toBe('24 − 8 = 16 → 2,4 − 0,8 = 1,6');
  });

  it('gives the grown-ups 25% van 60 as a quarter of 60, with the way to it', () => {
    const plan = practicePlan([], [{ ...fact(60, 4, '/'), form: 'procent-25' }]);

    expect(plan.facts[0].question).toBe('25% × 60');
    expect(plan.facts[0].answer).toBe('15');
    expect(plan.facts[0].worked).toBe('25% = ¼ → 60 : 4 = 15');
  });

  it('gives the grown-ups 72 : 100 as it is written, 0,72, with the way to it', () => {
    const plan = practicePlan([], [{ ...fact(72000, 100, '/'), form: 'komma-3' }]);

    expect(plan.facts[0].question).toBe('72 ÷ 100');
    expect(plan.facts[0].answer).toBe('0,72');
    expect(plan.facts[0].worked).toBe('0,72 × 100 = 72 → 72 : 100 = 0,72');
  });

  it('gives the grown-ups the rest of groep 7 as it was asked, with the way to each', () => {
    // a plan holds three facts, so the four come in two
    const facts = [
      { ...fact(2, 3, '+'), form: 'gelijknamig-8' },
      { ...fact(25, 3, '*'), form: 'breuk-komma' },
      { ...fact(7, 2, '*'), form: 'verhouding-3' },
      { ...fact(45, 9, '-'), form: 'korting-20' }
    ] as MissedFact[];
    const items = [...practicePlan([], facts.slice(0, 2)).facts, ...practicePlan([], facts.slice(2)).facts];

    expect(items.map(item => item.question)).toEqual(['2/8 + 3/8 = ?/8', '¾ = ?', '3 → €6, 7 → €?', '€45 − 20%']);
    // ¾ answered with its comma, the ratio and the discount in whole euros
    expect(items.map(item => item.answer)).toEqual(['5', '0,75', '14', '36']);
    expect(items.map(item => item.worked)).toEqual([
      '2 + 3 = 5 → 2/8 + 3/8 = 5/8', '¾ = 75/100 → 0,75', '6 : 3 = 2 → 7 × 2 = 14', '45 : 5 = 9 → 45 − 9 = 36'
    ]);
    // and a taking away is written as one
    const away = practicePlan([], [{ ...fact(5, 4, '-'), form: 'gelijknamig-6' }]);
    expect(away.facts[0].question).toBe('5/6 − 4/6 = ?/6');
    expect(away.facts[0].answer).toBe('1');
  });

  it('gives the grown-ups the middle of groep 8 as it was asked, with the way to each', () => {
    const facts = [
      { ...fact(3, 3, '*'), form: 'procent-via-5' },
      { ...fact(1800, 72, '/'), form: 'welk-procent' },
      { ...fact(4, 5, '*'), form: 'schaal-500' },
      { ...fact(36, 3, '/'), form: 'gemiddelde-3' }
    ] as MissedFact[];
    const items = [...practicePlan([], facts.slice(0, 2)).facts, ...practicePlan([], facts.slice(2)).facts];

    expect(items.map(item => item.question)).toEqual(['15% × 60', '18 / 72 = ?%', '1 : 500, 4 cm = ? m', '(11 + 15 + 10) : 3']);
    expect(items.map(item => item.answer)).toEqual(['9', '25', '20', '12']);
    expect(items.map(item => item.worked)).toEqual([
      '5% van 60 = 3 → 3 × 3 = 9', '18 × 100 = 1800 → 1800 : 72 = 25', '1 cm = 5 m → 4 × 5 = 20', '11 + 15 + 10 = 36 → 36 : 3 = 12'
    ]);
  });

  it('gives the grown-ups the end of groep 8 as it was asked, with the way to each', () => {
    const facts = [
      { ...fact(50, 4, '*'), form: 'inhoud-10' },
      { ...fact(680, 585, '-'), form: 'tijdsduur' },
      { ...fact(5, 30, '*'), form: 'snelheid' },
      { ...fact(5, 3, '+'), form: 'temperatuur-op' }
    ] as MissedFact[];
    const items = [...practicePlan([], facts.slice(0, 2)).facts, ...practicePlan([], facts.slice(2)).facts];

    expect(items.map(item => item.question)).toEqual(['10 × 5 × 4 = ? cm³', '9:45 → 11:20 = ? min', '60 km/h × 2,5 h', '\u22123° → 5° = ?°']);
    expect(items.map(item => item.answer)).toEqual(['200', '95', '150', '8']);
    expect(items[1].worked).toBe('9:45 → 10:00 = 15 → 10:00 → 11:20 = 80 → 15 + 80 = 95');
    expect(items[3].worked).toBe('\u22123° → 0° = 3 → 0° → 5° = 5 → 3 + 5 = 8');
  });

  it('gives the grown-ups klas 1 as it was asked, a minus below nought written as one', () => {
    const facts = [
      { ...fact(4, 9, '-'), form: 'negatief' },
      { ...fact(3, 20, '+'), form: 'voorrang-5' },
      { ...fact(3, 2, '+'), form: 'ongelijk-2-3' },
      { ...fact(15, 4, '+'), form: 'formule-3' },
      { ...fact(7, 5, '*'), form: 'haakjes-3' },
      { ...fact(347, 10, '≈'), form: 'afronden-decimaal' }
    ] as MissedFact[];
    const items = [0, 3].map(at => practicePlan([], facts.slice(at, at + 3)).facts).reduce((all, list) => all.concat(list), []);

    expect(items.map(item => item.question)).toEqual([
      '4 − 9', '3 + 4 × 5', '1/2 + 1/3 = ?/6', 'a = 3 × b + 4, b = 5 → a = ?', '(3 + 4) × 5', '3,47 ≈ ? (0,1)'
    ]);
    expect(items.map(item => item.answer)).toEqual(['\u22125', '23', '5', '19', '35', '3,5']);
  });

  it('gives the grown-ups a clock to set and read, never 300 + 45', () => {
    const item = practicePlan([], [{ ...fact(300, 45, '+'), form: 'klok' }] as MissedFact[]).facts[0];
    expect(item.question).toBe('🕒 3:45');
    expect(item.answer).toBe('3:45');
  });

  it('gives the grown-ups klas 2 as it was asked', () => {
    const facts = [
      { ...fact(4, 2, '*'), form: 'macht-3' },
      { ...fact(144, 12, '/'), form: 'wortel' },
      { ...fact(15, 3, '/'), form: 'vergelijking-5' },
      { ...fact(80, 12, '+'), form: 'toename-15' },
      { ...fact(100, 10, '/'), form: 'pythagoras-1' },
      { ...fact(5, 6, '*'), form: 'driehoek' }
    ] as MissedFact[];
    const items = [0, 3].map(at => practicePlan([], facts.slice(at, at + 3)).facts).reduce((all, list) => all.concat(list), []);

    expect(items.map(item => item.question)).toEqual(['2³', '√144', '3x + 5 = 20, x = ?', '€80 + 15%', '6² + 8² = c², c = ?', '½ × 10 × 6']);
    expect(items.map(item => item.answer)).toEqual(['8', '12', '5', '92', '10', '30']);
  });

  it('gives the grown-ups klas 3 and 4 as it was asked', () => {
    const facts = [
      { ...fact(7, 4, '-'), form: 'haakvgl-3' },
      { ...fact(4, -2, '*'), form: 'negmacht-3' },
      { ...fact(105, 200, '*'), form: 'groeifactor' },
      { ...fact(5, 2, '-'), form: 'kwadratisch' },
      { ...fact(50, 10, '*'), form: 'sin-30' },
      { ...fact(110, 90, '*'), form: 'procent-stappen' }
    ] as MissedFact[];
    const items = [0, 3].map(at => practicePlan([], facts.slice(at, at + 3)).facts).reduce((all, list) => all.concat(list), []);

    expect(items.map(item => item.question)).toEqual([
      '3(x + 4) = 21, x = ?', '(\u22122)³', '200 × 1,05', 'x² − 5x + 6 = 0, x = ? (max)', 'sin 30° × 10', '+10% → −10% → × ?'
    ]);
    expect(items.map(item => item.answer)).toEqual(['3', '\u22128', '210', '3', '5', '0,99']);
  });

  it('leaves the line off a fact that has no method worth showing', () => {
    const plan = practicePlan([], [fact(2, 3, '+')]);

    expect(plan.facts[0].worked).toBeUndefined();
  });

  it('shows a money question as the pile it was, with its own method', () => {
    // Money questions used to arrive here as a sentence with no method at
    // all. They now carry a summary and a worked line, both already written
    // in the notation the child's own band uses.
    const money: MissedFact = {
      num1: 0, num2: 0, operation: 'money',
      money: {
        shape: 'count', prompt: 'money-count', values: {},
        pile: [50, 20, 5], answer: 75, unit: 'cents', answerCents: 75,
        worked: '50c + 20c = 70c → 70c + 5c = 75c',
        answerText: '75c', summary: '50c + 20c + 5c'
      }
    };
    const plan = practicePlan([], [money]);

    expect(plan.facts[0].question).toBe('50c + 20c + 5c');
    expect(plan.facts[0].answer).toBe('75c');
    expect(plan.facts[0].worked).toBe('50c + 20c = 70c → 70c + 5c = 75c');
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

describe('whether it is working', () => {
  const today = new Date(2026, 8, 22, 12);

  it('says how many times each fact has been answered right since', () => {
    // The honest answer to "did last week's three stick"
    const plan = practicePlan([], [{ ...fact(8, 7, '+'), reviews: 2 }], today);

    expect(plan.facts[0].reviews).toBe(2);
    expect(plan.facts[0].toGraduate).toBeGreaterThan(2);
  });

  it('reads a fact with no history as never yet answered right', () => {
    expect(practicePlan([], [fact(8, 7, '+')], today).facts[0].reviews).toBe(0);
  });

  it('counts the facts waiting for their day', () => {
    const plan = practicePlan([], [
      { ...fact(8, 7, '+'), due: '2026-09-30' },
      { ...fact(9, 6, '+'), due: '2026-09-22' },
      { ...fact(7, 8, '+'), due: '2026-10-01' }
    ], today);

    expect(plan.waiting).toBe(2);
  });

  it('counts nothing as waiting when everything is due', () => {
    expect(practicePlan([], [fact(8, 7, '+')], today).waiting).toBe(0);
    expect(practicePlan([], [], today).waiting).toBe(0);
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
    // Every money question carries the same placeholder operation, so
    // counting them would report a child as weak at something they never met
    const money = (cents: number): MissedFact => ({
      num1: 0, num2: 0, operation: 'money',
      money: {
        shape: 'count', prompt: 'money-count', values: {},
        pile: [cents], answer: cents, unit: 'cents', answerCents: cents,
        worked: '', answerText: `${cents}c`, summary: `${cents}c`
      }
    });
    const plan = practicePlan([], [money(5), money(10), money(20)]);

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

describe('practicePlan: what stuck', () => {
  const today = new Date(2026, 8, 22, 12);
  const learnedOn = (num1: number, num2: number, on: string) => ({
    fact: { num1, num2, operation: '+' }, on, key: `${num1}+${num2}`
  });

  it('says nothing stuck when nothing has', () => {
    expect(practicePlan([], [], today).stuck).toEqual([]);
  });

  it('is empty rather than undefined when no record is passed at all', () => {
    // Every existing caller passed three arguments before this existed
    expect(practicePlan([], [], today).stuck).toEqual([]);
  });

  it('writes a learned fact out the same way a fact to practise is written', () => {
    const plan = practicePlan([], [], today, [learnedOn(8, 7, '2026-09-22')]);

    expect(plan.stuck.length).toBe(1);
    expect(plan.stuck[0].question).toBe('8 + 7');
    expect(plan.stuck[0].answer).toBe('15');
  });

  it('carries the worked line, so an adult sees the same method twice', () => {
    const plan = practicePlan([], [], today, [learnedOn(8, 7, '2026-09-22')]);

    expect(plan.stuck[0].worked).toBeTruthy();
  });

  it('leaves out anything learned longer ago than the window', () => {
    const plan = practicePlan([], [], today, [
      learnedOn(8, 7, '2026-09-22'),
      learnedOn(9, 6, '2026-01-01')
    ]);

    expect(plan.stuck.map(item => item.question)).toEqual(['8 + 7']);
  });

  it('is separate from what is still being practised', () => {
    // The two lists answer different questions and must not bleed
    const missed = [{ num1: 5, num2: 5, operation: '+' }];
    const plan = practicePlan([], missed, today, [learnedOn(8, 7, '2026-09-22')]);

    expect(plan.facts.map(item => item.question)).toEqual(['5 + 5']);
    expect(plan.stuck.map(item => item.question)).toEqual(['8 + 7']);
  });

  it('is not capped at three the way the practice list is', () => {
    // Three is a bounded ASK. This is a report of what happened, and
    // truncating it would understate a good week
    const many = [1, 2, 3, 4, 5].map(n => learnedOn(n, n, '2026-09-22'));

    expect(practicePlan([], [], today, many).stuck.length).toBe(5);
  });
});
