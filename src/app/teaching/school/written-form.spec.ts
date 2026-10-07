import { SUM_FORMS, SumForm, readForm } from '../../question/sum-form';
import { CURRICULUM, Moment, Random, SchoolSum, TOPICS, schoolSum } from './groep';
import { FormWords, SumLayout, formWorkedStep, sumLayout } from './written-form';

const WORDS: FormWords = { double: 'dubbel', half: 'de helft van', of: 'van', remainder: 'rest', hours: 'uur', minutes: 'minuten',
  toTens: 'Rond af op tientallen', toHundreds: 'Rond af op honderdtallen', area: 'Oppervlakte van de rechthoek' };

/** A fraction character read as its numerator and denominator, as a child reads ¾ as 3 over 4. */
const GLYPHS: { [glyph: string]: [number, number] } = {
  '½': [1, 2], '⅓': [1, 3], '⅔': [2, 3], '¼': [1, 4], '¾': [3, 4], '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5], '⅘': [4, 5],
  '⅙': [1, 6], '⅚': [5, 6], '⅛': [1, 8], '⅜': [3, 8], '⅝': [5, 8], '⅞': [7, 8]
};
const GLYPH = `(${Object.keys(GLYPHS).join('|')})`;

function seeded(seed: number): Random {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The answer the kept sum gives: what the child is marked against. */
function answer(sum: { num1: number; num2: number; operation: string }): number {
  switch (sum.operation) {
    case '+': return sum.num1 + sum.num2;
    case '-': return sum.num1 - sum.num2;
    case '*': return sum.num1 * sum.num2;
    case '%': return sum.num1 % sum.num2;
    // the multiple of num2 nearest by distance, halfway going up
    case '≈': {
      const down = sum.num1 - sum.num1 % sum.num2;
      return sum.num1 - down < down + sum.num2 - sum.num1 ? down : down + sum.num2;
    }
    default: return sum.num1 / sum.num2;
  }
}

/** The sum as a child reads it off the card, with the box shown as "?". */
function read(layout: SumLayout): string {
  return [...layout.before.map(part => part.text), '?', ...layout.after.map(part => part.text)].join(' ');
}

/**
 * Is the written sum true with this number in the box? Read the way a child
 * would check it: "dubbel 7 = 14", "7 + 3 = 10", "8 = 5 + 3".
 */
function holds(written: string, filled: number): boolean {
  const text = written.replace('?', String(filled));
  const double = text.match(/^dubbel (\d+) = (\d+)$/);
  if (double) {
    return 2 * +double[1] === +double[2];
  }
  const half = text.match(/^de helft van (\d+) = (\d+)$/);
  if (half) {
    return +half[1] === 2 * +half[2];
  }
  const rest = text.match(/^(\d+) : (\d+) = (\d+) rest (\d+)$/);
  if (rest) {
    const [whole, parts, times, left] = rest.slice(1).map(Number);
    return whole === parts * times + left && left < parts;
  }
  const measure = text.match(/^(\d+) (m|km|kg|uur|h) = (\d+) (cm|m|g|minuten|min)$/);
  if (measure) {
    const per: { [unit: string]: number } = { 'm cm': 100, 'km m': 1000, 'kg g': 1000, 'uur minuten': 60, 'h min': 60 };
    return per[`${measure[2]} ${measure[4]}`] * +measure[1] === +measure[3];
  }
  // Rond af op tientallen: 347 ≈ 350. A ten, and no ten nearer; halfway (345) goes up
  const rounded = text.match(/^Rond af op (tientallen|honderdtallen) (\d+) ≈ (\d+)$/);
  if (rounded) {
    const [n, to, filled] = [+rounded[2], rounded[1] === 'tientallen' ? 10 : 100, +rounded[3]];
    const distance = Math.abs(n - filled);
    return filled % to === 0 && (distance < to / 2 || (distance === to / 2 && filled > n));
  }
  // ¾ van 20 = 15: three of the four equal parts of 20
  const fractionOf = text.match(new RegExp(`^${GLYPH} van (\\d+) = (\\d+)$`));
  if (fractionOf) {
    const [top, bottom] = GLYPHS[fractionOf[1]];
    return +fractionOf[2] % bottom === 0 && +fractionOf[2] / bottom * top === +fractionOf[3];
  }
  // ¾ = 9 / 12: the same part of a whole
  const equal = text.match(new RegExp(`^${GLYPH} = (\\d+) / (\\d+)$`));
  if (equal) {
    const [top, bottom] = GLYPHS[equal[1]];
    return top * +equal[3] === +equal[2] * bottom;
  }
  const area = text.match(/^Oppervlakte van de rechthoek (\d+) m × (\d+) m = (\d+) m²$/);
  if (area) {
    return +area[1] * +area[2] === +area[3];
  }
  const part = text.match(/^(½|⅓|¼|⅕) van (\d+) = (\d+)$/);
  if (part) {
    return +part[2] === ({ '½': 2, '⅓': 3, '¼': 4, '⅕': 5 } as { [glyph: string]: number })[part[1]] * +part[3];
  }
  const sides = text.split(' = ');
  if (sides.length !== 2) {
    return false;
  }
  const value = (side: string) => {
    const [a, sign, b] = side.split(' ');
    if (sign === undefined) {
      return +a;
    }
    return sign === '+' ? +a + +b : sign === '−' ? +a - +b : sign === '×' ? +a * +b : +a / +b;  // : is sharing out
  };
  return value(sides[0]) === value(sides[1]);
}

/** Every sum of a topic, many times over. */
function made(topic: string, count = 300): SchoolSum[] {
  const random = seeded(topic.length * 31);
  return Array.from({ length: count }, () => ({ ...TOPICS[topic](random), topic }));
}

const FORM_TOPICS = Object.keys(TOPICS).filter(topic => made(topic, 1)[0].form);
/** Every form any topic makes, over many draws: one topic (maten) makes four. */
const FORMS_MADE = new Set(FORM_TOPICS.map(topic => made(topic, 200).map(sum => sum.form)).reduce((all, list) => all.concat(list), [] as (SumForm | undefined)[]));

describe('the written forms of groep 3 to 5 (question/sum-form.ts)', () => {
  it('has a topic for every form', () => {
    SUM_FORMS.forEach(form => expect(FORMS_MADE.has(form)).withContext(form).toBeTrue());
  });

  it('reads back every form the topics make, so a round put down halfway comes back in the form it was asked', () => {
    FORM_TOPICS.forEach(topic => made(topic, 20).forEach(sum => expect(readForm(sum.form)).withContext(topic).toBe(sum.form)));
  });

  it('writes each one as the workbook does, the box where the "?" is', () => {
    const shown = (form: SumForm, num1: number, num2: number, operation: string) =>
      read(sumLayout({ num1, num2, sign: operation === '/' || operation === '%' ? ':' : operation, form }, WORDS));
    expect(shown('aanvullen', 10, 7, '-')).toBe('7 + ? = 10');
    expect(shown('splitsen', 8, 5, '-')).toBe('8 = 5 + ?');
    expect(shown('dubbel', 7, 7, '+')).toBe('dubbel 7 = ?');
    expect(shown('helft', 16, 2, '/')).toBe('de helft van 16 = ?');
    expect(shown('deel', 20, 4, '/')).toBe('¼ van 20 = ?');
    expect(shown('rest', 23, 4, '%')).toBe('23 : 4 = 5 rest ?');
    expect(shown('m-cm', 3, 100, '*')).toBe('3 m = ? cm');
    expect(shown('uur-min', 2, 60, '*')).toBe('2 uur = ? minuten');
    expect(shown('afronden', 347, 10, '≈')).toBe('Rond af op tientallen 347 ≈ ?');
    expect(shown('afronden', 2468, 100, '≈')).toBe('Rond af op honderdtallen 2468 ≈ ?');
    expect(shown('van-4', 5, 3, '*')).toBe('¾ van 20 = ?');
    expect(shown('van-5', 7, 2, '*')).toBe('⅖ van 35 = ?');
    expect(shown('gelijk-2', 1, 4, '*')).toBe('½ = ? / 8');
    expect(shown('gelijk-4', 3, 3, '*')).toBe('¾ = ? / 12');
    expect(shown('oppervlakte', 6, 4, '*')).toBe('Oppervlakte van de rechthoek 6 m × 4 m = ? m²');
    // and a plain sum is still a plain sum, the box at the end
    expect(read(sumLayout({ num1: 7, num2: 5, sign: '+' }, WORDS))).toBe('7 + 5 = ?');
  });

  it('is true, as written, with the answer the child is marked against in the box: every sum of every form', () => {
    const misses: string[] = [];
    FORM_TOPICS.forEach(topic => made(topic).forEach(sum => {
      const written = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign: sum.operation === '%' ? ':' : sum.operation, form: sum.form }, WORDS));
      const right = answer(sum);
      if (!holds(written, right) || holds(written, right + 1)) {
        misses.push(`${topic}: ${written} with ${right}`);
      }
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works each one out by the fact it is taught through, and every step it prints is true', () => {
    expect(formWorkedStep('aanvullen', 10, 7)).toBe('10 − 7 = 3');
    expect(formWorkedStep('splitsen', 8, 5)).toBe('8 − 5 = 3');
    expect(formWorkedStep('dubbel', 7, 7)).toBe('7 + 7 = 14');
    expect(formWorkedStep('helft', 16, 2)).toBe('8 + 8 = 16');
    expect(formWorkedStep('deel', 20, 4)).toBe('20 : 4 = 5');
    expect(formWorkedStep('rest', 23, 4)).toBe('4 × 5 = 20 → 23 − 20 = 3');
    expect(formWorkedStep('m-cm', 3, 100)).toBe('1 m = 100 cm → 3 × 100 = 300');
    expect(formWorkedStep('uur-min', 2, 60)).toBe('1 h = 60 min → 2 × 60 = 120');
    expect(formWorkedStep('van-4', 5, 3)).toBe('20 : 4 = 5 → 3 × 5 = 15');
    expect(formWorkedStep('gelijk-4', 3, 3)).toBe('4 × 3 = 12 → 3 × 3 = 9');
    expect(formWorkedStep('oppervlakte', 6, 4)).toBe('6 × 4 = 24');
    expect(formWorkedStep(undefined, 7, 5)).toBeUndefined();
    const misses: string[] = [];
    FORM_TOPICS.forEach(topic => made(topic).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2)!;
      if (sum.form === 'afronden') {
        return;  // read as rounding below
      }
      // Every step is true, and the answer is in it (last for most; a half is worked as 8 + 8 = 16)
      const steps = line.split(' → ');
      const trueSteps = steps.every(step => {
        const result = step.match(/= (\d+)( \S+)?$/)!;
        return holds(step.replace(/= \d+( \S+)?$/, '= ?' + (result[2] || '')), +result[1]);
      });
      if (!trueSteps || !new RegExp(`(^|\\D)${answer(sum)}(\\D|$)`).test(line)) {
        misses.push(`${topic}: ${line}`);
      }
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('rounds by the figure after the place it rounds to, a 5 or more going up: 347 → 350, 341 → 340, 2468 → 2500', () => {
    expect(formWorkedStep('afronden', 347, 10)).toBe('347: 7 ≥ 5 → 350');
    expect(formWorkedStep('afronden', 341, 10)).toBe('341: 1 < 5 → 340');
    expect(formWorkedStep('afronden', 345, 10)).toBe('345: 5 ≥ 5 → 350');
    expect(formWorkedStep('afronden', 2468, 100)).toBe('2468: 6 ≥ 5 → 2500');
    expect(formWorkedStep('afronden', 2438, 100)).toBe('2438: 3 < 5 → 2400');
    const misses: string[] = [];
    made('afronden').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2)!;
      const step = line.match(/^(\d+): (\d) (≥|<) 5 → (\d+)$/);
      // the figure looked at is the one just right of the tens (or the hundreds)
      const figure = +String(sum.num1).slice(sum.num2 === 10 ? -1 : -2)[0];
      if (!step || +step[1] !== sum.num1 || +step[2] !== figure || (step[3] === '≥') !== (figure >= 5) || +step[4] !== answer(sum)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  describe('as school sets them', () => {
    it('makes 10 in groep 3: 1 + ? = 10 to 9 + ? = 10, never 0 + 10 or 10 + 0', () => {
      const seen = new Set(made('aanvullen-tot-10').map(sum => sum.num2));
      expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      made('aanvullen-tot-10').forEach(sum => expect(sum.num1).toBe(10));
    });

    it('splits a number up to 10 into two parts, neither of them nothing', () => {
      made('splitsen-tot-10').forEach(sum => {
        expect(sum.num1).toBeLessThanOrEqual(10);
        expect(sum.num2).toBeGreaterThanOrEqual(1);
        expect(answer(sum)).toBeGreaterThanOrEqual(1);
      });
    });

    it('doubles and halves within 20 in groep 3, within 100 in groep 4', () => {
      made('dubbel-van-tot-20').forEach(sum => expect(answer(sum)).toBeLessThanOrEqual(20));
      made('helft-van-tot-20').forEach(sum => expect(sum.num1).toBeLessThanOrEqual(20));
      made('dubbel-van-tot-100').forEach(sum => {
        expect(answer(sum)).toBeGreaterThan(20);
        expect(answer(sum)).toBeLessThanOrEqual(100);
      });
      made('helft-van-tot-100').forEach(sum => {
        expect(sum.num1).toBeGreaterThan(20);
        expect(sum.num1).toBeLessThanOrEqual(100);
      });
      // A half that comes out whole: de helft van 15 is groep 6's, with a comma
      FORM_TOPICS.filter(topic => /^helft/.test(topic)).forEach(topic =>
        made(topic).forEach(sum => expect(sum.num1 % 2).withContext(`${topic} ${sum.num1}`).toBe(0)));
    });

    it('takes a third, a quarter or a fifth of an amount that shares out whole, in groep 5', () => {
      made('deel-van').forEach(sum => {
        expect([3, 4, 5]).toContain(sum.num2);
        expect(sum.num1 % sum.num2).withContext(`${sum.num1} : ${sum.num2}`).toBe(0);
        expect(answer(sum)).toBeGreaterThanOrEqual(2);
        expect(answer(sum)).toBeLessThanOrEqual(10);
      });
    });

    it('brings each form in at its moment: aanvullen in the middle of groep 3, the rest at its end, to 100 at the end of groep 4', () => {
      // The biggest number in the sum as written: 14 in dubbel 7 = 14, 16 in de helft van 16
      const size = (sum: SchoolSum) => Math.max(sum.num1, answer(sum));
      const firstSeen = (form: SumForm, within: '20' | '100') => {
        for (const groep of [3, 4, 5, 6]) {
          for (const moment of ['B', 'M', 'E'] as Moment[]) {
            const random = seeded(groep * 7 + moment.charCodeAt(0));
            for (let i = 0; i < 400; i++) {
              const sum = schoolSum(groep, moment, random)!;
              if (sum.form === form && (within === '20' ? size(sum) <= 20 : size(sum) > 20)) {
                return `${groep}${moment}`;
              }
            }
          }
        }
        return 'never';
      };
      expect(firstSeen('aanvullen', '20')).toBe('3M');
      expect(firstSeen('splitsen', '20')).toBe('3E');
      expect(firstSeen('dubbel', '20')).toBe('3E');
      expect(firstSeen('helft', '20')).toBe('3E');
      expect(firstSeen('dubbel', '100')).toBe('4E');
      expect(firstSeen('helft', '100')).toBe('4E');
      expect(firstSeen('deel', '100')).toBe('5M');
      expect(firstSeen('rest', '100')).toBe('5E');
      expect(firstSeen('m-cm', '100')).toBe('5E');
      expect(firstSeen('afronden', '100')).toBe('6E');
    });

    it('takes more than one part of an amount in groep 6: a fraction in its simplest form, of an amount that shares out whole', () => {
      const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
      const denominators = new Set<number>();
      made('breuk-van').forEach(sum => {
        const written = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign: '×', form: sum.form }, WORDS));
        const [glyph, , amount] = written.split(' ');
        const [top, bottom] = GLYPHS[glyph];
        denominators.add(bottom);
        expect(top).withContext(written).toBeGreaterThan(1);
        expect(top).withContext(written).toBeLessThan(bottom);
        expect(gcd(top, bottom)).withContext(written).toBe(1);
        expect(+amount % bottom).withContext(written).toBe(0);
        expect(+amount).withContext(written).toBeLessThanOrEqual(80);
      });
      expect(denominators).toEqual(new Set([3, 4, 5, 6, 8]));
    });

    it('writes a fraction over a bigger denominator in groep 6, up to 20: ½ = ?/8, never the same denominator again', () => {
      const seen = new Set<string>();
      made('gelijke-breuken').forEach(sum => {
        const written = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign: '×', form: sum.form }, WORDS));
        seen.add(written);
        const [glyph, , , , under] = written.split(' ');
        const [top, bottom] = GLYPHS[glyph];
        expect(top).withContext(written).toBeLessThan(bottom);
        expect(+under).withContext(written).toBeGreaterThan(bottom);
        expect(+under).withContext(written).toBeLessThanOrEqual(20);
      });
      expect(seen.has('½ = ? / 8')).toBeTrue();
    });

    it('measures a rectangle in whole metres in groep 6, longer than it is wide', () => {
      made('oppervlakte').forEach(sum => {
        expect(sum.num2).toBeGreaterThanOrEqual(2);
        expect(sum.num1).toBeGreaterThan(sum.num2);
        expect(sum.num1).toBeLessThanOrEqual(12);
      });
    });

    it('brings fractions in at the middle of groep 6 and the area at its end', () => {
      const first: { [kind: string]: string } = {};
      const kind = (form: string) => form.replace(/-\d$/, '');
      for (const groep of [3, 4, 5, 6]) {
        for (const moment of ['B', 'M', 'E'] as Moment[]) {
          const random = seeded(groep * 7 + moment.charCodeAt(0));
          for (let i = 0; i < 400; i++) {
            const form = schoolSum(groep, moment, random)!.form;
            if (form && !first[kind(form)]) {
              first[kind(form)] = `${groep}${moment}`;
            }
          }
        }
      }
      expect(first['van']).toBe('6M');
      expect(first['gelijk']).toBe('6M');
      expect(first['oppervlakte']).toBe('6E');
    });

    it('asks the start of groep 3 only plain sums: the forms come once the sums under them are known', () => {
      Object.keys(CURRICULUM[3].B).forEach(topic => expect(FORM_TOPICS).withContext(topic).not.toContain(topic));
    });
  });
});
