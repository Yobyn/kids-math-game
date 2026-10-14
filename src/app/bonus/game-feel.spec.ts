import { COUNTDOWN, FLOAT_LIFE, FLOAT_RISE, ageFloats, countdownShown, floatAt, newFloat } from './game-feel';

describe('how the bonus games feel: the 3-2-1 and the floating +1', () => {
  it('counts down 3, 2, 1 and then lets the game go', () => {
    expect(countdownShown(COUNTDOWN)).toBe(3);
    expect(countdownShown(2.5)).toBe(3);
    expect(countdownShown(2)).toBe(2);
    expect(countdownShown(1.2)).toBe(2);
    expect(countdownShown(0.4)).toBe(1);
    expect(countdownShown(0)).toBe(0);
    expect(countdownShown(-0.1)).toBe(0);
  });

  it('floats a +1 up from where the point was scored, fading as it goes', () => {
    const float = newFloat(100, 200);
    expect(float.text).toBe('+1');
    expect(floatAt(float)).toEqual({ x: 100, y: 200, alpha: 1 });
    const half = floatAt({ ...float, age: FLOAT_LIFE / 2 });
    expect(half.y).toBeLessThan(200);
    expect(half.alpha).toBeLessThan(1);
    const done = floatAt({ ...float, age: FLOAT_LIFE });
    expect(done.y).toBeCloseTo(200 - FLOAT_RISE, 9);
    expect(done.alpha).toBe(0);
  });

  it('only fades a +1 under reduced motion, without rising', () => {
    const half = floatAt({ ...newFloat(100, 200), age: FLOAT_LIFE / 2 }, true);
    expect(half.y).toBe(200);
    expect(half.alpha).toBeLessThan(1);
  });

  it('ages the +1s and lets go of the faded ones', () => {
    const floats = [newFloat(0, 0), { ...newFloat(0, 0), age: FLOAT_LIFE - 0.1 }];
    const later = ageFloats(floats, 0.2);
    expect(later.length).toBe(1);
    expect(later[0].age).toBeCloseTo(0.2, 9);
    expect(ageFloats(later, FLOAT_LIFE)).toEqual([]);
    expect(ageFloats([newFloat(0, 0)], -1)[0].age).toBe(0);
  });
});
