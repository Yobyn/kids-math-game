/**
 * Choosing coins to make an amount — the one shape of money question a
 * number pad cannot express, kept free of the DOM so the rules can be
 * checked directly.
 *
 * WHY IT IS A SET AND NOT A NUMBER. Every other money question here ends in
 * a number typed into a box. This one is the Year 2 objective as the
 * curriculum actually words it: "combine amounts to make a particular value"
 * and "find different combinations of coins that equal the same amounts of
 * money" (national curriculum programmes of study, and the NCETM unit built
 * on them — curriculum material, not a study). The answer is a handful of
 * coins, and the interesting part is that there is more than one.
 *
 * SO ANY COMBINATION THAT TOTALS THE AMOUNT IS RIGHT, and that is the whole
 * design rather than a leniency. Marking one canonical set correct would
 * teach the opposite of the objective: a child who makes 75c as 50+20+5 and
 * a child who makes it as 20+20+20+10+5 have both done exactly what was
 * asked. The NCETM unit does raise the fewest-coins idea, but as something
 * to NOTICE — "what do the children notice about making 88p in the fewest
 * number of coins?" — not as the mark scheme. So the fewest-coins version is
 * what the worked line shows after two honest attempts, and never what
 * decides whether a child was right.
 *
 * The same unit is also where the existing decision to draw every piece the
 * same size comes from: "a coin has a value which is independent of its
 * size, shape, colour and mass".
 */

/**
 * The most coins a child may put down. Well above any answer these bands
 * ask for — the largest fewest-coins answer in range is five — so it never
 * stands between a child and a correct set. It is here because a tray is
 * tappable and a bored child will tap.
 */
export const MAX_PICKED = 12;

/** The fewest pieces a combination must have, so it is a combination. */
export const MIN_PIECES = 2;

/** Adds one piece, unless the purse is already full. */
export function addPiece(picked: number[], piece: number): number[] {
  return picked.length >= MAX_PICKED ? picked.slice() : [...picked, piece];
}

/**
 * Takes back the piece at this position. A child who mis-taps must be able
 * to undo exactly what they did, not start again — the same rule the keypad
 * holds, where every entry is undoable back to empty.
 */
export function removeAt(picked: number[], index: number): number[] {
  if (index < 0 || index >= picked.length) {
    return picked.slice();
  }
  return picked.slice(0, index).concat(picked.slice(index + 1));
}

export function pickTotal(picked: number[]): number {
  return picked.reduce((sum, piece) => sum + (Number.isFinite(piece) ? piece : 0), 0);
}

/**
 * Whether these coins make the amount. Nothing else is looked at: not how
 * many, not which ones, not the order they were put down in.
 */
export function pickMatches(picked: number[], targetCents: number): boolean {
  return picked.length > 0 && pickTotal(picked) === targetCents;
}

/**
 * The fewest pieces that make this amount, largest first, or [] when these
 * denominations cannot make it at all.
 *
 * Greedy, which is exact for the euro set and every subset of it used here
 * (each denomination divides into the next but one, so no smaller-first
 * combination ever beats taking the largest that fits). A denomination set
 * where that stops being true would need real change-making; the assertion
 * that it holds for these is in the tests.
 */
export function fewestPieces(targetCents: number, pieces: number[]): number[] {
  const usable = pieces.filter(piece => piece > 0).sort((a, b) => b - a);
  const out: number[] = [];
  let left = targetCents;

  usable.forEach(piece => {
    while (left >= piece) {
      out.push(piece);
      left -= piece;
    }
  });

  return left === 0 ? out : [];
}

/**
 * What the tray offers: every denomination the band uses that is not bigger
 * than the amount asked for, largest first.
 *
 * A coin larger than the target is left out deliberately. It can never be
 * part of a right answer, so it is not a choice — it is only a way to make a
 * child undo something, and the screen is already asking them to hold an
 * amount in their head.
 */
export function trayFor(pieces: number[], targetCents: number): number[] {
  return pieces
    .filter(piece => piece > 0 && piece <= targetCents)
    .sort((a, b) => b - a);
}
