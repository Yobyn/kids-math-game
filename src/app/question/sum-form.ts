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
 *   procent-via-5 15% van 60 = ?  kept as 3 × 3: 5% of 60 is 3, and 15% is three of
 *                                those (via 10%, 5% or 1%, whichever the amount shares by)
 *   welk-procent 18 van 72 = ?%  kept as 1800 : 72: the part times a hundred, shared by the whole
 *   schaal-500 Schaal 1 : 500, 4 cm = ? m
 *                                kept as 4 × 5: the centimetres times the metres one stands for
 *   gemiddelde-3 Wat is het gemiddelde? 12, 17, 7 → ?
 *                                kept as 36 : 3: the total shared by the count; the list
 *                                itself is made from those two (written-form.ts meanList)
 *   inhoud-10  10 × 5 × 4 = ? cm³ kept as 50 × 4: the bottom's area (10 × 5) times the
 *                                height; the length, 10, is in the form's name
 *   m3-l       2 m³ = ? l        kept as 2 × 1000, as the measures of groep 5
 *   tijdsduur  Hoeveel minuten? 9:45 → 11:20 = ?
 *                                kept as 680 − 585: both times in minutes from midnight
 *   snelheid   60 km per uur, 2,5 uur = ? km
 *                                kept as 5 × 30: the half hours times the km in one
 *   temperatuur-op Hoeveel graden verschil? −3° → 5° = ?
 *                                kept as 5 + 3: the degrees above nought and the degrees
 *                                below it (−3° is 3 below); -op goes up from the cold
 *                                one, -af down to it
 *   negatief   −3 + 8 = ?, −24 : −3 = ?  the one sum whose numbers may be below
 *                                nought (klas 1): kept as they are, −3 + 8
 *   voorrang-5 3 + 4 × 5 = ?     kept as 3 + 20: × before +; the 5 is in the name
 *   haakjes-3  (3 + 4) × 5 = ?   kept as 7 × 5: the brackets first; the 3 is in the name
 *   ongelijk-2-3 1/2 + 1/3 = ?/6 kept as 3 + 2, counted in sixths: both denominators
 *                                are in the name, the common one is their lcm
 *   keer-3     ⅔ × 12 = ?        kept as 4 × 2, as van-3 is: one third of 12, twice
 *   formule-3  a = 3 × b + 4, b = 5 → a = ?
 *                                kept as 15 + 4: 3 × 5 worked out, the 4 added; the 3 is in the name
 *   afronden-decimaal 3,47 ≈ ? op 1 decimaal
 *                                kept as 347 ≈ 10 in hundredths: 350, shown and typed as 3,5
 *   macht-3    2³ = ?            kept as 4 × 2: the power one lower, times the number once more
 *   wortel     √144 = ?          kept as 144 : 12, the answer being the number that squares to it
 *   vergelijking-5 3x + 5 = 20 → x = ?
 *                                kept as 15 : 3: what is left once the 5 is taken off, shared by 3
 *   invullen-2 x = 2: 3(x + 4) = ?
 *                                kept as 3 × 6: the brackets with 2 filled in, times 3
 *   toename-15 €80 + 15% = €?    kept as 80 + 12; afname-20 €80 − 20% kept as 80 − 16
 *   pythagoras-1 a = 6, b = 8 → c = ?
 *                                kept as 100 : 10: c² shared by c; the triangle (3-4-5) is in the name
 *   driehoek   ½ × 10 × 6 = ?    kept as 5 × 6: half the base times the height
 *   haakvgl-3  3(x + 4) = 21 → x = ?   kept as 7 − 4: 21 : 3 first, then the 4 taken off
 *   beide-5    5x = 3x + 12 → x = ?    kept as 12 : 2: the x's on one side (5 − 3); the 5 is in the name
 *   negmacht-3 (−2)³ = ?         kept as 4 × −2, as macht is, the number below nought
 *   minkwadraat −3² = ?          kept as 3 × −3: the square first, then the minus
 *   wetenschap 3,2 · 10³ = ?     kept as 32 × 1000 in tenths (3200)
 *   wetenschap-min 4 · 10⁻² = ?  kept as 4000 : 100 in thousandths (0,04)
 *   groeifactor 200 × 1,05 = ?   kept as 105 × 200 in hundredths (210)
 *   kwadraat-vgl x² = 49 (x > 0) kept as 49 : 7
 *   kwadratisch x² − 5x + 6 = 0, de grootste x = ?
 *                                kept as 5 − 2: the two solutions add up to 5, the smaller is 2
 *   groei-2    100 × 1,1² = ?    kept as 121 × 100 in hundredths: 1,1² is 1,21
 *   wortel-vereenvoudig √50 = ?√2 kept as 10 : 2: 5√2 is √(25 × 2)
 *   sin-30     sin 30° × 10 = ?  kept as 50 × 10 in hundredths: sin 30° is 0,5 (also cos-60, tan-45)
 *   herleiden  A = l × b, A = 36, l = 9 → b = ?  kept as 36 : 9
 *   procent-stappen +10% → −10% → × ?   kept as 110 × 90 in ten-thousandths (0,99)
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
  | FractionSumForm | 'breuk-komma' | RatioForm | DiscountForm | PercentStepForm | 'welk-procent' | ScaleForm | MeanForm
  | VolumeForm | VolumeMeasureForm | 'tijdsduur' | 'snelheid' | TemperatureForm
  | 'negatief' | PrecedenceForm | BracketForm | UnlikeFractionForm | TimesFractionForm | FormulaForm | 'afronden-decimaal'
  | PowerForm | 'wortel' | EquationForm | FillInForm | PercentChangeForm | PythagorasForm | 'driehoek'
  | BracketEquationForm | BothSidesForm | NegativePowerForm | 'minkwadraat' | 'wetenschap' | 'wetenschap-min' | 'groeifactor'
  | 'kwadraat-vgl' | 'kwadratisch' | 'groei-2' | 'wortel-vereenvoudig' | TrigForm | 'herleiden' | 'procent-stappen';

type TwoToNine = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const TWO_TO_NINE: TwoToNine[] = [2, 3, 4, 5, 6, 7, 8, 9];

/** 3 + 4 × 5: times before plus. The number is what is multiplied by (the 5). */
export type PrecedenceForm = `voorrang-${TwoToNine}`;
export const PRECEDENCE_FORMS: PrecedenceForm[] = TWO_TO_NINE.map(n => `voorrang-${n}` as PrecedenceForm);

/** (3 + 4) × 5: the brackets first. The number is the first in the brackets (the 3). */
export type BracketForm = `haakjes-${TwoToNine}`;
export const BRACKET_FORMS: BracketForm[] = TWO_TO_NINE.map(n => `haakjes-${n}` as BracketForm);

/**
 * 1/2 + 1/3 = ?/6: fractions with different denominators. Both denominators are in the name. The
 * common one is a single figure (4, 6, 8): 2/3 − 1/4 = ? / 12 is too wide for one line of a 320px phone.
 */
export type UnlikeFractionForm = 'ongelijk-2-3' | 'ongelijk-2-4' | 'ongelijk-2-6' | 'ongelijk-3-6' | 'ongelijk-2-8' | 'ongelijk-4-8';
export const UNLIKE_FRACTION_FORMS: UnlikeFractionForm[] = ['ongelijk-2-3', 'ongelijk-2-4', 'ongelijk-2-6', 'ongelijk-3-6', 'ongelijk-2-8', 'ongelijk-4-8'];

/** The two denominators of an unlike-fractions form, and the common one they are counted in: [2, 3, 6]. */
export function denominatorsOf(form: UnlikeFractionForm): [number, number, number] {
  const [first, second] = form.split('-').slice(1).map(Number);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  return [first, second, first * second / gcd(first, second)];
}

/** ⅔ × 12: a fraction times a whole number, as van-3 is ⅔ van 12. The number is the denominator. */
export type TimesFractionForm = 'keer-3' | 'keer-4' | 'keer-5' | 'keer-6' | 'keer-8';
export const TIMES_FRACTION_FORMS: TimesFractionForm[] = ['keer-3', 'keer-4', 'keer-5', 'keer-6', 'keer-8'];

/** a = 3 × b + 4, b = 5 → a = ?: a value filled in. The number is what b is multiplied by. */
export type FormulaForm = `formule-${TwoToNine}`;
export const FORMULA_FORMS: FormulaForm[] = TWO_TO_NINE.map(n => `formule-${n}` as FormulaForm);

/** The number at the end of a form's name: the 5 in voorrang-5, haakjes-5 and formule-5. */
export function lastNumberOf(form: string): number {
  return Number(form.split('-').pop());
}

/** 2³ = ?: a power. The number is the exponent. */
export type PowerForm = 'macht-2' | 'macht-3' | 'macht-4' | 'macht-5';
export const POWER_FORMS: PowerForm[] = ['macht-2', 'macht-3', 'macht-4', 'macht-5'];

/** 3x + 5 = 20 → x = ?: the number is what is added to the x's (the 5). */
type OneToTwelve = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type EquationForm = `vergelijking-${OneToTwelve}`;
export const EQUATION_FORMS: EquationForm[] = Array.from({ length: 12 }, (_, i) => `vergelijking-${i + 1}` as EquationForm);

/** x = 2: 3(x + 4) = ?: a value filled in in brackets. The number is the x. */
export type FillInForm = `invullen-${TwoToNine}`;
export const FILL_IN_FORMS: FillInForm[] = TWO_TO_NINE.map(n => `invullen-${n}` as FillInForm);

/** €80 + 15% = €?, €80 − 20% = €?: a percentage on top, or off. The number is the percentage. */
type ChangePercent = 5 | 10 | 15 | 20 | 25 | 30;
export type PercentChangeForm = `toename-${ChangePercent}` | `afname-${ChangePercent}`;
const CHANGE_PERCENTS: ChangePercent[] = [5, 10, 15, 20, 25, 30];
export const PERCENT_CHANGE_FORMS: PercentChangeForm[] = [
  ...CHANGE_PERCENTS.map(p => `toename-${p}` as PercentChangeForm), ...CHANGE_PERCENTS.map(p => `afname-${p}` as PercentChangeForm)
];

/**
 * a = 6, b = 8 → c = ?: the long side of a right-angled triangle, a whole number. The number says
 * which whole triangle it is a multiple of: 1 is 3-4-5, 2 is 5-12-13, 3 is 8-15-17, 4 is 7-24-25.
 */
export type PythagorasForm = 'pythagoras-1' | 'pythagoras-2' | 'pythagoras-3' | 'pythagoras-4';
export const PYTHAGORAS_FORMS: PythagorasForm[] = ['pythagoras-1', 'pythagoras-2', 'pythagoras-3', 'pythagoras-4'];
export const TRIANGLES: { [form in PythagorasForm]: [number, number, number] } = {
  'pythagoras-1': [3, 4, 5], 'pythagoras-2': [5, 12, 13], 'pythagoras-3': [8, 15, 17], 'pythagoras-4': [7, 24, 25]
};

/** The two short sides of a Pythagoras sum whose long side is c: the form's triangle, made c / its own long side times as big. */
export function sidesOf(form: PythagorasForm, c: number): [number, number] {
  const [a, b, long] = TRIANGLES[form];
  return [a * c / long, b * c / long];
}

/** 3(x + 4) = 21 → x = ?: an equation with brackets. The number is in front of the brackets (the 3). */
export type BracketEquationForm = `haakvgl-${TwoToNine}`;
export const BRACKET_EQUATION_FORMS: BracketEquationForm[] = TWO_TO_NINE.map(n => `haakvgl-${n}` as BracketEquationForm);

/** 5x = 3x + 12 → x = ?: x on both sides. The number is the x's on the left (the 5). */
export type BothSidesForm = `beide-${3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export const BOTH_SIDES_FORMS: BothSidesForm[] = [3, 4, 5, 6, 7, 8, 9].map(n => `beide-${n}` as BothSidesForm);

/** (−2)³ = ?: a power of a number below nought. The number is the exponent. */
export type NegativePowerForm = 'negmacht-2' | 'negmacht-3' | 'negmacht-4';
export const NEGATIVE_POWER_FORMS: NegativePowerForm[] = ['negmacht-2', 'negmacht-3', 'negmacht-4'];

/** sin 30° × 10 = ?: the sides of a right-angled triangle where the ratio is a nice number. */
export type TrigForm = 'sin-30' | 'cos-60' | 'tan-45';
export const TRIG_FORMS: TrigForm[] = ['sin-30', 'cos-60', 'tan-45'];
/** The ratio each stands for, in hundredths: sin 30° and cos 60° are 0,5, tan 45° is 1. */
export const TRIG_VALUES: { [form in TrigForm]: number } = { 'sin-30': 50, 'cos-60': 50, 'tan-45': 100 };

/** 10 × 5 × 4 = ? cm³: the volume of a box. The number is its length. */
export type VolumeForm = 'inhoud-2' | 'inhoud-4' | 'inhoud-5' | 'inhoud-10';
export const VOLUME_FORMS: VolumeForm[] = ['inhoud-2', 'inhoud-4', 'inhoud-5', 'inhoud-10'];

/** The length a volume form carries in its name: 10 for inhoud-10. */
export function lengthOf(form: VolumeForm): number {
  return Number(form.split('-')[1]);
}

/** A volume in litres: 2 m³ = ? l, 3 l = ? cm³. See teaching/school/written-form.ts VOLUME_MEASURES. */
export type VolumeMeasureForm = 'm3-l' | 'l-cm3';
export const VOLUME_MEASURE_FORMS: VolumeMeasureForm[] = ['m3-l', 'l-cm3'];

/** How many degrees between two temperatures, one below nought: going up (-op) or down (-af). */
export type TemperatureForm = 'temperatuur-op' | 'temperatuur-af';
export const TEMPERATURE_FORMS: TemperatureForm[] = ['temperatuur-op', 'temperatuur-af'];

/**
 * 15% van 60, 30% van 70, 12% van 300: any percentage, worked through the
 * 10%, 5% or 1% the amount shares out by. The number is that step.
 */
export type PercentStepForm = 'procent-via-10' | 'procent-via-5' | 'procent-via-1';
export const PERCENT_STEP_FORMS: PercentStepForm[] = ['procent-via-10', 'procent-via-5', 'procent-via-1'];

/** The percentage a step form works through: 5 for procent-via-5. */
export function stepOf(form: PercentStepForm): number {
  return Number(form.split('-')[2]);
}

/** Schaal 1 : 500, 4 cm = ? m. The number is the scale. */
export type ScaleForm = 'schaal-100' | 'schaal-200' | 'schaal-500' | 'schaal-1000';
export const SCALE_FORMS: ScaleForm[] = ['schaal-100', 'schaal-200', 'schaal-500', 'schaal-1000'];

/** The scale a form carries in its name: 500 for schaal-500 (1 : 500). */
export function scaleOf(form: ScaleForm): number {
  return Number(form.split('-')[1]);
}

/** The mean of three or four numbers. The number is how many. */
export type MeanForm = 'gemiddelde-3' | 'gemiddelde-4';
export const MEAN_FORMS: MeanForm[] = ['gemiddelde-3', 'gemiddelde-4'];

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
  if (form === 'wetenschap') {
    return 1;
  }
  if (form === 'komma-2' || form === 'breuk-komma' || form === 'afronden-decimaal' || form === 'groeifactor' || form === 'groei-2'
      || TRIG_FORMS.includes(form as TrigForm)) {
    return 2;
  }
  if (form === 'komma-3' || form === 'wetenschap-min') {
    return 3;
  }
  return form === 'procent-stappen' ? 4 : 0;
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
  ...FRACTION_SUM_FORMS, 'breuk-komma', ...RATIO_FORMS, ...DISCOUNT_FORMS, ...PERCENT_STEP_FORMS, 'welk-procent',
  ...SCALE_FORMS, ...MEAN_FORMS, ...VOLUME_FORMS, ...VOLUME_MEASURE_FORMS, 'tijdsduur', 'snelheid', ...TEMPERATURE_FORMS,
  'negatief', ...PRECEDENCE_FORMS, ...BRACKET_FORMS, ...UNLIKE_FRACTION_FORMS, ...TIMES_FRACTION_FORMS, ...FORMULA_FORMS,
  'afronden-decimaal', ...POWER_FORMS, 'wortel', ...EQUATION_FORMS, ...FILL_IN_FORMS, ...PERCENT_CHANGE_FORMS, ...PYTHAGORAS_FORMS,
  'driehoek', ...BRACKET_EQUATION_FORMS, ...BOTH_SIDES_FORMS, ...NEGATIVE_POWER_FORMS, 'minkwadraat', 'wetenschap', 'wetenschap-min',
  'groeifactor', 'kwadraat-vgl', 'kwadratisch', 'groei-2', 'wortel-vereenvoudig', ...TRIG_FORMS, 'herleiden', 'procent-stappen'];

/** A stored form, or undefined for anything that is not one: the sum is then shown plainly. */
export function readForm(raw: unknown): SumForm | undefined {
  return SUM_FORMS.includes(raw as SumForm) ? raw as SumForm : undefined;
}
