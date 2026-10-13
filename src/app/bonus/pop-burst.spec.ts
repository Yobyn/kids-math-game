import { BURST_LIFE, PIECES, ageBursts, newBurst, piecesOf } from './pop-burst';

describe('a balloon bursting into pieces (Ballonnen)', () => {
  const burst = newBurst(100, 200, 24, 0.5);

  it('bursts into pieces all round where the balloon was', () => {
    const pieces = piecesOf(burst);
    expect(pieces.length).toBe(PIECES);
    const left = pieces.filter(p => p.x < 100).length;
    const right = pieces.filter(p => p.x > 100).length;
    const above = pieces.filter(p => p.y < 200).length;
    const below = pieces.filter(p => p.y > 200).length;
    expect(Math.min(left, right, above, below)).toBeGreaterThan(0);
    pieces.forEach(p => expect(p.alpha).toBe(1));
  });

  it('flies the pieces out, then slows them, drops them a little and fades them', () => {
    const distance = (age: number) => {
      const p = piecesOf({ ...burst, age })[0];
      return Math.hypot(p.x - burst.x, p.y - burst.y);
    };
    const early = distance(0.1) - distance(0);
    const late = distance(BURST_LIFE) - distance(BURST_LIFE - 0.1);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(early);
    // the piece flying sideways ends a little lower than it started
    const sideways = piecesOf({ ...burst, age: BURST_LIFE * 0.9 })[0];
    expect(sideways.y).toBeGreaterThan(burst.y);
    expect(piecesOf({ ...burst, age: BURST_LIFE / 2 })[0].alpha).toBeCloseTo(0.5, 5);
    expect(piecesOf({ ...burst, age: BURST_LIFE })[0].alpha).toBe(0);
  });

  it('ages bursts and lets go of one whose pieces have faded', () => {
    const later = ageBursts([burst, { ...burst, age: BURST_LIFE - 0.05 }], 0.1);
    expect(later.length).toBe(1);
    expect(later[0].age).toBeCloseTo(0.1, 9);
    expect(ageBursts(later, BURST_LIFE)).toEqual([]);
    // time never runs backwards
    expect(ageBursts([burst], -1)[0].age).toBe(0);
  });

  it('turns each burst its own way', () => {
    const turned = piecesOf(newBurst(100, 200, 24, 0.5, 0.3))[0];
    expect(turned.x).not.toBeCloseTo(piecesOf(burst)[0].x, 3);
  });
});
