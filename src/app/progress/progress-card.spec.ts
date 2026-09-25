import { effortTiles } from './progress-card';
import { stepColour } from '../theme/palette';

const totals = { rounds: 12, questions: 120, correct: 96 };

describe('progress card: effort, never a mark', () => {
  it('counts rounds, questions and answers right, in that order', () => {
    expect(effortTiles(totals, null).map(tile => [tile.kind, tile.value]))
      .toEqual([['rounds', 12], ['questions', 120], ['right', 96]]);
  });

  it('shows the best round as its stars, not a percentage', () => {
    const best = effortTiles(totals, 80).find(tile => tile.kind === 'best')!;
    expect(best.stars).toBe(2);
    expect(best.value).toBe(2);
    expect(effortTiles(totals, 95).find(tile => tile.kind === 'best')!.stars).toBe(3);
  });

  it('shows no best at all when the best round earned no stars', () => {
    expect(effortTiles(totals, 40).some(tile => tile.kind === 'best')).toBe(false);
    expect(effortTiles(totals, null).some(tile => tile.kind === 'best')).toBe(false);
  });

  it('never goes down after a worse round: every tile is at least what it was', () => {
    const before = effortTiles({ rounds: 3, questions: 30, correct: 27 }, 90);
    // A round of nothing: counts grow, the best stays the best
    const after = effortTiles({ rounds: 4, questions: 40, correct: 27 }, 90);
    expect(after.length).toBe(before.length);
    after.forEach((tile, i) => expect(tile.value).toBeGreaterThanOrEqual(before[i].value));
  });

  it('shows whole, non-negative numbers whatever is stored', () => {
    const tiles = effortTiles({ rounds: -2, questions: 7.8, correct: NaN }, null);
    expect(tiles.map(tile => tile.value)).toEqual([0, 7, 0]);
  });

  it('colours each tile from the ring, blue to magenta', () => {
    const four = effortTiles(totals, 90);
    expect(four[0].colour).toBe('#3880ff');
    expect(four[3].colour).toBe('#d633eb');
    four.forEach((tile, i) => expect(tile.colour).toBe(stepColour(i + 1, 4)));
    // With three tiles the last is still the ring's magenta end
    expect(effortTiles(totals, null)[2].colour).toBe('#d633eb');
  });
});
