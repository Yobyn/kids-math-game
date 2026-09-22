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
 */

/** Paid for finishing a round, however it went. */
export const ROUND_COMPLETION_XP = 10;
/** Paid per correct answer — the smaller half of a round's worth. */
export const XP_PER_CORRECT = 2;

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
 * What a finished round is worth. Ten for finishing, two per correct answer:
 * a round is never worth nothing, and a perfect round is worth three times a
 * round where nothing went right.
 */
export function xpForRound(correctAnswers: number, total: number): number {
  const correct = Math.max(0, Math.min(Math.floor(correctAnswers), Math.floor(total)));
  return ROUND_COMPLETION_XP + correct * XP_PER_CORRECT;
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
