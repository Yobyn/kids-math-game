/**
 * The sums a Dutch school sets, by groep and by moment in the school year
 * (docs/CURRICULUM-NL.md). Yobyn, 2026-10-06: "they need what is actually
 * asked in school". Only the question screen imports this, so it is fetched
 * with the round, not in the first load.
 *
 * So far groep 3 and 4, in the forms that are plain sums: a number, a sign,
 * a number. The written forms (7 + ? = 10, dubbel 7) and groep 5 to 8 follow
 * the build order in the doc.
 */

export type Moment = 'B' | 'M' | 'E';
export type Operation = '+' | '-' | '*' | '/';

/** A sum as the screen shows it: num1, the sign, num2, and the answer box. */
export interface SchoolSum {
  num1: number;
  num2: number;
  operation: Operation;
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
      'dubbel-tot-10': NEW
    },
    E: {
      'plus-tot-20-over': NEW, 'min-tot-20-over': NEW, 'dubbel-tot-20': NEW, 'sprong-van-10': NEW,
      'plus-tot-20-zonder': REVIEW, 'min-tot-20-zonder': REVIEW
    }
  },
  4: {
    B: {
      'plus-tot-20-over': NEW, 'min-tot-20-over': NEW, 'sprong-van-10': REVIEW, 'dubbel-tot-20': REVIEW
    },
    M: {
      'tientallen': NEW, 'te-e-zonder': NEW, 'te-e-over': NEW, 'te-t': NEW,
      'tafels-1-2-5-10': NEW, 'deeltafels-2-5-10': NEW, 'plus-tot-20-over': REVIEW, 'min-tot-20-over': REVIEW
    },
    E: {
      'te-te-zonder': NEW, 'te-te-over': NEW, 'tafels-1-5-10': NEW, 'deeltafels-1-5-10': NEW,
      'honderdtallen': NEW, 'te-e-over': REVIEW, 'te-t': REVIEW
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
