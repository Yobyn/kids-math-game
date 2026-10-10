/**
 * The maths behind levels, kept free of the DOM so it can be tested directly.
 *
 * Two research findings shape the numbers here. Effort-based rewards beat
 * performance-based ones: they measurably increase a child's willingness to
 * take on harder work, and the effect survives the reward being taken away.
 * So a round is never worth nothing — finishing one pays a third of what a
 * perfect round pays, whatever the score. A child who gets three right still
 * climbs, at rather more than half the speed of a child who gets them all,
 * because the child who needs the ladder most is the one a purely
 * score-based reward would punish. Accuracy still pays, just not exclusively.
 *
 * The other is that early levels should be easy wins that build a sense of
 * "I can do this", with the cost rising afterwards. Hence a first level that
 * a single round reaches, a cost that grows by one round's worth each time,
 * and a cap so it never turns into a grind.
 *
 * What a round pays was doubled when every kind of character started to
 * climb on its own (Yobyn, 2026-10-10: "a bit easier to lvl so users unlock
 * things quicker"): a child now climbs each one, so each climb is half as
 * long. The ladder itself is unchanged, so nobody's level moves on the day.
 */

/** Paid for finishing a round, however it went. */
export const ROUND_COMPLETION_XP = 20;
/** Paid per correct answer — the smaller half of a round's worth. */
export const XP_PER_CORRECT = 4;

/** One round's worth of experience, the unit the curve is built from. */
export const LEVEL_STEP = 25;
/**
 * Levels stop getting more expensive here. Without a cap the cost climbs
 * forever and the ladder turns into exactly the grind it is meant to avoid.
 */
export const MAX_STEP_MULTIPLIER = 8;

export interface LevelProgress {
  level: number;
  /** Experience earned since reaching the current level. */
  xpIntoLevel: number;
  /** Experience the current level costs in total. */
  xpForLevel: number;
  /** 0-1, how far along the current level this is. */
  fraction: number;
  /** Experience still to earn before the next level. */
  xpRemaining: number;
}

/**
 * What a finished round is worth. Twenty for finishing, four per correct answer:
 * a round is never worth nothing, and a perfect round is worth three times a
 * round where nothing went right.
 */
export function xpForRound(correctAnswers: number, total: number): number {
  const correct = Math.max(0, Math.min(Math.floor(correctAnswers), Math.floor(total)));
  return ROUND_COMPLETION_XP + correct * XP_PER_CORRECT;
}

/**
 * The bonus game after a round (bonus/): BONUS_XP_PER_HIT per bounce off the
 * paddle, never more than this. The least a round pays is
 * ROUND_COMPLETION_XP, so the bonus is always well under what the maths
 * earned: the sums stay the way to climb, the game is a treat on top.
 * Doubled with the rounds, so it keeps the same share.
 */
export const BONUS_XP_PER_HIT = 2;
export const BONUS_XP_CAP = 10;

export function bonusXp(hits: number): number {
  return Math.min(BONUS_XP_CAP, Math.max(0, Math.floor(Number(hits) || 0)) * BONUS_XP_PER_HIT);
}

/** What the jump from `level - 1` to `level` costs. */
export function xpForLevelStep(level: number): number {
  if (level <= 1) {
    return 0;
  }
  return LEVEL_STEP * Math.min(level - 1, MAX_STEP_MULTIPLIER);
}

/** Total experience needed to stand at `level`. */
export function xpToReach(level: number): number {
  let total = 0;
  for (let step = 2; step <= level; step++) {
    total += xpForLevelStep(step);
  }
  return total;
}

export function levelForXp(xp: number): number {
  const earned = Math.max(0, Math.floor(xp) || 0);
  let level = 1;
  while (xpToReach(level + 1) <= earned) {
    level++;
  }
  return level;
}

export function levelProgress(xp: number): LevelProgress {
  const earned = Math.max(0, Math.floor(xp) || 0);
  const level = levelForXp(earned);
  const floor = xpToReach(level);
  const xpForLevel = xpForLevelStep(level + 1);
  const xpIntoLevel = earned - floor;

  return {
    level,
    xpIntoLevel,
    xpForLevel,
    fraction: xpForLevel > 0 ? Math.min(1, xpIntoLevel / xpForLevel) : 0,
    xpRemaining: Math.max(0, xpForLevel - xpIntoLevel)
  };
}
