import {
  DecimalMeasureForm, MeasureForm, PythagorasForm, SumForm, TRIG_VALUES, TrigForm, UnlikeFractionForm, VolumeMeasureForm, denominatorOf,
  denominatorsOf, lastNumberOf, lengthOf, packsOf, percentOf, placesOf, scaleOf, sidesOf, stepOf
} from '../../question/sum-form';

/**
 * How a sum is laid out round its answer box, and how its written form is
 * worked out (question/sum-form.ts). Free of the DOM, so both can be tested
 * straight: the box sits where the "?" is in the workbook.
 */

/** One piece of a sum on the screen. `kind` is its CSS class on the question card. */
export interface SumPart {
  kind: 'number' | 'fraction' | 'operation' | 'equals' | 'word' | 'caption';
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
  /** "Schaal", the heading 1 : 500 follows, over 4 cm = ? m */
  scale: string;
  /** "Wat is het gemiddelde?", the heading over 12, 17, 7 → ? */
  mean: string;
  /** "Hoeveel minuten?", the heading over 9:45 → 11:20 = ? */
  minutesBetween: string;
  /** "Hoeveel graden verschil?", the heading over −3° → 5° = ? */
  degreesBetween: string;
  /** "per uur" in 60 km per uur, the heading over 2,5 uur = ? km */
  perHour: string;
  /** "Inhoud in cm³", the heading over 10 × 5 × 4 = ? */
  volume: string;
  /** "Rond af op 1 decimaal", the heading over 3,47 ≈ ? */
  toOneDecimal: string;
  /** "Schuine zijde?", the heading over a = 6, b = 8 → c = ? */
  hypotenuse: string;
  /** "Oppervlakte driehoek", the heading over ½ × 10 × 6 = ? */
  triangleArea: string;
  /** "grootste x =" before the box under x² − 5x + 6 = 0 */
  largestX: string;
  /** "Groeifactor in totaal?", the heading over +10% → −10% → × ? */
  totalFactor: string;
}

/** The small raised figures a power is written with: 2³. */
export const SUPERSCRIPTS: { [power: number]: string } = { 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };

/** The power of ten a number is: 3 for 1000. */
function tensIn(value: number): number {
  return Math.round(Math.log10(value));
}

/** The names of the three nice ratios, as they are written: sin 30°. */
export const TRIG_NAMES: { [form in TrigForm]: string } = { 'sin-30': 'sin 30°', 'cos-60': 'cos 60°', 'tan-45': 'tan 45°' };

/** A whole number as klas 1 writes it, with a real minus below nought: −3. */
export function signed(value: number): string {
  return value < 0 ? `\u2212${grouped(-value)}` : grouped(value);
}

/** The volumes groep 8 changes into litres: a cubic metre holds 1000 litres, a litre 1000 cm³. */
export const VOLUME_MEASURES: { [form in VolumeMeasureForm]: { from: string; to: string; factor: number } } = {
  'm3-l': { from: 'm³', to: 'l', factor: 1000 },
  'l-cm3': { from: 'l', to: 'cm³', factor: 1000 }
};

/** A time of day from the minutes since midnight, as a clock shows it: 585 is 9:45. */
export function clock(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** A temperature as written, with a real minus below nought: −3°. */
export function degrees(value: number): string {
  return `${value < 0 ? '\u2212' : ''}${Math.abs(value)}°`;
}

/**
 * The numbers a mean is asked of, made from the total and how many there are
 * (a sum keeps two numbers: gemiddelde-3 is kept as total : 3). Always the
 * same list for the same sum, so a missed one comes back as it was; all
 * different, all above nothing, and adding up to the total, so the mean is
 * the whole number the sum says.
 */
export function meanList(total: number, count: number): number[] {
  const mean = total / count;
  const a = 1 + mean % 4;
  const b = a + 1 + mean % 2;
  return count === 3 ? [mean - a, mean + a + b, mean - b] : [mean + a, mean - b, mean - a, mean + b];
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
  const klas = klasLayout(sum, words);
  if (klas) {
    return klas;
  }
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
        before: [{ kind: 'fraction', text: UNIT_FRACTIONS[sum.num2] }, { kind: 'word', text: words.of }, number(sum.num1), equals],
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
        before: [{ kind: 'fraction', text: FRACTIONS[`${sum.num2}/${denominatorOf(sum.form)}`] }, { kind: 'word', text: words.of },
                 number(sum.num1 * denominatorOf(sum.form)), equals],
        after: []
      };
    // ¾ = ?/12, kept as 3 × 3: the box is the new numerator, over the new denominator
    case 'gelijk-2':
    case 'gelijk-3':
    case 'gelijk-4':
    case 'gelijk-5':
      return {
        before: [{ kind: 'fraction', text: FRACTIONS[`${sum.num1}/${denominatorOf(sum.form)}`] }, equals],
        after: [operation('/'), number(denominatorOf(sum.form) * sum.num2)]
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
    // 15% van 60 = ?, kept as 3 × 3: 5% of 60 is 3
    case 'procent-via-10':
    case 'procent-via-5':
    case 'procent-via-1': {
      const step = stepOf(sum.form);
      return {
        before: [{ kind: 'number', text: `${step * sum.num2}%` }, { kind: 'word', text: words.of }, number(sum.num1 * 100 / step), equals],
        after: []
      };
    }
    // 18 van 72 = ?%, kept as 1800 : 72
    case 'welk-procent':
      return {
        before: [number(sum.num1 / 100), { kind: 'word', text: words.of }, number(sum.num2), equals],
        after: [{ kind: 'word', text: '%' }]
      };
    // Schaal 1 : 500 over 4 cm = ? m, kept as 4 × 5
    case 'schaal-100':
    case 'schaal-200':
    case 'schaal-500':
    case 'schaal-1000':
      return {
        before: [{ kind: 'caption', text: `${words.scale} 1 : ${grouped(scaleOf(sum.form))}` },
                 number(sum.num1), { kind: 'word', text: 'cm' }, equals],
        after: [{ kind: 'word', text: 'm' }]
      };
    // Wat is het gemiddelde? over 12, 17, 7 → ?, kept as 36 : 3
    case 'gemiddelde-3':
    case 'gemiddelde-4':
      return {
        before: [{ kind: 'caption', text: words.mean }, { kind: 'number', text: meanList(sum.num1, sum.num2).join(', ') }, operation('→')],
        after: []
      };
    // 10 × 5 × 4 = ? cm³, kept as 50 × 4: the length is in the form's name
    case 'inhoud-2':
    case 'inhoud-4':
    case 'inhoud-5':
    case 'inhoud-10': {
      // the unit in the heading, as the area's: three numbers, two signs, the box and cm³ are too wide for a 320px phone
      const length = lengthOf(sum.form);
      return {
        before: [{ kind: 'caption', text: words.volume }, number(length), operation('×'), number(sum.num1 / length), operation('×'),
                 number(sum.num2), equals],
        after: []
      };
    }
    // 2 m³ = ? l, kept as 2 × 1000
    case 'm3-l':
    case 'l-cm3': {
      const measure = VOLUME_MEASURES[sum.form];
      return { before: [number(sum.num1), { kind: 'word', text: measure.from }, equals], after: [{ kind: 'word', text: measure.to }] };
    }
    // Hoeveel minuten? over 9:45 → 11:20 ?, kept as 680 − 585. No "=": the heading asks, and
    // two times, an arrow, an = and the box are too wide for a 320px phone
    case 'tijdsduur':
      return {
        before: [{ kind: 'caption', text: words.minutesBetween }, { kind: 'number', text: clock(sum.num2) }, operation('→'),
                 { kind: 'number', text: clock(sum.num1) }],
        after: []
      };
    // 60 km per uur over 2,5 uur = ? km, kept as 5 × 30: half hours times the km in each
    case 'snelheid':
      return {
        before: [{ kind: 'caption', text: `${sum.num2 * 2} km ${words.perHour}` }, { kind: 'number', text: tenths(sum.num1 * 5, words.point) },
                 { kind: 'word', text: words.hours }, equals],
        after: [{ kind: 'word', text: 'km' }]
      };
    // Hoeveel graden verschil? over −3° → 5° = ?, kept as 5 + 3: num2 is the degrees below nought
    case 'temperatuur-op':
    case 'temperatuur-af': {
      const [from, to] = sum.form === 'temperatuur-op' ? [-sum.num2, sum.num1] : [sum.num1, -sum.num2];
      return {
        before: [{ kind: 'caption', text: words.degreesBetween }, { kind: 'number', text: degrees(from) }, operation('→'),
                 { kind: 'number', text: degrees(to) }, equals],
        after: []
      };
    }
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

/** Klas 1's sums (sum-form.ts), whose forms carry a number in their name; undefined for any other. */
function klasLayout(sum: SumToShow, words: FormWords): SumLayout | undefined {
  const form = sum.form || '';
  const sign = (text: string): SumPart => ({ kind: 'operation', text });
  // −3 + 8 = ?, −24 : −3 = ?
  if (form === 'negatief') {
    return { before: [{ kind: 'number', text: signed(sum.num1) }, sign(sum.sign), { kind: 'number', text: signed(sum.num2) }, equals], after: [] };
  }
  // 3 + 4 × 5 = ?, kept as 3 + 20
  if (form.startsWith('voorrang-')) {
    const by = lastNumberOf(form);
    return { before: [number(sum.num1), sign(sum.sign), number(sum.num2 / by), sign('×'), number(by), equals], after: [] };
  }
  // (3 + 4) × 5 = ?, kept as 7 × 5
  if (form.startsWith('haakjes-')) {
    const first = lastNumberOf(form);
    return {
      before: [sign('('), number(first), sign('+'), number(sum.num1 - first), sign(')'), sign('×'), number(sum.num2), equals],
      after: []
    };
  }
  // 1/2 + 1/3 = ?/6, kept as 3 + 2 sixths
  if (form.startsWith('ongelijk-')) {
    const [first, second, common] = denominatorsOf(form as UnlikeFractionForm);
    return {
      before: [{ kind: 'number', text: `${sum.num1 * first / common}/${first}` }, sign(sum.sign),
               { kind: 'number', text: `${sum.num2 * second / common}/${second}` }, equals],
      after: [sign('/'), number(common)]
    };
  }
  // ⅔ × 12 = ?, kept as 4 × 2
  if (form.startsWith('keer-')) {
    const parts = lastNumberOf(form);
    return { before: [{ kind: 'number', text: FRACTIONS[`${sum.num2}/${parts}`] }, sign('×'), number(sum.num1 * parts), equals], after: [] };
  }
  // a = 3 × b + 4 over b = 5 → a = ?, kept as 15 + 4
  if (form.startsWith('formule-')) {
    const times = lastNumberOf(form);
    return {
      before: [{ kind: 'caption', text: `a = ${times} × b + ${sum.num2}` }, { kind: 'word', text: 'b =' }, number(sum.num1 / times),
               sign('→'), { kind: 'word', text: 'a =' }],
      after: []
    };
  }
  // Rond af op 1 decimaal over 3,47 ≈ ?, kept as 347 ≈ 10 in hundredths
  if (form === 'afronden-decimaal') {
    return { before: [{ kind: 'caption', text: words.toOneDecimal }, { kind: 'number', text: decimal(sum.num1, 2, words.point) }, sign('≈')], after: [] };
  }
  return klas2Layout(sum, words);
}

/** Klas 2's sums (sum-form.ts); undefined for any other. */
function klas2Layout(sum: SumToShow, words: FormWords): SumLayout | undefined {
  const form = sum.form || '';
  const sign = (text: string): SumPart => ({ kind: 'operation', text });
  const word = (text: string): SumPart => ({ kind: 'word', text });
  // 2³ = ?, kept as 4 × 2
  if (form.startsWith('macht-')) {
    return { before: [{ kind: 'number', text: `${sum.num2}${SUPERSCRIPTS[lastNumberOf(form)]}` }, equals], after: [] };
  }
  // √144 = ?, kept as 144 : 12
  if (form === 'wortel') {
    return { before: [{ kind: 'number', text: `√${sum.num1}` }, equals], after: [] };
  }
  // 3x + 5 = 20 over x = ?, kept as 15 : 3: the equation a line of its own, as it is written out on
  // paper before it is solved; with "x =" and the box beside it, it is too wide for a 320px phone
  if (form.startsWith('vergelijking-')) {
    const added = lastNumberOf(form);
    return {
      before: [{ kind: 'caption', text: `${sum.num2 === 1 ? '' : sum.num2}x + ${added} = ${sum.num1 + added}` }, word('x'), equals],
      after: []
    };
  }
  // x = 2 over 3(x + 4) = ?, kept as 3 × 6
  if (form.startsWith('invullen-')) {
    const x = lastNumberOf(form);
    return {
      before: [{ kind: 'caption', text: `x = ${x}` }, number(sum.num1), sign('('), word('x'), sign('+'), number(sum.num2 - x), sign(')'), equals],
      after: []
    };
  }
  // €80 + 15% = €?, kept as 80 + 12
  if (form.startsWith('toename-') || form.startsWith('afname-')) {
    return {
      before: [word('€'), number(sum.num1), sign(form.startsWith('toename-') ? '+' : '\u2212'), { kind: 'number', text: `${lastNumberOf(form)}%` },
               equals, word('€')],
      after: []
    };
  }
  // Schuine zijde? over a = 6 b = 8 → ?, kept as 100 : 10
  if (form.startsWith('pythagoras-')) {
    const [a, b] = sidesOf(form as PythagorasForm, sum.num2);
    return {
      before: [{ kind: 'caption', text: words.hypotenuse }, word('a ='), number(a), word('b ='), number(b), sign('→')],
      after: []
    };
  }
  const klas34 = klas34Layout(sum, words);
  if (klas34) {
    return klas34;
  }
  // Oppervlakte driehoek over ½ × 10 × 6 = ?, kept as 5 × 6
  if (form === 'driehoek') {
    return {
      before: [{ kind: 'caption', text: words.triangleArea }, { kind: 'number', text: '½' }, sign('×'), number(sum.num1 * 2), sign('×'),
               number(sum.num2), equals],
      after: []
    };
  }
  return undefined;
}

/** Klas 3 and 4's sums (sum-form.ts); undefined for any other. */
function klas34Layout(sum: SumToShow, words: FormWords): SumLayout | undefined {
  const form = sum.form || '';
  const sign = (text: string): SumPart => ({ kind: 'operation', text });
  const word = (text: string): SumPart => ({ kind: 'word', text });
  const text = (value: string): SumPart => ({ kind: 'number', text: value });
  const caption = (value: string): SumPart => ({ kind: 'caption', text: value });
  const solveX = (heading: string): SumLayout => ({ before: [caption(heading), word('x'), equals], after: [] });
  // 3(x + 4) = 21 over x = ?, kept as 7 − 4
  if (form.startsWith('haakvgl-')) {
    const times = lastNumberOf(form);
    return solveX(`${times}(x + ${sum.num2}) = ${times * sum.num1}`);
  }
  // 5x = 3x + 12 over x = ?, kept as 12 : 2
  if (form.startsWith('beide-')) {
    const left = lastNumberOf(form);
    const right = left - sum.num2;
    return solveX(`${left}x = ${right === 1 ? '' : right}x + ${sum.num1}`);
  }
  // x² = 49 (x > 0) over x = ?, kept as 49 : 7
  if (form === 'kwadraat-vgl') {
    return solveX(`x² = ${sum.num1}  (x > 0)`);
  }
  // x² − 5x + 6 = 0 over grootste x = ?, kept as 5 − 2
  if (form === 'kwadratisch') {
    const larger = sum.num1 - sum.num2;
    return { before: [caption(`x² \u2212 ${sum.num1}x + ${sum.num2 * larger} = 0`), word(words.largestX)], after: [] };
  }
  // (−2)³ = ?, kept as 4 × −2
  if (form.startsWith('negmacht-')) {
    return { before: [text(`(\u2212${-sum.num2})${SUPERSCRIPTS[lastNumberOf(form)]}`), equals], after: [] };
  }
  // −3² = ?, kept as 3 × −3
  if (form === 'minkwadraat') {
    return { before: [text(`\u2212${sum.num1}²`), equals], after: [] };
  }
  // 3,2 · 10³ = ?, kept as 32 × 1000 in tenths
  if (form === 'wetenschap') {
    return { before: [text(`${tenths(sum.num1, words.point)} · 10${SUPERSCRIPTS[tensIn(sum.num2)]}`), equals], after: [] };
  }
  // 4 · 10⁻² = ?, kept as 4000 : 100 in thousandths
  if (form === 'wetenschap-min') {
    return { before: [text(`${sum.num1 / 1000} · 10⁻${SUPERSCRIPTS[tensIn(sum.num2)]}`), equals], after: [] };
  }
  // 200 × 1,05 = ?, kept as 105 × 200 in hundredths
  if (form === 'groeifactor') {
    return { before: [number(sum.num2), sign('×'), text(decimal(sum.num1, 2, words.point)), equals], after: [] };
  }
  // 100 × 1,1² = ?, kept as 121 × 100 in hundredths
  if (form === 'groei-2') {
    return { before: [number(sum.num2), sign('×'), text(`${tenths(Math.sqrt(sum.num1), words.point)}²`), equals], after: [] };
  }
  // √50 = ?√2, kept as 10 : 2
  if (form === 'wortel-vereenvoudig') {
    const root = sum.num1 / sum.num2;
    return { before: [text(`√${root * root * sum.num2}`), equals], after: [text(`√${sum.num2}`)] };
  }
  // sin 30° × 10 = ?, kept as 50 × 10 in hundredths
  if (form === 'sin-30' || form === 'cos-60' || form === 'tan-45') {
    return { before: [text(TRIG_NAMES[form]), sign('×'), number(sum.num2), equals], after: [] };
  }
  // A = l × b, A = 36 over l = 9 → b = ?, kept as 36 : 9
  if (form === 'herleiden') {
    return { before: [caption(`A = l × b, A = ${sum.num1}`), word('l ='), number(sum.num2), sign('→'), word('b =')], after: [] };
  }
  // De groeifactor in totaal? +10% → −10% over × ?, kept as 110 × 90 in ten-thousandths. The steps
  // in the heading: beside the box they are too wide for one line of a phone
  if (form === 'procent-stappen') {
    const percent = (factor: number) => factor > 100 ? `+${factor - 100}%` : `\u2212${100 - factor}%`;
    return { before: [caption(`${words.totalFactor} ${percent(sum.num1)} → ${percent(sum.num2)}`), word('×')], after: [] };
  }
  return undefined;
}

/** The worked line of klas 3 and 4's sums; undefined for any other form. */
function klas34WorkedStep(form: string, num1: number, num2: number, point: string): string | undefined {
  // 3(x + 4) = 21: share both sides by 3, then take off the 4
  if (form.startsWith('haakvgl-')) {
    const times = lastNumberOf(form);
    return `${times * num1} : ${times} = ${num1} → ${num1} \u2212 ${num2} = ${num1 - num2}`;
  }
  // 5x = 3x + 12: take the 3x off both sides, 2x = 12, then share by 2
  if (form.startsWith('beide-')) {
    const left = lastNumberOf(form);
    const right = left - num2;
    return `${left}x \u2212 ${right === 1 ? '' : right}x = ${num2 === 1 ? '' : num2}x → ${num1} : ${num2} = ${num1 / num2}`;
  }
  if (form === 'kwadraat-vgl') {
    return `${num2} × ${num2} = ${num1} → x = ${num2}`;
  }
  // x² − 5x + 6 = 0: two numbers that times make 6 and add to 5, 2 and 3
  if (form === 'kwadratisch') {
    const larger = num1 - num2;
    return `${num2} × ${larger} = ${num2 * larger}, ${num2} + ${larger} = ${num1} → x = ${num2} of x = ${larger}`;
  }
  // (−2)³: three −2's multiplied
  if (form.startsWith('negmacht-')) {
    const power = lastNumberOf(form);
    return `${Array.from({ length: power }, () => `(${signed(num2)})`).join(' × ')} = ${signed(num1 * num2)}`;
  }
  // −3²: the square first, then the minus
  if (form === 'minkwadraat') {
    return `${num1}² = ${num1 * num1} → ${signed(-num1 * num1)}`;
  }
  if (form === 'wetenschap') {
    return `${tenths(num1, point)} × ${num2} = ${tenths(num1 * num2, point)}`;
  }
  if (form === 'wetenschap-min') {
    return `${num1 / 1000} : ${num2} = ${decimal(num1 / num2, 3, point)}`;
  }
  // 200 × 1,05: 1% of 200 is 2, and 105% is 105 of those
  if (form === 'groeifactor') {
    return `1% van ${num2} = ${num2 / 100} → ${num1} × ${num2 / 100} = ${decimal(num1 * num2, 2, point)}`;
  }
  // 100 × 1,1²: 1,1 × 1,1 = 1,21 first
  if (form === 'groei-2') {
    const factor = tenths(Math.sqrt(num1), point);
    return `${factor} × ${factor} = ${decimal(num1, 2, point)} → ${num2} × ${decimal(num1, 2, point)} = ${decimal(num1 * num2, 2, point)}`;
  }
  // √50: 50 is 25 × 2, and √25 = 5
  if (form === 'wortel-vereenvoudig') {
    const root = num1 / num2;
    return `${root * root * num2} = ${root * root} × ${num2} → √${root * root} = ${root}`;
  }
  if (form === 'sin-30' || form === 'cos-60' || form === 'tan-45') {
    const ratio = decimal(TRIG_VALUES[form], 2, point);
    return `${TRIG_NAMES[form]} = ${ratio} → ${ratio} × ${num2} = ${decimal(num1 * num2, 2, point)}`;
  }
  if (form === 'herleiden') {
    return `b = A : l → ${num1} : ${num2} = ${num1 / num2}`;
  }
  // +10% is × 1,1 and −10% is × 0,9: the factors multiply
  if (form === 'procent-stappen') {
    return `${decimal(num1, 2, point)} × ${decimal(num2, 2, point)} = ${decimal(num1 * num2, 4, point)}`;
  }
  return undefined;
}

/** The worked line of klas 2's sums; undefined for any other form. */
function klas2WorkedStep(form: string, num1: number, num2: number): string | undefined {
  // 2⁵: five twos multiplied
  if (form.startsWith('macht-')) {
    return `${Array.from({ length: lastNumberOf(form) }, () => num2).join(' × ')} = ${num1 * num2}`;
  }
  // √144: the number that times itself makes 144
  if (form === 'wortel') {
    return `${num2} × ${num2} = ${num1}`;
  }
  // 3x + 5 = 20: take the 5 off both sides, then share by 3
  if (form.startsWith('vergelijking-')) {
    const added = lastNumberOf(form);
    return `${num1 + added} \u2212 ${added} = ${num1} → ${num1} : ${num2} = ${num1 / num2}`;
  }
  // 3(x + 4) with x = 2: the brackets first, 2 + 4, then times 3
  if (form.startsWith('invullen-')) {
    const x = lastNumberOf(form);
    return `${x} + ${num2 - x} = ${num2} → ${num1} × ${num2} = ${num1 * num2}`;
  }
  // €80 + 15%: 15% of 80 is 12, then 80 + 12
  if (form.startsWith('toename-') || form.startsWith('afname-')) {
    const up = form.startsWith('toename-');
    return `${lastNumberOf(form)}% van ${num1} = ${num2} → ${num1} ${up ? '+' : '\u2212'} ${num2} = ${up ? num1 + num2 : num1 - num2}`;
  }
  // a² + b² = c², then the root
  if (form.startsWith('pythagoras-')) {
    const [a, b] = sidesOf(form as PythagorasForm, num2);
    return `${a}² + ${b}² = ${a * a} + ${b * b} = ${num1} → √${num1} = ${num2}`;
  }
  // a triangle is half a rectangle: half the base, times the height
  if (form === 'driehoek') {
    return `${num1 * 2} : 2 = ${num1} → ${num1} × ${num2} = ${num1 * num2}`;
  }
  return undefined;
}

/**
 * −3 + 8, 4 − 9, −4 × 6: the sum without its signs first, then the sign.
 * Plus with one below nought is the difference, with the sign of the bigger;
 * minus is plus the opposite; times and sharing follow − × − = +.
 */
function signedWorked(num1: number, num2: number, operation: string): string {
  const answer = operation === '+' ? num1 + num2 : operation === '-' ? num1 - num2 : operation === '*' ? num1 * num2 : num1 / num2;
  if (operation === '*' || operation === '/') {
    const by = operation === '*' ? '×' : ':';
    const signOf = (n: number) => (n < 0 ? '\u2212' : '+');
    return `${Math.abs(num1)} ${by} ${Math.abs(num2)} = ${Math.abs(answer)} → ${signOf(num1)} ${by} ${signOf(num2)} = ${signOf(answer)} → ${signed(answer)}`;
  }
  if (operation === '-') {
    return `${signed(num1)} \u2212 ${signed(num2)} = ${signed(num1)} + ${signed(-num2)} → ${signedWorked(num1, -num2, '+')}`;
  }
  if (num1 >= 0 && num2 >= 0) {
    return `${num1} + ${num2} = ${answer}`;
  }
  if (num1 < 0 && num2 < 0) {
    return `${Math.abs(num1)} + ${Math.abs(num2)} = ${Math.abs(answer)} → ${signed(answer)}`;
  }
  const [big, small] = Math.abs(num1) >= Math.abs(num2) ? [num1, num2] : [num2, num1];
  return `${Math.abs(big)} \u2212 ${Math.abs(small)} = ${Math.abs(answer)} → ${signed(answer)}`;
}

/** The worked line of klas 1's sums; undefined for any other form. */
function klasWorkedStep(form: string, num1: number, num2: number, operation: string, point: string): string | undefined {
  const sign = operation === '-' ? '\u2212' : '+';
  if (form === 'negatief') {
    return signedWorked(num1, num2, operation);
  }
  // × before +: 4 × 5 first, then 3 + 20
  if (form.startsWith('voorrang-')) {
    const by = lastNumberOf(form);
    const answer = operation === '-' ? num1 - num2 : num1 + num2;
    return `${num2 / by} × ${by} = ${num2} → ${num1} ${sign} ${num2} = ${answer}`;
  }
  // the brackets first: 3 + 4, then times 5
  if (form.startsWith('haakjes-')) {
    const first = lastNumberOf(form);
    return `${first} + ${num1 - first} = ${num1} → ${num1} × ${num2} = ${num1 * num2}`;
  }
  // both in sixths, then added: 1/2 = 3/6, 1/3 = 2/6, 3 + 2 = 5
  if (form.startsWith('ongelijk-')) {
    const [first, second, common] = denominatorsOf(form as UnlikeFractionForm);
    const answer = operation === '-' ? num1 - num2 : num1 + num2;
    return `${num1 * first / common}/${first} = ${num1}/${common} → ${num2 * second / common}/${second} = ${num2}/${common} → `
      + `${num1} ${sign} ${num2} = ${answer}`;
  }
  // ⅔ × 12: a third of 12 is 4, two thirds 2 × 4
  if (form.startsWith('keer-')) {
    const parts = lastNumberOf(form);
    return `${num1 * parts} : ${parts} = ${num1} → ${num2} × ${num1} = ${num1 * num2}`;
  }
  // a = 3 × b + 4 with b = 5: 3 × 5 first, then + 4
  if (form.startsWith('formule-')) {
    const times = lastNumberOf(form);
    return `${times} × ${num1 / times} = ${num1} → ${num1} + ${num2} = ${num1 + num2}`;
  }
  // 3,47 op 1 decimaal: the figure after the first decimal, 7; 5 or more goes up
  if (form === 'afronden-decimaal') {
    const figure = num1 % 10;
    return `${decimal(num1, 2, point)}: ${figure} ${figure >= 5 ? '≥' : '<'} 5 → ${decimal(roundTo(num1, num2), 2, point)}`;
  }
  return klas2WorkedStep(form, num1, num2) || klas34WorkedStep(form, num1, num2, point);
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
  const klas = form ? klasWorkedStep(form, num1, num2, operation, point) : undefined;
  if (klas) {
    return klas;
  }
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
    // 15% van 60: 5% of it is 60 : 20 = 3, and 15% three of those
    case 'procent-via-10':
    case 'procent-via-5':
    case 'procent-via-1': {
      const step = stepOf(form);
      return `${step}% van ${grouped(num1 * 100 / step)} = ${num1} → ${num2} × ${num1} = ${num1 * num2}`;
    }
    // 18 van 72: as hundredths of 72, 18 × 100 shared by 72
    case 'welk-procent':
      return `${num1 / 100} × 100 = ${num1} → ${num1} : ${num2} = ${num1 / num2}`;
    // 1 : 500: one centimetre on the map is 500 cm, 5 m, in real life
    case 'schaal-100':
    case 'schaal-200':
    case 'schaal-500':
    case 'schaal-1000':
      return `1 cm = ${num2} m → ${num1} × ${num2} = ${num1 * num2}`;
    // the mean: add them all up, then share the total by how many there are
    case 'gemiddelde-3':
    case 'gemiddelde-4':
      return `${meanList(num1, num2).join(' + ')} = ${num1} → ${num1} : ${num2} = ${num1 / num2}`;
    // a box: the bottom first, length times width, then that many times the height
    case 'inhoud-2':
    case 'inhoud-4':
    case 'inhoud-5':
    case 'inhoud-10': {
      const length = lengthOf(form);
      return `${length} × ${num1 / length} = ${num1} → ${num1} × ${num2} = ${num1 * num2}`;
    }
    // 2 m³: a cubic metre holds 1000 litres
    case 'm3-l':
    case 'l-cm3': {
      const measure = VOLUME_MEASURES[form];
      return `1 ${measure.from} = ${measure.factor} ${measure.to} → ${num1} × ${measure.factor} = ${num1 * num2}`;
    }
    // 9:45 to 11:20: up to the whole hour, then on from it
    case 'tijdsduur': {
      const hour = Math.ceil(num2 / 60) * 60;
      return `${clock(num2)} → ${clock(hour)} = ${hour - num2} → ${clock(hour)} → ${clock(num1)} = ${num1 - hour} → `
        + `${hour - num2} + ${num1 - hour} = ${num1 - num2}`;
    }
    // 60 km per uur for 2,5 uur: two whole hours, 2 × 60, and half an hour more, half of 60
    case 'snelheid': {
      const [hours, speed] = [Math.floor(num1 / 2), num2 * 2];
      if (num1 % 2 === 0) {
        return `${hours} × ${speed} = ${num1 * num2}`;
      }
      return hours ? `${hours} × ${speed} = ${hours * speed} → ${hours * speed} + ${num2} = ${num1 * num2}` : `${speed} : 2 = ${num2}`;
    }
    // −3° to 5°: up to nought, then on from it
    case 'temperatuur-op':
    case 'temperatuur-af': {
      const [from, to] = form === 'temperatuur-op' ? [-num2, num1] : [num1, -num2];
      return `${degrees(from)} → 0° = ${Math.abs(from)} → 0° → ${degrees(to)} = ${Math.abs(to)} → `
        + `${Math.abs(from)} + ${Math.abs(to)} = ${num1 + num2}`;
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
