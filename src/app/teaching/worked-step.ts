/**
 * One line showing how a fact is worked out, kept free of the DOM so it can
 * be tested directly — including that every step it prints is actually true.
 *
 * Two research findings shape when this appears. Worked examples cut
 * cognitive load and teach more than an answer alone, especially early in
 * learning a skill. But they also invite overreliance: a child who can always
 * see the method stops reaching for it themselves, and the help stops being
 * read at all.
 *
 * So this is never available on demand and never shown before a child has
 * tried. It appears only after two honest attempts at the same question, at
 * the moment the answer was going to be given away regardless — the choice is
 * not between working it out and being shown, it is between being shown how
 * and being shown only what.
 *
 * The lines are arithmetic and an arrow, so they read the same in every
 * language the game speaks.
 */

/** Written between the halves of a worked step. */
const THEN = ' → ';

/**
 * How the fact is reached, or undefined when there is no step worth showing —
 * a fact whose "method" is just the answer again teaches nothing.
 */
export function workedStep(num1: number, num2: number, operation: string): string | undefined {
  if (![num1, num2].every(value => Number.isFinite(value) && value >= 0)) {
    return undefined;
  }

  switch (operation) {
    case '+':
      return addition(num1, num2);
    case '-':
      return subtraction(num1, num2);
    case '*':
      return multiplication(num1, num2);
    case '/':
      return division(num1, num2);
    default:
      return undefined;
  }
}

/**
 * Single digits that cross ten get the bridge — 8 + 7 as 8 + 2 then 10 + 5 —
 * which is the method these facts are actually taught with. Bigger numbers
 * get the tens and the ones separated instead.
 */
function addition(num1: number, num2: number): string | undefined {
  const total = num1 + num2;

  if (num1 < 10 && num2 < 10) {
    const bridge = 10 - num1;
    const rest = num2 - bridge;
    if (total <= 10 || bridge <= 0 || rest <= 0) {
      return undefined;
    }
    return `${num1} + ${bridge} = 10${THEN}10 + ${rest} = ${total}`;
  }

  const tens = Math.floor(num2 / 10) * 10;
  const ones = num2 - tens;
  if (!tens || !ones) {
    return undefined;
  }
  return `${num1} + ${tens} = ${num1 + tens}${THEN}${num1 + tens} + ${ones} = ${total}`;
}

/** The same bridge, downward: 15 - 8 as 15 - 5 then 10 - 3. */
function subtraction(num1: number, num2: number): string | undefined {
  const answer = num1 - num2;

  // The generator never asks one, but a step that walks a child below zero
  // would be worse than saying nothing
  if (answer < 0) {
    return undefined;
  }

  if (num1 > 10 && num1 < 20 && num2 < 10 && answer < 10 && answer >= 0) {
    const toTen = num1 - 10;
    const rest = num2 - toTen;
    if (toTen <= 0 || rest <= 0) {
      return undefined;
    }
    return `${num1} - ${toTen} = 10${THEN}10 - ${rest} = ${answer}`;
  }

  const tens = Math.floor(num2 / 10) * 10;
  const ones = num2 - tens;
  if (!tens || !ones) {
    return undefined;
  }
  return `${num1} - ${tens} = ${num1 - tens}${THEN}${num1 - tens} - ${ones} = ${answer}`;
}

/**
 * Leans on the five times table, which children know first: 7 x 6 as
 * 7 x 5 and one more 7. Twos and tens are not worth explaining.
 */
function multiplication(num1: number, num2: number): string | undefined {
  const product = num1 * num2;

  // Only six through nine: below that the fives anchor is no shortcut, and
  // the ten times table is "add a nought", which needs no working out
  if (num2 < 6 || num2 > 9 || num1 < 2 || num1 > 10) {
    return undefined;
  }

  const fives = num1 * 5;
  const extra = num2 - 5;
  const rest = num1 * extra;

  return `${num1} × 5 = ${fives}${THEN}${fives} + ${rest} = ${product}`;
}

/** Division read backwards, as the multiplication a child already knows. */
function division(num1: number, num2: number): string | undefined {
  if (num2 <= 1 || num1 % num2 !== 0) {
    return undefined;
  }

  const answer = num1 / num2;
  if (answer <= 1) {
    return undefined;
  }

  return `${num2} × ${answer} = ${num1}${THEN}${num1} ÷ ${num2} = ${answer}`;
}
