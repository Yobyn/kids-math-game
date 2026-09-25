import { PlayTotals } from '../services/progress.service';
import { StarCount, starsFor } from '../result/round-card';
import { stepColour } from '../theme/palette';

/**
 * What "How far you have come" shows, decided here so no screen can drift
 * back into a report card.
 *
 * Everything on it only ever goes up — that was the design from the start,
 * and it stays: rounds finished, questions answered, answers right, a best.
 * What changed (2026-09-25) is HOW the best is shown and whether the things
 * earned carry a denominator:
 *
 * - The best round is its STARS, not a percentage. A percentage is the
 *   language of a mark, and accuracy lives on the grown-ups' screen. Stars
 *   are the one judgement a child already knows from the end of a round.
 *   A best of no stars shows no tile at all: "your best: nothing" is not
 *   something to put in front of a child.
 * - The things earned are counted, never counted AGAINST a total. "5 / 13"
 *   made a set to complete, which the scrapbook already refuses to do
 *   (Habgood & Ainsworth, 2011: the reward should be the subject, not a
 *   second game about collecting).
 */

export type TileKind = 'rounds' | 'questions' | 'right' | 'best';

export interface EffortTile {
  kind: TileKind;
  /** The number shown, for counts. */
  value: number;
  /** For the best round: how many stars it earned (1 to 3). */
  stars?: StarCount;
  /** The ring's colour for this tile's place, as `#rrggbb`. */
  colour: string;
}

/** The tiles, in order, each coloured from the ring. */
export function effortTiles(totals: PlayTotals, bestPercentage: number | null): EffortTile[] {
  const count = (n: number) => Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  const tiles: Omit<EffortTile, 'colour'>[] = [
    { kind: 'rounds', value: count(totals.rounds) },
    { kind: 'questions', value: count(totals.questions) },
    { kind: 'right', value: count(totals.correct) }
  ];
  const stars = bestPercentage === null ? 0 : starsFor(bestPercentage);
  if (stars > 0) {
    tiles.push({ kind: 'best', value: stars, stars });
  }
  return tiles.map((tile, i) => ({ ...tile, colour: stepColour(i + 1, tiles.length) }));
}
