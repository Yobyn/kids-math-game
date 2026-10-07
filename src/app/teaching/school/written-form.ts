import { MeasureForm, SumForm } from '../../question/sum-form';

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

/** A number rounded to the nearest ten or hundred, a 5 going up as at school: 345 → 350. */
export function roundTo(value: number, to: number): number {
  return Math.round(value / to) * to;
}

const number = (value: number): SumPart => ({ kind: 'number', text: String(value) });
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
        before: [{ kind: 'caption', text: sum.num2 === 100 ? words.toHundreds : words.toTens }, number(sum.num1), operation('≈')],
        after: []
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
export function formWorkedStep(form: SumForm | undefined, num1: number, num2: number): string | undefined {
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
      return `${num1}: ${figure} ${figure >= 5 ? '≥' : '<'} 5 → ${roundTo(num1, num2)}`;
    }
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
