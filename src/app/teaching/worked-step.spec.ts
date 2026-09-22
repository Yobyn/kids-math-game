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
