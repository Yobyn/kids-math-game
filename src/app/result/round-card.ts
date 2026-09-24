/**
 * What the end of a round says, decided here rather than in a template, so
 * it can be tested and so no screen can quietly drift back into a report.
 *
 * The end of a round is the reward, and for a long time it read like a test
 * result: "Quiz Complete!", a table of Correct / Accuracy / Total Score with
 * Bonus. Accuracy belongs on the grown-ups' screen; a child is told what
 * they DID. Praise goes to the work, not the child: Gunderson et al. (2013,
 * Child Development) found praise of a young child's effort and process
 * predicted, years later, the belief that ability grows with effort — so the
 * headline says "great work", never "you're clever", and a low round is
 * praised for keeping going rather than told to practise.
 */

export type StarCount = 0 | 1 | 2 | 3;

/** Stars are the one judgement on the screen, and three is the most. */
export function starsFor(percentage: number): StarCount {
  if (!Number.isFinite(percentage)) {
    return 0;
  }
  if (percentage >= 90) {
    return 3;
  }
  if (percentage >= 70) {
    return 2;
  }
  if (percentage >= 50) {
    return 1;
  }
  return 0;
}

export type PraiseKey = 'praise-3' | 'praise-2' | 'praise-1' | 'praise-0';

/** The headline, praising the work at every star count — including none. */
export function praiseFor(stars: StarCount): PraiseKey {
  return `praise-${stars}` as PraiseKey;
}

export type TileKind = 'right' | 'xp' | 'best';

export interface Tile {
  kind: TileKind;
  /** The number on the tile, or null for one that is only a word. */
  value: number | null;
}

/**
 * What the child did this round, as tiles: how many they got right, what it
 * paid, and — only when it happened — that it was their best. Nothing here
 * can read as a gap: no "out of", no percentage, no old best that this round
 * fell short of.
 */
export function roundTiles(round: { correctAnswers: number; xpEarned: number; isPersonalBest: boolean }): Tile[] {
  const tiles: Tile[] = [
    { kind: 'right', value: Math.max(0, Math.floor(round.correctAnswers || 0)) },
    { kind: 'xp', value: Math.max(0, Math.floor(round.xpEarned || 0)) }
  ];
  if (round.isPersonalBest) {
    tiles.push({ kind: 'best', value: null });
  }
  return tiles;
}

/** Each earned star lands this long after the one before. */
export const STAR_STEP_MS = 300;
/** The tiles follow the stars, this far apart. */
export const TILE_STEP_MS = 120;

export interface Timeline {
  /** When each earned star lands, in ms from the screen opening. */
  stars: number[];
  /** When each tile appears. */
  tiles: number[];
  /** When everything is on screen. */
  done: number;
}

/**
 * The order the screen fills in: stars one by one, then the tiles. Under
 * reduced motion everything is there at once. Nothing on the screen waits
 * for it — the buttons work from the first frame.
 */
export function revealTimeline(stars: StarCount, tileCount: number, reducedMotion: boolean): Timeline {
  if (reducedMotion) {
    return { stars: Array(stars).fill(0), tiles: Array(tileCount).fill(0), done: 0 };
  }
  const starTimes = Array.from({ length: stars }, (_, i) => STAR_STEP_MS * (i + 1));
  const afterStars = STAR_STEP_MS * stars;
  const tileTimes = Array.from({ length: tileCount }, (_, i) => afterStars + TILE_STEP_MS * (i + 1));
  const all = [...starTimes, ...tileTimes];
  return { stars: starTimes, tiles: tileTimes, done: all.length ? Math.max(...all) : 0 };
}
