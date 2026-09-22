import {
  CLEARLY_OUTGROWN,
  ROUNDS_CONSIDERED,
  TOP_DIFFICULTY,
  TOP_GRADE,
  suggestGrade
} from './grade-tuner';
import { DIFFICULTY_ORDER } from './difficulty-tuner';
import { RoundResult } from '../services/progress.service';

function round(
  grade: number,
  percentage: number,
  difficulty: string = TOP_DIFFICULTY
): RoundResult {
  return {
    date: '2026-09-22T10:00:00.000Z',
    correctAnswers: Math.round(percentage / 10),
    total: 10,
    percentage,
    score: percentage,
    grade,
    difficulty
  };
}

/** `count` rounds all at the same grade, setting and score. */
function runOf(count: number, grade: number, percentage: number, difficulty = TOP_DIFFICULTY) {
  return Array.from({ length: count }, () => round(grade, percentage, difficulty));
}

describe('suggesting the next grade', () => {
  it('says nothing before there is enough to go on', () => {
    for (let played = 0; played < ROUNDS_CONSIDERED; played++) {
      expect(suggestGrade(runOf(played, 3, 100), 3)).toBeUndefined();
    }
  });

  it('suggests the next grade after a run at the top rung', () => {
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 3, 100), 3)).toBe(4);
  });

  it('waits for the difficulty ladder to run out first', () => {
    // Grade and difficulty are two dials on one thing, and the cheaper, safer
    // one comes first: a child breezing through easy should be offered
    // medium, which the difficulty tuner already does.
    DIFFICULTY_ORDER.filter(level => level !== TOP_DIFFICULTY).forEach(level => {
      expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 3, 100, level), 3)).toBeUndefined();
    });
  });

  it('will not count a mix of settings as a run at the top', () => {
    const mixed = [round(3, 100), round(3, 100, 'easy'), round(3, 100)];

    expect(suggestGrade(mixed, 3)).toBeUndefined();
  });

  it('ignores a round that cannot say how hard it was', () => {
    // Which is exactly what a round whose difficulty changed mid-way records
    const eased = { ...round(3, 100), difficulty: undefined };

    expect(suggestGrade([eased, round(3, 100), round(3, 100)], 3)).toBeUndefined();
  });

  it('needs every round in the run to be well above the bar', () => {
    const nearlyAll = runOf(ROUNDS_CONSIDERED - 1, 3, 100)
      .concat([round(3, CLEARLY_OUTGROWN - 1)]);

    expect(suggestGrade(nearlyAll, 3)).toBeUndefined();
  });

  it('takes exactly the bar, and nothing below it', () => {
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 3, CLEARLY_OUTGROWN), 3)).toBe(4);
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 3, CLEARLY_OUTGROWN - 1), 3)).toBeUndefined();
  });

  it('asks for more than the difficulty tuner does', () => {
    // A whole school year is a bigger claim than one rung
    expect(CLEARLY_OUTGROWN).toBeGreaterThan(85);
    expect(ROUNDS_CONSIDERED).toBeGreaterThan(2);
  });

  it('only counts rounds at the grade being played', () => {
    const elsewhere = runOf(ROUNDS_CONSIDERED, 5, 100);

    expect(suggestGrade(elsewhere, 3)).toBeUndefined();
  });

  it('NEVER suggests going down, whatever the scores', () => {
    // The asymmetry is the point: a grade is a school year, so pointing down
    // is a statement about the child rather than about the questions — and
    // the difficulty ladder already handles "this is too hard".
    for (let grade = 1; grade <= TOP_GRADE; grade++) {
      for (let percentage = 0; percentage <= 100; percentage += 10) {
        const suggested = suggestGrade(runOf(ROUNDS_CONSIDERED, grade, percentage), grade);
        if (suggested !== undefined) {
          expect(suggested).toBeGreaterThan(grade);
        }
      }
    }
  });

  it('never suggests more than one grade at a time', () => {
    for (let grade = 1; grade < TOP_GRADE; grade++) {
      expect(suggestGrade(runOf(ROUNDS_CONSIDERED, grade, 100), grade)).toBe(grade + 1);
    }
  });

  it('has nothing to suggest at the top of the ladder', () => {
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, TOP_GRADE, 100), TOP_GRADE)).toBeUndefined();
  });

  it('says nothing for a grade that is not one', () => {
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 0, 100), 0)).toBeUndefined();
    expect(suggestGrade(runOf(ROUNDS_CONSIDERED, 3, 100), NaN)).toBeUndefined();
    expect(suggestGrade(null as any, 3)).toBeUndefined();
  });

  it('stays quiet for a child having an ordinary time of it, over a sweep', () => {
    // Most of the time there should be nothing to say, and there is
    let suggestions = 0;
    for (let percentage = 0; percentage <= 100; percentage += 5) {
      if (suggestGrade(runOf(ROUNDS_CONSIDERED, 3, percentage), 3)) {
        suggestions++;
      }
    }

    expect(suggestions).toBeLessThan(5);
  });
});
