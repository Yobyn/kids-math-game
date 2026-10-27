/**
 * The sums a Dutch school sets, by groep and by moment in the school year
 * (docs/CURRICULUM-NL.md). Yobyn, 2026-10-06: "they need what is actually
 * asked in school". Only the question screen imports this, so it is fetched
 * with the round, not in the first load.
 *
 * So far groep 3 and 4: the plain sums (a number, a sign, a number) and the
 * written forms of the workbook (7 + ? = 10, 8 = 5 + ?, dubbel 7, de helft
 * van 16); and groep 5 (all the tables, to 1000, 4 × 30, 4 × 23, ¼ van
 * 20, 23 : 4 = 5 rest ?, 3 m = ? cm); and groep 6's plain sums (to 10 000,
 * 25 × 8, 96 : 4, 23 × 14, 347 ≈ ? op tientallen, ¾ van 20, ½ = ?/8, the
 * area of a rectangle, 0,3 + 0,4); and groep 7's whole numbers (345 678 ≈ ? op
 * duizendtallen, 124 × 36, 864 : 24, 25% van 60) and its decimals (3,45 × 100,
 * 72 : 100, 2,5 × 4, 2,5 km = ? m) and the rest of groep 7 (2/8 + 3/8,
 * ¾ = 0,75, 3 pakken kosten €6, 20% korting); and all of groep 8 (15% van
 * 60, 18 van 72 = ?%, ⅔ van 45, schaal 1 : 500, the mean; 10 × 5 × 4 = ? cm³,
 * 2 m³ = ? l, 9:45 → 11:20, 60 km per uur, −3° → 5°); and klas 1, kept here
 * as "groep 9" (−3 + 8, −24 : −3, 3 + 4 × 5, (3 + 4) × 5, 1/2 + 1/3 = ?/6,
 * ⅔ × 12, a = 3 × b + 4, 3,47 op 1 decimaal); and klas 2, "groep 10" (2³, √144,
 * 3x + 5 = 20, 3(x + 4) met x = 2, €80 + 15%, Pythagoras, ½ × 10 × 6); and
 * klas 3 and 4, "groep 11 and 12" (3(x + 4) = 21, 5x = 3x + 12, (−2)³,
 * 3,2 · 10³, 200 × 1,05, x² = 49; x² − 5x + 6 = 0, 100 × 1,1², √50 = ?√2,
 * sin 30° × 10, A = l × b, +10% → −10%). Every grade follows the curriculum.
 */

import {
  DECIMAL_MEASURE_FORMS, DISCOUNT_FORMS, FRACTION_SUM_FORMS, MEAN_FORMS, MEASURE_FORMS, PERCENT_FORMS, PERCENT_STEP_FORMS,
  RATIO_FORMS, SCALE_FORMS, SumForm, TEMPERATURE_FORMS, VOLUME_FORMS, VOLUME_MEASURE_FORMS, denominatorOf, lengthOf, packsOf,
  percentOf, scaleOf, stepOf, BRACKET_FORMS, FORMULA_FORMS, PRECEDENCE_FORMS, TIMES_FRACTION_FORMS, UNLIKE_FRACTION_FORMS,
  denominatorsOf, lastNumberOf, EQUATION_FORMS, FILL_IN_FORMS, PERCENT_CHANGE_FORMS, POWER_FORMS, PYTHAGORAS_FORMS, TRIANGLES,
  BOTH_SIDES_FORMS, BRACKET_EQUATION_FORMS, NEGATIVE_POWER_FORMS, TRIG_FORMS, TRIG_VALUES
} from '../../question/sum-form';
import { DECIMAL_MEASURES, MEASURES, numeratorsOf } from './written-form';

export type Moment = 'B' | 'M' | 'E';
/**
 * % is what is left over: 23 % 4 is the 3 in 23 : 4 = 5 rest 3.
 * ≈ is rounding: 347 ≈ 10 is 347 rounded to the nearest ten, 350.
 */
export type Operation = '+' | '-' | '*' | '/' | '%' | '≈';

/** A sum as the screen shows it: num1, the sign, num2, and the answer box. */
export interface SchoolSum {
  num1: number;
  num2: number;
  operation: Operation;
  /** How it is written, when not as num1 sign num2 = ? (question/sum-form.ts). */
  form?: SumForm;
  /** Which topic of the curriculum it is (the ids in TOPICS). */
  topic: string;
}

/** A source of numbers in [0, 1), as Math.random. */
export type Random = () => number;

/** A whole number from lo to hi, both included. */
function between(random: Random, lo: number, hi: number): number {
  return lo + Math.floor(random() * (hi - lo + 1));
}

function pick<T>(random: Random, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

const ones = (n: number) => n % 10;

/** A topic: how to make one of its sums. */
type Maker = (random: Random) => Omit<SchoolSum, 'topic'>;

/**
 * Every topic of groep 3 and 4. Each makes only sums that fit its own rule
 * ("crosses the ten", "stays within the ten"): the rule is the topic, a sum
 * that broke it would be the next topic's, or one the child has not met.
 */
export const TOPICS: { [id: string]: Maker } = {
  // Groep 3, the start: small numbers within 10
  'plus-tot-10-klein': random => {
    const num1 = between(random, 1, 5);
    return { num1, num2: between(random, 1, 5), operation: '+' };
  },
  'min-tot-10-klein': random => {
    const num1 = between(random, 2, 10);
    return { num1, num2: between(random, 1, Math.min(5, num1 - 1)), operation: '-' };
  },
  // Groep 3, the middle: all of within 10, and the teens without crossing the ten
  'plus-tot-10': random => {
    const num1 = between(random, 1, 9);
    return { num1, num2: between(random, 1, 10 - num1), operation: '+' };
  },
  'min-tot-10': random => {
    const num1 = between(random, 2, 10);
    return { num1, num2: between(random, 1, num1 - 1), operation: '-' };
  },
  'plus-tot-20-zonder': random => {
    const num1 = 10 + between(random, 1, 8);
    return { num1, num2: between(random, 1, 9 - ones(num1)), operation: '+' };
  },
  'min-tot-20-zonder': random => {
    const num1 = 10 + between(random, 2, 9);
    return { num1, num2: between(random, 1, ones(num1)), operation: '-' };
  },
  'dubbel-tot-10': random => {
    const num1 = between(random, 1, 5);
    return { num1, num2: num1, operation: '+' };
  },
  // Groep 3, the end: crossing the ten within 20, doubles to 20, jumps of ten
  'plus-tot-20-over': random => {
    const num1 = between(random, 2, 9);
    return { num1, num2: between(random, 11 - num1, 9), operation: '+' };
  },
  'min-tot-20-over': random => {
    const num1 = 10 + between(random, 1, 8);
    return { num1, num2: between(random, ones(num1) + 1, 9), operation: '-' };
  },
  'dubbel-tot-20': random => {
    const num1 = between(random, 6, 10);
    return { num1, num2: num1, operation: '+' };
  },
  'sprong-van-10': random => {
    const num1 = between(random, 10, 89);
    return random() < 0.5 ? { num1, num2: 10, operation: '+' } : { num1: num1 + 10, num2: 10, operation: '-' };
  },
  // Groep 4, the middle: within 100
  'tientallen': random => {
    const num1 = 10 * between(random, 1, 8);
    return random() < 0.5
      ? { num1, num2: 10 * between(random, 1, 9 - num1 / 10), operation: '+' }
      : { num1: num1 + 10, num2: 10 * between(random, 1, num1 / 10), operation: '-' };
  },
  'te-e-zonder': random => {
    const num1 = 10 * between(random, 2, 9) + between(random, 1, 8);
    return random() < 0.5
      ? { num1, num2: between(random, 1, 9 - ones(num1)), operation: '+' }
      : { num1, num2: between(random, 1, ones(num1)), operation: '-' };
  },
  'te-e-over': random => {
    if (random() < 0.5) {
      const num1 = 10 * between(random, 2, 8) + between(random, 2, 9);
      return { num1, num2: between(random, 11 - ones(num1), 9), operation: '+' };
    }
    const num1 = 10 * between(random, 2, 9) + between(random, 0, 7);
    return { num1, num2: between(random, ones(num1) + 1, 9), operation: '-' };
  },
  'te-t': random => {
    const num1 = 10 * between(random, 1, 7) + between(random, 1, 9);
    if (random() < 0.5) {
      return { num1, num2: 10 * between(random, 1, 9 - Math.floor(num1 / 10)), operation: '+' };
    }
    const bigger = num1 + 10 * between(random, 1, 2);
    return { num1: bigger, num2: 10 * between(random, 1, Math.floor(bigger / 10)), operation: '-' };
  },
  // Groep 4, the end: two-digit and two-digit, hundreds
  'te-te-zonder': random => {
    if (random() < 0.5) {
      const num1 = 10 * between(random, 1, 7) + between(random, 1, 7);
      const num2 = 10 * between(random, 1, 8 - Math.floor(num1 / 10)) + between(random, 1, 9 - ones(num1));
      return { num1, num2, operation: '+' };
    }
    const num1 = 10 * between(random, 3, 9) + between(random, 2, 9);
    const num2 = 10 * between(random, 1, Math.floor(num1 / 10) - 1) + between(random, 1, ones(num1));
    return { num1, num2, operation: '-' };
  },
  'te-te-over': random => {
    if (random() < 0.5) {
      const num1 = 10 * between(random, 1, 7) + between(random, 2, 9);
      const num2 = 10 * between(random, 1, 8 - Math.floor(num1 / 10)) + between(random, 11 - ones(num1), 9);
      return { num1, num2, operation: '+' };
    }
    const num1 = 10 * between(random, 3, 9) + between(random, 1, 8);
    const num2 = 10 * between(random, 1, Math.floor(num1 / 10) - 1) + between(random, ones(num1) + 1, 9);
    return { num1, num2, operation: '-' };
  },
  'honderdtallen': random => {
    const num1 = 100 * between(random, 1, 8);
    return random() < 0.5
      ? { num1, num2: 100 * between(random, 1, 9 - num1 / 100), operation: '+' }
      : { num1: num1 + 100, num2: 100 * between(random, 1, num1 / 100), operation: '-' };
  }
};

// The written forms (question/sum-form.ts): each kept as the sum whose answer is asked
Object.assign(TOPICS, {
  // Groep 3, the middle: what goes with a number to make 10. 7 + ? = 10
  'aanvullen-tot-10': random => ({ num1: 10, num2: between(random, 1, 9), operation: '-', form: 'aanvullen' }),
  // Groep 3, the end: a number up to 10 split in two. 8 = 5 + ?
  'splitsen-tot-10': random => {
    const num1 = between(random, 3, 10);
    return { num1, num2: between(random, 1, num1 - 1), operation: '-', form: 'splitsen' };
  },
  // Groep 3, the end: doubles and halves to 20. dubbel 7, de helft van 16
  'dubbel-van-tot-20': random => {
    const num1 = between(random, 2, 10);
    return { num1, num2: num1, operation: '+', form: 'dubbel' };
  },
  'helft-van-tot-20': random => ({ num1: 2 * between(random, 2, 10), num2: 2, operation: '/', form: 'helft' }),
  // Groep 4, the end: doubles and halves to 100. dubbel 35, de helft van 60
  'dubbel-van-tot-100': random => {
    const num1 = between(random, 11, 50);
    return { num1, num2: num1, operation: '+', form: 'dubbel' };
  },
  'helft-van-tot-100': random => ({ num1: 2 * between(random, 11, 50), num2: 2, operation: '/', form: 'helft' })
} as { [id: string]: Maker });

/** The tables, as they are learnt: 1, 2, 5 and 10 first, then 3 and 4 (groep 4); 6 to 9 in groep 5. */
export const TABLES_FIRST = [1, 2, 5, 10];
export const TABLES_GROEP_4 = [1, 2, 3, 4, 5, 10];

/** A keersom from the given tables: "7 × 2" is seven twos, the table second, as written in class. */
function times(tables: number[]): Maker {
  return random => ({ num1: between(random, 1, 10), num2: pick(random, tables), operation: '*' });
}

/** A deelsom inside the given tables: "14 : 2", always coming out whole. */
function shareOut(tables: number[]): Maker {
  return random => {
    const table = pick(random, tables.filter(t => t > 1));
    return { num1: table * between(random, 1, 10), num2: table, operation: '/' };
  };
}

TOPICS['tafels-1-2-5-10'] = times(TABLES_FIRST);
TOPICS['deeltafels-2-5-10'] = shareOut(TABLES_FIRST);
TOPICS['tafels-1-5-10'] = times(TABLES_GROEP_4);
TOPICS['deeltafels-1-5-10'] = shareOut(TABLES_GROEP_4);

/** Groep 5's new tables. With them a child knows all ten. */
export const TABLES_GROEP_5 = [6, 7, 8, 9];
TOPICS['tafels-6-7-8-9'] = times(TABLES_GROEP_5);
TOPICS['deeltafels-6-7-8-9'] = shareOut(TABLES_GROEP_5);

/**
 * Klokkijken (groep 3 to 5): the time a drawn clock shows, typed as a
 * digital clock writes it. 3:45 is kept as 300 + 45, so 3, 4, 5 on the
 * keypad is the answer, and the answer box writes it 3:45. On the clock face:
 * 1 to 12 o'clock.
 */
const clockSum = (hours: number, minutes: number): Omit<SchoolSum, 'topic'> =>
  ({ num1: 100 * hours, num2: minutes, operation: '+', form: 'klok' });
// Groep 3, the end: hele en halve uren. 4:00, 3:30 ("half 4")
TOPICS['klok-uren'] = random => clockSum(between(random, 1, 12), pick(random, [0, 30]));
// Groep 4: kwart over en kwart voor, with the whole and half hours still about
TOPICS['klok-kwartier'] = random => clockSum(between(random, 1, 12), pick(random, [15, 45, 15, 45, 0, 30]));
// Groep 4, the end: every five minutes. 3:25 ("vijf voor half 4")
TOPICS['klok-5-minuten'] = random => clockSum(between(random, 1, 12), 5 * between(random, 1, 11));
// Groep 5: to the minute. 3:37
TOPICS['klok-minuten'] = random => {
  let minutes = between(random, 1, 59);
  if (minutes % 5 === 0) {
    minutes += between(random, 1, 4) * (minutes === 55 ? -1 : 1);
  }
  return clockSum(between(random, 1, 12), minutes);
};

/** The digits of a number below 10 000: thousands, hundreds, tens, ones. */
const digits = (n: number) => [Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10];

/** Does adding these carry in any column, or taking away borrow in any? */
export function carries(num1: number, num2: number, operation: '+' | '-'): boolean {
  const [a, b] = [digits(num1), digits(num2)];
  return a.some((digit, i) => operation === '+' ? digit + b[i] > 9 : digit < b[i]);
}

/**
 * A sum to 1000 that does, or does not, go through a ten or a hundred. Drawn
 * and tried again until it is one; the fallback is a sum of the right kind,
 * so a run of bad luck can never ask the wrong thing.
 */
function within1000(through: boolean): Maker {
  return random => {
    for (let tries = 0; tries < 200; tries++) {
      const operation = random() < 0.5 ? '+' : '-';
      // 340 + 250, 563 - 30 without; 367 + 258, 512 - 347 through
      const num1 = between(random, through ? 120 : 110, 899);
      const num2 = through ? between(random, 101, 899) : 10 * between(random, 1, 89);
      const answer = operation === '+' ? num1 + num2 : num1 - num2;
      if (answer > 0 && answer < 1000 && carries(num1, num2, operation) === through) {
        return { num1, num2, operation };
      }
    }
    return through ? { num1: 367, num2: 258, operation: '+' } : { num1: 340, num2: 250, operation: '+' };
  };
}

Object.assign(TOPICS, {
  // Groep 5, the middle: within 1000 without going through a ten or a hundred; times a ten
  'tot-1000-zonder': within1000(false),
  'keer-tiental': random => ({ num1: between(random, 2, 9), num2: 10 * between(random, 2, 9), operation: '*' }),
  // a part of an amount: ¼ van 20, kept as 20 : 4
  'deel-van': random => {
    const parts = pick(random, [3, 4, 5]);
    return { num1: parts * between(random, 2, 10), num2: parts, operation: '/', form: 'deel' };
  },
  // Groep 5, the end: within 1000 through a ten or a hundred (kolomsgewijs); TE × E
  'tot-1000-over': within1000(true),
  // Groep 5, the end: sharing out with something left over. 23 : 4 = 5 rest ?
  'delen-met-rest': random => {
    const parts = between(random, 2, 9);
    const left = between(random, 1, parts - 1);
    return { num1: parts * between(random, 2, 9) + left, num2: parts, operation: '%', form: 'rest' };
  },
  // a measure in a smaller unit: 3 m = ? cm, 2 uur = ? minuten, kept as 3 × 100
  'maten': random => {
    const form = pick(random, MEASURE_FORMS);
    return { num1: between(random, 2, 9), num2: MEASURES[form].factor, operation: '*', form };
  },
  'te-keer-e': random => {
    const num1 = between(random, 2, 9);
    let num2 = between(random, 11, Math.max(11, Math.floor(200 / num1)));
    // 4 × 23, not 4 × 20 (that is times a ten): step down, so it stays under the cap
    if (num2 % 10 === 0) {
      num2 -= 1;
    }
    return { num1, num2, operation: '*' };
  }
} as { [id: string]: Maker });

/** Not a round ten: 4 × 23, not 4 × 20 (that is times a ten, a sum of its own). */
function notRound(random: Random, lo: number, hi: number): number {
  const n = between(random, lo, hi);
  return n % 10 === 0 ? n - 1 : n;
}

/**
 * A sum to 10 000 done in columns (cijferend): four figures, and at least one
 * column carries or borrows, else it is a sum to do in the head.
 */
function within10000(random: Random): Omit<SchoolSum, 'topic'> {
  for (let tries = 0; tries < 200; tries++) {
    // 2345 + 1678, 5003 - 2468
    const operation = random() < 0.5 ? '+' : '-';
    const num1 = operation === '+' ? between(random, 1000, 7999) : between(random, 2000, 9999);
    const num2 = operation === '+' ? between(random, 1000, 9999 - num1) : between(random, 1000, num1 - 100);
    if (carries(num1, num2, operation)) {
      return { num1, num2, operation };
    }
  }
  return { num1: 2345, num2: 1678, operation: '+' };
}

Object.assign(TOPICS, {
  // Groep 6, the middle: to 10 000 in columns; times and sharing out past the tables
  'tot-10000': within10000,
  // 25 × 8, 48 × 6: a two-figure number times a table, up to 600
  'keer-groter': random => {
    const num2 = between(random, 3, 9);
    return { num1: notRound(random, 12, Math.min(99, Math.floor(600 / num2))), num2, operation: '*' };
  },
  // 96 : 4, 150 : 6: shared out past the tables, coming out whole, between 10 and 50
  'delen-groter': random => {
    const num2 = between(random, 2, 9);
    return { num1: num2 * notRound(random, 11, 50), num2, operation: '/' };
  },
  // Groep 6, the end: two figures times two figures. 23 × 14
  'te-keer-te': random => ({ num1: notRound(random, 12, 39), num2: notRound(random, 11, 29), operation: '*' }),
  // 347 ≈ ? op tientallen, 2468 ≈ ? op honderdtallen
  'afronden': random => {
    if (random() < 0.5) {
      const num1 = notRound(random, 101, 999);
      return { num1, num2: 10, operation: '≈', form: 'afronden' };
    }
    let num1 = between(random, 110, 9949);
    // 2400 is already a hundred: nothing to round
    if (num1 % 100 === 0) {
      num1 += between(random, 1, 99);
    }
    return { num1, num2: 100, operation: '≈', form: 'afronden' };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 6, the middle: more than one part of an amount. ¾ van 20, kept as 5 × 3
  'breuk-van': random => {
    const parts = pick(random, [3, 4, 5, 6, 8]);
    return { num1: between(random, 2, 10), num2: pick(random, numeratorsOf(parts, 2)), operation: '*', form: `van-${parts}` as SumForm };
  },
  // the same fraction over a bigger denominator, up to 20. ½ = ?/8, kept as 1 × 4
  'gelijke-breuken': random => {
    const under = pick(random, [2, 3, 4, 5]);
    return {
      num1: pick(random, numeratorsOf(under)), num2: between(random, 2, Math.floor(20 / under)), operation: '*',
      form: `gelijk-${under}` as SumForm
    };
  },
  // Groep 6, the end: adding and taking away tenths. 0,3 + 0,4, 1,5 + 2,7, 2,4 − 0,8,
  // kept as whole tenths (3 + 4); never a round number, which would hide the comma
  'tienden': random => {
    if (random() < 0.5) {
      const num1 = notRound(random, 1, 49);
      return { num1, num2: notRound(random, 1, 49), operation: '+', form: 'tienden' };
    }
    const num1 = notRound(random, 12, 99);
    return { num1, num2: notRound(random, 1, num1 - 1), operation: '-', form: 'tienden' };
  },
  // Groep 6, the end: the area of a rectangle in whole metres. 6 m × 4 m = ? m²
  'oppervlakte': random => {
    const width = between(random, 2, 9);
    return { num1: between(random, width + 1, 12), num2: width, operation: '*', form: 'oppervlakte' };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 7, the middle: numbers to a million rounded to thousands. 345 678 ≈ ?, kept as 345 678 ≈ 1000;
  // never past 994 999, so the answer fits the keypad's six figures
  'afronden-duizendtallen': random => {
    let num1 = between(random, 10001, 994999);
    // 345 000 is already a thousand: nothing to round
    if (num1 % 1000 === 0) {
      num1 += between(random, 1, 999);
    }
    return { num1, num2: 1000, operation: '≈', form: 'afronden' };
  },
  // in columns: three figures times two. 124 × 36
  'cijferend-keer': random => ({ num1: notRound(random, 102, 499), num2: notRound(random, 12, 49), operation: '*' }),
  // a staartdeling: by two figures, coming out whole. 864 : 24
  'staartdeling': random => {
    const num2 = notRound(random, 12, 49);
    return { num1: num2 * notRound(random, 12, 60), num2, operation: '/' };
  },
  // 50%, 25% and 10% of an amount that shares out whole. 25% van 60, kept as 60 : 4
  'procenten': random => {
    const form = pick(random, PERCENT_FORMS);
    const parts = 100 / percentOf(form);
    // 50% van 36, 25% van 60, 10% van 350: amounts a workbook uses, a whole number of parts
    const amount = parts === 10 ? 10 * between(random, 2, 50) : parts * between(random, 3, 30);
    return { num1: amount, num2: parts, operation: '/', form };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 7, the middle: a comma number times or shared by 10, 100 or 1000. 3,45 × 100, 72 : 100
  'komma-maal-10': random => {
    const by = pick(random, [10, 100, 1000]);
    if (random() < 0.5) {
      // 4,5 or 3,45, kept in hundredths: one or two figures after the comma, never a whole number
      const hundredths = random() < 0.5 ? 10 * notRound(random, 11, 99) : notRound(random, 101, 999);
      return { num1: hundredths, num2: by, operation: '*', form: 'komma-2' };
    }
    // 72 : 100 = 0,72, 4,5 : 10 = 0,45, kept in thousandths; never more than three figures after the comma
    for (;;) {
      const thousandths = random() < 0.5 ? 1000 * notRound(random, 2, 99) : 100 * notRound(random, 11, 99);
      if (thousandths % by === 0) {
        return { num1: thousandths, num2: by, operation: '/', form: 'komma-3' };
      }
    }
  },
  // Groep 7, the end: a comma number times a whole number. 2,5 × 4, 1,25 × 8
  'kommagetal-keer': random => {
    if (random() < 0.5) {
      // a quarter or three quarters past a whole, times 4 or 8: 1,25 × 8 = 10
      const hundredths = 100 * between(random, 0, 4) + pick(random, [25, 75]);
      return { num1: hundredths, num2: pick(random, [4, 8]), operation: '*', form: 'komma-2' };
    }
    return { num1: 10 * notRound(random, 11, 99), num2: between(random, 2, 9), operation: '*', form: 'komma-2' };
  },
  // the metric system with a comma: 2,5 km = ? m, 1,5 l = ? dl, kept as 25 × 1000 in tenths
  'metriek': random => {
    const form = pick(random, DECIMAL_MEASURE_FORMS);
    return { num1: notRound(random, 11, 99), num2: DECIMAL_MEASURES[form].factor, operation: '*', form };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 7, the middle: fractions with the same denominator. 2/8 + 3/8 = ?/8, kept as 2 + 3;
  // the answer stays below a whole, as groep 7 first meets it
  'gelijknamige-breuken': random => {
    const form = pick(random, FRACTION_SUM_FORMS);
    const under = denominatorOf(form);
    if (random() < 0.5) {
      const num1 = between(random, 1, under - 2);
      return { num1, num2: between(random, 1, under - 1 - num1), operation: '+', form };
    }
    const num1 = between(random, 2, under - 1);
    return { num1, num2: between(random, 1, num1 - 1), operation: '-', form };
  },
  // a fraction as a decimal. ¾ = 0,75, kept as 25 × 3 in hundredths: a quarter is 25 hundredths
  'breuk-naar-komma': random => {
    const under = pick(random, [2, 4, 5, 10]);
    return { num1: 100 / under, num2: pick(random, numeratorsOf(under)), operation: '*', form: 'breuk-komma' };
  },
  // Groep 7, the end: a ratio through the price of one. 3 pakken kosten €6, 7 pakken = €?, kept as 7 × 2
  'verhoudingen': random => {
    const form = pick(random, RATIO_FORMS);
    let asked = between(random, 2, 12);
    // 3 pakken and 3 pakken is no question: ask for one more
    if (asked === packsOf(form)) {
      asked += 1;
    }
    return { num1: asked, num2: between(random, 2, 9), operation: '*', form };
  },
  // 20% korting op €45: what is paid, in whole euros. Kept as 45 − 9
  'korting': random => {
    const form = pick(random, DISCOUNT_FORMS);
    // a price the percentage takes a whole number of euros off: 10% of a ten, 20% of a five, 25% of a four
    const step = 100 / gcd(percentOf(form), 100);
    const price = step * between(random, Math.ceil(20 / step), Math.floor(200 / step));
    return { num1: price, num2: price * percentOf(form) / 100, operation: '-', form };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 8, the middle: any percentage of an amount, worked through 10%, 5% or 1%.
  // 30% van 70, 15% van 60, 12% van 300: never 10%, 25% or 50% alone, which groep 7 knows
  'procent-van': random => {
    const form = pick(random, PERCENT_STEP_FORMS);
    const step = stepOf(form);
    if (step === 10) {
      return { num1: between(random, 2, 50), num2: pick(random, [3, 4, 6, 7, 8, 9]), operation: '*', form };
    }
    if (step === 5) {
      return { num1: between(random, 2, 20), num2: pick(random, [3, 7, 9, 11, 13, 15, 17, 19]), operation: '*', form };
    }
    let percent = between(random, 2, 99);
    // a multiple of 5 goes through 5% or 10%: 1% is for the 12% and 36% of this world
    if (percent % 5 === 0) {
      percent += 1;
    }
    return { num1: between(random, 2, 9), num2: percent, operation: '*', form };
  },
  // what percentage one amount is of another. 18 van 72 = ?%, kept as 1800 : 72
  'welk-procent': random => {
    const percent = pick(random, [5, 10, 15, 20, 25, 30, 40, 60, 70, 75, 80, 90]);
    // the whole a percentage of it comes out as a whole number: 25% of a four, 15% of a twenty
    const step = 100 / gcd(percent, 100);
    let whole = step * between(random, Math.ceil(8 / step), Math.floor(200 / step));
    // 18 van 100 is no question: it says its own percentage
    if (whole === 100) {
      whole += step;
    }
    return { num1: whole * percent, num2: whole, operation: '/', form: 'welk-procent' };
  },
  // more than one part of a bigger amount. ⅔ van 45, ⅗ van 120, kept as 15 × 2
  'breuk-van-groot': random => {
    const parts = pick(random, [3, 4, 5, 6, 8]);
    return { num1: between(random, 6, 25), num2: pick(random, numeratorsOf(parts, 2)), operation: '*', form: `van-${parts}` as SumForm };
  },
  // a map's scale. Schaal 1 : 500, 4 cm = ? m, kept as 4 × 5
  'schaal': random => {
    const form = pick(random, SCALE_FORMS);
    return { num1: between(random, 2, 20), num2: scaleOf(form) / 100, operation: '*', form };
  },
  // the mean of three or four numbers. 11, 15 en 10: gemiddeld 12, kept as 36 : 3.
  // Four numbers are small ones (9, 2, 3, 10), as the doc's 4, 8, 6, 10: four of two figures
  // and the box do not fit one line of a 320px phone
  'gemiddelde': random => {
    const form = pick(random, MEAN_FORMS);
    const count = Number(form.split('-')[1]);
    return { num1: count * (count === 3 ? between(random, 8, 40) : between(random, 4, 9)), num2: count, operation: '/', form };
  }
} as { [id: string]: Maker });

Object.assign(TOPICS, {
  // Groep 8, the end: the volume of a box. 10 × 5 × 4 = ? cm³, kept as 50 × 4
  'inhoud': random => {
    const form = pick(random, VOLUME_FORMS);
    return { num1: lengthOf(form) * between(random, 2, 9), num2: between(random, 2, 10), operation: '*', form };
  },
  // litres: 2 m³ = ? l, 3 l = ? cm³
  'liters': random => ({ num1: between(random, 2, 9), num2: 1000, operation: '*', form: pick(random, VOLUME_MEASURE_FORMS) }),
  // how long from one time to another, past at least one whole hour. 9:45 → 11:20 = ? minuten,
  // kept as 680 − 585; never on the hour, which would be no question of time at all. A school
  // morning, from before 10:00: two times of two figures each do not fit one line of a 320px phone
  'tijdsduur': random => {
    const start = 60 * between(random, 7, 9) + 5 * between(random, 1, 11);
    const end = Math.ceil(start / 60) * 60 + 60 * between(random, 0, 2) + 5 * between(random, 1, 11);
    return { num1: end, num2: start, operation: '-', form: 'tijdsduur' };
  },
  // speed, distance and time. 60 km per uur, 2,5 uur = ? km, kept as 5 × 30: the half hours times
  // the km in each, so the answer is a whole number of km
  'snelheid': random => {
    const speed = pick(random, [40, 50, 60, 70, 80, 90, 100, 120]);
    return { num1: between(random, 3, 9), num2: speed / 2, operation: '*', form: 'snelheid' };
  },
  // negative numbers, as a thermometer has them: from below nought to above it, or back.
  // −3° → 5° = ? graden, kept as 5 + 3: the degrees above nought and the degrees below it
  'temperatuur': random => ({
    num1: between(random, 1, 15), num2: between(random, 1, 12), operation: '+', form: pick(random, TEMPERATURE_FORMS)
  })
} as { [id: string]: Maker });

/** A whole number from lo to hi, never nought, below nought as often as above: ±lo to ±hi. */
function eitherSide(random: Random, lo: number, hi: number): number {
  return between(random, lo, hi) * (random() < 0.5 ? -1 : 1);
}

Object.assign(TOPICS, {
  // Klas 1, the start: adding and taking away below nought. −3 + 8, 4 − 9, −5 − 3, −5 − −3;
  // something in it is always below nought, or it would be groep 4's sum
  'negatief-plus-min': random => {
    for (;;) {
      const operation = random() < 0.5 ? '+' : '-';
      const num1 = eitherSide(random, 1, 15);
      const num2 = random() < 0.7 ? between(random, 1, 15) : -between(random, 1, 15);
      const answer = operation === '+' ? num1 + num2 : num1 - num2;
      if ((num1 < 0 || num2 < 0 || answer < 0) && answer !== 0) {
        return { num1, num2, operation, form: 'negatief' };
      }
    }
  },
  // Klas 1, the middle: times and sharing below nought. −4 × 6, −24 : −3; one of them at least below nought
  'negatief-keer-deel': random => {
    const a = eitherSide(random, 2, 12);
    const b = a > 0 ? -between(random, 2, 12) : eitherSide(random, 2, 12);
    return random() < 0.5 ? { num1: a, num2: b, operation: '*', form: 'negatief' } : { num1: a * b, num2: b, operation: '/', form: 'negatief' };
  },
  // bewerkingsvolgorde: × before + and −. 3 + 4 × 5, 50 − 6 × 7, kept as 3 + 20
  'voorrang': random => {
    const form = pick(random, PRECEDENCE_FORMS);
    const product = lastNumberOf(form) * between(random, 2, 9);
    if (random() < 0.5) {
      return { num1: between(random, 2, 30), num2: product, operation: '+', form };
    }
    return { num1: product + between(random, 1, 30), num2: product, operation: '-', form };
  },
  // and the brackets first. (3 + 4) × 5, kept as 7 × 5
  'haakjes': random => {
    const form = pick(random, BRACKET_FORMS);
    return { num1: lastNumberOf(form) + between(random, 2, 9), num2: between(random, 2, 9), operation: '*', form };
  },
  // fractions with different denominators, the answer over the common one. 1/2 + 1/3 = ?/6,
  // kept as 3 + 2 sixths; the answer is a part of a whole, never nothing and never all of it
  'ongelijknamige-breuken': random => {
    for (;;) {
      const form = pick(random, UNLIKE_FRACTION_FORMS);
      const [first, second, common] = denominatorsOf(form);
      // each fraction as it is written, in its simplest form: 1/3, never 2/6
      const num1 = pick(random, numeratorsOf(first)) * common / first;
      const num2 = pick(random, numeratorsOf(second)) * common / second;
      const operation = random() < 0.5 ? '+' : '-';
      const answer = operation === '+' ? num1 + num2 : num1 - num2;
      if (answer > 0 && answer < common) {
        return { num1, num2, operation, form };
      }
    }
  },
  // Klas 1, the end: a fraction times a whole number. ⅔ × 12, kept as 4 × 2
  'breuk-keer-getal': random => {
    const form = pick(random, TIMES_FRACTION_FORMS);
    const parts = lastNumberOf(form);
    return { num1: between(random, 2, 12), num2: pick(random, numeratorsOf(parts, 2)), operation: '*', form };
  },
  // a formula with a value filled in. a = 3 × b + 4, b = 5 → a = ?, kept as 15 + 4
  'formule': random => {
    const form = pick(random, FORMULA_FORMS);
    return { num1: lastNumberOf(form) * between(random, 2, 12), num2: between(random, 1, 20), operation: '+', form };
  },
  // rounding to one decimal. 3,47 ≈ ? op 1 decimaal, kept as 347 ≈ 10 in hundredths;
  // never one that is already a tenth (3,40), which would be no question
  'afronden-decimaal': random => {
    let num1 = between(random, 101, 2999);
    if (num1 % 10 === 0) {
      num1 += between(random, 1, 9);
    }
    return { num1, num2: 10, operation: '≈', form: 'afronden-decimaal' };
  }
} as { [id: string]: Maker });

/** The largest number that taken to this power stays a sum for the head: 15², 6³, 4⁴, 3⁵. */
const POWER_BASES: { [power: number]: number } = { 2: 15, 3: 6, 4: 4, 5: 3 };

Object.assign(TOPICS, {
  // Klas 2, the middle: powers. 2³ = ?, 7² = ?, kept as 4 × 2: the power one lower, times once more
  'machten': random => {
    const form = pick(random, POWER_FORMS);
    const power = lastNumberOf(form);
    const base = between(random, 2, POWER_BASES[power]);
    return { num1: base ** (power - 1), num2: base, operation: '*', form };
  },
  // and square roots of the squares to 15². √144 = ?, kept as 144 : 12
  'wortels': random => {
    const root = between(random, 2, 15);
    return { num1: root * root, num2: root, operation: '/', form: 'wortel' };
  },
  // linear equations, one step and two. x + 7 = 15, 3x + 5 = 20 → x = ?, kept as 15 : 3; x whole and above nought
  'vergelijkingen': random => {
    const form = pick(random, EQUATION_FORMS);
    const times = random() < 0.25 ? 1 : between(random, 2, 9);
    return { num1: times * between(random, 2, 12), num2: times, operation: '/', form };
  },
  // brackets with a value filled in. x = 2: 3(x + 4) = ?, kept as 3 × 6
  'haakjes-invullen': random => {
    const form = pick(random, FILL_IN_FORMS);
    return { num1: between(random, 2, 9), num2: lastNumberOf(form) + between(random, 1, 9), operation: '*', form };
  },
  // Klas 2, the end: a percentage on top or off. €80 + 15% = €?, €80 − 20% = €?, kept as 80 + 12;
  // a price the percentage is a whole number of euros of, under €100: three figures, the sign, the
  // percentage and the box are too wide for one line of a 320px phone
  'procent-erbij-eraf': random => {
    const form = pick(random, PERCENT_CHANGE_FORMS);
    const percent = lastNumberOf(form);
    const step = 100 / gcd(percent, 100);
    const price = step * between(random, Math.ceil(20 / step), Math.floor(99 / step));
    return { num1: price, num2: price * percent / 100, operation: form.startsWith('toename-') ? '+' : '-', form };
  },
  // Pythagoras with a whole answer: a multiple of 3-4-5, 5-12-13, 8-15-17 or 7-24-25. a = 6, b = 8 → c = ?, kept as 100 : 10
  'pythagoras': random => {
    const form = pick(random, PYTHAGORAS_FORMS);
    const long = TRIANGLES[form][2] * (form === 'pythagoras-1' ? between(random, 1, 5) : 1);
    return { num1: long * long, num2: long, operation: '/', form };
  },
  // the area of a triangle: half the base times the height. ½ × 10 × 6 = ?, kept as 5 × 6
  'driehoek': random => ({ num1: between(random, 2, 12), num2: between(random, 2, 15), operation: '*', form: 'driehoek' })
} as { [id: string]: Maker });

/** The largest number below nought that, taken to this power, stays a sum for the head: (−9)², (−5)³, (−3)⁴. */
const NEGATIVE_BASES: { [power: number]: number } = { 2: 9, 3: 5, 4: 3 };

Object.assign(TOPICS, {
  // Klas 3, the middle: equations with brackets. 3(x + 4) = 21 → x = ?, kept as 7 − 4; x whole, above nought
  'haakjes-vergelijking': random => {
    const form = pick(random, BRACKET_EQUATION_FORMS);
    const added = between(random, 1, 9);
    return { num1: between(random, 1, 9) + added, num2: added, operation: '-', form };
  },
  // x on both sides. 5x = 3x + 12 → x = ?, kept as 12 : 2
  'x-beide-kanten': random => {
    const form = pick(random, BOTH_SIDES_FORMS);
    const more = between(random, 1, lastNumberOf(form) - 1);
    return { num1: more * between(random, 2, 9), num2: more, operation: '/', form };
  },
  // powers of numbers below nought, and the square that is not one: (−2)³ = ?, −3² = ?
  'negatieve-machten': random => {
    if (random() < 0.3) {
      const base = between(random, 2, 9);
      return { num1: base, num2: -base, operation: '*', form: 'minkwadraat' };
    }
    const form = pick(random, NEGATIVE_POWER_FORMS);
    const power = lastNumberOf(form);
    const base = -between(random, 2, NEGATIVE_BASES[power]);
    return { num1: base ** (power - 1), num2: base, operation: '*', form };
  },
  // scientific notation read as a number. 3,2 · 10³ = ?, 4 · 10⁻² = ?
  'wetenschappelijk': random => {
    if (random() < 0.5) {
      return { num1: notRound(random, 11, 99), num2: 10 ** between(random, 2, 5), operation: '*', form: 'wetenschap' };
    }
    return { num1: 1000 * between(random, 1, 9), num2: 10 ** between(random, 1, 3), operation: '/', form: 'wetenschap-min' };
  },
  // Klas 3, the end: a growth factor, one step. 200 × 1,05 = ?, kept as 105 × 200 in hundredths; a whole answer
  'groeifactor': random => ({
    num1: pick(random, [102, 103, 104, 105, 110, 115, 120, 125, 95, 90, 80]), num2: 100 * between(random, 1, 10), operation: '*', form: 'groeifactor'
  }),
  // x² = a number, the x above nought. x² = 49 → x = ?, kept as 49 : 7
  'kwadraat-vergelijking': random => {
    const root = between(random, 2, 15);
    return { num1: root * root, num2: root, operation: '/', form: 'kwadraat-vgl' };
  },
  // Klas 4, the middle: a quadratic equation by factorising. x² − 5x + 6 = 0 → de grootste x = ?, kept as 5 − 2
  'ontbinden': random => {
    const smaller = between(random, 1, 8);
    return { num1: smaller + between(random, smaller + 1, 9), num2: smaller, operation: '-', form: 'kwadratisch' };
  },
  // exponential growth over two steps. 100 × 1,1² = ?, kept as 121 × 100 in hundredths
  'groei-twee-stappen': random => ({
    num1: pick(random, [121, 144, 225, 81, 64]), num2: 100 * between(random, 1, 9), operation: '*', form: 'groei-2'
  }),
  // roots made simpler. √50 = ?√2, kept as 10 : 2
  'wortels-vereenvoudigen': random => {
    const under = pick(random, [2, 3, 5]);
    return { num1: between(random, 2, 6) * under, num2: under, operation: '/', form: 'wortel-vereenvoudig' };
  },
  // Klas 4, the end: trigonometry with the ratios that are nice numbers. sin 30° × 10 = ?, a whole answer
  'goniometrie': random => {
    const form = pick(random, TRIG_FORMS);
    const side = TRIG_VALUES[form] === 50 ? 2 * between(random, 1, 10) : between(random, 2, 20);
    return { num1: TRIG_VALUES[form], num2: side, operation: '*', form };
  },
  // a formula rearranged. A = l × b, A = 36, l = 9 → b = ?, kept as 36 : 9
  'formule-herleiden': random => {
    const length = between(random, 2, 12);
    return { num1: length * between(random, 2, 12), num2: length, operation: '/', form: 'herleiden' };
  },
  // percentages over two steps, as one growth factor. +10% → −10% → × ?, kept as 110 × 90
  'procent-stappen': random => ({
    num1: pick(random, [110, 120, 125, 150]), num2: pick(random, [90, 80, 75, 50]), operation: '*', form: 'procent-stappen'
  })
} as { [id: string]: Maker });

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

/** How often a topic comes up in a round: what is new at a moment most, what it builds on less. */
const NEW = 2;
const REVIEW = 1;

/**
 * What a groep is asked at each moment of its school year, and how often.
 * The start of a year is the end of the one before, revisited.
 */
export const CURRICULUM: { [groep: number]: { [moment in Moment]: { [topic: string]: number } } } = {
  3: {
    B: { 'plus-tot-10-klein': NEW, 'min-tot-10-klein': NEW },
    M: {
      'plus-tot-10': NEW, 'min-tot-10': NEW, 'plus-tot-20-zonder': NEW, 'min-tot-20-zonder': NEW,
      'dubbel-tot-10': NEW, 'aanvullen-tot-10': NEW
    },
    E: {
      'plus-tot-20-over': NEW, 'min-tot-20-over': NEW, 'dubbel-tot-20': NEW, 'sprong-van-10': NEW,
      'splitsen-tot-10': NEW, 'dubbel-van-tot-20': NEW, 'helft-van-tot-20': NEW,
      'plus-tot-20-zonder': REVIEW, 'min-tot-20-zonder': REVIEW, 'aanvullen-tot-10': REVIEW, 'klok-uren': NEW
    }
  },
  4: {
    B: {
      'plus-tot-20-over': NEW, 'min-tot-20-over': NEW, 'sprong-van-10': REVIEW, 'dubbel-tot-20': REVIEW,
      'helft-van-tot-20': REVIEW, 'splitsen-tot-10': REVIEW, 'klok-uren': REVIEW
    },
    M: {
      'tientallen': NEW, 'te-e-zonder': NEW, 'te-e-over': NEW, 'te-t': NEW,
      'tafels-1-2-5-10': NEW, 'deeltafels-2-5-10': NEW, 'plus-tot-20-over': REVIEW, 'min-tot-20-over': REVIEW,
      'klok-kwartier': NEW
    },
    E: {
      'te-te-zonder': NEW, 'te-te-over': NEW, 'tafels-1-5-10': NEW, 'deeltafels-1-5-10': NEW,
      'honderdtallen': NEW, 'dubbel-van-tot-100': NEW, 'helft-van-tot-100': NEW, 'klok-5-minuten': NEW,
      'te-e-over': REVIEW, 'te-t': REVIEW, 'klok-kwartier': REVIEW
    }
  },
  5: {
    B: {
      'tafels-1-5-10': NEW, 'deeltafels-1-5-10': NEW, 'te-te-over': NEW,
      'honderdtallen': REVIEW, 'dubbel-van-tot-100': REVIEW, 'helft-van-tot-100': REVIEW, 'klok-5-minuten': REVIEW
    },
    M: {
      'tafels-6-7-8-9': NEW, 'deeltafels-6-7-8-9': NEW, 'tot-1000-zonder': NEW, 'keer-tiental': NEW,
      'deel-van': NEW, 'klok-minuten': NEW, 'tafels-1-5-10': REVIEW, 'helft-van-tot-100': REVIEW
    },
    E: {
      'tot-1000-over': NEW, 'te-keer-e': NEW, 'delen-met-rest': NEW, 'maten': NEW,
      'tafels-6-7-8-9': REVIEW, 'deeltafels-6-7-8-9': REVIEW, 'tot-1000-zonder': REVIEW, 'deel-van': REVIEW,
      'klok-minuten': REVIEW
    }
  },
  6: {
    B: {
      'tot-1000-over': NEW, 'te-keer-e': NEW, 'delen-met-rest': NEW,
      'maten': REVIEW, 'tafels-6-7-8-9': REVIEW, 'deeltafels-6-7-8-9': REVIEW
    },
    M: {
      'tot-10000': NEW, 'keer-groter': NEW, 'delen-groter': NEW, 'breuk-van': NEW, 'gelijke-breuken': NEW,
      'tot-1000-over': REVIEW, 'te-keer-e': REVIEW, 'delen-met-rest': REVIEW
    },
    E: {
      'te-keer-te': NEW, 'afronden': NEW, 'oppervlakte': NEW, 'tienden': NEW,
      'tot-10000': REVIEW, 'keer-groter': REVIEW, 'delen-groter': REVIEW, 'breuk-van': REVIEW, 'gelijke-breuken': REVIEW
    }
  },
  7: {
    B: {
      'te-keer-te': NEW, 'afronden': NEW, 'tienden': NEW,
      'oppervlakte': REVIEW, 'breuk-van': REVIEW, 'tot-10000': REVIEW
    },
    M: {
      'afronden-duizendtallen': NEW, 'cijferend-keer': NEW, 'staartdeling': NEW, 'procenten': NEW, 'komma-maal-10': NEW,
      'gelijknamige-breuken': NEW, 'breuk-naar-komma': NEW,
      'te-keer-te': REVIEW, 'tienden': REVIEW
    },
    E: {
      'kommagetal-keer': NEW, 'metriek': NEW, 'verhoudingen': NEW, 'korting': NEW,
      'afronden-duizendtallen': REVIEW, 'cijferend-keer': REVIEW, 'staartdeling': REVIEW, 'procenten': REVIEW, 'komma-maal-10': REVIEW,
      'gelijknamige-breuken': REVIEW, 'breuk-naar-komma': REVIEW
    }
  },
  8: {
    B: {
      'kommagetal-keer': NEW, 'metriek': NEW, 'verhoudingen': NEW, 'korting': NEW,
      'procenten': REVIEW, 'staartdeling': REVIEW, 'breuk-naar-komma': REVIEW
    },
    M: {
      'procent-van': NEW, 'welk-procent': NEW, 'breuk-van-groot': NEW, 'schaal': NEW, 'gemiddelde': NEW,
      'korting': REVIEW, 'verhoudingen': REVIEW, 'metriek': REVIEW
    },
    E: {
      'inhoud': NEW, 'liters': NEW, 'tijdsduur': NEW, 'snelheid': NEW, 'temperatuur': NEW,
      'procent-van': REVIEW, 'welk-procent': REVIEW, 'breuk-van-groot': REVIEW, 'schaal': REVIEW, 'gemiddelde': REVIEW
    }
  },
  // Klas 1 (grade 7), HAVO/VWO (docs/CURRICULUM-NL.md, "Klas 1–4")
  9: {
    B: {
      'negatief-plus-min': NEW,
      'procent-van': REVIEW, 'tijdsduur': REVIEW, 'temperatuur': REVIEW, 'inhoud': REVIEW, 'snelheid': REVIEW
    },
    M: {
      'negatief-keer-deel': NEW, 'voorrang': NEW, 'haakjes': NEW, 'ongelijknamige-breuken': NEW,
      'negatief-plus-min': REVIEW, 'procent-van': REVIEW
    },
    E: {
      'breuk-keer-getal': NEW, 'formule': NEW, 'afronden-decimaal': NEW,
      'negatief-keer-deel': REVIEW, 'voorrang': REVIEW, 'haakjes': REVIEW, 'ongelijknamige-breuken': REVIEW
    }
  },
  // Klas 2 (grade 8), HAVO/VWO
  10: {
    B: {
      'breuk-keer-getal': REVIEW, 'formule': REVIEW, 'afronden-decimaal': REVIEW, 'negatief-keer-deel': REVIEW, 'voorrang': REVIEW
    },
    M: {
      'machten': NEW, 'wortels': NEW, 'vergelijkingen': NEW, 'haakjes-invullen': NEW,
      'formule': REVIEW, 'negatief-plus-min': REVIEW
    },
    E: {
      'procent-erbij-eraf': NEW, 'pythagoras': NEW, 'driehoek': NEW, 'inhoud': REVIEW,
      'machten': REVIEW, 'wortels': REVIEW, 'vergelijkingen': REVIEW, 'haakjes-invullen': REVIEW
    }
  },
  // Klas 3 (grade 9), HAVO/VWO
  11: {
    B: { 'procent-erbij-eraf': REVIEW, 'pythagoras': REVIEW, 'driehoek': REVIEW, 'vergelijkingen': REVIEW, 'machten': REVIEW },
    M: {
      'haakjes-vergelijking': NEW, 'x-beide-kanten': NEW, 'negatieve-machten': NEW, 'wetenschappelijk': NEW,
      'vergelijkingen': REVIEW
    },
    E: {
      'groeifactor': NEW, 'kwadraat-vergelijking': NEW,
      'haakjes-vergelijking': REVIEW, 'x-beide-kanten': REVIEW, 'negatieve-machten': REVIEW, 'wetenschappelijk': REVIEW, 'pythagoras': REVIEW
    }
  },
  // Klas 4 (grade 10), HAVO/VWO
  12: {
    B: { 'groeifactor': REVIEW, 'kwadraat-vergelijking': REVIEW, 'haakjes-vergelijking': REVIEW, 'x-beide-kanten': REVIEW },
    M: { 'ontbinden': NEW, 'groei-twee-stappen': NEW, 'wortels-vereenvoudigen': NEW, 'groeifactor': REVIEW },
    E: {
      'goniometrie': NEW, 'formule-herleiden': NEW, 'procent-stappen': NEW,
      'ontbinden': REVIEW, 'groei-twee-stappen': REVIEW, 'wortels-vereenvoudigen': REVIEW
    }
  }
};

/** The moment in the school year a difficulty stands for: the start, the middle, the end. */
export function momentFor(difficulty: string): Moment {
  return difficulty === 'easy' ? 'B' : difficulty === 'hard' ? 'E' : 'M';
}

/**
 * A sum for this groep at this moment, or null for a groep or a moment not
 * built yet (the old questions stay for those). Each topic comes up as often as its
 * weight says.
 */
export function schoolSum(groep: number, moment: Moment, random: Random = Math.random): SchoolSum | null {
  const topics = CURRICULUM[groep] && CURRICULUM[groep][moment];
  if (!topics || !Object.keys(topics).length) {
    return null;
  }
  const ids = Object.keys(topics);
  let left = random() * ids.reduce((sum, id) => sum + topics[id], 0);
  const topic = ids.find(id => (left -= topics[id]) < 0) || ids[ids.length - 1];
  return { ...TOPICS[topic](random), topic };
}
