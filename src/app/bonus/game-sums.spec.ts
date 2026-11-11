import { GameSum, bandOf, choices, gameSum, written, wrongAnswers } from './game-sums';

/** A seeded generator: the sweeps below cover each year's whole range and fail the same way twice. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Works a sum's text out again, apart from the answer it carries. */
function worked(text: string): number {
  const plain = text.replace(/−/g, '-');
  const power = plain.match(/^(\d+)([²³⁴⁵])$/);
  if (power) {
    return Math.pow(Number(power[1]), '²³⁴⁵'.indexOf(power[2]) + 2);
  }
  if (plain[0] === '√') {
    return Math.sqrt(Number(plain.slice(1)));
  }
  const parts = plain.match(/^(-?\d+) ([+×:÷-]) (-?\d+)$/);
  if (!parts) {
    throw new Error(`cannot read "${text}"`);
  }
  const [a, b] = [Number(parts[1]), Number(parts[3])];
  return parts[2] === '+' ? a + b : parts[2] === '-' ? a - b : parts[2] === '×' ? a * b : a / b;
}

function many(grade: number, count = 400, warmUp = false): GameSum[] {
  const random = seeded(grade * 31 + (warmUp ? 7 : 3));
  return Array.from({ length: count }, () => gameSum({ grade, warmUp }, random));
}

describe('the sums the bonus games play with (2026-11-10)', () => {
  it('carries the right answer to every sum, in every year', () => {
    GRADES.forEach(grade => many(grade).forEach(sum =>
      expect(sum.answer).withContext(`${grade}: ${sum.text}`).toBe(worked(sum.text))));
  });

  it('asks only sums whose answer is whole and fits on a balloon: three figures at the most', () => {
    GRADES.forEach(grade => many(grade).forEach(sum => {
      expect(Number.isInteger(sum.answer)).withContext(sum.text).toBeTrue();
      expect(written(sum.answer).length).withContext(sum.text).toBeLessThanOrEqual(3);
    }));
  });

  it('keeps groep 3 within 10 and groep 4 within 20 and its first tables, and asks nothing below nought before klas 1', () => {
    many(1).forEach(sum => {
      expect(sum.text).toMatch(/^\d+ [+−] \d+$/);
      expect(sum.answer).toBeGreaterThanOrEqual(1);
      expect(sum.answer).toBeLessThanOrEqual(10);
    });
    many(2).forEach(sum => expect(sum.answer).withContext(sum.text).toBeLessThanOrEqual(100));
    many(2).filter(sum => /[+−]/.test(sum.text)).forEach(sum => expect(Math.max(sum.answer, ...sum.text.match(/\d+/g)!.map(Number))).toBeLessThanOrEqual(20));
    many(2).filter(sum => sum.text.indexOf('×') > 0).forEach(sum => expect([2, 5, 10]).toContain(Number(sum.text.split(' × ')[1])));
    [1, 2, 3, 4, 5, 6].forEach(grade => many(grade).forEach(sum => {
      expect(sum.answer).withContext(sum.text).toBeGreaterThanOrEqual(0);
      expect(sum.text).not.toMatch(/^−|[+×] −/);
    }));
  });

  it('never asks a table fact with a 1 in it: nothing to work out there', () => {
    GRADES.forEach(grade => many(grade).filter(sum => /[×:÷]/.test(sum.text)).forEach(sum => {
      const numbers = sum.text.match(/\d+/g)!.map(Number);
      expect(numbers).withContext(sum.text).not.toContain(1);
      expect(Math.abs(sum.answer)).withContext(sum.text).toBeGreaterThan(1);
    }));
  });

  it('goes below nought in klas 1 and 2, and to roots and powers in klas 3 and 4', () => {
    expect(many(7).some(sum => sum.answer < 0)).toBeTrue();
    expect(many(8).some(sum => sum.answer < 0)).toBeTrue();
    expect(many(9).some(sum => sum.text[0] === '√')).toBeTrue();
    expect(many(10).some(sum => /[³⁴⁵]$/.test(sum.text))).toBeTrue();
  });

  it('plays last year\'s facts on the warm-up climb, the start of the year', () => {
    expect(bandOf({ grade: 4, warmUp: true })).toBe(3);
    expect(bandOf({ grade: 4 })).toBe(4);
    expect(bandOf({ grade: 1, warmUp: true })).toBe(1);
    // klas 1's warm-up is groep 8's tables: nothing below nought yet
    many(7, 300, true).forEach(sum => expect(sum.answer).withContext(sum.text).toBeGreaterThan(0));
    // a grade out of range (a hand-edited store) plays the nearest year
    expect(bandOf({ grade: 99 })).toBe(10);
    expect(bandOf({ grade: NaN })).toBe(1);
  });

  it('writes sharing as the child\'s school does: ":" unless told "÷"', () => {
    const random = seeded(5);
    const sums = Array.from({ length: 200 }, () => gameSum({ grade: 4, divide: '÷' }, random));
    expect(sums.some(sum => sum.text.indexOf(' ÷ ') > 0)).toBeTrue();
    expect(sums.some(sum => sum.text.indexOf(' : ') > 0)).toBeFalse();
    expect(many(4).some(sum => sum.text.indexOf(' : ') > 0)).toBeTrue();
  });

  it('never asks the sum just asked again', () => {
    const random = seeded(9);
    let last = gameSum({ grade: 1 }, random);
    for (let i = 0; i < 300; i++) {
      const next = gameSum({ grade: 1 }, random, last);
      expect(next.text).not.toBe(last.text);
      last = next;
    }
  });

  it('writes a number below nought with a true minus', () => {
    expect(written(-7)).toBe('−7');
    expect(written(12)).toBe('12');
  });
});

describe('the wrong answers shown beside the right one (2026-11-10)', () => {
  it('are all different, never the answer, and as many as asked for', () => {
    GRADES.forEach(grade => {
      const random = seeded(grade + 100);
      many(grade, 200).forEach(sum => {
        const wrong = wrongAnswers(sum, 3, random);
        expect(wrong.length).withContext(sum.text).toBe(3);
        expect(new Set(wrong).size).withContext(sum.text).toBe(3);
        expect(wrong).withContext(sum.text).not.toContain(sum.answer);
        wrong.forEach(value => expect(written(value).length).withContext(`${sum.text}: ${value}`).toBeLessThanOrEqual(4));
      });
    });
  });

  it('stay at nought or above until the sums go below it', () => {
    [1, 2, 3, 4, 5, 6].forEach(grade => {
      const random = seeded(grade + 200);
      many(grade, 200).forEach(sum => wrongAnswers(sum, 3, random).forEach(value =>
        expect(value).withContext(sum.text).toBeGreaterThanOrEqual(0)));
    });
  });

  it('are near the answer: a slip, not a guess', () => {
    const random = seeded(77);
    many(1, 200).forEach(sum => wrongAnswers(sum, 2, random).forEach(value =>
      expect(Math.abs(value - sum.answer)).withContext(sum.text).toBeLessThanOrEqual(4)));
    many(4, 200).forEach(sum => wrongAnswers(sum, 2, random).forEach(value =>
      expect(Math.abs(value - sum.answer)).withContext(sum.text).toBeLessThanOrEqual(12)));
  });

  it('offer the sign the wrong way round where a sum is below nought', () => {
    const random = seeded(3);
    expect(wrongAnswers({ text: '4 − 9', answer: -5 }, 2, random)).toContain(5);
    expect(wrongAnswers({ text: '−3 × 4', answer: -12 }, 2, random)).toContain(12);
  });

  it('are dealt with the answer among them, once, in no fixed place', () => {
    const random = seeded(11);
    const places = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const dealt = choices({ text: '6 × 7', answer: 42 }, 3, random);
      expect(dealt.length).toBe(3);
      expect(dealt.filter(value => value === 42).length).toBe(1);
      places.add(dealt.indexOf(42));
    }
    expect(places.size).toBe(3);
  });
});
