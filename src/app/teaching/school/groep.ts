/**
 * The sums a Dutch school sets, by groep and by moment in the school year
 * (docs/CURRICULUM-NL.md). Yobyn, 2026-10-06: "they need what is actually
 * asked in school". Only the question screen imports this, so it is fetched
 * with the round, not in the first load.
 *
 * So far groep 3 and 4: the plain sums (a number, a sign, a number) and the
 * written forms of the workbook (7 + ? = 10, 8 = 5 + ?, dubbel 7, de helft
 * van 16); and groep 5 (all the tables, to 1000, 4 × 30, 4 × 23, ¼ van
 * 20, 23 : 4 = 5 rest ?, 3 m = ? cm). The rest follows the build order in
 * the doc.
 */

import { MEASURE_FORMS, SumForm } from '../../question/sum-form';
import { MEASURES } from './written-form';

export type Moment = 'B' | 'M' | 'E';
/** % is what is left over: 23 % 4 is the 3 in 23 : 4 = 5 rest 3 */
export type Operation = '+' | '-' | '*' | '/' | '%';

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

/** The digits of a number below 1000: hundreds, tens, ones. */
const digits = (n: number) => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];

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
      'plus-tot-20-zonder': REVIEW, 'min-tot-20-zonder': REVIEW, 'aanvullen-tot-10': REVIEW
    }
  },
  4: {
    B: {
      'plus-tot-20-over': NEW, 'min-tot-20-over': NEW, 'sprong-van-10': REVIEW, 'dubbel-tot-20': REVIEW,
      'helft-van-tot-20': REVIEW, 'splitsen-tot-10': REVIEW
    },
    M: {
      'tientallen': NEW, 'te-e-zonder': NEW, 'te-e-over': NEW, 'te-t': NEW,
      'tafels-1-2-5-10': NEW, 'deeltafels-2-5-10': NEW, 'plus-tot-20-over': REVIEW, 'min-tot-20-over': REVIEW
    },
    E: {
      'te-te-zonder': NEW, 'te-te-over': NEW, 'tafels-1-5-10': NEW, 'deeltafels-1-5-10': NEW,
      'honderdtallen': NEW, 'dubbel-van-tot-100': NEW, 'helft-van-tot-100': NEW,
      'te-e-over': REVIEW, 'te-t': REVIEW
    }
  },
  5: {
    B: {
      'tafels-1-5-10': NEW, 'deeltafels-1-5-10': NEW, 'te-te-over': NEW,
      'honderdtallen': REVIEW, 'dubbel-van-tot-100': REVIEW, 'helft-van-tot-100': REVIEW
    },
    M: {
      'tafels-6-7-8-9': NEW, 'deeltafels-6-7-8-9': NEW, 'tot-1000-zonder': NEW, 'keer-tiental': NEW,
      'deel-van': NEW, 'tafels-1-5-10': REVIEW, 'helft-van-tot-100': REVIEW
    },
    E: {
      'tot-1000-over': NEW, 'te-keer-e': NEW, 'delen-met-rest': NEW, 'maten': NEW,
      'tafels-6-7-8-9': REVIEW, 'deeltafels-6-7-8-9': REVIEW, 'tot-1000-zonder': REVIEW, 'deel-van': REVIEW
    }
  }
};

/** The moment in the school year a difficulty stands for: the start, the middle, the end. */
export function momentFor(difficulty: string): Moment {
  return difficulty === 'easy' ? 'B' : difficulty === 'hard' ? 'E' : 'M';
}

/**
 * A sum for this groep at this moment, or null for a groep not built yet
 * (the old questions stay for those). Each topic comes up as often as its
 * weight says.
 */
export function schoolSum(groep: number, moment: Moment, random: Random = Math.random): SchoolSum | null {
  const topics = CURRICULUM[groep] && CURRICULUM[groep][moment];
  if (!topics) {
    return null;
  }
  const ids = Object.keys(topics);
  let left = random() * ids.reduce((sum, id) => sum + topics[id], 0);
  const topic = ids.find(id => (left -= topics[id]) < 0) || ids[ids.length - 1];
  return { ...TOPICS[topic](random), topic };
}
