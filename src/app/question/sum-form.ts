/**
 * The ways a sum is written in a Dutch groep 3 to 5 workbook besides
 * "7 + 5 = ?" (docs/CURRICULUM-NL.md, build order 2). A question keeps the
 * sum whose answer is the one asked for, and its form says how to show it:
 *
 *   aanvullen  7 + ? = 10        kept as 10 - 7
 *   splitsen   8 = 5 + ?         kept as 8 - 5
 *   dubbel     dubbel 7 = ?      kept as 7 + 7
 *   helft      de helft van 16   kept as 16 : 2
 *   deel       ¼ van 20          kept as 20 : 4
 *   rest       23 : 4 = 5 rest ? kept as 23 % 4 (the remainder)
 *   m-cm etc.  3 m = ? cm        kept as 3 × 100
 *   afronden   347 ≈ ? op tientallen  kept as 347 ≈ 10 (rounded to the nearest 10)
 *   van-4 etc. ¾ van 20          kept as 5 × 3: one part times the parts taken
 *   gelijk-4   ¾ = ?/12          kept as 3 × 3: the numerator times what the
 *                                denominator was multiplied by
 *   oppervlakte 6 m × 4 m = ? m²  kept as 6 × 4
 *
 * so marking, the worked line and a missed fact's identity all still work
 * from the sum. A remainder and a rounding are the sums with signs of their
 * own, % and ≈, since no other sum's answer is what is left over or the
 * nearest ten. It lives apart, and small, because a saved round (in the
 * first load) has to read it back.
 *
 * The number under a fraction's line is in the form's name (van-4, gelijk-4),
 * since a sum keeps two numbers and both are taken.
 */
export type SumForm = 'aanvullen' | 'splitsen' | 'dubbel' | 'helft' | 'deel' | 'rest' | 'afronden' | 'oppervlakte'
  | MeasureForm | FractionOfForm | EqualFractionForm;

/** ¾ van 20, ⅖ van 35: a part of an amount, more than one part taken. The number is the denominator. */
export type FractionOfForm = 'van-3' | 'van-4' | 'van-5' | 'van-6' | 'van-8';
export const FRACTION_OF_FORMS: FractionOfForm[] = ['van-3', 'van-4', 'van-5', 'van-6', 'van-8'];

/** ½ = ?/8, ¾ = ?/12: the same fraction with a bigger denominator. The number is the first denominator. */
export type EqualFractionForm = 'gelijk-2' | 'gelijk-3' | 'gelijk-4' | 'gelijk-5';
export const EQUAL_FRACTION_FORMS: EqualFractionForm[] = ['gelijk-2', 'gelijk-3', 'gelijk-4', 'gelijk-5'];

/** The denominator a fraction form carries in its name: 4 for van-4 and gelijk-4. */
export function denominatorOf(form: FractionOfForm | EqualFractionForm): number {
  return Number(form.split('-')[1]);
}

/** A measure changed into a smaller unit: 3 m = ? cm. See teaching/school/written-form.ts MEASURES. */
export type MeasureForm = 'm-cm' | 'km-m' | 'kg-g' | 'uur-min';

export const MEASURE_FORMS: MeasureForm[] = ['m-cm', 'km-m', 'kg-g', 'uur-min'];

export const SUM_FORMS: SumForm[] = ['aanvullen', 'splitsen', 'dubbel', 'helft', 'deel', 'rest', 'afronden', 'oppervlakte',
  ...MEASURE_FORMS, ...FRACTION_OF_FORMS, ...EQUAL_FRACTION_FORMS];

/** A stored form, or undefined for anything that is not one: the sum is then shown plainly. */
export function readForm(raw: unknown): SumForm | undefined {
  return SUM_FORMS.includes(raw as SumForm) ? raw as SumForm : undefined;
}
