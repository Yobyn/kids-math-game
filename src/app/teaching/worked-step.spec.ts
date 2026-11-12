import { CURRICULUM, TOPICS } from './school/groep';
import { workedStep } from './worked-step';

/**
 * Reads a printed step back as arithmetic. A worked example that is wrong is
 * worse than none at all, so the tests check the sums rather than the wording.
 */
function equations(step: string): { left: string; right: number }[] {
  return step.split('→').map(part => {
    const [left, right] = part.split('=');
    return { left: left.trim(), right: Number(right.trim()) };
  });
}

function evaluate(expression: string): number {
  const [a, operator, b] = expression.split(' ');
  const left = Number(a);
  const right = Number(b);
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '×': return left * right;
    case '÷': return left / right;
    default: throw new Error(`unknown operator ${operator}`);
  }
}

function answerFor(num1: number, num2: number, operation: string): number {
  switch (operation) {
    case '+': return num1 + num2;
    case '-': return num1 - num2;
    case '*': return num1 * num2;
    case '/': return num1 / num2;
    default: throw new Error(operation);
  }
}

describe('every step it prints is true', () => {
  const operations = ['+', '-', '*', '/'];

  it('never prints a sum that does not hold', () => {
    let checked = 0;

    for (const operation of operations) {
      for (let num1 = 0; num1 <= 40; num1++) {
        for (let num2 = 0; num2 <= 12; num2++) {
          if (operation === '/' && (num2 === 0 || num1 % num2 !== 0)) {
            continue;
          }
          if (operation === '-' && num1 < num2) {
            continue;
          }

          const step = workedStep(num1, num2, operation);
          if (!step) {
            continue;
          }

          checked++;
          equations(step).forEach(({ left, right }) => {
            expect(evaluate(left)).toBe(right);
          });
        }
      }
    }

    // A guard against the whole sweep silently checking nothing
    expect(checked).toBeGreaterThan(200);
  });

  it('always lands on the real answer', () => {
    for (const operation of operations) {
      for (let num1 = 0; num1 <= 40; num1++) {
        for (let num2 = 1; num2 <= 12; num2++) {
          if (operation === '/' && num1 % num2 !== 0) {
            continue;
          }
          if (operation === '-' && num1 < num2) {
            continue;
          }

          const step = workedStep(num1, num2, operation);
          if (!step) {
            continue;
          }

          const printed = equations(step);
          expect(printed[printed.length - 1].right).toBe(answerFor(num1, num2, operation));
        }
      }
    }
  });

  it('never walks a child below zero', () => {
    for (let num1 = 0; num1 <= 40; num1++) {
      for (let num2 = 0; num2 <= 12; num2++) {
        const step = workedStep(num1, num2, '-');
        if (!step) {
          continue;
        }

        // Only the results are checked: a minus sign is the operator here,
        // so a negative one can only appear on the right of an equals
        equations(step).forEach(({ right }) => expect(right).toBeGreaterThanOrEqual(0));
      }
    }
  });
});

describe('the method it chooses', () => {
  it('bridges ten for single digits that cross it', () => {
    expect(workedStep(8, 7, '+')).toBe('8 + 2 = 10 → 10 + 5 = 15');
    expect(workedStep(9, 4, '+')).toBe('9 + 1 = 10 → 10 + 3 = 13');
  });

  it('bridges back down for subtraction across ten', () => {
    expect(workedStep(15, 8, '-')).toBe('15 - 5 = 10 → 10 - 3 = 7');
  });

  it('bridges the next ten for a two-figure number and a one that cross it, as groep 4 is taught (2026-11-09)', () => {
    // 59 + 5 had no worked line at all: only single digits were bridged
    expect(workedStep(59, 5, '+')).toBe('59 + 1 = 60 → 60 + 4 = 64');
    expect(workedStep(37, 7, '+')).toBe('37 + 3 = 40 → 40 + 4 = 44');
    expect(workedStep(43, 7, '-')).toBe('43 - 3 = 40 → 40 - 4 = 36');
    // from a whole ten: ten take seven, and the tens left
    expect(workedStep(40, 7, '-')).toBe('10 - 7 = 3 → 30 + 3 = 33');
    // landing on the ten, or not crossing it, needs no step
    expect(workedStep(37, 3, '+')).toBeUndefined();
    expect(workedStep(34, 2, '+')).toBeUndefined();
    expect(workedStep(28, 7, '-')).toBeUndefined();
  });

  it('works every crossing sum groep 4 is asked out through the ten (2026-11-09)', () => {
    const random = (() => { let seed = 7; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 300; i++) {
      const sum = TOPICS['te-e-over'](random);
      expect(workedStep(sum.num1, sum.num2, sum.operation)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeDefined();
    }
  });

  it('splits tens from ones when the numbers are bigger', () => {
    expect(workedStep(23, 45, '+')).toBe('23 + 40 = 63 → 63 + 5 = 68');
    expect(workedStep(56, 23, '-')).toBe('56 - 20 = 36 → 36 - 3 = 33');
  });

  it('leans on the five times table, which children learn first', () => {
    expect(workedStep(7, 6, '*')).toBe('7 × 5 = 35 → 35 + 7 = 42');
    expect(workedStep(4, 8, '*')).toBe('4 × 5 = 20 → 20 + 12 = 32');
  });

  it('works the tables of 3 and 4 out from the table of 2: one more, and twice it (2026-11-10)', () => {
    // 7 × 3 and 6 × 4 had no worked line at all: only the tables of 6 to 9 were worked, through the fives
    expect(workedStep(7, 3, '*')).toBe('7 × 2 = 14 → 14 + 7 = 21');
    expect(workedStep(6, 4, '*')).toBe('6 × 2 = 12 → 12 + 12 = 24');
    expect(workedStep(9, 3, '*')).toBe('9 × 2 = 18 → 18 + 9 = 27');
    // ten times is a nought, and one or two times needs no working
    expect(workedStep(10, 3, '*')).toBeUndefined();
    expect(workedStep(1, 4, '*')).toBeUndefined();
  });

  it('gives every fact of the tables of 3 and 4 that groep 4 and 5 are asked a worked line (2026-11-10)', () => {
    const random = (() => { let seed = 11; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 400; i++) {
      const sum = TOPICS['tafels-1-5-10'](random);
      if ((sum.num2 === 3 || sum.num2 === 4) && sum.num1 > 1 && sum.num1 < 10) {
        expect(workedStep(sum.num1, sum.num2, sum.operation)).withContext(`${sum.num1} × ${sum.num2}`).toBeDefined();
      }
    }
  });

  it('works a sum of whole tens or hundreds out from the small sum inside it (2026-11-11)', () => {
    // 20 + 60, 800 − 400 and 4 × 70 had no worked line at all: "round numbers need no step". But a child who
    // missed one twice is shown the sum it hides, as school teaches it: 2 tens and 6 tens, 4 × 7 and a nought
    expect(workedStep(20, 60, '+')).toBe('2 + 6 = 8 → 20 + 60 = 80');
    expect(workedStep(60, 70, '+')).toBe('6 + 7 = 13 → 60 + 70 = 130');
    expect(workedStep(50, 20, '-')).toBe('5 - 2 = 3 → 50 - 20 = 30');
    expect(workedStep(300, 200, '+')).toBe('3 + 2 = 5 → 300 + 200 = 500');
    expect(workedStep(800, 400, '-')).toBe('8 - 4 = 4 → 800 - 400 = 400');
    expect(workedStep(4, 70, '*')).toBe('4 × 7 = 28 → 4 × 70 = 280');
    expect(workedStep(30, 4, '*')).toBe('3 × 4 = 12 → 30 × 4 = 120');
    expect(workedStep(6, 300, '*')).toBe('6 × 3 = 18 → 6 × 300 = 1800');
  });

  it('gives every sum of whole tens and hundreds that groep 4 and 5 are asked a worked line, true and on its answer (2026-11-11)', () => {
    const random = (() => { let seed = 23; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    ['tientallen', 'honderdtallen', 'keer-tiental'].forEach(topic => {
      for (let i = 0; i < 300; i++) {
        const sum = TOPICS[topic](random);
        const step = workedStep(sum.num1, sum.num2, sum.operation);
        expect(step).withContext(`${topic}: ${sum.num1} ${sum.operation} ${sum.num2}`).toBeDefined();
        const lines = equations(step || '0 + 0 = 0');
        lines.forEach(({ left, right }) => expect(evaluate(left)).withContext(step || '').toBe(right));
        expect(lines[lines.length - 1].right).toBe(answerFor(sum.num1, sum.num2, sum.operation));
        // the small sum is one of single figures: a fact known by heart
        expect(lines[0].left).toMatch(/^\d [+\-×] \d$/);
      }
    });
  });

  it('takes a bigger number a place at a time, as it is strung on the number line: hundreds, tens, ones (2026-11-12)', () => {
    // 829 + 140 had no worked line: its second number has no ones, and only tens-and-ones were split
    expect(workedStep(829, 140, '+')).toBe('829 + 100 = 929 → 929 + 40 = 969');
    expect(workedStep(594, 290, '-')).toBe('594 - 200 = 394 → 394 - 90 = 304');
    expect(workedStep(7025, 4770, '-')).toBe('7025 - 4000 = 3025 → 3025 - 700 = 2325 → 2325 - 70 = 2255');
    // 725 − 534 was "725 − 530 = 195 → 195 − 4 = 191": a first step as hard as the sum
    expect(workedStep(725, 534, '-')).toBe('725 - 500 = 225 → 225 - 30 = 195 → 195 - 4 = 191');
    expect(workedStep(756, 186, '+')).toBe('756 + 100 = 856 → 856 + 80 = 936 → 936 + 6 = 942');
    expect(workedStep(402, 105, '+')).toBe('402 + 100 = 502 → 502 + 5 = 507');
    // two figures are tens and ones, as they were
    expect(workedStep(38, 45, '+')).toBe('38 + 40 = 78 → 78 + 5 = 83');
    expect(workedStep(76, 25, '-')).toBe('76 - 20 = 56 → 56 - 5 = 51');
    // a number of one place is one step, which says nothing
    expect(workedStep(148, 600, '+')).toBeUndefined();
    expect(workedStep(563, 30, '-')).toBeUndefined();
  });

  it('gives every sum within 1000 and 10 000 that groep 5 and 6 are asked a line of single places, true and on its answer (2026-11-12)', () => {
    const random = (() => { let seed = 31; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    let worked = 0;
    ['tot-1000-zonder', 'tot-1000-over', 'tot-10000'].forEach(topic => {
      for (let i = 0; i < 300; i++) {
        const sum = TOPICS[topic](random);
        const context = `${topic}: ${sum.num1} ${sum.operation} ${sum.num2}`;
        const step = workedStep(sum.num1, sum.num2, sum.operation);
        // only a second number of one place (148 + 600) is left as it is
        const onePlace = /^\d0*$/.test(String(sum.num2));
        expect(step === undefined).withContext(context).toBe(onePlace);
        if (!step) {
          continue;
        }
        worked++;
        const lines = equations(step);
        lines.forEach(({ left, right }) => {
          expect(evaluate(left)).withContext(step).toBe(right);
          // each step adds or takes one place: 500, 30 or 4
          expect(left.split(' ')[2]).withContext(step).toMatch(/^\d0*$/);
        });
        expect(lines[0].left.split(' ')[0]).withContext(context).toBe(String(sum.num1));
        expect(lines[lines.length - 1].right).withContext(context).toBe(answerFor(sum.num1, sum.num2, sum.operation));
      }
    });
    expect(worked).toBeGreaterThan(600);
  });

  it('reads division back as the multiplication behind it', () => {
    expect(workedStep(42, 6, '/')).toBe('6 × 7 = 42 → 42 ÷ 6 = 7');
  });

  it('splits a two-figure number in its tens and its ones, as 4 × 23, 25 × 8 and 23 × 14 are taught', () => {
    expect(workedStep(4, 23, '*')).toBe('4 × 20 = 80 → 4 × 3 = 12 → 80 + 12 = 92');
    expect(workedStep(25, 8, '*')).toBe('20 × 8 = 160 → 5 × 8 = 40 → 160 + 40 = 200');
    expect(workedStep(23, 14, '*')).toBe('23 × 10 = 230 → 23 × 4 = 92 → 230 + 92 = 322');
  });

  it('shares out past the tables in a handy part and the rest: 96 : 4 as 80 : 4 and 16 : 4', () => {
    expect(workedStep(96, 4, '/')).toBe('80 ÷ 4 = 20 → 16 ÷ 4 = 4 → 20 + 4 = 24');
    expect(workedStep(150, 6, '/')).toBe('120 ÷ 6 = 20 → 30 ÷ 6 = 5 → 20 + 5 = 25');
    // a round answer is a table times ten: read back as before
    expect(workedStep(120, 6, '/')).toBe('6 × 20 = 120 → 120 ÷ 6 = 20');
  });
});

describe('the sums groep 5 and 6 are set', () => {
  it('prints only true steps for them, ending on the answer, and has a line for every × and : past the tables', () => {
    const misses: string[] = [];
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    [5, 6].forEach(groep => (['B', 'M', 'E'] as const).forEach(moment => Object.keys(CURRICULUM[groep][moment]).forEach(topic => {
      for (let i = 0; i < 100; i++) {
        const sum = TOPICS[topic](random);
        if (sum.form || !['*', '/'].includes(sum.operation)) {
          continue;
        }
        const step = workedStep(sum.num1, sum.num2, sum.operation);
        const big = sum.operation === '*' ? Math.max(sum.num1, sum.num2) > 10 && Math.max(sum.num1, sum.num2) % 10 !== 0
                                          : sum.num1 / sum.num2 > 10;
        if (!step) {
          if (big) {
            misses.push(`${topic}: nothing for ${sum.num1} ${sum.operation} ${sum.num2}`);
          }
          continue;
        }
        const parts = equations(step);
        if (!parts.every(({ left, right }) => evaluate(left) === right) ||
            parts[parts.length - 1].right !== answerFor(sum.num1, sum.num2, sum.operation)) {
          misses.push(`${topic}: ${step}`);
        }
      }
    })));
    expect(misses.slice(0, 5)).toEqual([]);
  });
});

describe('when it says nothing', () => {
  it('stays quiet when the method would just be the answer again', () => {
    // Nothing to explain about a sum that never crosses ten
    expect(workedStep(3, 4, '+')).toBeUndefined();
    expect(workedStep(9, 1, '+')).toBeUndefined();
    expect(workedStep(8, 3, '-')).toBeUndefined();
  });

  it('stays quiet about round numbers that hide no small sum', () => {
    // hundreds and tens are said as they are written, and nothing is left of a number taken from itself
    expect(workedStep(200, 30, '+')).toBeUndefined();
    expect(workedStep(250, 20, '-')).toBeUndefined();
    expect(workedStep(40, 40, '-')).toBeUndefined();
  });

  it('stays quiet about tables a child does not need talking through', () => {
    expect(workedStep(6, 2, '*')).toBeUndefined();
    expect(workedStep(6, 5, '*')).toBeUndefined();
    expect(workedStep(7, 10, '*')).toBeUndefined();
    // ten or a hundred times is noughts and no more, and tens times tens is no table
    expect(workedStep(4, 100, '*')).toBeUndefined();
    expect(workedStep(20, 30, '*')).toBeUndefined();
  });

  it('stays quiet about division that explains nothing', () => {
    expect(workedStep(8, 1, '/')).toBeUndefined();
    expect(workedStep(6, 6, '/')).toBeUndefined();
  });

  it('refuses an operation it does not know', () => {
    expect(workedStep(8, 7, '^')).toBeUndefined();
    expect(workedStep(8, 7, '')).toBeUndefined();
  });

  it('refuses nonsense rather than printing it', () => {
    expect(workedStep(NaN, 7, '+')).toBeUndefined();
    expect(workedStep(-4, 7, '+')).toBeUndefined();
    expect(workedStep(8, Infinity, '+')).toBeUndefined();
  });
});
