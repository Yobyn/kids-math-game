import { RoundResult } from '../services/progress.service';
import {
  CLEARLY_TOO_EASY,
  CLEARLY_TOO_HARD,
  DIFFICULTY_ORDER,
  ROUNDS_CONSIDERED,
  isDifficulty,
  lastGrade,
  lastPlayed,
  step,
  suggestDifficulty,
  suggestionDirection
} from './difficulty-tuner';

/** Newest first, as ProgressService keeps them. */
function rounds(...specs: [number, string, number?][]): RoundResult[] {
  return specs.map(([percentage, difficulty, grade], i) => ({
    date: `2026-09-${String(20 - i).padStart(2, '0')}T10:00:00.000Z`,
    correctAnswers: Math.round(percentage / 10),
    total: 10,
    percentage,
    score: 20,
    grade: grade === undefined ? 2 : grade,
    difficulty
  }));
}

describe('when to suggest a different setting', () => {
  it('says nothing to a child who has only played once', () => {
    // One round is a mood, not a pattern
    expect(suggestDifficulty(rounds([100, 'easy']), 2, 'easy')).toBeUndefined();
  });

  it('suggests harder after a run of rounds that were clearly too easy', () => {
    expect(suggestDifficulty(rounds([95, 'easy'], [90, 'easy']), 2, 'easy')).toBe('medium');
  });

  it('suggests easier after a run of rounds that were clearly too hard', () => {
    expect(suggestDifficulty(rounds([30, 'hard'], [40, 'hard']), 2, 'hard')).toBe('medium');
  });

  it('leaves a child alone while they are in the band worth being in', () => {
    // 60-75% is where the learning is; nothing to say
    expect(suggestDifficulty(rounds([70, 'medium'], [65, 'medium']), 2, 'medium')).toBeUndefined();
  });

  it('leaves a child alone after one good round and one ordinary one', () => {
    expect(suggestDifficulty(rounds([100, 'easy'], [60, 'easy']), 2, 'easy')).toBeUndefined();
    expect(suggestDifficulty(rounds([20, 'hard'], [70, 'hard']), 2, 'hard')).toBeUndefined();
  });

  it('never suggests more than one step', () => {
    const suggestion = suggestDifficulty(rounds([100, 'easy'], [100, 'easy']), 2, 'easy');

    expect(suggestion).toBe('medium');
    expect(DIFFICULTY_ORDER.indexOf(suggestion!) - DIFFICULTY_ORDER.indexOf('easy')).toBe(1);
  });

  it('has nothing to offer at the top of the ladder', () => {
    expect(suggestDifficulty(rounds([100, 'hard'], [100, 'hard']), 2, 'hard')).toBeUndefined();
  });

  it('has nothing to offer at the bottom of it', () => {
    expect(suggestDifficulty(rounds([10, 'easy'], [0, 'easy']), 2, 'easy')).toBeUndefined();
  });

  it('ignores rounds played at another setting', () => {
    // Breezing through easy says nothing about how hard is going
    const history = rounds([100, 'easy'], [100, 'easy'], [60, 'medium']);

    expect(suggestDifficulty(history, 2, 'medium')).toBeUndefined();
  });

  it('ignores rounds played at another grade', () => {
    const history = rounds([100, 'easy', 1], [100, 'easy', 1]);

    expect(suggestDifficulty(history, 2, 'easy')).toBeUndefined();
  });

  it('ignores rounds recorded before the setting was kept', () => {
    const history = rounds([100, 'easy'], [100, 'easy']);
    delete history[1].difficulty;

    expect(suggestDifficulty(history, 2, 'easy')).toBeUndefined();
  });

  it('looks only at the most recent rounds, not a good week in the past', () => {
    const history = rounds([50, 'easy'], [55, 'easy'], [100, 'easy'], [100, 'easy']);

    expect(history.length).toBeGreaterThan(ROUNDS_CONSIDERED);
    expect(suggestDifficulty(history, 2, 'easy')).toBe(undefined);
  });

  it('holds the line exactly at the thresholds', () => {
    const easyEnough = rounds([CLEARLY_TOO_EASY, 'easy'], [CLEARLY_TOO_EASY, 'easy']);
    const justUnder = rounds([CLEARLY_TOO_EASY - 1, 'easy'], [CLEARLY_TOO_EASY, 'easy']);
    expect(suggestDifficulty(easyEnough, 2, 'easy')).toBe('medium');
    expect(suggestDifficulty(justUnder, 2, 'easy')).toBeUndefined();

    const hardEnough = rounds([CLEARLY_TOO_HARD, 'hard'], [CLEARLY_TOO_HARD, 'hard']);
    const justOver = rounds([CLEARLY_TOO_HARD + 1, 'hard'], [CLEARLY_TOO_HARD, 'hard']);
    expect(suggestDifficulty(hardEnough, 2, 'hard')).toBe('medium');
    expect(suggestDifficulty(justOver, 2, 'hard')).toBeUndefined();
  });

  it('leaves a wide middle where it says nothing at all', () => {
    // Everything between the two thresholds is a child's own business
    for (let percentage = CLEARLY_TOO_HARD + 1; percentage < CLEARLY_TOO_EASY; percentage++) {
      const history = rounds([percentage, 'medium'], [percentage, 'medium']);
      expect(suggestDifficulty(history, 2, 'medium')).toBeUndefined();
    }
  });
});

describe('reading where a child is', () => {
  it('takes the setting from the round they last played', () => {
    expect(lastPlayed(rounds([60, 'hard'], [90, 'easy']), 2)).toBe('hard');
  });

  it('skips rounds that never recorded one', () => {
    const history = rounds([60, 'easy'], [90, 'medium']);
    delete history[0].difficulty;

    expect(lastPlayed(history, 2)).toBe('medium');
  });

  it('has no answer for a grade never played', () => {
    expect(lastPlayed(rounds([60, 'easy', 1]), 5)).toBeUndefined();
    expect(lastPlayed([], 2)).toBeUndefined();
  });

  it('refuses a setting that is not one of the three', () => {
    const history = rounds([60, 'impossible']);

    expect(lastPlayed(history, 2)).toBeUndefined();
    expect(isDifficulty('impossible')).toBe(false);
    expect(isDifficulty('medium')).toBe(true);
  });
});

describe('describing a suggestion', () => {
  it('knows which way it goes', () => {
    expect(suggestionDirection('easy', 'medium')).toBe('harder');
    expect(suggestionDirection('hard', 'medium')).toBe('easier');
  });

  it('runs out at the ends of the ladder', () => {
    expect(step('hard', 1)).toBeUndefined();
    expect(step('easy', -1)).toBeUndefined();
    expect(step('medium', 1)).toBe('hard');
    expect(step('medium', -1)).toBe('easy');
  });
});

describe('the grade last played', () => {
  const round = (grade: number, date: string) => ({
    date, correctAnswers: 7, total: 10, percentage: 70, score: 14, grade
  });

  it('is nothing before anything has been played', () => {
    expect(lastGrade([])).toBeUndefined();
    expect(lastGrade(null as any)).toBeUndefined();
  });

  it('is the grade of the newest round', () => {
    // History is stored newest first
    expect(lastGrade([
      round(5, '2026-09-22T10:00:00.000Z'),
      round(2, '2026-09-21T10:00:00.000Z')
    ])).toBe(5);
  });

  it('ignores a round that cannot say which grade it was', () => {
    expect(lastGrade([
      { date: 'x', correctAnswers: 1, total: 10, percentage: 10, score: 1 } as any,
      round(3, '2026-09-21T10:00:00.000Z')
    ])).toBe(3);
    expect(lastGrade([round(0, '2026-09-22T10:00:00.000Z')])).toBeUndefined();
    expect(lastGrade([round(NaN, '2026-09-22T10:00:00.000Z')])).toBeUndefined();
  });

  it('hands back a whole grade for every grade the game offers', () => {
    for (let grade = 1; grade <= 10; grade++) {
      const found = lastGrade([round(grade, '2026-09-22T10:00:00.000Z')]);
      expect(found).toBe(grade);
      expect(Math.floor(found!)).toBe(found!);
    }
  });
});
