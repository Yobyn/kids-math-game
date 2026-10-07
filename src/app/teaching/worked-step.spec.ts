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

  it('splits tens from ones when the numbers are bigger', () => {
    expect(workedStep(23, 45, '+')).toBe('23 + 40 = 63 → 63 + 5 = 68');
    expect(workedStep(56, 23, '-')).toBe('56 - 20 = 36 → 36 - 3 = 33');
  });

  it('leans on the five times table, which children learn first', () => {
    expect(workedStep(7, 6, '*')).toBe('7 × 5 = 35 → 35 + 7 = 42');
    expect(workedStep(4, 8, '*')).toBe('4 × 5 = 20 → 20 + 12 = 32');
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

  it('stays quiet about round numbers', () => {
    expect(workedStep(20, 30, '+')).toBeUndefined();
    expect(workedStep(50, 20, '-')).toBeUndefined();
  });

  it('stays quiet about tables a child does not need talking through', () => {
    expect(workedStep(6, 2, '*')).toBeUndefined();
    expect(workedStep(6, 5, '*')).toBeUndefined();
    expect(workedStep(7, 10, '*')).toBeUndefined();
    // times a ten is a table and a nought: 7 × 20
    expect(workedStep(7, 20, '*')).toBeUndefined();
    expect(workedStep(30, 4, '*')).toBeUndefined();
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
