import { CLIMBS, climbs, flagAt, hillPath } from './climb';
import { stepColour } from '../theme/palette';

describe('climbs: harder is a bigger climb', () => {
  it('rises from easy to hard: each climb’s peak is taller than the last', () => {
    const tallest = (level: keyof typeof CLIMBS) => Math.max(...CLIMBS[level]);
    expect(tallest('medium')).toBeGreaterThan(tallest('easy'));
    expect(tallest('hard')).toBeGreaterThan(tallest('medium'));
  });

  it('has more peaks the harder it is: one hill, two, then three', () => {
    expect(CLIMBS.easy.length).toBe(1);
    expect(CLIMBS.medium.length).toBe(2);
    expect(CLIMBS.hard.length).toBe(3);
  });

  it('flies a flag only on the hardest climb, on its tallest peak', () => {
    expect(flagAt(CLIMBS.easy)).toBeNull();
    expect(flagAt(CLIMBS.medium)).toBeNull();
    const flag = flagAt(CLIMBS.hard)!;
    expect(flag.x).toBe(30);
    expect(flag.y).toBeLessThan(10);
  });

  it('colours each climb from the ring, blue to magenta, as the grade cards are', () => {
    const all = climbs();
    expect(all.map(c => c.level)).toEqual(['easy', 'medium', 'hard']);
    all.forEach((climb, i) => expect(climb.colour).toBe(stepColour(i + 1, 3)));
    expect(all[0].colour).toBe('#3880ff');
    expect(all[2].colour).toBe('#d633eb');
  });
});

describe('climbs: the drawing', () => {
  const numbers = (path: string) => (path.match(/-?\d+(\.\d+)?/g) || []).map(Number);

  it('draws one closed shape along the bottom, one hump per peak', () => {
    const path = hillPath([0.5, 0.7]);
    expect(path.startsWith('M0 40')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect((path.match(/Q/g) || []).length).toBe(2);
  });

  it('reaches each peak’s height at the top of its hump', () => {
    // A quadratic's apex is halfway between its ends and its control point
    const path = hillPath([1]);
    const [, , cx, cy] = numbers(path);
    expect(cx).toBe(30);
    expect((40 + cy) / 2).toBeCloseTo(8, 0);
  });

  it('keeps every hump inside the drawing, whatever height it is given', () => {
    for (const peaks of [[0], [2], [-1], [0.3, 1.4, 0.2]]) {
      const [, , ...rest] = numbers(hillPath(peaks));
      const xs = rest.filter((_, i) => i % 2 === 0);
      xs.forEach(x => expect(x).toBeGreaterThanOrEqual(0));
      xs.forEach(x => expect(x).toBeLessThanOrEqual(60));
      // And every apex (halfway between the baseline and the control point)
      // stays inside the drawing's height, however tall a peak is asked for
      const controlYs = rest.filter((_, i) => i % 4 === 1);
      controlYs.forEach(cy => {
        const apex = (40 + cy) / 2;
        expect(apex).toBeGreaterThanOrEqual(0);
        expect(apex).toBeLessThanOrEqual(40);
      });
    }
    expect(hillPath([])).toBe('');
  });
});
