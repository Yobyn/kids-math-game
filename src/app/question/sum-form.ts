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
 *
 * so marking, the worked line and a missed fact's identity all still work
 * from the sum. A remainder is the one sum with a sign of its own, %, since
 * no other sum's answer is what is left over. It lives apart, and small, because a saved round (in the
 * first load) has to read it back.
 */
export type SumForm = 'aanvullen' | 'splitsen' | 'dubbel' | 'helft' | 'deel' | 'rest' | MeasureForm;

/** A measure changed into a smaller unit: 3 m = ? cm. See teaching/school/written-form.ts MEASURES. */
export type MeasureForm = 'm-cm' | 'km-m' | 'kg-g' | 'uur-min';

export const MEASURE_FORMS: MeasureForm[] = ['m-cm', 'km-m', 'kg-g', 'uur-min'];

export const SUM_FORMS: SumForm[] = ['aanvullen', 'splitsen', 'dubbel', 'helft', 'deel', 'rest', ...MEASURE_FORMS];

/** A stored form, or undefined for anything that is not one: the sum is then shown plainly. */
export function readForm(raw: unknown): SumForm | undefined {
  return SUM_FORMS.includes(raw as SumForm) ? raw as SumForm : undefined;
}
