import { RoundResult } from '../services/progress.service';
import { DIFFICULTY_ORDER } from './difficulty-tuner';

/**
 * Whether a child has outgrown the grade they keep choosing, kept free of the
 * DOM so the rule can be checked against any history.
 *
 * Three decisions here, and none of them is the obvious one.
 *
 * IT ONLY EVER POINTS UP. A grade is a school year, so telling a child to go
 * down one is a statement about them rather than about the questions — and it
 * is not needed: the difficulty ladder already handles "this is too hard"
 * without touching the grade, and it asks rather than tells. Up and down look
 * symmetrical and are not.
 *
 * IT WAITS FOR THE DIFFICULTY LADDER TO RUN OUT. Grade and difficulty are two
 * dials on the same thing, and the cheaper, safer one comes first: a child
 * breezing through grade 3 easy should be offered grade 3 medium, which the
 * difficulty tuner already does. Only a child at the TOP rung who is still
 * breezing has actually run out of room here.
 *
 * IT DOES NOT MEASURE SPEED, which is the obvious way to tell "knows it" from
 * "got it right eventually". Boaler's Fluency Without Fear reports that for
 * roughly a third of students the onset of timed testing is where maths
 * anxiety begins, and Beilock's imaging work finds that time pressure blocks
 * the working memory the facts are held in — so a child under the clock
 * cannot reach facts they know. (The evidence is contested; there are no
 * clean experiments proving timed tests cause anxiety.) Either way, putting a
 * timer in front of a child to decide whether to promote them buys a better
 * signal with the one thing this game exists to avoid. Accuracy over several
 * rounds is noisier, and it is the right trade.
 */

/** The grades the game offers. */
export const TOP_GRADE = 10;

/**
 * Comfortably above the difficulty tuner's own bar. Moving a whole year is a
 * bigger claim than moving one rung, so it takes better evidence.
 */
export const CLEARLY_OUTGROWN = 90;

/** Three rounds, not two: a bigger move asks for more than a good afternoon. */
export const ROUNDS_CONSIDERED = 3;

/** The hardest rung there is — nothing suggests a grade before this is reached. */
export const TOP_DIFFICULTY = DIFFICULTY_ORDER[DIFFICULTY_ORDER.length - 1];

/**
 * The grade to suggest, or undefined when there is nothing worth saying —
 * which is nearly always, and should be.
 */
export function suggestGrade(history: RoundResult[], grade: number): number | undefined {
  if (!Number.isFinite(grade) || grade < 1 || grade >= TOP_GRADE) {
    return undefined;
  }

  const recent = (history || [])
    .filter(round => round && round.grade === grade && round.difficulty === TOP_DIFFICULTY)
    .slice(0, ROUNDS_CONSIDERED);

  if (recent.length < ROUNDS_CONSIDERED) {
    return undefined;
  }

  return recent.every(round => round.percentage >= CLEARLY_OUTGROWN)
    ? grade + 1
    : undefined;
}
