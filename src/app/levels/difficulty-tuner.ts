import { RoundResult } from '../services/progress.service';

/**
 * Deciding when a child is on the wrong rung, kept free of the DOM so it can
 * be tested directly.
 *
 * Two research findings shape this, and the second is why it advises rather
 * than decides. A child learns fastest in a band around 60-75% right — below
 * it they disengage, above it they stop growing — and difficulty should move
 * in steps rather than jumps. But a system that adapts on its own is itself a
 * risk: its picture of the learner can be wrong, and a game that quietly
 * overrules what a child chose produces exactly the frustration adapting was
 * meant to avoid.
 *
 * So nothing here changes anything. It reads what has actually happened and
 * says what it would suggest; the child still chooses, on the screen where
 * they were already choosing.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Easiest first. A suggestion never moves more than one place along it. */
export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];

/** Comfortably above the band, not merely at the top of it. */
export const CLEARLY_TOO_EASY = 85;
/** Below the band by enough that it is not just a bad day. */
export const CLEARLY_TOO_HARD = 50;
/**
 * One round is a mood — a noisy room, a tired afternoon. Two in a row at the
 * same setting is a pattern, and a pattern is the least that should move a
 * child off a rung they picked themselves.
 */
export const ROUNDS_CONSIDERED = 2;

export function isDifficulty(value: any): value is Difficulty {
  return DIFFICULTY_ORDER.indexOf(value) >= 0;
}

/** One step along the ladder, or undefined at either end of it. */
export function step(from: Difficulty, direction: 1 | -1): Difficulty | undefined {
  return DIFFICULTY_ORDER[DIFFICULTY_ORDER.indexOf(from) + direction];
}

/**
 * What to suggest for the next round, or undefined when there is nothing
 * worth saying — which is most of the time, and should be.
 *
 * Only rounds at this grade and this setting count: a child who breezed
 * through easy sums last week says nothing about how hard sums are going now.
 */
export function suggestDifficulty(
  history: RoundResult[],
  grade: number,
  current: Difficulty
): Difficulty | undefined {
  const recent = history
    .filter(round => round.grade === grade && round.difficulty === current)
    .slice(0, ROUNDS_CONSIDERED);

  if (recent.length < ROUNDS_CONSIDERED) {
    return undefined;
  }

  if (recent.every(round => round.percentage >= CLEARLY_TOO_EASY)) {
    return step(current, 1);
  }

  if (recent.every(round => round.percentage <= CLEARLY_TOO_HARD)) {
    return step(current, -1);
  }

  return undefined;
}

/**
 * The setting the child last actually played at this grade. The stored choice
 * is cleared when a round ends, so what they played is the only honest answer
 * to "where are they now".
 */
export function lastPlayed(history: RoundResult[], grade: number): Difficulty | undefined {
  const round = history.find(entry => entry.grade === grade && isDifficulty(entry.difficulty));
  return round ? (round.difficulty as Difficulty) : undefined;
}

/**
 * The grade the child last actually played, which is the one worth offering
 * them again. Read from history rather than storage because the result screen
 * clears the stored choice on purpose — it wanted a fresh selection, which on
 * a phone means ten cards and three screenfuls of scrolling every time.
 */
export function lastGrade(history: RoundResult[]): number | undefined {
  const round = (history || []).find(entry =>
    entry && Number.isFinite(entry.grade) && entry.grade > 0);
  return round ? Math.floor(round.grade) : undefined;
}

/** Which way a suggestion goes, for choosing what to say about it. */
export function suggestionDirection(
  current: Difficulty,
  suggested: Difficulty
): 'harder' | 'easier' {
  return DIFFICULTY_ORDER.indexOf(suggested) > DIFFICULTY_ORDER.indexOf(current)
    ? 'harder'
    : 'easier';
}
