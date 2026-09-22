import {
  LEVEL_STEP,
  MAX_STEP_MULTIPLIER,
  ROUND_COMPLETION_XP,
  levelForXp,
  levelProgress,
  xpForLevelStep,
  xpForRound,
  xpToReach
} from './level-curve';

describe('what a round is worth', () => {
  it('pays something for finishing, however badly it went', () => {
    expect(xpForRound(0, 10)).toBe(ROUND_COMPLETION_XP);
    expect(xpForRound(0, 10)).toBeGreaterThan(0);
  });

  it('never lets a bad round be worth less than a third of a perfect one', () => {
    const worst = xpForRound(0, 10);
    const best = xpForRound(10, 10);

    expect(worst / best).toBeGreaterThanOrEqual(1 / 3);
  });

  it('keeps a struggling child climbing at more than half the pace', () => {
    // Three right out of ten is a hard round, not a failed one
    expect(xpForRound(3, 10) / xpForRound(10, 10)).toBeGreaterThan(0.5);
  });

  it('still pays more for getting more right', () => {
    const worths = [0, 3, 6, 9, 10].map(correct => xpForRound(correct, 10));
    const rising = worths.every((worth, i) => i === 0 || worth > worths[i - 1]);

    expect(rising).toBe(true);
  });

  it('cannot be gamed by claiming more correct than were asked', () => {
    expect(xpForRound(50, 10)).toBe(xpForRound(10, 10));
  });

  it('shrugs off negative and fractional counts', () => {
    expect(xpForRound(-5, 10)).toBe(ROUND_COMPLETION_XP);
    expect(xpForRound(4.9, 10)).toBe(xpForRound(4, 10));
  });
});

describe('the level curve', () => {
  it('starts everyone at level one with nothing earned', () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpToReach(1)).toBe(0);
  });

  it('gives the first level up inside a single round', () => {
    // An easy early win is what builds "I can do this"
    expect(xpToReach(2)).toBeLessThanOrEqual(xpForRound(10, 10));
    expect(levelForXp(xpForRound(10, 10))).toBe(2);
  });

  it('asks for more with each level, so later ones feel earned', () => {
    const steps = [2, 3, 4, 5, 6].map(xpForLevelStep);
    const rising = steps.every((step, i) => i === 0 || step > steps[i - 1]);

    expect(rising).toBe(true);
  });

  it('stops getting more expensive, so it never becomes a grind', () => {
    const capped = LEVEL_STEP * MAX_STEP_MULTIPLIER;

    expect(xpForLevelStep(20)).toBe(capped);
    expect(xpForLevelStep(100)).toBe(capped);
  });

  it('keeps every level reachable in single figures of rounds', () => {
    const bestRound = xpForRound(10, 10);
    const worstRound = xpForRound(0, 10);

    for (let level = 2; level <= 30; level++) {
      expect(xpForLevelStep(level) / bestRound).toBeLessThanOrEqual(10);
      expect(xpForLevelStep(level) / worstRound).toBeLessThanOrEqual(20);
    }
  });

  it('never goes backwards as experience grows', () => {
    let previous = 1;
    for (let xp = 0; xp <= 3000; xp += 7) {
      const level = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('agrees with itself: the level for a threshold is that level', () => {
    for (let level = 1; level <= 25; level++) {
      expect(levelForXp(xpToReach(level))).toBe(level);
      expect(levelForXp(xpToReach(level) - 1)).toBe(Math.max(1, level - 1));
    }
  });
});

describe('progress within a level', () => {
  it('sits at the bottom of a level the moment it is reached', () => {
    const progress = levelProgress(xpToReach(4));

    expect(progress.level).toBe(4);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.fraction).toBe(0);
  });

  it('reports what is left to earn, and it matches the bar', () => {
    const halfway = xpToReach(3) + Math.floor(xpForLevelStep(4) / 2);
    const progress = levelProgress(halfway);

    expect(progress.xpIntoLevel + progress.xpRemaining).toBe(progress.xpForLevel);
    expect(progress.fraction).toBeCloseTo(0.5, 1);
  });

  it('never reports a fraction outside the bar', () => {
    for (let xp = 0; xp <= 2000; xp += 13) {
      const { fraction } = levelProgress(xp);
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    }
  });

  it('treats junk as a fresh start rather than breaking the screen', () => {
    expect(levelProgress(NaN).level).toBe(1);
    expect(levelProgress(-100).level).toBe(1);
    expect(levelProgress(undefined as any).level).toBe(1);
    expect(levelProgress(NaN).fraction).toBe(0);
  });
});
