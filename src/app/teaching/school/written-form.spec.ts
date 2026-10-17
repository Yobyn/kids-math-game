import { SUM_FORMS, SumForm, UnlikeFractionForm, denominatorsOf, placesOf, readForm } from '../../question/sum-form';
import { CURRICULUM, Moment, Random, SchoolSum, TOPICS, schoolSum } from './groep';
import {
  FormWords, SumLayout, clock, decimal, degrees, formWorkedStep, grouped, meanList, signed, sumLayout, tenths, typedDecimal, typedTenths
} from './written-form';

const WORDS: FormWords = { double: 'dubbel', half: 'de helft van', of: 'van', remainder: 'rest', hours: 'uur', minutes: 'minuten',
  toTens: 'Rond af op tientallen', toHundreds: 'Rond af op honderdtallen', area: 'Oppervlakte van de rechthoek', point: ',',
  toThousands: 'Rond af op duizendtallen', packs: 'pakken', cost: 'kosten', discount: 'korting: wat betaal je?',
  scale: 'Schaal', mean: 'Wat is het gemiddelde?', minutesBetween: 'Hoeveel minuten?',
  degreesBetween: 'Hoeveel graden verschil?', perHour: 'per uur', volume: 'Inhoud in cm³',
  toOneDecimal: 'Rond af op 1 decimaal', hypotenuse: 'Rechthoekige driehoek: de schuine zijde?',
  triangleArea: 'Oppervlakte van de driehoek', largestX: 'grootste x =', totalFactor: 'De groeifactor in totaal?' };

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
  // Klas 3 and 4, read as their own sums before anything more general
  const klas = klasHolds(text);
  if (klas !== undefined) {
    return klas;
  }
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
  const measure = text.match(/^(\d+(?:,\d)?) (m|km|kg|l|m³|uur|h) = (\d+) (cm|m|g|dl|l|cm³|minuten|min)$/);
  if (measure) {
    const per: { [unit: string]: number } = {
      'm cm': 100, 'km m': 1000, 'kg g': 1000, 'l dl': 10, 'uur minuten': 60, 'h min': 60, 'm³ l': 1000, 'l cm³': 1000
    };
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
  // −3 + 8 = 5, −24 : −3 = 8: numbers below nought, with a real minus or a typed one
  const negative = text.match(/^([−-]?\d+) ([+−×:]) ([−-]?\d+) = ([−-]?\d+)$/);
  if (negative && /[−-]\d/.test(text)) {
    const [a, b, c] = [negative[1], negative[3], negative[4]].map(n => Number(n.replace('−', '-')));
    const sign = negative[2];
    return (sign === '+' ? a + b : sign === '−' ? a - b : sign === '×' ? a * b : a / b) === c;
  }
  // 3 + 4 × 5 = 23: times first
  const precedence = text.match(/^(\d+) ([+−]) (\d+) × (\d+) = (\d+)$/);
  if (precedence) {
    const [a, b, c, d] = [1, 3, 4, 5].map(i => +precedence[i]);
    return (precedence[2] === '+' ? a + b * c : a - b * c) === d;
  }
  // ( 3 + 4 ) × 5 = 35: the brackets first
  const brackets = text.match(/^\( (\d+) \+ (\d+) \) × (\d+) = (\d+)$/);
  if (brackets) {
    return (+brackets[1] + +brackets[2]) * +brackets[3] === +brackets[4];
  }
  // ⅔ × 12 = 8
  const timesFraction = text.match(new RegExp(`^${GLYPH} × (\\d+) = (\\d+)$`));
  if (timesFraction) {
    const [top, bottom] = GLYPHS[timesFraction[1]];
    return +timesFraction[2] * top === +timesFraction[3] * bottom;
  }
  // a = 3 × b + 4 b = 5 → a = 19
  const formula = text.match(/^a = (\d+) × b \+ (\d+) b = (\d+) → a = (\d+)$/);
  if (formula) {
    return +formula[1] * +formula[3] + +formula[2] === +formula[4];
  }
  // Rond af op 1 decimaal 3,47 ≈ 3,5: a tenth, and no tenth nearer; halfway goes up
  const oneDecimal = text.match(/^Rond af op 1 decimaal ([\d,]+) ≈ ([\d,]+)$/);
  if (oneDecimal) {
    const [n, filled] = [thousandths(oneDecimal[1]), thousandths(oneDecimal[2])];
    const distance = Math.abs(n - filled);
    return filled % 100 === 0 && (distance < 50 || (distance === 50 && filled > n));
  }
  // 2³ = 8: the number that many times
  const power = text.match(/^(\d+)([²³⁴⁵]) = (\d+)$/);
  if (power) {
    return (+power[1]) ** ('²³⁴⁵'.indexOf(power[2]) + 2) === +power[3];
  }
  // √144 = 12: the number that times itself is 144
  const root = text.match(/^√(\d+) = (\d+)$/);
  if (root) {
    return +root[2] * +root[2] === +root[1];
  }
  // 3x + 5 = 20 → x = 5: put back in, it is true
  const equation = text.match(/^(\d*)x \+ (\d+) = (\d+) x = (\d+)$/);
  if (equation) {
    return (+(equation[1] || 1)) * +equation[4] + +equation[2] === +equation[3];
  }
  // x = 2 3 ( x + 4 ) = 18
  const fillIn = text.match(/^x = (\d+) (\d+) \( x \+ (\d+) \) = (\d+)$/);
  if (fillIn) {
    return +fillIn[2] * (+fillIn[1] + +fillIn[3]) === +fillIn[4];
  }
  // € 80 + 15% = € 92
  const change = text.match(/^€ (\d+) ([+−]) (\d+)% = € (\d+)$/);
  if (change) {
    const [price, percent, paid] = [+change[1], +change[3], +change[4]];
    return 100 * paid === price * (change[2] === '+' ? 100 + percent : 100 - percent);
  }
  // Rechthoekige driehoek: de schuine zijde? a = 6 b = 8 → c = 10
  const pythagoras = text.match(/^Rechthoekige driehoek: de schuine zijde\? a = (\d+) b = (\d+) → (\d+)$/);
  if (pythagoras) {
    return (+pythagoras[1]) ** 2 + (+pythagoras[2]) ** 2 === (+pythagoras[3]) ** 2;
  }
  // Oppervlakte van de driehoek ½ × 10 × 6 = 30
  const triangle = text.match(/^Oppervlakte van de driehoek ½ × (\d+) × (\d+) = (\d+)$/);
  if (triangle) {
    return +triangle[1] * +triangle[2] === 2 * +triangle[3];
  }
  // 10 × 5 × 4 = 200 cm³: a box's volume
  const volume = text.match(/^(?:Inhoud in cm³ )?(\d+) × (\d+) × (\d+) = (\d+)$/);
  if (volume) {
    return +volume[1] * +volume[2] * +volume[3] === +volume[4];
  }
  // Hoeveel minuten? 9:45 → 11:20 = 95: as a clock counts them
  const span = text.match(/^Hoeveel minuten\? (\d+):(\d\d) → (\d+):(\d\d) (\d+)$/);
  if (span) {
    const [h1, m1, h2, m2, minutes] = span.slice(1).map(Number);
    return m1 < 60 && m2 < 60 && (h2 * 60 + m2) - (h1 * 60 + m1) === minutes;
  }
  // 60 km per uur 2,5 uur = 150 km: that far every hour, for that many hours
  const speed = text.match(/^(\d+) km per uur (\d+(?:,\d)?) uur = (\d+) km$/);
  if (speed) {
    return +speed[1] * thousandths(speed[2]) === 1000 * +speed[3];
  }
  // Hoeveel graden verschil? −3° → 5° = 8: the steps on a thermometer between them
  const temperature = text.match(/^Hoeveel graden verschil\? (−?)(\d+)° → (−?)(\d+)° = (\d+)$/);
  if (temperature) {
    const from = (temperature[1] ? -1 : 1) * +temperature[2];
    const to = (temperature[3] ? -1 : 1) * +temperature[4];
    return Math.abs(to - from) === +temperature[5];
  }
  // 18 van 72 = 25 %: 18 is a quarter of 72
  const whichPercent = text.match(/^(\d+) van (\d+) = (\d+) %$/);
  if (whichPercent) {
    return 100 * +whichPercent[1] === +whichPercent[3] * +whichPercent[2];
  }
  // Schaal 1 : 500 4 cm = 20 m: every centimetre on the map is 500 in real life
  const scale = text.match(/^Schaal 1 : (\d+) (\d+) cm = (\d+) m$/);
  if (scale) {
    return +scale[1] * +scale[2] === 100 * +scale[3];
  }
  // Wat is het gemiddelde? 11, 15, 10 → 12: what each would be if they were all the same
  const mean = text.match(/^Wat is het gemiddelde\? ([\d, ]+) → (\d+)$/);
  if (mean) {
    const values = mean[1].split(', ').map(Number);
    return values.reduce((sum, value) => sum + value, 0) === values.length * +mean[2];
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

/** A number as written, with a comma and a real or typed minus: −8, 0,04, 210. */
function value(text: string): number {
  return Number(text.replace('\u2212', '-').replace(',', '.'));
}

/** Klas 3 and 4's sums, checked as a teacher would; undefined for anything else. */
function klasHolds(text: string): boolean | undefined {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\d+)\(x \+ (\d+)\) = (\d+) x = (\d+)$/))) {
    return +m[1] * (+m[4] + +m[2]) === +m[3];
  }
  if ((m = text.match(/^(\d+)x = (\d*)x \+ (\d+) x = (\d+)$/))) {
    return +m[1] * +m[4] === +(m[2] || 1) * +m[4] + +m[3];
  }
  if ((m = text.match(/^x² = (\d+) {2}\(x > 0\) x = (\d+)$/))) {
    return +m[2] * +m[2] === +m[1];
  }
  if ((m = text.match(/^x² − (\d+)x \+ (\d+) = 0 grootste x = (\d+)$/))) {
    const [b, c, x] = [+m[1], +m[2], +m[3]];
    // a solution, and the larger of the two: the other is b − x, and it must be smaller
    return x * x - b * x + c === 0 && b - x < x;
  }
  if ((m = text.match(/^\(−(\d+)\)([²³⁴]) = ([−-]?\d+)$/))) {
    return (-m[1]) ** ('²³⁴'.indexOf(m[2]) + 2) === value(m[3]);
  }
  if ((m = text.match(/^−(\d+)² = ([−-]?\d+)$/))) {
    return -(+m[1] * +m[1]) === value(m[2]);
  }
  if ((m = text.match(/^([\d,]+) · 10(⁻?)([¹²³⁴⁵⁶]) = ([\d,]+)$/))) {
    const power = '¹²³⁴⁵⁶'.indexOf(m[3]) + 1;
    const exact = m[2] ? thousandths(m[1]) / 10 ** power : thousandths(m[1]) * 10 ** power;
    return exact === thousandths(m[4]);
  }
  if ((m = text.match(/^(\d+) × (\d+,\d+)(²?) = ([\d,]+)$/))) {
    const factor = thousandths(m[2]) / 1000;
    return Math.abs(+m[1] * factor ** (m[3] ? 2 : 1) - value(m[4])) < 1e-9;
  }
  if ((m = text.match(/^√(\d+) = (\d+) √(\d+)$/))) {
    return +m[2] * +m[2] * +m[3] === +m[1];
  }
  if ((m = text.match(/^(sin 30°|cos 60°|tan 45°) × (\d+) = ([\d,]+)$/))) {
    return Math.abs((m[1] === 'tan 45°' ? 1 : 0.5) * +m[2] - value(m[3])) < 1e-9;
  }
  if ((m = text.match(/^A = l × b, A = (\d+) l = (\d+) → b = (\d+)$/))) {
    return +m[2] * +m[3] === +m[1];
  }
  if ((m = text.match(/^De groeifactor in totaal\? \+(\d+)% → −(\d+)% × ([\d,]+)$/))) {
    return Math.abs((100 + +m[1]) * (100 - +m[2]) / 10000 - value(m[3])) < 1e-9;
  }
  return undefined;
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
    expect(shown('procent-via-5', 3, 3, '*')).toBe('15% van 60 = ?');
    expect(shown('procent-via-10', 7, 3, '*')).toBe('30% van 70 = ?');
    expect(shown('procent-via-1', 3, 12, '*')).toBe('12% van 300 = ?');
    expect(shown('welk-procent', 1800, 72, '/')).toBe('18 van 72 = ? %');
    expect(shown('schaal-500', 4, 5, '*')).toBe('Schaal 1 : 500 4 cm = ? m');
    expect(shown('schaal-1000', 7, 10, '*')).toBe('Schaal 1 : 1000 7 cm = ? m');
    expect(shown('gemiddelde-3', 36, 3, '/')).toBe('Wat is het gemiddelde? 11, 15, 10 → ?');
    expect(shown('inhoud-10', 50, 4, '*')).toBe('Inhoud in cm³ 10 × 5 × 4 = ?');
    expect(shown('m3-l', 2, 1000, '*')).toBe('2 m³ = ? l');
    expect(shown('l-cm3', 3, 1000, '*')).toBe('3 l = ? cm³');
    expect(shown('tijdsduur', 680, 585, '−')).toBe('Hoeveel minuten? 9:45 → 11:20 ?');
    expect(shown('snelheid', 5, 30, '*')).toBe('60 km per uur 2,5 uur = ? km');
    expect(shown('temperatuur-op', 5, 3, '+')).toBe('Hoeveel graden verschil? \u22123° → 5° = ?');
    expect(shown('temperatuur-af', 5, 3, '+')).toBe('Hoeveel graden verschil? 5° → \u22123° = ?');
    expect(shown('negatief', -3, 8, '+')).toBe('\u22123 + 8 = ?');
    expect(shown('negatief', -24, -3, ':')).toBe('\u221224 : \u22123 = ?');
    expect(shown('voorrang-5', 3, 20, '+')).toBe('3 + 4 × 5 = ?');
    expect(shown('haakjes-3', 7, 5, '*')).toBe('( 3 + 4 ) × 5 = ?');
    expect(shown('ongelijk-2-3', 3, 2, '+')).toBe('1/2 + 1/3 = ? / 6');
    expect(shown('ongelijk-4-8', 6, 3, '−')).toBe('3/4 − 3/8 = ? / 8');
    expect(shown('keer-3', 4, 2, '*')).toBe('⅔ × 12 = ?');
    expect(shown('formule-3', 15, 4, '+')).toBe('a = 3 × b + 4 b = 5 → a = ?');
    expect(shown('afronden-decimaal', 347, 10, '≈')).toBe('Rond af op 1 decimaal 3,47 ≈ ?');
    expect(shown('macht-3', 4, 2, '*')).toBe('2³ = ?');
    expect(shown('wortel', 144, 12, '/')).toBe('√144 = ?');
    expect(shown('vergelijking-5', 15, 3, '/')).toBe('3x + 5 = 20 x = ?');
    expect(shown('vergelijking-7', 8, 1, '/')).toBe('x + 7 = 15 x = ?');
    expect(shown('invullen-2', 3, 6, '*')).toBe('x = 2 3 ( x + 4 ) = ?');
    expect(shown('toename-15', 80, 12, '+')).toBe('€ 80 + 15% = € ?');
    expect(shown('afname-20', 80, 16, '−')).toBe('€ 80 \u2212 20% = € ?'.replace('\u2212', '−'));
    expect(shown('pythagoras-1', 100, 10, '/')).toBe('Rechthoekige driehoek: de schuine zijde? a = 6 b = 8 → ?');
    expect(shown('driehoek', 5, 6, '*')).toBe('Oppervlakte van de driehoek ½ × 10 × 6 = ?');
    expect(shown('haakvgl-3', 7, 4, '−')).toBe('3(x + 4) = 21 x = ?');
    expect(shown('beide-5', 12, 2, ':')).toBe('5x = 3x + 12 x = ?');
    expect(shown('negmacht-3', 4, -2, '×')).toBe('(\u22122)³ = ?');
    expect(shown('minkwadraat', 3, -3, '×')).toBe('\u22123² = ?');
    expect(shown('wetenschap', 32, 1000, '×')).toBe('3,2 · 10³ = ?');
    expect(shown('wetenschap-min', 4000, 100, ':')).toBe('4 · 10⁻² = ?');
    expect(shown('groeifactor', 105, 200, '×')).toBe('200 × 1,05 = ?');
    expect(shown('kwadraat-vgl', 49, 7, ':')).toBe('x² = 49  (x > 0) x = ?');
    expect(shown('kwadratisch', 5, 2, '−')).toBe('x² \u2212 5x + 6 = 0 grootste x = ?');
    expect(shown('groei-2', 121, 100, '×')).toBe('100 × 1,1² = ?');
    expect(shown('wortel-vereenvoudig', 10, 2, ':')).toBe('√50 = ? √2');
    expect(shown('sin-30', 50, 10, '×')).toBe('sin 30° × 10 = ?');
    expect(shown('herleiden', 36, 9, ':')).toBe('A = l × b, A = 36 l = 9 → b = ?');
    expect(shown('procent-stappen', 110, 90, '×')).toBe('De groeifactor in totaal? +10% → \u221210% × ?');
    // and a plain sum is still a plain sum, the box at the end
    expect(read(sumLayout({ num1: 7, num2: 5, sign: '+' }, WORDS))).toBe('7 + 5 = ?');
    // Only ¾ = ?/12 has its box as a numerator, drawn over the 12
    expect(sumLayout({ num1: 3, num2: 3, sign: '×', form: 'gelijk-4' }, WORDS).over).toBeTrue();
    expect(sumLayout({ num1: 5, num2: 3, sign: '×', form: 'van-4' }, WORDS).over).toBeFalsy();
    expect(sumLayout({ num1: 7, num2: 5, sign: '+' }, WORDS).over).toBeFalsy();
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
    expect(formWorkedStep('procent-via-5', 3, 3, '*')).toBe('5% van 60 = 3 → 3 × 3 = 9');
    expect(formWorkedStep('procent-via-1', 3, 12, '*')).toBe('1% van 300 = 3 → 12 × 3 = 36');
    expect(formWorkedStep('welk-procent', 1800, 72, '/')).toBe('18 × 100 = 1800 → 1800 : 72 = 25');
    expect(formWorkedStep('schaal-500', 4, 5, '*')).toBe('1 cm = 5 m → 4 × 5 = 20');
    expect(formWorkedStep('gemiddelde-4', 48, 4, '/')).toBe('13 + 10 + 11 + 14 = 48 → 48 : 4 = 12');
    expect(formWorkedStep('inhoud-10', 50, 4, '*')).toBe('10 × 5 = 50 → 50 × 4 = 200');
    expect(formWorkedStep('m3-l', 2, 1000, '*')).toBe('1 m³ = 1000 l → 2 × 1000 = 2000');
    expect(formWorkedStep('tijdsduur', 680, 585, '-')).toBe('9:45 → 10:00 = 15 → 10:00 → 11:20 = 80 → 15 + 80 = 95');
    expect(formWorkedStep('snelheid', 5, 30, '*')).toBe('2 × 60 = 120 → 120 + 30 = 150');
    expect(formWorkedStep('snelheid', 6, 40, '*')).toBe('3 × 80 = 240');
    expect(formWorkedStep('temperatuur-op', 5, 3, '+')).toBe('\u22123° → 0° = 3 → 0° → 5° = 5 → 3 + 5 = 8');
    expect(formWorkedStep('temperatuur-af', 5, 3, '+')).toBe('5° → 0° = 5 → 0° → \u22123° = 3 → 5 + 3 = 8');
    expect(formWorkedStep('negatief', -3, 8, '+')).toBe('8 \u2212 3 = 5 → 5');
    expect(formWorkedStep('negatief', 4, 9, '-')).toBe('4 \u2212 9 = 4 + \u22129 → 9 \u2212 4 = 5 → \u22125');
    expect(formWorkedStep('negatief', -24, -3, '/')).toBe('24 : 3 = 8 → \u2212 : \u2212 = + → 8');
    expect(formWorkedStep('negatief', -4, 6, '*')).toBe('4 × 6 = 24 → \u2212 × + = \u2212 → \u221224');
    expect(formWorkedStep('negatief', 5, -6, '-')).toBe('5 \u2212 \u22126 = 5 + 6 → 5 + 6 = 11');
    expect(formWorkedStep('voorrang-5', 3, 20, '+')).toBe('4 × 5 = 20 → 3 + 20 = 23');
    expect(formWorkedStep('haakjes-3', 7, 5, '*')).toBe('3 + 4 = 7 → 7 × 5 = 35');
    expect(formWorkedStep('ongelijk-2-3', 3, 2, '+')).toBe('1/2 = 3/6 → 1/3 = 2/6 → 3 + 2 = 5');
    expect(formWorkedStep('keer-3', 4, 2, '*')).toBe('12 : 3 = 4 → 2 × 4 = 8');
    expect(formWorkedStep('formule-3', 15, 4, '+')).toBe('3 × 5 = 15 → 15 + 4 = 19');
    expect(formWorkedStep('afronden-decimaal', 347, 10, '≈')).toBe('3,47: 7 ≥ 5 → 3,5');
    expect(formWorkedStep('afronden-decimaal', 342, 10, '≈')).toBe('3,42: 2 < 5 → 3,4');
    expect(formWorkedStep('macht-5', 16, 2, '*')).toBe('2 × 2 × 2 × 2 × 2 = 32');
    expect(formWorkedStep('wortel', 144, 12, '/')).toBe('12 × 12 = 144');
    expect(formWorkedStep('vergelijking-5', 15, 3, '/')).toBe('20 \u2212 5 = 15 → 15 : 3 = 5');
    expect(formWorkedStep('invullen-2', 3, 6, '*')).toBe('2 + 4 = 6 → 3 × 6 = 18');
    expect(formWorkedStep('toename-15', 80, 12, '+')).toBe('15% van 80 = 12 → 80 + 12 = 92');
    expect(formWorkedStep('afname-20', 80, 16, '-')).toBe('20% van 80 = 16 → 80 \u2212 16 = 64');
    expect(formWorkedStep('pythagoras-1', 100, 10, '/')).toBe('6² + 8² = 36 + 64 = 100 → √100 = 10');
    expect(formWorkedStep('driehoek', 5, 6, '*')).toBe('10 : 2 = 5 → 5 × 6 = 30');
    expect(formWorkedStep('haakvgl-3', 7, 4, '-')).toBe('21 : 3 = 7 → 7 \u2212 4 = 3');
    expect(formWorkedStep('beide-5', 12, 2, '/')).toBe('5x \u2212 3x = 2x → 12 : 2 = 6');
    expect(formWorkedStep('negmacht-3', 4, -2, '*')).toBe('(\u22122) × (\u22122) × (\u22122) = \u22128');
    expect(formWorkedStep('minkwadraat', 3, -3, '*')).toBe('3² = 9 → \u22129');
    expect(formWorkedStep('wetenschap', 32, 1000, '*')).toBe('3,2 × 1000 = 3200');
    expect(formWorkedStep('wetenschap-min', 4000, 100, '/')).toBe('4 : 100 = 0,04');
    expect(formWorkedStep('groeifactor', 105, 200, '*')).toBe('1% van 200 = 2 → 105 × 2 = 210');
    expect(formWorkedStep('kwadratisch', 5, 2, '-')).toBe('2 × 3 = 6, 2 + 3 = 5 → x = 2 of x = 3');
    expect(formWorkedStep('groei-2', 121, 100, '*')).toBe('1,1 × 1,1 = 1,21 → 100 × 1,21 = 121');
    expect(formWorkedStep('wortel-vereenvoudig', 10, 2, '/')).toBe('50 = 25 × 2 → √25 = 5');
    expect(formWorkedStep('sin-30', 50, 10, '*')).toBe('sin 30° = 0,5 → 0,5 × 10 = 5');
    expect(formWorkedStep('herleiden', 36, 9, '/')).toBe('b = A : l → 36 : 9 = 4');
    expect(formWorkedStep('procent-stappen', 110, 90, '*')).toBe('1,1 × 0,9 = 0,99');
    expect(formWorkedStep(undefined, 7, 5)).toBeUndefined();
    const misses: string[] = [];
    FORM_TOPICS.forEach(topic => made(topic).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      if (sum.form === 'afronden' || placesOf(sum.form) || /^(procent-\d|korting|gelijknamig|schaal|gemiddelde|tijdsduur|temperatuur|negatief|ongelijk|macht|pythagoras|beide|kwadratisch|kwadraat-vgl|negmacht|minkwadraat|wortel-vereenvoudig|herleiden)/.test(sum.form!)) {
        return;  // read as rounding, as decimals, as percentages, as fractions, as scales and as means below
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

  it('works a scale out through what one centimetre stands for: 1 : 500, 1 cm = 5 m, so 4 cm is 4 × 5', () => {
    const misses: string[] = [];
    made('schaal').forEach(sum => {
      const [one, times] = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!.split(' → ');
      const scale = Number(sum.form!.split('-')[1]);
      // 1 cm on the map is `scale` cm in real life: that many metres over a hundred
      if (one !== `1 cm = ${scale / 100} m` || !holds(times, 0) || !times.endsWith(`= ${answer(sum)}`)) {
        misses.push(`${one} → ${times}`);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a mean out as school does: all of them added, then shared by how many there are', () => {
    const misses: string[] = [];
    made('gemiddelde').forEach(sum => {
      const [added, shared] = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!.split(' → ');
      const values = meanList(sum.num1, sum.num2);
      if (added !== `${values.join(' + ')} = ${sum.num1}` || !holds(shared, 0) || !shared.endsWith(`= ${answer(sum)}`)) {
        misses.push(`${added} → ${shared}`);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a time span out through the whole hour: up to it, on from it, and the two added', () => {
    const misses: string[] = [];
    made('tijdsduur').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const [up, upBy, on, onBy, added] = line.split(' → ').map(part => part.trim());
      const hour = Math.ceil(sum.num2 / 60) * 60;
      if (up !== clock(sum.num2) || !upBy.startsWith(`${clock(hour)} = `) || on !== clock(hour) || !onBy.startsWith(`${clock(sum.num1)} = `)
          || !holds(added, 0) || !added.endsWith(`= ${answer(sum)}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a temperature out through nought: down or up to it, on from it, and the two added', () => {
    const misses: string[] = [];
    made('temperatuur').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const parts = line.split(' → ');
      const [from, to] = sum.form === 'temperatuur-op' ? [-sum.num2, sum.num1] : [sum.num1, -sum.num2];
      if (parts.length !== 5 || parts[0] !== degrees(from) || parts[1] !== `0° = ${Math.abs(from)}` || parts[2] !== '0°'
          || parts[3] !== `${degrees(to)} = ${Math.abs(to)}` || !holds(parts[4], 0) || !parts[4].endsWith(`= ${answer(sum)}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works numbers below nought out without their signs first, then the sign, ending on the answer', () => {
    const misses: string[] = [];
    made('negatief-plus-min').concat(made('negatief-keer-deel')).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const steps = line.split(' → ');
      // the sums without signs are true, and the last step is the answer, with a real minus
      const plain = steps.filter(step => /^\d+ [×:−+] \d+ = \d+$/.test(step.replace(/\u2212/g, '−')));
      const last = steps[steps.length - 1];
      if (!plain.length || !plain.every(step => holds(step.replace(/\u2212/g, '−'), 0))
          || (last !== signed(answer(sum)) && !last.endsWith(`= ${signed(answer(sum))}`))) {
        misses.push(`${sum.num1} ${sum.operation} ${sum.num2}: ${line} [${plain.join(' | ')}]`);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works fractions with different denominators out by writing both over the common one, then adding', () => {
    const misses: string[] = [];
    made('ongelijknamige-breuken').forEach(sum => {
      const [first, second, last] = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!.split(' → ');
      const same = (step: string) => {
        const [a, b, c, d] = step.split(/ = |\//).map(Number);
        return a * d === b * c;
      };
      if (!same(first) || !same(second) || !holds(last, 0) || !last.endsWith(`= ${answer(sum)}`)) {
        misses.push(`${first} → ${second} → ${last}`);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('rounds to one decimal by the figure after it, a 5 or more going up, and says so', () => {
    const misses: string[] = [];
    made('afronden-decimaal').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      if (!line.startsWith(`${decimal(sum.num1, 2)}: ${sum.num1 % 10} `) || !line.endsWith(`→ ${decimal(answer(sum), 2)}`)) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works a power out as the number that many times, and Pythagoras as a² + b² then the root', () => {
    const misses: string[] = [];
    made('machten').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const factors = line.split(' = ')[0].split(' × ').map(Number);
      if (factors.length !== Number(sum.form!.split('-')[1]) || factors.some(f => f !== sum.num2) || !line.endsWith(`= ${answer(sum)}`)) {
        misses.push(line);
      }
    });
    made('pythagoras').forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const [squares, root] = line.split(' → ');
      const [a, b] = squares.match(/^(\d+)² \+ (\d+)²/)!.slice(1).map(Number);
      if (a * a + b * b !== sum.num1 || root !== `√${sum.num1} = ${answer(sum)}`) {
        misses.push(line);
      }
    });
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('works klas 3 and 4 out so that each line ends on the answer, as the child types it', () => {
    const topics = ['haakjes-vergelijking', 'x-beide-kanten', 'negatieve-machten', 'wetenschappelijk', 'groeifactor', 'kwadraat-vergelijking',
      'ontbinden', 'groei-twee-stappen', 'wortels-vereenvoudigen', 'goniometrie', 'formule-herleiden', 'procent-stappen'];
    const misses: string[] = [];
    topics.forEach(topic => made(topic).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const places = placesOf(sum.form);
      const shown = places ? decimal(answer(sum), places) : signed(answer(sum));
      if (!line || !line.endsWith(shown)) {
        misses.push(`${topic}: ${line} (wanted ${shown})`);
      }
    }));
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

    it('takes any percentage of an amount in groep 8, through 10%, 5% or 1%, never only the 10%, 25% and 50% of groep 7', () => {
      const sums = made('procent-van', 900);
      const seen = new Set<string>();
      sums.forEach(sum => {
        const step = Number(sum.form!.split('-')[2]);
        const percent = step * sum.num2;
        const amount = sum.num1 * 100 / step;
        const at = `${percent}% van ${amount}`;
        seen.add(sum.form!);
        expect([10, 25, 50]).withContext(at).not.toContain(percent);
        expect(percent).withContext(at).toBeLessThan(100);
        // through 1% only what 5% and 10% cannot do: 12%, 36%
        if (step === 1) {
          expect(percent % 5).withContext(at).not.toBe(0);
        }
        expect(Number.isInteger(amount)).withContext(at).toBeTrue();
        expect(amount).withContext(at).toBeLessThanOrEqual(1000);
      });
      expect(seen).toEqual(new Set(['procent-via-10', 'procent-via-5', 'procent-via-1']));
      // 15% van 60, the doc's own example, is one of them
      expect(sums.some(sum => sum.form === 'procent-via-5' && sum.num1 === 3 && sum.num2 === 3)).toBeTrue();
    });

    it('asks what percentage one amount is of another in groep 8: a whole percentage, a whole part, never out of 100', () => {
      const sums = made('welk-procent', 800);
      sums.forEach(sum => {
        const part = sum.num1 / 100;
        const at = `${part} van ${sum.num2}`;
        expect(Number.isInteger(part)).withContext(at).toBeTrue();
        expect(part).withContext(at).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(answer(sum))).withContext(at).toBeTrue();
        expect(answer(sum)).withContext(at).toBeLessThan(100);
        expect(sum.num2).withContext(at).not.toBe(100);
      });
      expect(new Set(sums.map(sum => answer(sum))).size).toBeGreaterThan(8);
    });

    it('takes parts of bigger amounts in groep 8: ⅔ van 45, past what groep 6 asked', () => {
      const sums = made('breuk-van-groot', 800);
      sums.forEach(sum => expect(sum.num2).toBeGreaterThanOrEqual(2));
      expect(sums.some(sum => sum.num1 * Number(sum.form!.split('-')[1]) > 100)).toBeTrue();
      expect(sums.some(sum => sum.form === 'van-3' && sum.num1 === 15 && sum.num2 === 2)).toBeTrue();
    });

    it('reads a map at 1 : 100, 1 : 200, 1 : 500 and 1 : 1000 in groep 8, in whole metres', () => {
      const sums = made('schaal', 600);
      sums.forEach(sum => expect(sum.num2 * 100).toBe(Number(sum.form!.split('-')[1])));
      expect(new Set(sums.map(sum => sum.form))).toEqual(new Set(['schaal-100', 'schaal-200', 'schaal-500', 'schaal-1000']));
    });

    it('asks the mean of three or four different numbers in groep 8, every one above nothing, the mean a whole number', () => {
      const sums = made('gemiddelde', 800);
      sums.forEach(sum => {
        const values = meanList(sum.num1, sum.num2);
        const at = values.join(', ');
        expect(values.length).withContext(at).toBe(sum.num2);
        expect(new Set(values).size).withContext(at).toBe(values.length);
        values.forEach(value => expect(value).withContext(at).toBeGreaterThan(0));
        expect(values.reduce((total, value) => total + value, 0)).withContext(at).toBe(sum.num1);
        expect(Number.isInteger(answer(sum))).withContext(at).toBeTrue();
        // the mean is somewhere in the middle, not one of the numbers given
        expect(values).withContext(at).not.toContain(answer(sum));
      });
      expect(new Set(sums.map(sum => sum.num2))).toEqual(new Set([3, 4]));
      // four of two figures each and the box do not fit one line of a 320px phone: four are small
      sums.filter(sum => sum.num2 === 4).forEach(sum =>
        expect(meanList(sum.num1, sum.num2).join(', ').replace(/\D/g, '').length).withContext(meanList(sum.num1, 4).join(', ')).toBeLessThanOrEqual(6));
      // the same sum is always the same list: a missed one comes back as it was
      expect(meanList(36, 3)).toEqual(meanList(36, 3));
    });

    it('asks the volume of a box at the end of groep 8, three whole numbers of cm, and litres in m³ and cm³', () => {
      made('inhoud', 600).forEach(sum => {
        const length = Number(sum.form!.split('-')[1]);
        expect(sum.num1 % length).toBe(0);
        expect(answer(sum)).toBeLessThanOrEqual(1000);
        expect(Math.min(length, sum.num1 / length, sum.num2)).toBeGreaterThanOrEqual(2);
      });
      expect(new Set(made('liters', 200).map(sum => sum.form))).toEqual(new Set(['m3-l', 'l-cm3']));
    });

    it('asks how long from one time to another in groep 8: never on the hour, always past one, at most four hours', () => {
      const sums = made('tijdsduur', 800);
      sums.forEach(sum => {
        const at = `${clock(sum.num2)} → ${clock(sum.num1)}`;
        expect(sum.num1 % 60).withContext(at).not.toBe(0);
        expect(sum.num2 % 60).withContext(at).not.toBe(0);
        expect(Math.floor(sum.num1 / 60)).withContext(at).toBeGreaterThan(Math.floor(sum.num2 / 60));
        expect(answer(sum)).withContext(at).toBeLessThan(240);
        expect(sum.num1 % 5 + sum.num2 % 5).withContext(at).toBe(0);
        // a school morning, starting before 10:00, so both times fit one line of a 320px phone
        expect(sum.num2).withContext(at).toBeLessThan(600);
      });
      expect(sums.some(sum => answer(sum) < 60)).toBeTrue();
      expect(sums.some(sum => answer(sum) > 120)).toBeTrue();
    });

    it('asks how far at a speed in groep 8: whole and half hours, whole kilometres', () => {
      const sums = made('snelheid', 600);
      sums.forEach(sum => {
        expect(sum.num1).toBeGreaterThanOrEqual(3);
        expect(Number.isInteger(answer(sum))).toBeTrue();
      });
      expect(sums.some(sum => sum.num1 % 2 === 1)).toBeTrue();
      expect(sums.some(sum => sum.num1 % 2 === 0)).toBeTrue();
    });

    it('asks how many degrees between a temperature below nought and one above it in groep 8, up and down', () => {
      const sums = made('temperatuur', 600);
      sums.forEach(sum => {
        // num2 is how far below nought the cold one is: −3° is kept as 3
        expect(sum.num2).toBeGreaterThan(0);
        expect(sum.num1).toBeGreaterThan(0);
        expect(sum.operation).toBe('+');
      });
      expect(new Set(sums.map(sum => sum.form))).toEqual(new Set(['temperatuur-op', 'temperatuur-af']));
    });

    it('keeps something below nought in every klas 1 negative-number sum, never an answer of nought', () => {
      made('negatief-plus-min', 800).forEach(sum => {
        expect(sum.num1 < 0 || sum.num2 < 0 || answer(sum) < 0).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue();
        expect(answer(sum)).not.toBe(0);
      });
      const timesAndShare = made('negatief-keer-deel', 800);
      timesAndShare.forEach(sum => {
        expect(sum.num1 < 0 || sum.num2 < 0).toBeTrue();
        expect(Number.isInteger(answer(sum))).toBeTrue();
      });
      expect(new Set(timesAndShare.map(sum => sum.operation))).toEqual(new Set(['*', '/']));
      expect(timesAndShare.some(sum => answer(sum) > 0)).withContext('− × − = +').toBeTrue();
    });

    it('asks the order of operations so that reading left to right gives a different answer', () => {
      made('voorrang', 600).forEach(sum => {
        const by = Number(sum.form!.split('-')[1]);
        const leftToRight = sum.operation === '+' ? (sum.num1 + sum.num2 / by) * by : (sum.num1 - sum.num2 / by) * by;
        expect(answer(sum)).toBeGreaterThan(0);
        expect(leftToRight).not.toBe(answer(sum));
      });
      made('haakjes', 600).forEach(sum => {
        const first = Number(sum.form!.split('-')[1]);
        // without the brackets: first + second × num2
        expect(first + (sum.num1 - first) * sum.num2).not.toBe(answer(sum));
      });
    });

    it('adds and takes away fractions with different denominators in klas 1, the answer a part of a whole', () => {
      const sums = made('ongelijknamige-breuken', 800);
      sums.forEach(sum => {
        const common = denominatorsOf(sum.form as UnlikeFractionForm)[2];
        expect(answer(sum)).toBeGreaterThan(0);
        expect(answer(sum)).toBeLessThan(common);
      });
      expect(new Set(sums.map(sum => sum.operation))).toEqual(new Set(['+', '-']));
      // each fraction in its simplest form, as it is written: 1/3, never 2/6
      sums.forEach(sum => {
        const [first, second, common] = denominatorsOf(sum.form as UnlikeFractionForm);
        const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
        expect(gcd(sum.num1 * first / common, first)).toBe(1);
        expect(gcd(sum.num2 * second / common, second)).toBe(1);
      });
      // the common denominator one figure, so the sum fits one line of a 320px phone
      sums.forEach(sum => expect(denominatorsOf(sum.form as UnlikeFractionForm)[2]).toBeLessThan(10));
    });

    it('asks powers a head can work out, roots of the squares to 15², and equations with a whole x above nought', () => {
      made('machten', 600).forEach(sum => expect(answer(sum)).toBeLessThanOrEqual(256));
      made('wortels', 600).forEach(sum => expect(Number.isInteger(answer(sum))).toBeTrue());
      const equations = made('vergelijkingen', 600);
      equations.forEach(sum => {
        expect(Number.isInteger(answer(sum))).toBeTrue();
        expect(answer(sum)).toBeGreaterThan(0);
      });
      expect(equations.some(sum => sum.num2 === 1)).withContext('x + 7 = 15, one step').toBeTrue();
      expect(equations.some(sum => sum.num2 > 1)).withContext('3x + 5 = 20, two steps').toBeTrue();
    });

    it('puts a percentage on a price or takes it off in whole euros, and Pythagoras always has a whole long side', () => {
      const changes = made('procent-erbij-eraf', 800);
      changes.forEach(sum => {
        const percent = Number(sum.form!.split('-')[1]);
        expect(100 * sum.num2).toBe(percent * sum.num1);
        // under €100, so the card fits one line of a 320px phone
        expect(sum.num1).toBeLessThan(100);
      });
      expect(new Set(changes.map(sum => sum.operation))).toEqual(new Set(['+', '-']));
      made('pythagoras', 600).forEach(sum => expect(answer(sum) * answer(sum)).toBe(sum.num1));
    });

    it('keeps every klas 3 and 4 answer whole where it must be: x above nought, the largest solution, a whole side', () => {
      made('haakjes-vergelijking', 600).forEach(sum => expect(answer(sum)).toBeGreaterThan(0));
      made('x-beide-kanten', 600).forEach(sum => expect(Number.isInteger(answer(sum)) && answer(sum) > 0).toBeTrue());
      made('ontbinden', 600).forEach(sum => expect(answer(sum)).toBeGreaterThan(sum.num2));
      made('goniometrie', 600).forEach(sum => expect((sum.num1 * sum.num2) % 100).toBe(0));
      made('groeifactor', 600).forEach(sum => expect((sum.num1 * sum.num2) % 100).toBe(0));
      const powers = made('negatieve-machten', 600);
      expect(powers.some(sum => sum.form === 'minkwadraat')).toBeTrue();
      expect(powers.some(sum => answer(sum) > 0) && powers.some(sum => answer(sum) < 0)).toBeTrue();
    });

    it('never asks to round a number that is already a tenth', () => {
      made('afronden-decimaal', 800).forEach(sum => expect(sum.num1 % 10).not.toBe(0));
    });

    it('brings fractions in at the middle of groep 6 and the area at its end', () => {
      const first: { [kind: string]: string } = {};
      const kind = (form: string) => form.replace(/-\d+$/, '');
      for (const groep of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        for (const moment of ['B', 'M', 'E'] as Moment[]) {
          const random = seeded(groep * 7 + moment.charCodeAt(0));
          for (let i = 0; i < 400 && schoolSum(groep, moment); i++) {
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
      expect(first['procent-via']).toBe('8M');
      expect(first['welk-procent']).toBe('8M');
      expect(first['schaal']).toBe('8M');
      expect(first['gemiddelde']).toBe('8M');
      expect(first['inhoud']).toBe('8E');
      expect(first['m3-l']).toBe('8E');
      expect(first['tijdsduur']).toBe('8E');
      expect(first['snelheid']).toBe('8E');
      expect(first['temperatuur-op']).toBe('8E');
      expect(first['negatief']).toBe('9B');
      expect(first['voorrang']).toBe('9M');
      expect(first['haakjes']).toBe('9M');
      expect(first['ongelijk-2']).toBe('9M');
      expect(first['keer']).toBe('9E');
      expect(first['formule']).toBe('9E');
      expect(first['afronden-decimaal']).toBe('9E');
      expect(first['macht']).toBe('10M');
      expect(first['wortel']).toBe('10M');
      expect(first['vergelijking']).toBe('10M');
      expect(first['invullen']).toBe('10M');
      expect(first['toename']).toBe('10E');
      expect(first['pythagoras']).toBe('10E');
      expect(first['driehoek']).toBe('10E');
      expect(first['haakvgl']).toBe('11M');
      expect(first['beide']).toBe('11M');
      expect(first['wetenschap']).toBe('11M');
      expect(first['groeifactor']).toBe('11E');
      expect(first['kwadraat-vgl']).toBe('11E');
      expect(first['kwadratisch']).toBe('12M');
      expect(first['groei']).toBe('12M');
      expect(first['sin']).toBe('12E');
      expect(first['herleiden']).toBe('12E');
      expect(first['procent-stappen']).toBe('12E');
    });

    it('asks the start of groep 3 only plain sums: the forms come once the sums under them are known', () => {
      Object.keys(CURRICULUM[3].B).forEach(topic => expect(FORM_TOPICS).withContext(topic).not.toContain(topic));
    });
  });
});
