/**
 * Money as a taught strand rather than a themed sum, kept free of the DOM so
 * every band, every generated question and every worked line can be checked
 * directly.
 *
 * WHAT WAS HERE BEFORE was one shape of question per band in whole euros:
 * add two prices from grade 2, work out change from grade 4, and nothing
 * else, ever. No coins, no cents, no decimals, and no worked line at all.
 *
 * WHAT THE PROGRESSION ACTUALLY IS (national curriculum programmes of study
 * for mathematics, and the teaching-for-mastery material built on them — a
 * curriculum document, not a study):
 *   - Years 1-2: recognise the coins, combine coins to make a given amount,
 *     solve money problems practically. Pounds and pence are kept SEPARATE,
 *     deliberately without a decimal point.
 *   - Year 3: fluent in the value of coins; add and subtract amounts
 *     including mixed units; give change using manageable amounts; still
 *     recorded as £ and p separately, and the pence part never reaches 100.
 *   - Year 4: the decimal £.p form is introduced formally.
 * Practitioner guidance on counting coins adds the prerequisite: counting a
 * mixed pile rests on SKIP COUNTING, so a child meets one denomination at a
 * time before two, and two before a handful.
 *
 * So the bands below start at grade 1 (the old code started at 2), open with
 * a single denomination to count, add a second, then mixed units, and only
 * reach decimal notation at grade 4 — where the curriculum puts it.
 *
 * THE ONE RULE THAT SHAPES EVERYTHING ELSE: below the decimal band, every
 * answer must be a whole number in ONE unit — so many cents, or so many
 * euros, never "3 euros 40". That is not a workaround for the keypad; it is
 * the curriculum's own separation rule, and questions are built to satisfy
 * it rather than generated and then rejected.
 */

/** The euro pieces, in cents. Notes appear only in the upper bands. */
export const MONEY_PIECES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

/**
 * How a piece is drawn. The two-toned coins are drawn the way round they
 * really are: a €1 has a silver centre inside a gold ring, and a €2 is the
 * other way about. It is a small truth, but a child who has handled the
 * coins would notice it being wrong.
 */
export type PieceKind = 'copper' | 'gold' | 'silverCentre' | 'goldCentre' | 'note';

export function pieceKind(cents: number): PieceKind {
  if (cents >= 500) {
    return 'note';
  }
  if (cents >= 200) {
    return 'goldCentre';
  }
  if (cents >= 100) {
    return 'silverCentre';
  }
  return cents >= 10 ? 'gold' : 'copper';
}

/** What the child types: which number, read how. */
export type MoneyUnit = 'cents' | 'euros' | 'decimal' | 'count';

export type MoneyShape = 'count' | 'make' | 'total' | 'change';

export interface MoneyBand {
  shapes: MoneyShape[];
  /** Denominations this band may put on the screen. */
  pieces: number[];
  /** How many DIFFERENT denominations a pile may hold. One, then two, then more. */
  kinds: number;
  /** The largest amount this band asks about, in cents. */
  maxCents: number;
  /** True once the child records money with a decimal point (grade 4). */
  decimal: boolean;
}

const BANDS: { upTo: number; band: MoneyBand }[] = [
  // Year 1: one coin at a time, counted by skip counting. Nothing to add up
  // from two different piles yet, and nothing over 20c.
  { upTo: 1, band: { shapes: ['count'], pieces: [1, 2, 5, 10], kinds: 1, maxCents: 20, decimal: false } },
  // Year 2: a second denomination, and making a given amount from one coin.
  { upTo: 2, band: { shapes: ['count', 'make'], pieces: [1, 2, 5, 10, 20, 50], kinds: 2, maxCents: 100, decimal: false } },
  // Year 3: mixed units, totals and change — still recorded separately.
  { upTo: 3, band: { shapes: ['count', 'make', 'total', 'change'], pieces: [1, 2, 5, 10, 20, 50, 100, 200], kinds: 3, maxCents: 500, decimal: false } },
  // Year 4 onwards: the decimal form, and notes to pay with.
  { upTo: 6, band: { shapes: ['count', 'make', 'total', 'change'], pieces: [1, 2, 5, 10, 20, 50, 100, 200, 500], kinds: 3, maxCents: 1000, decimal: true } },
  { upTo: 10, band: { shapes: ['count', 'make', 'total', 'change'], pieces: [5, 10, 20, 50, 100, 200, 500, 1000], kinds: 3, maxCents: 2000, decimal: true } }
];

/** The band a grade plays at. Every grade from 1 has money now. */
export function bandFor(grade: number): MoneyBand {
  const found = BANDS.find(entry => grade <= entry.upTo);
  return (found || BANDS[BANDS.length - 1]).band;
}

export interface MoneyWords {
  /** Between the euros and the cents where they are written separately. */
  and: string;
}

const DEFAULT_WORDS: MoneyWords = { and: 'and' };

/**
 * An amount as a child at this band would write it: `40c`, `€3`, `€3 and 40c`
 * below the decimal band, `€3.40` at it and above.
 */
export function formatCents(cents: number, decimal = false, words: MoneyWords = DEFAULT_WORDS): string {
  const whole = Math.floor(Math.abs(cents) / 100);
  const part = Math.abs(cents) % 100;
  const sign = cents < 0 ? '-' : '';

  if (!whole) {
    return `${sign}${part}c`;
  }
  if (!part) {
    return `${sign}€${whole}`;
  }
  if (decimal) {
    return `${sign}€${whole}.${String(part).padStart(2, '0')}`;
  }
  return `${sign}€${whole} ${words.and} ${part}c`;
}

/**
 * How a whole-number answer of this size is read. An amount with both euros
 * and cents in it can only be typed where the decimal point exists.
 */
export function unitFor(cents: number, band: MoneyBand): MoneyUnit | null {
  if (cents < 100) {
    return 'cents';
  }
  if (cents % 100 === 0) {
    return 'euros';
  }
  return band.decimal ? 'decimal' : null;
}

/** The number a child types for this amount, in the unit above. */
export function typedValue(cents: number, unit: MoneyUnit): number {
  if (unit === 'euros') {
    return cents / 100;
  }
  if (unit === 'decimal') {
    return Math.round(cents) / 100;
  }
  return cents;
}

export interface MoneyQuestion {
  shape: MoneyShape;
  /** The translation key for the wording. */
  prompt: string;
  /** Already-formatted values to substitute into it. */
  values: { [name: string]: string };
  /** Pieces to draw, largest first. Empty for the shapes that show none. */
  pile: number[];
  /** What the child types. */
  answer: number;
  /** How to read that number — what goes beside the answer box. */
  unit: MoneyUnit;
  /** The true amount, for shapes that are about an amount. */
  answerCents: number;
  /** One line of method, or '' where there is no step worth showing. */
  worked: string;
  /** The answer written the way this band writes it, for giving it away. */
  answerText: string;
  /**
   * The question in one line, for the grown-ups' screen. Already written in
   * the child's own language, because nothing downstream of here can format
   * an amount without knowing which band it came from.
   */
  summary: string;
}

/** Written between the halves of a worked step, as in worked-step.ts. */
const THEN = ' → ';

type Random = () => number;

function pick<T>(items: T[], random: Random): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function between(low: number, high: number, random: Random): number {
  return low + Math.floor(random() * (high - low + 1));
}

/**
 * The pieces below a euro, and the whole-euro ones, kept apart: a pile drawn
 * from one of these alone always totals something a child can write in a
 * single unit, which is what the band below grade 4 requires.
 */
function tierPieces(band: MoneyBand, wholeEuros: boolean): number[] {
  return band.pieces.filter(piece => (piece >= 100) === wholeEuros);
}

/**
 * How much money is this? A pile of `kinds` denominations, drawn from one
 * tier so the total reads in one unit, unless the band writes decimals — in
 * which case the tiers may mix and the total may need a point.
 */
function countQuestion(band: MoneyBand, random: Random, words: MoneyWords): MoneyQuestion | null {
  const mixTiers = band.decimal && random() < 0.5;
  const wholeEuros = !mixTiers && tierPieces(band, true).length > 0 && random() < 0.35;
  const available = mixTiers ? band.pieces : tierPieces(band, wholeEuros);
  if (!available.length) {
    return null;
  }

  const kinds = Math.min(band.kinds, available.length, between(1, band.kinds, random));
  const chosen: number[] = [];
  const pool = available.slice();
  for (let i = 0; i < kinds && pool.length; i++) {
    const piece = pick(pool, random);
    chosen.push(piece);
    pool.splice(pool.indexOf(piece), 1);
  }

  const pile: number[] = [];
  let total = 0;
  chosen.forEach(piece => {
    const most = Math.min(4, Math.floor((band.maxCents - total) / piece));
    const count = Math.max(1, between(1, Math.max(1, most), random));
    for (let i = 0; i < count && total + piece <= band.maxCents; i++) {
      pile.push(piece);
      total += piece;
    }
  });

  if (pile.length < 2 || !total) {
    return null;
  }

  const unit = unitFor(total, band);
  if (!unit) {
    return null;
  }

  pile.sort((a, b) => b - a);
  return {
    shape: 'count',
    prompt: 'money-count',
    values: {},
    pile,
    answer: typedValue(total, unit),
    unit,
    answerCents: total,
    worked: runningTotal(pile, band, words),
    answerText: formatCents(total, band.decimal, words),
    summary: pile.map(piece => formatCents(piece, band.decimal, words)).join(' + ')
  };
}

/**
 * How many 20c coins make €1? The shape the curriculum calls combining coins
 * to make a given amount, and the one that makes skip counting pay.
 */
function makeQuestion(band: MoneyBand, random: Random, words: MoneyWords): MoneyQuestion | null {
  const usable = band.pieces.filter(piece => piece <= 200);
  if (!usable.length) {
    return null;
  }
  const piece = pick(usable, random);
  const most = Math.min(10, Math.floor(band.maxCents / piece));
  if (most < 2) {
    return null;
  }
  const count = between(2, most, random);
  const target = piece * count;
  if (!unitFor(target, band)) {
    return null;
  }

  return {
    shape: 'make',
    prompt: 'money-make',
    values: {
      coin: formatCents(piece, band.decimal, words),
      target: formatCents(target, band.decimal, words)
    },
    pile: [],
    answer: count,
    unit: 'count',
    answerCents: target,
    worked: `${formatCents(piece, band.decimal, words)} × ${count} = ${formatCents(target, band.decimal, words)}`,
    answerText: String(count),
    summary: `${formatCents(target, band.decimal, words)} ← ${formatCents(piece, band.decimal, words)}`
  };
}

/** Two prices added. */
function totalQuestion(band: MoneyBand, random: Random, words: MoneyWords): MoneyQuestion | null {
  const wholeEuros = tierPieces(band, true).length > 0 && (!band.decimal || random() < 0.5);
  const step = wholeEuros ? 100 : 5;
  const cap = Math.min(band.maxCents, wholeEuros ? band.maxCents : 95);
  const first = between(1, Math.max(1, Math.floor(cap / step) - 1), random) * step;
  const second = between(1, Math.max(1, Math.floor((band.maxCents - first) / step)), random) * step;
  const total = first + second;

  const unit = unitFor(total, band);
  if (!unit || !first || !second) {
    return null;
  }

  return {
    shape: 'total',
    prompt: 'money-total',
    values: {
      first: formatCents(first, band.decimal, words),
      second: formatCents(second, band.decimal, words)
    },
    pile: [],
    answer: typedValue(total, unit),
    unit,
    answerCents: total,
    worked: bridgeUp(first, second, band, words),
    answerText: formatCents(total, band.decimal, words),
    summary: `${formatCents(first, band.decimal, words)} + ${formatCents(second, band.decimal, words)}`
  };
}

/**
 * Change, worked the way it is taught: counted UP from the price to what was
 * handed over, rather than subtracted.
 */
function changeQuestion(band: MoneyBand, random: Random, words: MoneyWords): MoneyQuestion | null {
  const step = band.decimal ? 5 : 5;
  const price = between(1, Math.max(1, Math.floor(Math.min(band.maxCents, 500) / step) - 1), random) * step;
  const paidFloor = Math.ceil((price + 1) / 100) * 100;
  const notes = [paidFloor, paidFloor + 100, 500, 1000].filter(
    value => value > price && value <= Math.max(band.maxCents, 1000)
  );
  if (!notes.length) {
    return null;
  }
  const paid = pick(notes, random);
  const change = paid - price;

  const unit = unitFor(change, band);
  if (!unit || !change) {
    return null;
  }

  return {
    shape: 'change',
    prompt: 'money-change',
    values: {
      price: formatCents(price, band.decimal, words),
      paid: formatCents(paid, band.decimal, words)
    },
    pile: [],
    answer: typedValue(change, unit),
    unit,
    answerCents: change,
    worked: countUp(price, paid, band, words),
    answerText: formatCents(change, band.decimal, words),
    summary: `${formatCents(paid, band.decimal, words)} - ${formatCents(price, band.decimal, words)}`
  };
}

/**
 * The pile added up one piece at a time, which is how a child counts it.
 * Two pieces is the question restated, so it gets nothing.
 */
function runningTotal(pile: number[], band: MoneyBand, words: MoneyWords): string {
  if (pile.length < 3) {
    return '';
  }
  let total = pile[0] + pile[1];
  let line = `${formatCents(pile[0], band.decimal, words)} + ${formatCents(pile[1], band.decimal, words)}`
    + ` = ${formatCents(total, band.decimal, words)}`;
  // Two steps is a method; six is a wall of text
  for (let i = 2; i < Math.min(pile.length, 4); i++) {
    const next = total + pile[i];
    line += `${THEN}${formatCents(total, band.decimal, words)} + ${formatCents(pile[i], band.decimal, words)}`
      + ` = ${formatCents(next, band.decimal, words)}`;
    total = next;
  }
  return total === pile.reduce((sum, piece) => sum + piece, 0) ? line : '';
}

/** A sum that crosses a whole euro, bridged at the euro. */
function bridgeUp(first: number, second: number, band: MoneyBand, words: MoneyWords): string {
  const total = first + second;
  const toEuro = 100 - (first % 100);
  if (first % 100 === 0 || toEuro >= second || total < 100) {
    return '';
  }
  const atEuro = first + toEuro;
  const rest = second - toEuro;
  return `${formatCents(first, band.decimal, words)} + ${formatCents(toEuro, band.decimal, words)}`
    + ` = ${formatCents(atEuro, band.decimal, words)}`
    + `${THEN}${formatCents(atEuro, band.decimal, words)} + ${formatCents(rest, band.decimal, words)}`
    + ` = ${formatCents(total, band.decimal, words)}`;
}

/** Change counted up: to the next whole euro first, then in euros. */
function countUp(price: number, paid: number, band: MoneyBand, words: MoneyWords): string {
  const toEuro = (100 - (price % 100)) % 100;
  if (!toEuro || price + toEuro >= paid) {
    return '';
  }
  const atEuro = price + toEuro;
  const rest = paid - atEuro;
  return `${formatCents(price, band.decimal, words)} + ${formatCents(toEuro, band.decimal, words)}`
    + ` = ${formatCents(atEuro, band.decimal, words)}`
    + `${THEN}${formatCents(atEuro, band.decimal, words)} + ${formatCents(rest, band.decimal, words)}`
    + ` = ${formatCents(paid, band.decimal, words)}`;
}

type Builder = (band: MoneyBand, random: Random, words: MoneyWords) => MoneyQuestion | null;

const BUILDERS: { [shape in MoneyShape]: Builder } = {
  count: countQuestion,
  make: makeQuestion,
  total: totalQuestion,
  change: changeQuestion
};

/** How many times a shape may be re-rolled before falling back. */
const TRIES = 12;

/**
 * A money question for this grade, or null if none could be built — the
 * caller asks an ordinary sum instead rather than looping. Bounded on
 * purpose: an unbounded re-roll froze a tab for the youngest players once
 * already, and it is not going to happen twice.
 */
export function moneyQuestion(
  grade: number,
  random: Random = Math.random,
  words: MoneyWords = DEFAULT_WORDS
): MoneyQuestion | null {
  const band = bandFor(grade);
  const shape = pick(band.shapes, random);

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const built = BUILDERS[shape](band, random, words);
    if (built) {
      return built;
    }
  }

  // Counting a pile is the shape every band can always build; this is the floor
  for (let attempt = 0; attempt < TRIES; attempt++) {
    const built = countQuestion(band, random, words);
    if (built) {
      return built;
    }
  }
  return null;
}

/** What goes in front of the answer box: `€`, or nothing. */
export function unitPrefix(unit: MoneyUnit): string {
  return unit === 'euros' || unit === 'decimal' ? '€' : '';
}

/** What goes after it: `c`, or nothing. */
export function unitSuffix(unit: MoneyUnit): string {
  return unit === 'cents' ? 'c' : '';
}

/**
 * Whether what was typed is the answer. Decimals are compared in whole cents
 * so that 3.40 and 3.4 both count and no float ever decides whether a child
 * was right.
 */
export function moneyAnswerMatches(typed: string, question: MoneyQuestion): boolean {
  const value = Number(String(typed == null ? '' : typed).trim());
  if (!Number.isFinite(value) || typed === '') {
    return false;
  }
  if (question.unit === 'decimal') {
    return Math.round(value * 100) === Math.round(question.answer * 100);
  }
  return value === question.answer;
}
