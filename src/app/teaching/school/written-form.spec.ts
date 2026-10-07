import { SUM_FORMS, SumForm, placesOf, readForm } from '../../question/sum-form';
import { CURRICULUM, Moment, Random, SchoolSum, TOPICS, schoolSum } from './groep';
import { FormWords, SumLayout, decimal, formWorkedStep, grouped, sumLayout, tenths, typedDecimal, typedTenths } from './written-form';

const WORDS: FormWords = { double: 'dubbel', half: 'de helft van', of: 'van', remainder: 'rest', hours: 'uur', minutes: 'minuten',
  toTens: 'Rond af op tientallen', toHundreds: 'Rond af op honderdtallen', area: 'Oppervlakte van de rechthoek', point: ',',
  toThousands: 'Rond af op duizendtallen', packs: 'pakken', cost: 'kosten', discount: 'korting: wat betaal je?' };

/** A number as written in Dutch, 3,45 or 72, read in thousandths: 3450, 72000. NaN past three figures after the comma. */
function thousandths(text: string): number {
  const [whole, part = ''] = text.split(',');
  return part.length > 3 ? NaN : Number(whole) * 1000 + Number(part.padEnd(3, '0'));
}


/** A fraction character read as its numerator and denominator, as a child reads ¾ as 3 over 4. */
const GLYPHS: { [glyph: string]: [number, number] } = {
  '½': [1, 2], '⅓': [1, 3], '⅔': [2, 3], '¼': [1, 4], '¾': [3, 4], '⅕': [1, 5], '⅖': [2, 5], '⅗': [3, 5], '⅘': [4, 5],
  '⅙': [1, 6], '⅚': [5, 6], '⅛': [1, 8], '⅜': [3, 8], '⅝': [5, 8], '⅞': [7, 8], '⅒': [1, 10]
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

/** The sum with a number in its box: the last "?", since a heading can ask a question of its own (wat betaal je?). */
function fill(written: string, value: number | string): string {
  const at = written.lastIndexOf('?');
  return written.slice(0, at) + String(value) + written.slice(at + 1);
}

/**
 * Is the written sum true with this number in the box? Read the way a child
 * would check it: "dubbel 7 = 14", "7 + 3 = 10", "8 = 5 + 3".
 */
function holds(written: string, filled: number | string): boolean {
  const text = written.includes('?') ? fill(written, filled) : written;  // a worked step comes filled in
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
  const measure = text.match(/^(\d+(?:,\d)?) (m|km|kg|l|uur|h) = (\d+) (cm|m|g|dl|minuten|min)$/);
  if (measure) {
    const per: { [unit: string]: number } = { 'm cm': 100, 'km m': 1000, 'kg g': 1000, 'l dl': 10, 'uur minuten': 60, 'h min': 60 };
    return per[`${measure[2]} ${measure[4]}`] * thousandths(measure[1]) === 1000 * +measure[3];
  }
  // Rond af op tientallen: 347 ≈ 350. A ten, and no ten nearer; halfway (345) goes up
  const rounded = text.match(/^Rond af op (tientallen|honderdtallen|duizendtallen) ([\d\u202f]+) ≈ (\d+)$/);
  if (rounded) {
    const to = ({ tientallen: 10, honderdtallen: 100, duizendtallen: 1000 } as { [place: string]: number })[rounded[1]];
    const [n, filled] = [+rounded[2].replace(/\u202f/g, ''), +rounded[3]];
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
  // 1,5 + 2,7 = 4,2, 3,45 × 100 = 345, 72 : 100 = 0,72: read in thousandths; the number after × or : is whole
  const decimal = text.match(/^([\d,]+) ([+−×:]) ([\d,]+) = ([\d,]+)$/);
  if (decimal && /,/.test(text)) {
    const [a, result] = [decimal[1], decimal[4]].map(thousandths);
    const sign = decimal[2];
    if (sign === '+' || sign === '−') {
      return (sign === '+' ? a + thousandths(decimal[3]) : a - thousandths(decimal[3])) === result;
    }
    const by = /,/.test(decimal[3]) ? NaN : +decimal[3];
    return sign === '×' ? a * by === result : a === result * by;
  }
  // 2/8 + 3/8 = 5 / 8: the parts added, each part the same size; 1/2 + 1/4 would be 3/4
  const fractions = text.match(/^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = (\d+) ?\/ ?(\d+)$/);
  if (fractions) {
    const [a, n, b, m, c, under] = [1, 2, 4, 5, 6, 7].map(i => +fractions[i]);
    return (fractions[3] === '+' ? a * m + b * n : a * m - b * n) * under === c * n * m;
  }
  // ¾ = 0,75: the same part of a whole, read in thousandths
  const asDecimal = text.match(new RegExp(`^${GLYPH} = ([\\d,]+)$`));
  if (asDecimal) {
    const [top, bottom] = GLYPHS[asDecimal[1]];
    return top * 1000 === thousandths(asDecimal[2]) * bottom;
  }
  // 3 pakken kosten €6, 7 pakken = € 14: every pak costs the same
  const ratio = text.match(/^(\d+) pakken kosten €(\d+) (\d+) pakken = € (\d+)$/);
  if (ratio) {
    const [packs, price, asked, paid] = ratio.slice(1).map(Number);
    return price * asked === paid * packs;
  }
  // 20% korting: € 45 → € 36: the price less a fifth of it
  const discount = text.match(/^(\d+)% korting: wat betaal je\? € (\d+) → € (\d+)$/);
  if (discount) {
    const [off, price, paid] = discount.slice(1).map(Number);
    return 100 * paid === price * (100 - off);
  }
  // 25% van 60 = 15: a quarter of 60
  const percent = text.match(/^(\d+)% van (\d+) = (\d+)$/);
  if (percent) {
    return +percent[1] * +percent[2] === 100 * +percent[3];
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
    expect(shown('procent-25', 60, 4, '/')).toBe('25% van 60 = ?');
    expect(shown('procent-10', 350, 10, '/')).toBe('10% van 350 = ?');
    expect(shown('afronden', 345678, 1000, '≈')).toBe('Rond af op duizendtallen 345\u202f678 ≈ ?');
    expect(shown('van-5', 7, 2, '*')).toBe('⅖ van 35 = ?');
    expect(shown('gelijk-2', 1, 4, '*')).toBe('½ = ? / 8');
    expect(shown('gelijk-4', 3, 3, '*')).toBe('¾ = ? / 12');
    expect(shown('oppervlakte', 6, 4, '*')).toBe('Oppervlakte van de rechthoek 6 m × 4 m = ? m²');
    expect(read(sumLayout({ num1: 3, num2: 4, sign: '+', form: 'tienden' }, WORDS))).toBe('0,3 + 0,4 = ?');
    expect(read(sumLayout({ num1: 24, num2: 8, sign: '−', form: 'tienden' }, WORDS))).toBe('2,4 − 0,8 = ?');
    expect(read(sumLayout({ num1: 15, num2: 27, sign: '+', form: 'tienden' }, { ...WORDS, point: '.' }))).toBe('1.5 + 2.7 = ?');
    expect(shown('komma-2', 345, 100, '×')).toBe('3,45 × 100 = ?');
    expect(shown('komma-2', 250, 4, '×')).toBe('2,5 × 4 = ?');
    expect(shown('komma-3', 72000, 100, '/')).toBe('72 : 100 = ?');
    expect(shown('komma-3', 4500, 10, '/')).toBe('4,5 : 10 = ?');
    expect(shown('komma-km-m', 25, 1000, '*')).toBe('2,5 km = ? m');
    expect(shown('komma-l-dl', 15, 10, '*')).toBe('1,5 l = ? dl');
    expect(shown('gelijknamig-8', 2, 3, '+')).toBe('2/8 + 3/8 = ? / 8');
    expect(shown('gelijknamig-6', 5, 4, '−')).toBe('5/6 − 4/6 = ? / 6');
    expect(shown('breuk-komma', 25, 3, '*')).toBe('¾ = ?');
    expect(shown('breuk-komma', 20, 2, '*')).toBe('⅖ = ?');
    expect(shown('verhouding-3', 7, 2, '*')).toBe('3 pakken kosten €6 7 pakken = € ?');
    expect(shown('korting-20', 45, 9, '-')).toBe('20% korting: wat betaal je? € 45 → € ?');
    // and a plain sum is still a plain sum, the box at the end
    expect(read(sumLayout({ num1: 7, num2: 5, sign: '+' }, WORDS))).toBe('7 + 5 = ?');
  });

  it('is true, as written, with the answer the child is marked against in the box: every sum of every form', () => {
    const misses: string[] = [];
    FORM_TOPICS.forEach(topic => made(topic).forEach(sum => {
      const sign = ({ '%': ':', '-': '−', '*': '×', '/': ':' } as { [op: string]: string })[sum.operation] || sum.operation;
      const written = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign, form: sum.form }, WORDS));
      const right = answer(sum);
      // a sum with a comma is answered with one: 7 tenths is written 0,7
      const filled = (value: number) => placesOf(sum.form) ? decimal(value, placesOf(sum.form)) : value;
      if (!holds(written, filled(right)) || holds(written, filled(right + 1))) {
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
    expect(formWorkedStep('procent-25', 60, 4)).toBe('25% = ¼ → 60 : 4 = 15');
    expect(formWorkedStep('procent-10', 350, 10)).toBe('10% = ⅒ → 350 : 10 = 35');
    expect(formWorkedStep('procent-50', 36, 2)).toBe('50% = ½ → 36 : 2 = 18');
    expect(formWorkedStep('tienden', 15, 27, '+')).toBe('15 + 27 = 42 → 1,5 + 2,7 = 4,2');
    expect(formWorkedStep('tienden', 24, 8, '-')).toBe('24 − 8 = 16 → 2,4 − 0,8 = 1,6');
    expect(formWorkedStep('tienden', 3, 7, '+', '.')).toBe('3 + 7 = 10 → 0.3 + 0.7 = 1');
    expect(formWorkedStep('komma-2', 345, 100, '*')).toBe('345 × 100 = 34500 → 3,45 × 100 = 345');
    expect(formWorkedStep('komma-2', 250, 4, '*')).toBe('25 × 4 = 100 → 2,5 × 4 = 10');
    expect(formWorkedStep('komma-3', 72000, 100, '/')).toBe('0,72 × 100 = 72 → 72 : 100 = 0,72');
    expect(formWorkedStep('komma-km-m', 25, 1000, '*')).toBe('1 km = 1000 m → 2,5 × 1000 = 2500');
    expect(formWorkedStep('gelijknamig-8', 2, 3, '+')).toBe('2 + 3 = 5 → 2/8 + 3/8 = 5/8');
    expect(formWorkedStep('gelijknamig-6', 5, 4, '-')).toBe('5 − 4 = 1 → 5/6 − 4/6 = 1/6');
    expect(formWorkedStep('breuk-komma', 25, 3, '*')).toBe('¾ = 75/100 → 0,75');
    expect(formWorkedStep('breuk-komma', 50, 1, '*', '.')).toBe('½ = 50/100 → 0.5');
    expect(formWorkedStep('verhouding-3', 7, 2, '*')).toBe('6 : 3 = 2 → 7 × 2 = 14');
    expect(formWorkedStep('korting-20', 45, 9, '-')).toBe('45 : 5 = 9 → 45 − 9 = 36');
    expect(formWorkedStep('korting-25', 92, 23, '-')).toBe('92 : 4 = 23 → 92 − 23 = 69');
    expect(formWorkedStep(undefined, 7, 5)).toBeUndefined();
    const misses: string[] = [];
    FORM_TOPICS.forEach(topic => made(topic).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      if (sum.form === 'afronden' || placesOf(sum.form) || /^(procent|korting|gelijknamig)/.test(sum.form!)) {
        return;  // read as rounding, as decimals, as percentages and as fractions below
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
    // six figures as the card prints them, the thousands set apart
    expect(formWorkedStep('afronden', 345678, 1000)).toBe('345\u202f678: 6 ≥ 5 → 346\u202f000');
    expect(formWorkedStep('afronden', 345478, 1000)).toBe('345\u202f478: 4 < 5 → 345\u202f000');
    const misses: string[] = [];
    made('afronden').concat(made('afronden-duizendtallen')).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2)!;
      const step = line.replace(/\u202f/g, '').match(/^(\d+): (\d) (≥|<) 5 → (\d+)$/);
      // the figure looked at is the one just right of the tens (or the hundreds)
      const figure = +String(sum.num1).slice(-String(sum.num2).length + 1)[0];
      if (!step || +step[1] !== sum.num1 || +step[2] !== figure || (step[3] === '≥') !== (figure >= 5) || +step[4] !== answer(sum)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a percentage out as the part it is: 25% is a quarter, so 60 shared in four', () => {
    const misses: string[] = [];
    made('procenten').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2)!;
      const [part, share] = line.split(' → ');
      const percent = Number(sum.form!.split('-')[1]);
      const glyph = part.split(' = ')[1];
      if (!GLYPHS[glyph] || GLYPHS[glyph][0] * 100 !== percent * GLYPHS[glyph][1] || !holds(share, 0) || !share.endsWith(`= ${answer(sum)}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works fractions with the same denominator out in parts: 2 + 3 = 5, so 2/8 + 3/8 = 5/8, both true', () => {
    const misses: string[] = [];
    made('gelijknamige-breuken').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const steps = line.split(' → ');
      const under = Number(sum.form!.split('-')[1]);
      if (steps.length !== 2 || !steps.every(step => holds(step, 0)) || !line.endsWith(`= ${answer(sum)}/${under}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a fraction into a decimal through hundredths: ¾ = 75/100, which is 0,75', () => {
    const misses: string[] = [];
    made('breuk-naar-komma').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const [glyph, rest] = line.split(' = ');
      const [hundredths, written] = rest.split(' → ');
      const [top, bottom] = GLYPHS[glyph] || [NaN, NaN];
      if (!hundredths.endsWith('/100') || top * 100 !== parseInt(hundredths, 10) * bottom
          || !holds(`${glyph} = ${written}`, 0) || written !== decimal(answer(sum), 2)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a discount out as the part it is, taken off: 20% is a fifth, 45 : 5 = 9, 45 − 9 = 36', () => {
    const misses: string[] = [];
    made('korting').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const [share, paid, ...more] = line.split(' → ');
      const percent = Number(sum.form!.split('-')[1]);
      // 20% is one part in five: the price shared in as many parts as the percentage goes into 100
      if (more.length || !holds(share, 0) || !holds(paid, 0) || !share.startsWith(`${sum.num1} : ${100 / percent} =`)
          || !paid.startsWith(`${sum.num1} − ${share.split(' = ')[1]}`) || !paid.endsWith(`= ${answer(sum)}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('sets the thousands apart from 10 000 up, as a workbook prints them, and leaves four figures together', () => {
    expect(grouped(2345)).toBe('2345');
    expect(grouped(9999)).toBe('9999');
    expect(grouped(10000)).toBe('10\u202f000');
    expect(grouped(345678)).toBe('345\u202f678');
    expect(read(sumLayout({ num1: 34567, num2: 1234, sign: '+' }, WORDS))).toBe('34\u202f567 + 1234 = ?');
  });

  it('reads a typed answer in tenths, with a comma or a point, and nothing else', () => {
    expect(typedTenths('0,7')).toBe(7);
    expect(typedTenths('0.7')).toBe(7);
    expect(typedTenths('.7')).toBe(7);
    expect(typedTenths('4,2')).toBe(42);
    expect(typedTenths('4')).toBe(40);
    expect(typedTenths('4,0')).toBe(40);
    expect(typedTenths('0,70')).toBe(7);
    // 0,75 is not 0,8, and not a number of tenths at all
    expect(typedTenths('0,75')).toBeNaN();
    expect(typedTenths('')).toBeNaN();
    expect(typedTenths(',')).toBeNaN();
    expect(typedTenths('4,')).toBeNaN();
    expect(typedTenths('1,2,3')).toBeNaN();
    expect(typedTenths('-0,7')).toBeNaN();
  });

  it('writes hundredths and thousandths as school does, with no noughts at the end: 3,45, 0,72, 0,072, 345', () => {
    expect(decimal(345, 2)).toBe('3,45');
    expect(decimal(34500, 2)).toBe('345');
    expect(decimal(720, 3)).toBe('0,72');
    expect(decimal(72, 3)).toBe('0,072');
    expect(decimal(4500, 3)).toBe('4,5');
    expect(decimal(345, 2, '.')).toBe('3.45');
  });

  it('reads a typed answer in hundredths or thousandths, and nothing finer than the sum counts in', () => {
    expect(typedDecimal('0,72', 3)).toBe(720);
    expect(typedDecimal('0.072', 3)).toBe(72);
    expect(typedDecimal('345', 2)).toBe(34500);
    expect(typedDecimal('3,45', 2)).toBe(345);
    expect(typedDecimal('3,450', 2)).toBe(345);
    expect(typedDecimal('3,451', 2)).toBeNaN();
    expect(typedDecimal('34,5', 2)).toBe(3450);
  });

  it('works a comma sum out in whole units and as written, both true, ending on the answer', () => {
    const misses: string[] = [];
    ['komma-maal-10', 'kommagetal-keer', 'metriek'].forEach(topic => made(topic).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const steps = line.split(' → ');
      if (steps.length !== 2 || !steps.every(step => holds(step, 0)) || !line.endsWith(decimal(answer(sum), placesOf(sum.form)))) {
        misses.push(`${topic}: ${line}`);
      }
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('writes tenths as school does: 0,7 with a nought in front, 4 for a whole number', () => {
    expect(tenths(7)).toBe('0,7');
    expect(tenths(42)).toBe('4,2');
    expect(tenths(40)).toBe('4');
    expect(tenths(7, '.')).toBe('0.7');
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
        // a part more than one: ¾ van 4 asks nothing a child needs to share out
        expect(+amount / bottom).withContext(written).toBeGreaterThanOrEqual(2);
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

    it('adds and takes away tenths at the end of groep 6: below 10, never a whole number in the sum, never below nought', () => {
      const sums = made('tienden', 600);
      sums.forEach(sum => {
        const written = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign: sum.operation === '-' ? '−' : '+', form: sum.form }, WORDS));
        expect(sum.num1 % 10).withContext(written).not.toBe(0);
        expect(sum.num2 % 10).withContext(written).not.toBe(0);
        expect(answer(sum)).withContext(written).toBeGreaterThan(0);
        expect(answer(sum)).withContext(written).toBeLessThan(100);
      });
      expect(new Set(sums.map(sum => sum.operation))).toEqual(new Set(['+', '-']));
      // both 0,3 + 0,4 and sums past one whole: 1,5 + 2,7
      expect(sums.some(sum => sum.num1 < 10 && sum.num2 < 10)).toBeTrue();
      expect(sums.some(sum => sum.operation === '+' && sum.num1 > 10 && sum.num2 > 10)).toBeTrue();
      // the tenths carry over a whole: 0,8 + 0,5 = 1,3
      expect(sums.some(sum => sum.operation === '+' && sum.num1 % 10 + sum.num2 % 10 > 10)).toBeTrue();
      // worked in whole tenths and then as written, both true, ending on the answer
      const misses: string[] = [];
      sums.forEach(sum => {
        const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
        const steps = line.split(' → ');
        // each step read as written (it has no box, so nothing is filled in)
        const [inTenths, written] = steps.map(step => holds(step, 0));
        if (steps.length !== 2 || !inTenths || !written || !line.endsWith(tenths(answer(sum)))) {
          misses.push(line);
        }
      });
      expect(misses.slice(0, 5)).toEqual([]);
    });

    it('multiplies and shares by 10, 100 and 1000 in groep 7, never more than three figures after the comma', () => {
      const sums = made('komma-maal-10', 800);
      sums.forEach(sum => {
        const at = `${decimal(sum.num1, placesOf(sum.form))} ${sum.operation} ${sum.num2}`;
        expect([10, 100, 1000]).toContain(sum.num2);
        if (sum.operation === '*') {
          // 4,5 or 3,45: a comma number, not a whole one
          expect(decimal(sum.num1, placesOf(sum.form))).withContext(at).toContain(',');
        } else {
          expect(sum.num1 % sum.num2).withContext(at).toBe(0);
          expect(placesOf(sum.form)).toBeLessThanOrEqual(3);
        }
      });
      expect(new Set(sums.map(sum => sum.operation))).toEqual(new Set(['*', '/']));
      ['*', '/'].forEach(op => expect(new Set(sums.filter(sum => sum.operation === op).map(sum => sum.num2))).withContext(op).toEqual(new Set([10, 100, 1000])));
      // 72 : 100 from a whole number, 4,5 : 10 from a comma number with one figure after the comma
      expect(sums.some(sum => sum.operation === '/' && !decimal(sum.num1, 3).includes(','))).toBeTrue();
      expect(sums.some(sum => sum.operation === '/' && decimal(sum.num1, 3).includes(','))).toBeTrue();
      sums.filter(sum => sum.operation === '/').forEach(sum =>
        expect((decimal(sum.num1, 3).split(',')[1] || '').length).withContext(decimal(sum.num1, 3)).toBeLessThanOrEqual(1));
      // 4,5 × 10 and 3,45 × 100: one and two figures after the comma
      const figuresAfter = (sum: SchoolSum) => decimal(sum.num1, 2).split(',')[1].length;
      expect(new Set(sums.filter(sum => sum.operation === '*').map(figuresAfter))).toEqual(new Set([1, 2]));
    });

    it('multiplies a comma number by a whole one at the end of groep 7: 2,5 × 4, 1,25 × 8, some coming out whole', () => {
      const sums = made('kommagetal-keer', 800);
      sums.forEach(sum => {
        expect(decimal(sum.num1, 2)).toContain(',');
        expect(sum.num2).toBeGreaterThanOrEqual(2);
        expect(sum.num2).toBeLessThanOrEqual(9);
      });
      expect(sums.some(sum => !decimal(answer(sum), 2).includes(','))).toBeTrue();
      // two figures after the comma only for a quarter or three quarters (1,25, 2,75), times 4 or 8: they come out whole
      const quarters = sums.filter(sum => decimal(sum.num1, 2).split(',')[1].length === 2);
      expect(new Set(quarters.map(sum => sum.num1 % 100))).toEqual(new Set([25, 75]));
      quarters.forEach(sum => expect(answer(sum) % 100).withContext(`${decimal(sum.num1, 2)} × ${sum.num2}`).toBe(0));
    });

    it('changes a measure with a comma into a smaller unit at the end of groep 7: 1000 m in a km and g in a kg, 10 dl in a litre, 100 cm in a metre', () => {
      const factor: { [form: string]: number } = { 'komma-km-m': 1000, 'komma-kg-g': 1000, 'komma-l-dl': 10, 'komma-m-cm': 100 };
      const seen = new Set<string>();
      made('metriek', 600).forEach(sum => {
        seen.add(sum.form!);
        expect(sum.num2).withContext(sum.form!).toBe(factor[sum.form!]);
        expect(tenths(sum.num1)).withContext(sum.form!).toContain(',');
        expect(sum.num1).toBeLessThan(100);
      });
      expect(seen).toEqual(new Set(Object.keys(factor)));
    });

    it('adds and takes away fractions with the same denominator in groep 7, the answer a part of a whole: never nothing, never a whole', () => {
      const sums = made('gelijknamige-breuken', 800);
      sums.forEach(sum => {
        const under = Number(sum.form!.split('-')[1]);
        const at = `${sum.num1}/${under} ${sum.operation} ${sum.num2}/${under}`;
        expect(Math.min(sum.num1, sum.num2)).withContext(at).toBeGreaterThanOrEqual(1);
        expect(Math.max(sum.num1, sum.num2)).withContext(at).toBeLessThan(under);
        expect(answer(sum)).withContext(at).toBeGreaterThanOrEqual(1);
        expect(answer(sum)).withContext(at).toBeLessThan(under);
      });
      expect(new Set(sums.map(sum => sum.operation))).toEqual(new Set(['+', '-']));
      // one figure under the line, so the sum fits one line of a 320px phone
      expect(new Set(sums.map(sum => Number(sum.form!.split('-')[1])))).toEqual(new Set([4, 5, 6, 8]));
    });

    it('writes the fractions school knows as decimals in groep 7: halves, quarters, fifths and a tenth, in hundredths', () => {
      const seen = new Set<string>();
      made('breuk-naar-komma', 800).forEach(sum => {
        const glyph = read(sumLayout({ num1: sum.num1, num2: sum.num2, sign: '×', form: sum.form }, WORDS)).split(' ')[0];
        seen.add(glyph);
        const [top, bottom] = GLYPHS[glyph];
        // ¼ is 25 hundredths: below a whole, and never finer than hundredths (⅛ = 0,125 is groep 8)
        expect(answer(sum) * bottom).withContext(glyph).toBe(100 * top);
        expect(answer(sum)).toBeLessThan(100);
      });
      expect(seen).toEqual(new Set(['½', '¼', '¾', '⅕', '⅖', '⅗', '⅘', '⅒']));
    });

    it('prices packs through the price of one in groep 7: whole euros, a different number of packs asked, fewer and more', () => {
      const sums = made('verhoudingen', 800);
      sums.forEach(sum => {
        const packs = Number(sum.form!.split('-')[1]);
        const at = `${packs} → ${packs * sum.num2}, ${sum.num1} → ?`;
        expect(sum.num1).withContext(at).not.toBe(packs);
        expect(sum.num1).withContext(at).toBeGreaterThanOrEqual(2);
        // one pak costs a whole number of euros, 2 to 9: the step through 1 is a table sum
        expect(sum.num2).withContext(at).toBeGreaterThanOrEqual(2);
        expect(sum.num2).withContext(at).toBeLessThanOrEqual(9);
      });
      expect(sums.some(sum => sum.num1 < Number(sum.form!.split('-')[1]))).toBeTrue();
      expect(sums.some(sum => sum.num1 > Number(sum.form!.split('-')[1]))).toBeTrue();
    });

    it('takes 10%, 20%, 25% or 50% off a price in groep 7, the discount and what is paid both whole euros', () => {
      const sums = made('korting', 800);
      sums.forEach(sum => {
        const percent = Number(sum.form!.split('-')[1]);
        const at = `${percent}% korting op €${sum.num1}`;
        expect(100 * sum.num2).withContext(at).toBe(percent * sum.num1);
        expect(sum.num1).withContext(at).toBeGreaterThanOrEqual(20);
        expect(sum.num1).withContext(at).toBeLessThanOrEqual(200);
      });
      expect(new Set(sums.map(sum => Number(sum.form!.split('-')[1])))).toEqual(new Set([10, 20, 25, 50]));
      // prices as a shop has them, €45 as well as €120: many, and not only round tens
      expect(new Set(sums.map(sum => sum.num1)).size).toBeGreaterThan(40);
      ['korting-20', 'korting-25', 'korting-50'].forEach(form =>
        expect(sums.some(sum => sum.form === form && sum.num1 % 10 !== 0)).withContext(form).toBeTrue());
    });

    it('brings fractions in at the middle of groep 6 and the area at its end', () => {
      const first: { [kind: string]: string } = {};
      const kind = (form: string) => form.replace(/-\d+$/, '');
      for (const groep of [3, 4, 5, 6, 7]) {
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
      expect(first['tienden']).toBe('6E');
      expect(first['komma']).toBe('7M');
      expect(first['komma-km-m']).toBe('7E');
      expect(first['gelijknamig']).toBe('7M');
      expect(first['breuk-komma']).toBe('7M');
      expect(first['verhouding']).toBe('7E');
      expect(first['korting']).toBe('7E');
    });

    it('asks the start of groep 3 only plain sums: the forms come once the sums under them are known', () => {
      Object.keys(CURRICULUM[3].B).forEach(topic => expect(FORM_TOPICS).withContext(topic).not.toContain(topic));
    });
  });
});
