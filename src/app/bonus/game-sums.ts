/**
 * The sums the bonus games play with (Yobyn, 2026-11-10: "bring maths into
 * the games ... make it fun and engaging"). A game is quick, so these are the
 * facts a child is meant to know by heart for their year (automatiseren):
 * the bonds to 10 and 20, the tables, and for the klassen the sums below
 * nought, squares and roots. Never a sum to work out on paper: its answer
 * fits on a balloon, a star or a tile, three figures at the most.
 *
 * Which sums follows the year the round was played in (docs/CURRICULUM-NL.md)
 * and its climb: the warm-up, the start of the year, plays last year's
 * facts, "what you already know".
 *
 * Free of the DOM and of Angular, so it can be tested straight.
 */

export interface GameSum {
  /** As it is written above the board: "7 + 5", "6 × 7", "−3 + 8", "√49". */
  text: string;
  answer: number;
}

/** Who is playing: the game's grade (1 is groep 3, 7 is klas 1) and the round's climb. */
export interface GameLevel {
  grade: number;
  /** True for the warm-up climb: the start of the year, so last year's facts. */
  warmUp?: boolean;
  /** How sharing is written where the child is at school: ":" in Dutch and Spanish, "÷" in English. */
  divide?: string;
}

type Random = () => number;
type Maker = (random: Random, divide: string) => GameSum;

/** A whole number from low to high, both included. */
function between(random: Random, low: number, high: number): number {
  return low + Math.min(high - low, Math.floor(random() * (high - low + 1)));
}

function pick<T>(random: Random, items: T[]): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

/** A number as the card writes it: a true minus for one below nought. */
export function written(value: number): string {
  return value < 0 ? `−${-value}` : String(value);
}

const plus = (a: number, b: number): GameSum => ({ text: `${written(a)} + ${written(b)}`, answer: a + b });
const minus = (a: number, b: number): GameSum => ({ text: `${written(a)} − ${written(b)}`, answer: a - b });
const times = (a: number, b: number): GameSum => ({ text: `${written(a)} × ${written(b)}`, answer: a * b });
const shared = (a: number, b: number, divide: string): GameSum => ({ text: `${a} ${divide} ${b}`, answer: a / b });

/** n × table and its sharing sum, n from 2 to 10: a table fact with a 1 in it is no sum for a game. */
function table(tables: number[]): Maker[] {
  return [
    random => times(between(random, 2, 10), pick(random, tables)),
    (random, divide) => {
      const by = pick(random, tables);
      return shared(by * between(random, 2, 10), by, divide);
    }
  ];
}

/** Adding to 10, and taking away within 10: groep 3. */
const TO_TEN: Maker[] = [
  random => {
    const a = between(random, 1, 8);
    return plus(a, between(random, 1, 10 - a));
  },
  random => {
    const a = between(random, 3, 10);
    return minus(a, between(random, 1, a - 1));
  }
];

/** Through the ten within 20, and doubles: groep 4. */
const TO_TWENTY: Maker[] = [
  random => {
    const a = between(random, 4, 9);
    return plus(a, between(random, 11 - a, 9));
  },
  random => {
    const a = between(random, 11, 18);
    return minus(a, between(random, a - 9, 9));
  },
  random => {
    const a = between(random, 6, 10);
    return plus(a, a);
  }
];

/** Whole tens: 40 + 30, 80 − 20. */
const TENS: Maker[] = [
  random => {
    const a = between(random, 1, 8);
    return plus(a * 10, between(random, 1, 9 - a) * 10);
  },
  random => {
    const a = between(random, 3, 9);
    return minus(a * 10, between(random, 1, a - 1) * 10);
  }
];

/** Below nought: klas 1 and 2. */
const NEGATIVE: Maker[] = [
  random => {
    const a = between(random, 1, 9);
    return minus(a, between(random, a + 1, a + 9));
  },
  random => plus(-between(random, 2, 12), between(random, 1, 12)),
  random => minus(-between(random, 1, 9), between(random, 1, 9)),
  random => times(-between(random, 2, 9), between(random, 2, 9)),
  random => times(between(random, 2, 9), -between(random, 2, 9))
];

const SQUARES: Maker[] = [
  random => {
    const a = between(random, 2, 12);
    return { text: `${a}²`, answer: a * a };
  }
];

/** Roots, minus times minus, and small powers: klas 3 and 4. */
const ROOTS: Maker[] = [
  random => {
    const a = between(random, 2, 15);
    return { text: `√${a * a}`, answer: a };
  },
  random => times(-between(random, 2, 9), -between(random, 2, 9)),
  random => {
    const [base, power, sign] = pick(random, [[2, 3, '³'], [2, 4, '⁴'], [2, 5, '⁵'], [3, 3, '³'], [4, 3, '³'], [5, 3, '³']] as [number, number, string][]);
    return { text: `${base}${sign}`, answer: Math.pow(base, power) };
  },
  random => {
    const a = between(random, 11, 15);
    return { text: `${a}²`, answer: a * a };
  }
];

/**
 * The facts of each year, by the game's grade: 1 is groep 3, 6 is groep 8,
 * 7 to 10 are klas 1 to 4. Each is what that year is taught to know by heart.
 */
const BANDS: { [grade: number]: Maker[] } = {
  1: TO_TEN,
  2: [...TO_TWENTY, ...table([2, 5, 10])],
  3: [...table([2, 3, 4, 5, 10]), ...table([6, 7, 8, 9]), ...TENS],
  4: [...table([2, 3, 4, 5]), ...table([6, 7, 8, 9]), ...table([6, 7, 8, 9])],
  5: [...table([6, 7, 8, 9]), ...table([3, 4, 6, 7, 8, 9]), random => times(between(random, 2, 9), between(random, 2, 9) * 10)],
  6: [...table([6, 7, 8, 9, 11, 12]), ...table([6, 7, 8, 9, 11, 12]), random => times(between(random, 2, 9), between(random, 2, 9) * 10)],
  7: [...NEGATIVE, ...SQUARES],
  8: [...NEGATIVE, ...SQUARES, ...table([7, 8, 9, 12])],
  9: [...ROOTS, ...NEGATIVE.slice(3)],
  10: ROOTS
};

/** The year whose facts a level plays: its own, or the one before on the warm-up climb. */
export function bandOf(level: GameLevel): number {
  const grade = Math.min(10, Math.max(1, Math.round(Number(level.grade)) || 1));
  return level.warmUp ? Math.max(1, grade - 1) : grade;
}

/** A sum for this level, never the one just asked. */
export function gameSum(level: GameLevel, random: Random = Math.random, last?: GameSum): GameSum {
  const makers = BANDS[bandOf(level)];
  const divide = level.divide || ':';
  let sum = pick(random, makers)(random, divide);
  for (let tries = 0; last && tries < 8 && sum.text === last.text; tries++) {
    sum = pick(random, makers)(random, divide);
  }
  return sum;
}

/**
 * Wrong answers to show beside the right one: near it, and the slips a child
 * makes (one off, a ten off, the sign the wrong way round, one group too
 * many). All different, none the answer, and none below nought unless the
 * answer is, or the sum has a number below nought in it.
 */
export function wrongAnswers(sum: GameSum, count: number, random: Random = Math.random): number[] {
  const { answer } = sum;
  const below = answer < 0 || sum.text.indexOf('−') === 0 || /[+×−] −/.test(sum.text);
  const step = Math.abs(answer) >= 20 ? pick(random, [2, 5, 10]) : 2;
  const near = [answer + 1, answer - 1, answer + step, answer - step];
  if (Math.abs(answer) >= 20) {
    near.push(answer + 10, answer - 10);
  }
  if (below && answer !== 0) {
    near.unshift(-answer);
  }
  const numbers = (sum.text.match(/\d+/g) || []).map(Number);
  if (sum.text.indexOf('×') > 0 && numbers.length === 2) {
    const sign = answer < 0 ? -1 : 1;
    near.push(sign * (numbers[0] + 1) * numbers[1], sign * numbers[0] * (numbers[1] - 1));
  }
  const pool = near.filter((value, i) => value !== answer && (below || value >= 0) && near.indexOf(value) === i);
  // The nearest slips first, a random one of the rest after, so the answer is not always the middle one
  const chosen: number[] = [];
  while (chosen.length < count && pool.length) {
    const at = chosen.length === 0 && below && pool[0] === -answer ? 0 : Math.min(pool.length - 1, Math.floor(random() * Math.min(pool.length, 4)));
    chosen.push(pool.splice(at, 1)[0]);
  }
  for (let add = 3; chosen.length < count; add++) {
    if (chosen.indexOf(answer + add) < 0) {
      chosen.push(answer + add);
    }
  }
  return chosen;
}

/** The answer and its wrong ones, shuffled: what a game shows to choose from. */
export function choices(sum: GameSum, count: number, random: Random = Math.random): number[] {
  const all = [sum.answer, ...wrongAnswers(sum, count - 1, random)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
