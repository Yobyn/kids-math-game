import { GameLevel } from './game-sums';

/**
 * Who a bonus game's sums are for (game-sums.ts): the year and the climb of
 * the round that earned the game, which is the newest in the child's history
 * (the result screen has cleared the grade it was chosen with by then), and
 * the sharing sign of the language on screen. With no round to go by, the
 * grade last chosen, or groep 3.
 */
export function levelFor(history: { grade: number; difficulty?: string }[], language: string): GameLevel {
  const last = history[0];
  let grade = last ? Number(last.grade) : NaN;
  if (!Number.isFinite(grade)) {
    try {
      grade = Number(localStorage.getItem('grade'));
    } catch {
      grade = NaN;
    }
  }
  return {
    grade: Number.isFinite(grade) && grade >= 1 ? grade : 1,
    warmUp: !!last && last.difficulty === 'easy',
    divide: language === 'en' ? '÷' : ':'
  };
}
