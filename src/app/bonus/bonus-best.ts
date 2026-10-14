import { BonusGame } from './bonus-games';

/**
 * Each bonus game's best score, per child, for the games' end cards
 * (Yobyn, 2026-10-13: the games' "look and feel"). Kept in the bonus chunk
 * with the games, under the child's own key (ProgressService.ownerKey), so
 * nothing of it is in the first load.
 */
export const BONUS_BEST_KEY = 'bonusBest';

type Bests = { [game in BonusGame]?: number };

function readBests(key: string): Bests {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    const bests: Bests = {};
    Object.keys(parsed || {}).forEach(game => {
      const value = Number(parsed[game]);
      if (Number.isFinite(value) && value > 0) {
        bests[game as BonusGame] = Math.floor(value);
      }
    });
    return bests;
  } catch {
    return {};
  }
}

/** A game's best so far, kept under `key`: 0 before the first. */
export function bonusBest(key: string, game: BonusGame): number {
  return readBests(key)[game] || 0;
}

/**
 * Keeps a game's score as its best when it is higher, never lower, and says
 * whether it beat an earlier best: the first game sets one, it beats none.
 */
export function recordBonusBest(key: string, game: BonusGame, points: number): { best: number; beaten: boolean } {
  const bests = readBests(key);
  const before = bests[game] || 0;
  const score = Math.max(0, Math.floor(points) || 0);
  if (score <= before) {
    return { best: before, beaten: false };
  }
  try {
    localStorage.setItem(key, JSON.stringify({ ...bests, [game]: score }));
  } catch {
    // Kept for this game's end card only
  }
  return { best: score, beaten: before > 0 };
}
