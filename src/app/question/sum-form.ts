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
 *   tienden    0,3 + 0,4 = ?     kept as 3 + 4, counted in tenths: the answer
 *                                7 is shown and typed as 0,7
 *   procent-25 25% van 60 = ?    kept as 60 : 4 (25% is a quarter)
 *   komma-2    3,45 × 100 = ?    kept as 345 × 100 in hundredths: the answer
 *                                34500 hundredths is shown and typed as 345
 *   komma-3    72 : 100 = ?      kept as 72000 : 100 in thousandths (0,72)
 *   komma-km-m 2,5 km = ? m      kept as 25 × 1000 in tenths (2500)
 *   gelijknamig-8 2/8 + 3/8 = ?/8 kept as 2 + 3: the numerators, counted in eighths
 *   breuk-komma ¾ = ?            kept as 25 × 3 in hundredths: a quarter is 25
 *                                hundredths, so the answer 75 is shown and typed as 0,75
 *   verhouding-3 3 pakken kosten €6, 7 pakken = €?
 *                                kept as 7 × 2: the packs asked for times the
 *                                price of one (€6 : 3)
 *   korting-20 20% korting op €45 kept as 45 − 9: the price less 20% of it
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
export type SumForm = 'aanvullen' | 'splitsen' | 'dubbel' | 'helft' | 'deel' | 'rest' | 'afronden' | 'oppervlakte' | 'tienden'
  | MeasureForm | FractionOfForm | EqualFractionForm | PercentForm | DecimalForm | DecimalMeasureForm
  | FractionSumForm | 'breuk-komma' | RatioForm | DiscountForm;

/**
 * 2/8 + 3/8 = ?/8: fractions with the same denominator added or taken away. The number is the denominator.
 * One figure under the line: with tenths or twelfths, 7/12 + 4/12 = ? / 12 is too wide for one line of a
 * 320px phone. They come when a fraction is drawn over its line.
 */
export type FractionSumForm = 'gelijknamig-4' | 'gelijknamig-5' | 'gelijknamig-6' | 'gelijknamig-8';
export const FRACTION_SUM_FORMS: FractionSumForm[] = ['gelijknamig-4', 'gelijknamig-5', 'gelijknamig-6', 'gelijknamig-8'];

/** 3 pakken kosten €6, 7 pakken = €?: a ratio, worked through the price of one. The number is the packs priced. */
export type RatioForm = 'verhouding-2' | 'verhouding-3' | 'verhouding-4' | 'verhouding-5';
export const RATIO_FORMS: RatioForm[] = ['verhouding-2', 'verhouding-3', 'verhouding-4', 'verhouding-5'];

/** The packs a ratio form prices in its name: 3 for verhouding-3. */
export function packsOf(form: RatioForm): number {
  return Number(form.split('-')[1]);
}

/** 20% korting op €45: what is paid after a discount. The number is the percentage off. */
export type DiscountForm = 'korting-10' | 'korting-20' | 'korting-25' | 'korting-50';
export const DISCOUNT_FORMS: DiscountForm[] = ['korting-10', 'korting-20', 'korting-25', 'korting-50'];

/**
 * A sum with a comma in it, kept as whole numbers counted in hundredths
 * (komma-2) or thousandths (komma-3), so marking never compares floats. The
 * number before the sign is in that unit; the one after is a plain whole
 * number (× 100, : 4).
 */
export type DecimalForm = 'komma-2' | 'komma-3';

/** A measure with a comma changed into a smaller unit: 2,5 km = ? m, kept in tenths. */
export type DecimalMeasureForm = 'komma-km-m' | 'komma-kg-g' | 'komma-l-dl' | 'komma-m-cm';
export const DECIMAL_MEASURE_FORMS: DecimalMeasureForm[] = ['komma-km-m', 'komma-kg-g', 'komma-l-dl', 'komma-m-cm'];

/**
 * How many figures after the comma a form counts in: 1 for tenths (0,3 + 0,4
 * and 2,5 km), 2 for hundredths, 3 for thousandths; 0 for a sum of whole
 * numbers.
 */
export function placesOf(form: SumForm | undefined): number {
  if (form === 'tienden' || DECIMAL_MEASURE_FORMS.includes(form as DecimalMeasureForm)) {
    return 1;
  }
  return form === 'komma-2' || form === 'breuk-komma' ? 2 : form === 'komma-3' ? 3 : 0;
}

/** 50%, 25% and 10% of an amount: the ones groep 7 learns first. The number is the percentage. */
export type PercentForm = 'procent-50' | 'procent-25' | 'procent-10';
export const PERCENT_FORMS: PercentForm[] = ['procent-50', 'procent-25', 'procent-10'];

/** ¾ van 20, ⅖ van 35: a part of an amount, more than one part taken. The number is the denominator. */
export type FractionOfForm = 'van-3' | 'van-4' | 'van-5' | 'van-6' | 'van-8';
export const FRACTION_OF_FORMS: FractionOfForm[] = ['van-3', 'van-4', 'van-5', 'van-6', 'van-8'];

/** ½ = ?/8, ¾ = ?/12: the same fraction with a bigger denominator. The number is the first denominator. */
export type EqualFractionForm = 'gelijk-2' | 'gelijk-3' | 'gelijk-4' | 'gelijk-5';
export const EQUAL_FRACTION_FORMS: EqualFractionForm[] = ['gelijk-2', 'gelijk-3', 'gelijk-4', 'gelijk-5'];

/** The denominator a fraction form carries in its name: 4 for van-4, gelijk-4 and gelijknamig-4. */
export function denominatorOf(form: FractionOfForm | EqualFractionForm | FractionSumForm): number {
  return Number(form.split('-')[1]);
}

/** The percentage a percent or discount form carries in its name: 25 for procent-25 and korting-25. */
export function percentOf(form: PercentForm | DiscountForm): number {
  return Number(form.split('-')[1]);
}

/** A measure changed into a smaller unit: 3 m = ? cm. See teaching/school/written-form.ts MEASURES. */
export type MeasureForm = 'm-cm' | 'km-m' | 'kg-g' | 'uur-min';

export const MEASURE_FORMS: MeasureForm[] = ['m-cm', 'km-m', 'kg-g', 'uur-min'];

export const SUM_FORMS: SumForm[] = ['aanvullen', 'splitsen', 'dubbel', 'helft', 'deel', 'rest', 'afronden', 'oppervlakte', 'tienden',
  ...MEASURE_FORMS, ...FRACTION_OF_FORMS, ...EQUAL_FRACTION_FORMS, ...PERCENT_FORMS, 'komma-2', 'komma-3', ...DECIMAL_MEASURE_FORMS,
  ...FRACTION_SUM_FORMS, 'breuk-komma', ...RATIO_FORMS, ...DISCOUNT_FORMS];

/** A stored form, or undefined for anything that is not one: the sum is then shown plainly. */
export function readForm(raw: unknown): SumForm | undefined {
  return SUM_FORMS.includes(raw as SumForm) ? raw as SumForm : undefined;
}
