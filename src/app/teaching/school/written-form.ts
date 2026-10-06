import { SumForm } from '../../question/sum-form';

/**
 * How a sum is laid out round its answer box, and how its written form is
 * worked out (question/sum-form.ts). Free of the DOM, so both can be tested
 * straight: the box sits where the "?" is in the workbook.
 */

/** One piece of a sum on the screen. `kind` is its CSS class on the question card. */
export interface SumPart {
  kind: 'number' | 'operation' | 'equals' | 'word';
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
}

/** The fraction a part of an amount is written with: ¼ van 20. Only the ones groep 5 meets. */
export const UNIT_FRACTIONS: { [parts: number]: string } = { 2: '½', 3: '⅓', 4: '¼', 5: '⅕' };

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
        before: [{ kind: 'word', text: `${UNIT_FRACTIONS[sum.num2]} ${words.of}` }, number(sum.num1), equals],
        after: []
      };
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
    default:
      return undefined;
  }
}
