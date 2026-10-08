import { DecimalMeasureForm, MeasureForm, SumForm, denominatorOf, packsOf, percentOf, placesOf } from '../../question/sum-form';

/**
 * How a sum is laid out round its answer box, and how its written form is
 * worked out (question/sum-form.ts). Free of the DOM, so both can be tested
 * straight: the box sits where the "?" is in the workbook.
 */

/** One piece of a sum on the screen. `kind` is its CSS class on the question card. */
export interface SumPart {
  kind: 'number' | 'operation' | 'equals' | 'word' | 'caption';
  text: string;
}

/** The sum as written, cut at the answer box: what comes before it, and after. */
export interface SumLayout {
  before: SumPart[];
  after: SumPart[];
  /**
   * The box is a numerator: drawn over what comes after it, with the
   * fraction bar between, as ¾ = ?/12 is written in the workbook.
   */
  over?: boolean;
}

/** The sum as the child reads it. `sign` is the operation as written in class (× : ÷ −). */
export interface SumToShow {
  num1: number;
  num2: number;
  sign: string;
  form?: SumForm;
}

/** The words a written form needs, in the child's language. */
export interface FormWords {
  double: string;
  half: string;
  /** "van" in ¼ van 20 */
  of: string;
  /** "rest" in 23 : 4 = 5 rest ? */
  remainder: string;
  /** The time units, which are words; the others are symbols the same in every language */
  hours: string;
  minutes: string;
  /** "Rond af op tientallen", the heading over 347 ≈ ? (a line of its own) */
  toTens: string;
  toHundreds: string;
  toThousands: string;
  /** "Oppervlakte", the heading over 6 m × 4 m = ? m² */
  area: string;
  /** The decimal sign: a comma in Dutch and Spanish (0,7), a point in English (0.7) */
  point: string;
  /** "pakken" and "kosten" in 3 pakken kosten €6, the line over 7 pakken = €? */
  packs: string;
  cost: string;
  /** "korting: wat betaal je?" after the 20% in the heading over €45 → €? */
  discount: string;
}

/**
 * The measures groep 5 changes into a smaller unit, and by how much. The
 * unit is written in symbols (m, cm, kg, g) as on a ruler or a scale; hours
 * and minutes are words in the child's language.
 */
export const MEASURES: { [form in MeasureForm]: { from: string; to: string; factor: number } } = {
  'm-cm': { from: 'm', to: 'cm', factor: 100 },
  'km-m': { from: 'km', to: 'm', factor: 1000 },
  'kg-g': { from: 'kg', to: 'g', factor: 1000 },
  'uur-min': { from: 'h', to: 'min', factor: 60 }
};

/** The fraction a part of an amount is written with: ¼ van 20. Only the ones groep 5 meets. */
export const UNIT_FRACTIONS: { [parts: number]: string } = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕' };

/**
 * Every fraction groep 6 writes, as the one character a workbook prints:
 * ¾ under its numerator and denominator. Only fractions in their simplest
 * form, each with a character of its own.
 */
export const FRACTIONS: { [fraction: string]: string } = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞', '1/10': '⅒'
};

/** The numerators a denominator is written with in FRACTIONS: 2 for thirds, 3 for quarters, 2, 3, 4 for fifths. */
export function numeratorsOf(denominator: number, from = 1): number[] {
  return Object.keys(FRACTIONS).map(key => key.split('/').map(Number))
    .filter(([top, bottom]) => bottom === denominator && top >= from).map(([top]) => top);
}

/** A number rounded to the nearest ten or hundred, a 5 going up as at school: 345 → 350. */
export function roundTo(value: number, to: number): number {
  return Math.round(value / to) * to;
}

/**
 * A number counted in tenths, hundredths or thousandths as it is written:
 * 7 tenths as 0,7, 345 hundredths as 3,45, 720 thousandths as 0,72, 40
 * tenths as 4. Decimal sums keep whole numbers, so nothing is ever a float
 * on the way.
 */
export function decimal(value: number, places: number, point = ','): string {
  const unit = 10 ** places;
  const whole = Math.floor(value / unit);
  const figures = String(value % unit).padStart(places, '0').replace(/0+$/, '');
  return figures ? `${whole}${point}${figures}` : String(whole);
}

/**
 * A typed answer read as a whole number of tenths, hundredths or
 * thousandths: "0,72", "0.72" and ".72" are 72 hundredths, "4" is 400.
 * NaN for anything with more figures after the comma than the unit has, so
 * 0,75 is never taken for 0,8.
 */
export function typedDecimal(typed: string, places: number): number {
  const text = String(typed == null ? '' : typed).trim().replace(',', '.');
  const match = text.match(/^(\d*)(?:\.(\d+?)0*)?$/);
  if (!text || !match || (match[2] || '').length > places) {
    return NaN;
  }
  return Number(match[1] || 0) * 10 ** places + Number((match[2] || '').padEnd(places, '0') || 0);
}

/** A number of tenths as it is written: 7 as 0,7 (decimal with one figure). */
export const tenths = (value: number, point = ',') => decimal(value, 1, point);

/** A typed answer read as tenths: "0,7" is 7 (typedDecimal with one figure). */
export const typedTenths = (typed: string) => typedDecimal(typed, 1);

/** The measures groep 7 changes into a smaller unit with a comma: 2,5 km = ? m. */
export const DECIMAL_MEASURES: { [form in DecimalMeasureForm]: { from: string; to: string; factor: number } } = {
  'komma-km-m': { from: 'km', to: 'm', factor: 1000 },
  'komma-kg-g': { from: 'kg', to: 'g', factor: 1000 },
  'komma-l-dl': { from: 'l', to: 'dl', factor: 10 },
  'komma-m-cm': { from: 'm', to: 'cm', factor: 100 }
};

/**
 * A number as a Dutch workbook prints it: from 10 000 up, the thousands set
 * apart by a narrow space (345 678), so six figures can be read at a glance.
 * Four figures stay together (2345).
 */
export function grouped(value: number): string {
  return value >= 10000 ? String(value).replace(/\B(?=(\d{3})+$)/g, '\u202f') : String(value);
}

const number = (value: number): SumPart => ({ kind: 'number', text: grouped(value) });
const operation = (text: string): SumPart => ({ kind: 'operation', text });
const equals: SumPart = { kind: 'equals', text: '=' };

export function sumLayout(sum: SumToShow, words: FormWords): SumLayout {
  switch (sum.form) {
    // 7 + ? = 10, kept as 10 - 7
    case 'aanvullen':
      return { before: [number(sum.num2), operation('+')], after: [equals, number(sum.num1)] };
    // 8 = 5 + ?, kept as 8 - 5
    case 'splitsen':
      return { before: [number(sum.num1), equals, number(sum.num2), operation('+')], after: [] };
    // dubbel 7 = ?, kept as 7 + 7
    case 'dubbel':
      return { before: [{ kind: 'word', text: words.double }, number(sum.num1), equals], after: [] };
    // de helft van 16 = ?, kept as 16 : 2
    case 'helft':
      return { before: [{ kind: 'word', text: words.half }, number(sum.num1), equals], after: [] };
    // ¼ van 20 = ?, kept as 20 : 4
    case 'deel':
      return {
        // The fraction is what the sum is about: it is as big as the numbers, only "van" is a word
        before: [{ kind: 'number', text: UNIT_FRACTIONS[sum.num2] }, { kind: 'word', text: words.of }, number(sum.num1), equals],
        after: []
      };
    // 23 : 4 = 5 rest ?, kept as 23 % 4: the box is what is left over
    case 'rest':
      return {
        before: [number(sum.num1), operation(sum.sign), number(sum.num2), equals,
                 number(Math.floor(sum.num1 / sum.num2)), { kind: 'word', text: words.remainder }],
        after: []
      };
    // Rond af op tientallen: 347 ≈ ?, kept as 347 ≈ 10. The instruction is a
    // heading on a line of its own, as in the workbook, so it never crowds the sum
    case 'afronden':
      return {
        before: [{ kind: 'caption', text: sum.num2 === 1000 ? words.toThousands : sum.num2 === 100 ? words.toHundreds : words.toTens },
                 number(sum.num1), operation('≈')],
        after: []
      };
    // ¾ van 20 = ?, kept as 5 × 3: the amount is one part times the parts
    case 'van-3':
    case 'van-4':
    case 'van-5':
    case 'van-6':
    case 'van-8':
      return {
        before: [{ kind: 'number', text: FRACTIONS[`${sum.num2}/${denominatorOf(sum.form)}`] }, { kind: 'word', text: words.of },
                 number(sum.num1 * denominatorOf(sum.form)), equals],
        after: []
      };
    // ¾ = ?/12, kept as 3 × 3: the box is the new numerator, over the new denominator
    case 'gelijk-2':
    case 'gelijk-3':
    case 'gelijk-4':
    case 'gelijk-5':
      return {
        before: [{ kind: 'number', text: FRACTIONS[`${sum.num1}/${denominatorOf(sum.form)}`] }, equals],
        after: [operation('/'), number(denominatorOf(sum.form) * sum.num2)],
        over: true
      };
    // 0,3 + 0,4 = ?, kept as 3 + 4 in tenths
    case 'tienden':
      return {
        before: [{ kind: 'number', text: tenths(sum.num1, words.point) }, operation(sum.sign),
                 { kind: 'number', text: tenths(sum.num2, words.point) }, equals],
        after: []
      };
    // 3,45 × 100 = ?, 72 : 100 = ?, 2,5 × 4 = ?: the comma number first, the whole number after
    case 'komma-2':
    case 'komma-3':
      return {
        before: [{ kind: 'number', text: decimal(sum.num1, placesOf(sum.form), words.point) }, operation(sum.sign),
                 number(sum.num2), equals],
        after: []
      };
    // 2,5 km = ? m, kept as 25 × 1000 in tenths
    case 'komma-km-m':
    case 'komma-kg-g':
    case 'komma-l-dl':
    case 'komma-m-cm': {
      const measure = DECIMAL_MEASURES[sum.form];
      return {
        before: [{ kind: 'number', text: tenths(sum.num1, words.point) }, { kind: 'word', text: measure.from }, equals],
        after: [{ kind: 'word', text: measure.to }]
      };
    }
    // 25% van 60 = ?, kept as 60 : 4
    case 'procent-50':
    case 'procent-25':
    case 'procent-10':
      return {
        before: [{ kind: 'number', text: `${percentOf(sum.form)}%` }, { kind: 'word', text: words.of }, number(sum.num1), equals],
        after: []
      };
    // 2/8 + 3/8 = ?/8, kept as 2 + 3: the box is the new numerator, over the same denominator
    case 'gelijknamig-4':
    case 'gelijknamig-5':
    case 'gelijknamig-6':
    case 'gelijknamig-8': {
      const under = denominatorOf(sum.form);
      return {
        before: [{ kind: 'number', text: `${sum.num1}/${under}` }, operation(sum.sign), { kind: 'number', text: `${sum.num2}/${under}` }, equals],
        after: [operation('/'), number(under)]
      };
    }
    // ¾ = ?, kept as 25 × 3 in hundredths: the answer is written with a comma
    case 'breuk-komma':
      return { before: [{ kind: 'number', text: FRACTIONS[`${sum.num2}/${100 / sum.num1}`] }, equals], after: [] };
    // 3 pakken kosten €6 over 7 pakken = €?, kept as 7 × 2: what is known is the heading, what is asked the sum
    case 'verhouding-2':
    case 'verhouding-3':
    case 'verhouding-4':
    case 'verhouding-5': {
      const packs = packsOf(sum.form);
      return {
        before: [{ kind: 'caption', text: `${packs} ${words.packs} ${words.cost} €${packs * sum.num2}` },
                 number(sum.num1), { kind: 'word', text: words.packs }, equals, { kind: 'word', text: '€' }],
        after: []
      };
    }
    // 20% korting: wat betaal je? over €45 → €?, kept as 45 − 9
    case 'korting-10':
    case 'korting-20':
    case 'korting-25':
    case 'korting-50':
      return {
        before: [{ kind: 'caption', text: `${percentOf(sum.form)}% ${words.discount}` },
                 { kind: 'word', text: '€' }, number(sum.num1), operation('→'), { kind: 'word', text: '€' }],
        after: []
      };
    // Oppervlakte: 6 m × 4 m = ? m², kept as 6 × 4
    case 'oppervlakte':
      return {
        before: [{ kind: 'caption', text: words.area }, number(sum.num1), { kind: 'word', text: 'm' }, operation('×'),
                 number(sum.num2), { kind: 'word', text: 'm' }, equals],
        after: [{ kind: 'word', text: 'm²' }]
      };
    // 3 m = ? cm, kept as 3 × 100
    case 'm-cm':
    case 'km-m':
    case 'kg-g':
    case 'uur-min': {
      const unit = (symbol: string) => symbol === 'h' ? words.hours : symbol === 'min' ? words.minutes : symbol;
      const measure = MEASURES[sum.form];
      return {
        before: [number(sum.num1), { kind: 'word', text: unit(measure.from) }, equals],
        after: [{ kind: 'word', text: unit(measure.to) }]
      };
    }
    default:
      return { before: [number(sum.num1), operation(sum.sign), number(sum.num2), equals], after: [] };
  }
}

/**
 * One way to the answer of a written form, shown with the answer after two
 * tries (worked-step.ts says why only then). Each is the fact the form is
 * taught through: aanvullen and splitsen are taking away in disguise, a
 * double is the number twice, a half is the number that doubles back, and
 * a quarter of 20 is 20 shared out in four.
 * Undefined for a plain sum, which worked-step.ts handles.
 */
export function formWorkedStep(form: SumForm | undefined, num1: number, num2: number,
                               operation = '+', point = ','): string | undefined {
  switch (form) {
    case 'aanvullen':
    case 'splitsen':
      return `${num1} − ${num2} = ${num1 - num2}`;
    case 'dubbel':
      return `${num1} + ${num1} = ${num1 * 2}`;
    case 'helft':
      return `${num1 / 2} + ${num1 / 2} = ${num1}`;
    // ¼ van 20: share 20 out in 4
    case 'deel':
      return `${num1} : ${num2} = ${num1 / num2}`;
    // 23 : 4: four fives is 20, and 3 is left
    case 'rest': {
      const quotient = Math.floor(num1 / num2);
      return `${num2} × ${quotient} = ${num2 * quotient} → ${num1} − ${num2 * quotient} = ${num1 % num2}`;
    }
    // 347 op tientallen: look at the figure after the tens, 7; 5 or more goes up. 347: 7 ≥ 5 → 350
    case 'afronden': {
      const figure = Math.floor(num1 / (num2 / 10)) % 10;
      return `${grouped(num1)}: ${figure} ${figure >= 5 ? '≥' : '<'} 5 → ${grouped(roundTo(num1, num2))}`;
    }
    // ¾ van 20: a quarter is 20 : 4 = 5, three quarters three fives
    case 'van-3':
    case 'van-4':
    case 'van-5':
    case 'van-6':
    case 'van-8': {
      const parts = denominatorOf(form);
      return `${num1 * parts} : ${parts} = ${num1} → ${num2} × ${num1} = ${num1 * num2}`;
    }
    // ¾ = ?/12: the 4 became 12 by times 3, so the 3 does too
    case 'gelijk-2':
    case 'gelijk-3':
    case 'gelijk-4':
    case 'gelijk-5': {
      const under = denominatorOf(form);
      return `${under} × ${num2} = ${under * num2} → ${num1} × ${num2} = ${num1 * num2}`;
    }
    // 1,5 + 2,7: count in tenths, 15 + 27 = 42 tenths, which is 4,2
    case 'tienden': {
      const answer = operation === '-' ? num1 - num2 : num1 + num2;
      const sign = operation === '-' ? '−' : '+';
      return `${num1} ${sign} ${num2} = ${answer} → ${tenths(num1, point)} ${sign} ${tenths(num2, point)} = ${tenths(answer, point)}`;
    }
    // 3,45 × 100: count in hundredths, 345 × 100 = 34500, which is 345;
    // 72 : 100 read back as the times it undoes: 0,72 × 100 = 72
    case 'komma-2':
    case 'komma-3': {
      const places = placesOf(form);
      const written = decimal(num1, places, point);
      if (operation === '/') {
        const quotient = decimal(num1 / num2, places, point);
        return `${quotient} × ${num2} = ${written} → ${written} : ${num2} = ${quotient}`;
      }
      // the number in its own smallest unit: 2,5 in tenths is 25, 3,45 in hundredths 345
      const shown = (written.split(point)[1] || '').length;
      const counted = num1 / 10 ** (places - shown);
      return `${counted} × ${num2} = ${counted * num2} → ${written} × ${num2} = ${decimal(num1 * num2, places, point)}`;
    }
    // 2,5 km: one kilometre is 1000 m, so 2,5 is 2,5 thousands
    case 'komma-km-m':
    case 'komma-kg-g':
    case 'komma-l-dl':
    case 'komma-m-cm': {
      const measure = DECIMAL_MEASURES[form];
      return `1 ${measure.from} = ${measure.factor} ${measure.to} → ${tenths(num1, point)} × ${measure.factor} = ${tenths(num1 * num2, point)}`;
    }
    // 25% is a quarter, so 25% van 60 is 60 shared out in four
    case 'procent-50':
    case 'procent-25':
    case 'procent-10':
      return `${percentOf(form)}% = ${FRACTIONS[`1/${num2}`]} → ${num1} : ${num2} = ${num1 / num2}`;
    // 2/8 + 3/8: count in eighths, 2 + 3 = 5 eighths
    case 'gelijknamig-4':
    case 'gelijknamig-5':
    case 'gelijknamig-6':
    case 'gelijknamig-8': {
      const under = denominatorOf(form);
      const answer = operation === '-' ? num1 - num2 : num1 + num2;
      const sign = operation === '-' ? '−' : '+';
      return `${num1} ${sign} ${num2} = ${answer} → ${num1}/${under} ${sign} ${num2}/${under} = ${answer}/${under}`;
    }
    // ¾ is 75 hundredths: a quarter is 25 of them
    case 'breuk-komma':
      return `${FRACTIONS[`${num2}/${100 / num1}`]} = ${num1 * num2}/100 → ${decimal(num1 * num2, 2, point)}`;
    // 3 pakken €6: one pak is 6 : 3 = 2, so 7 pakken 7 × 2
    case 'verhouding-2':
    case 'verhouding-3':
    case 'verhouding-4':
    case 'verhouding-5': {
      const packs = packsOf(form);
      return `${packs * num2} : ${packs} = ${num2} → ${num1} × ${num2} = ${num1 * num2}`;
    }
    // 20% is a fifth: 45 : 5 = 9 off, so 45 − 9 is paid. Two steps, so the line fits a phone
    case 'korting-10':
    case 'korting-20':
    case 'korting-25':
    case 'korting-50': {
      const parts = 100 / percentOf(form);
      return `${num1} : ${parts} = ${num2} → ${num1} − ${num2} = ${num1 - num2}`;
    }
    // a rectangle's area is its length times its width
    case 'oppervlakte':
      return `${num1} × ${num2} = ${num1 * num2}`;
    // 3 m: one metre is 100 cm, so three is three hundreds
    case 'm-cm':
    case 'km-m':
    case 'kg-g':
    case 'uur-min': {
      const measure = MEASURES[form];
      return `1 ${measure.from} = ${measure.factor} ${measure.to} → ${num1} × ${measure.factor} = ${num1 * num2}`;
    }
    default:
      return undefined;
  }
}
