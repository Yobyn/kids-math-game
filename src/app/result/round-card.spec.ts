import {
  STAR_STEP_MS, TILE_STEP_MS, praiseFor, revealTimeline, roundTiles, starsFor, StarCount
} from './round-card';
import { LanguageService } from '../services/language.service';

describe('round card: stars', () => {
  it('gives three at 90% and up, two at 70, one at 50, none below', () => {
    expect([100, 90, 89, 70, 69, 50, 49, 0].map(starsFor)).toEqual([3, 3, 2, 2, 1, 1, 0, 0]);
  });

  it('never gives more than three or fewer than none, whatever arrives', () => {
    for (const odd of [150, -20, NaN, Infinity, -Infinity]) {
      const stars = starsFor(odd);
      expect(stars >= 0 && stars <= 3).toBe(true);
    }
    expect(starsFor(NaN)).toBe(0);
  });
});

describe('round card: praise for the work, never a verdict on the child', () => {
  const language = new LanguageService();
  const all: StarCount[] = [0, 1, 2, 3];

  it('has a different headline for every star count', () => {
    expect(new Set(all.map(praiseFor)).size).toBe(4);
  });

  it('is written in every language', () => {
    for (const lang of ['en', 'nl', 'es'] as const) {
      language.setLanguage(lang);
      for (const stars of all) {
        const text = language.translate(praiseFor(stars));
        expect(text).toBeTruthy();
        expect(text).not.toBe(praiseFor(stars));
      }
    }
    language.setLanguage('en');
  });

  it('praises the work, and does not label the child', () => {
    language.setLanguage('en');
    for (const stars of all) {
      const text = language.translate(praiseFor(stars)).toLowerCase();
      expect(text).not.toMatch(/\b(smart|clever|genius|natural|talent)/);
    }
    // The top two name the work itself
    expect(language.translate(praiseFor(3)).toLowerCase()).toContain('work');
    expect(language.translate(praiseFor(2)).toLowerCase()).toContain('work');
  });

  it('never reads as failing, even with no stars', () => {
    for (const lang of ['en', 'nl', 'es'] as const) {
      language.setLanguage(lang);
      const text = language.translate(praiseFor(0)).toLowerCase();
      expect(text).not.toMatch(/fail|wrong|try again|practi[cs]|oefen|fall|practica|mal\b|fout/);
    }
    language.setLanguage('en');
  });
});

describe('round card: tiles are what the child did', () => {
  it('shows how many were right and what it paid', () => {
    expect(roundTiles({ correctAnswers: 8, xpEarned: 40, isPersonalBest: false }))
      .toEqual([{ kind: 'right', value: 8 }, { kind: 'xp', value: 40 }]);
  });

  it('adds the best only when this round WAS the best', () => {
    const tiles = roundTiles({ correctAnswers: 10, xpEarned: 50, isPersonalBest: true });
    expect(tiles.map(tile => tile.kind)).toEqual(['right', 'xp', 'best']);
    expect(tiles[2].value).toBeNull();
  });

  it('never shows an "out of", a percentage, or a number below zero', () => {
    const tiles = roundTiles({ correctAnswers: -3, xpEarned: NaN, isPersonalBest: false });
    expect(tiles).toEqual([{ kind: 'right', value: 0 }, { kind: 'xp', value: 0 }]);
    tiles.forEach(tile => expect(Object.keys(tile).sort()).toEqual(['kind', 'value']));
  });

  it('shows whole numbers', () => {
    expect(roundTiles({ correctAnswers: 7.6, xpEarned: 12.9, isPersonalBest: false }).map(t => t.value)).toEqual([7, 12]);
  });
});

describe('round card: the order it fills in', () => {
  it('lands the stars one by one, then the tiles', () => {
    const timeline = revealTimeline(3, 3, false);
    expect(timeline.stars).toEqual([STAR_STEP_MS, STAR_STEP_MS * 2, STAR_STEP_MS * 3]);
    expect(Math.min(...timeline.tiles)).toBeGreaterThan(Math.max(...timeline.stars));
    expect(timeline.tiles).toEqual([...timeline.tiles].sort((a, b) => a - b));
    expect(timeline.tiles[1] - timeline.tiles[0]).toBe(TILE_STEP_MS);
    expect(timeline.done).toBe(Math.max(...timeline.tiles));
  });

  it('is over quickly: never more than about a second and a half', () => {
    for (const stars of [0, 1, 2, 3] as StarCount[]) {
      expect(revealTimeline(stars, 3, false).done).toBeLessThanOrEqual(1500);
    }
  });

  it('does not wait on stars that were not earned', () => {
    const none = revealTimeline(0, 2, false);
    expect(none.stars).toEqual([]);
    expect(none.tiles[0]).toBe(TILE_STEP_MS);
  });

  it('puts everything there at once under reduced motion', () => {
    const still = revealTimeline(3, 3, true);
    expect(still.stars).toEqual([0, 0, 0]);
    expect(still.tiles).toEqual([0, 0, 0]);
    expect(still.done).toBe(0);
  });
});
