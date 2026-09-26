import {
  BLINK_GAP,
  BLINK_JITTER,
  BLINK_SECONDS,
  BREATH_SECONDS,
  TAIL_BEAT,
  TAIL_BURST,
  TAIL_EVERY,
  TAIL_SWING,
  WING_BEAT,
  WING_FLAP,
  WAVE_BEND,
  WAVE_LIFT,
  WAVE_SECONDS,
  WAVE_SWING,
  WAVE_SWINGS,
  breath,
  eyesOpen,
  putOnSomethingNew,
  tailWag,
  wave,
  wingFlap
} from './motion';

/** Samples `f` from `from` to `to` every `step` seconds. */
function samples<T>(from: number, to: number, step: number, f: (t: number) => T): { t: number; v: T }[] {
  const out: { t: number; v: T }[] = [];
  for (let t = from; t <= to + 1e-9; t += step) {
    out.push({ t, v: f(t) });
  }
  return out;
}

describe('motion', () => {
  describe('breathing', () => {
    it('starts breathed out, is breathed in half a breath later, and out again after a whole one', () => {
      expect(breath(0)).toBeCloseTo(0, 9);
      expect(breath(BREATH_SECONDS / 2)).toBeCloseTo(1, 9);
      expect(breath(BREATH_SECONDS)).toBeCloseTo(0, 9);
      expect(breath(BREATH_SECONDS / 4)).toBeCloseTo(0.5, 9);
    });

    it('rises and falls smoothly, never past fully in or out', () => {
      const all = samples(0, 20, 0.01, breath);
      expect(all.filter(s => s.v < -1e-9 || s.v > 1 + 1e-9)).toEqual([]);
      const jumps = all.slice(1).filter((s, i) => Math.abs(s.v - all[i].v) > 0.01);
      expect(jumps).toEqual([]);
    });

    it('is a calm, resting rate', () => {
      expect(BREATH_SECONDS).toBeGreaterThanOrEqual(3);
      expect(BREATH_SECONDS).toBeLessThanOrEqual(6);
    });
  });

  describe('blinking', () => {
    const all = samples(0, 120, 0.004, eyesOpen);
    /** The moments the eyes start to close. */
    const starts = all.filter((s, i) => i > 0 && s.v < 1 && all[i - 1].v === 1).map(s => s.t);

    it('keeps the eyes open almost all the time', () => {
      const shut = all.filter(s => s.v < 0.5).length / all.length;
      expect(shut).toBeGreaterThan(0.005);
      expect(shut).toBeLessThan(0.04);
    });

    it('closes the eyes fully, and never further or wider than open', () => {
      expect(Math.min(...all.map(s => s.v))).toBeLessThan(0.05);
      expect(all.filter(s => s.v < 0 || s.v > 1)).toEqual([]);
    });

    it('blinks every few seconds, at uneven gaps as a person does', () => {
      expect(starts.length).toBeGreaterThan(120 / (BLINK_GAP + BLINK_JITTER) - 1);
      const gaps = starts.slice(1).map((t, i) => t - starts[i]);
      expect(gaps.filter(gap => gap < BLINK_GAP - BLINK_JITTER - 0.01 || gap > BLINK_GAP + BLINK_JITTER + 0.01)).toEqual([]);
      const rounded = new Set(gaps.map(gap => gap.toFixed(1)));
      expect(rounded.size).toBeGreaterThan(3);
      // Sooner than usual and later than usual, both
      expect(Math.min(...gaps)).toBeLessThan(BLINK_GAP - BLINK_JITTER / 2);
      expect(Math.max(...gaps)).toBeGreaterThan(BLINK_GAP + BLINK_JITTER / 2);
    });

    it('does not blink the moment the character arrives', () => {
      expect(starts[0]).toBeGreaterThan(1);
    });

    it('takes a blink’s length, shutting faster than it opens', () => {
      const first = starts[0];
      const blink = all.filter(s => s.t >= first - 0.01 && s.t <= first + BLINK_SECONDS + 0.01);
      const lowest = blink.reduce((low, s) => (s.v < low.v ? s : low));
      expect(lowest.t - first).toBeLessThan((first + BLINK_SECONDS - lowest.t));
      expect(eyesOpen(first + BLINK_SECONDS + 0.01)).toBe(1);
    });

    it('gives the same answer for the same moment', () => {
      expect(eyesOpen(37.123)).toBe(eyesOpen(37.123));
    });
  });

  describe('waving', () => {
    const all = samples(-0.5, WAVE_SECONDS + 0.5, 0.002, wave);

    it('is at rest before, at the start, at the end and after', () => {
      [-1, 0, WAVE_SECONDS, WAVE_SECONDS + 1].forEach(t => expect(wave(t)).toEqual({ lift: 0, bend: 0 }));
    });

    it('lifts the arm to its height and bends the forearm up, then brings it back down', () => {
      const lifts = all.map(s => s.v.lift);
      expect(Math.max(...lifts)).toBeCloseTo(WAVE_LIFT, 6);
      expect(wave(WAVE_SECONDS / 2).lift).toBeCloseTo(WAVE_LIFT, 6);
      expect(Math.min(...lifts)).toBeGreaterThanOrEqual(0);
    });

    it('starts and finishes slowly, as an arm does, rather than at full speed', () => {
      const early = wave(0.035).lift;
      const late = wave(WAVE_SECONDS - 0.035).lift;
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(WAVE_LIFT * 0.05);
      expect(late).toBeLessThan(WAVE_LIFT * 0.05);
      // and is well on its way by halfway up
      expect(wave(0.175).lift).toBeCloseTo(WAVE_LIFT / 2, 6);
    });

    it('moves smoothly: no jump from one moment to the next', () => {
      const jumps = all.slice(1).filter((s, i) =>
        Math.abs(s.v.lift - all[i].v.lift) > 0.05 || Math.abs(s.v.bend - all[i].v.bend) > 0.05);
      expect(jumps).toEqual([]);
    });

    it(`swings the hand ${WAVE_SWINGS} times each way, while the arm is up`, () => {
      const up = all.filter(s => s.v.lift > WAVE_LIFT - 1e-6);
      const bends = up.map(s => s.v.bend - WAVE_BEND);
      expect(Math.max(...bends)).toBeCloseTo(WAVE_SWING, 2);
      expect(Math.min(...bends)).toBeCloseTo(-WAVE_SWING, 2);
      // Out past halfway one way, then the other: count the swings outward
      let outward = 0;
      let side = 0;
      bends.forEach(b => {
        const now = b > WAVE_SWING / 2 ? 1 : b < -WAVE_SWING / 2 ? -1 : side;
        if (now === 1 && side !== 1) {
          outward++;
        }
        side = now;
      });
      expect(outward).toBe(WAVE_SWINGS);
    });

    it('keeps the arm out from the side and the forearm pointing up, never across the face', () => {
      const up = all.filter(s => s.v.lift > WAVE_LIFT - 1e-6);
      up.forEach(s => {
        const forearm = s.v.lift + s.v.bend;
        expect(forearm).toBeGreaterThan(Math.PI * 0.7);
        expect(forearm).toBeLessThan(Math.PI * 1.1);
      });
      expect(WAVE_LIFT).toBeLessThan(Math.PI / 2);
    });
  });

  describe('what earns a wave', () => {
    const was = { hat: 'none', glasses: 'none', top: 'hoodie' };

    it('waves when a hat, glasses or a top goes on that was not on before', () => {
      expect(putOnSomethingNew(was, { ...was, hat: 'cap' })).toBeTrue();
      expect(putOnSomethingNew(was, { ...was, glasses: 'shades' })).toBeTrue();
      expect(putOnSomethingNew(was, { ...was, top: 'striped' })).toBeTrue();
      expect(putOnSomethingNew({ ...was, hat: 'cap' }, { ...was, hat: 'crown' })).toBeTrue();
    });

    it('waves hello to a new pet', () => {
      expect(putOnSomethingNew({ ...was, pet: 'none' }, { ...was, pet: 'kitten' })).toBeTrue();
      expect(putOnSomethingNew({ ...was, pet: 'kitten' }, { ...was, pet: 'none' })).toBeFalse();
    });

    it('does not wave for taking something off, for nothing changing, or on arrival', () => {
      expect(putOnSomethingNew({ ...was, hat: 'cap' }, was)).toBeFalse();
      expect(putOnSomethingNew(was, { ...was })).toBeFalse();
      expect(putOnSomethingNew(undefined, { ...was, hat: 'cap' })).toBeFalse();
    });
  });

  describe('a pet', () => {
    it('keeps its tail still at first, then wags in bursts with rests between', () => {
      const all = samples(0, TAIL_EVERY * 4 + 1, 0.005, tailWag);
      expect(all.filter(s => s.t < 1).every(s => s.v === 0)).toBeTrue();
      for (let burst = 0; burst < 4; burst++) {
        const start = 1 + burst * TAIL_EVERY;
        const wagging = all.filter(s => s.t > start && s.t < start + TAIL_BURST);
        const resting = all.filter(s => s.t > start + TAIL_BURST + 0.01 && s.t < start + TAIL_EVERY - 0.01);
        expect(Math.max(...wagging.map(s => Math.abs(s.v)))).toBeGreaterThan(TAIL_SWING * 0.8);
        expect(resting.every(s => s.v === 0)).toBeTrue();
      }
      expect(all.every(s => Math.abs(s.v) <= TAIL_SWING + 1e-9)).toBeTrue();
    });

    it('wags quickly, both ways, swelling in and fading out', () => {
      const burst = samples(1, 1 + TAIL_BURST, 0.002, tailWag);
      const changes = burst.slice(1).filter((s, i) => Math.sign(s.v) !== Math.sign(burst[i].v) && s.v !== 0).length;
      expect(changes).toBeGreaterThanOrEqual(Math.floor((TAIL_BURST / TAIL_BEAT) * 2) - 1);
      expect(Math.abs(tailWag(1 + 0.02))).toBeLessThan(TAIL_SWING * 0.2);
      expect(Math.abs(tailWag(1 + TAIL_BURST - 0.02))).toBeLessThan(TAIL_SWING * 0.2);
      const jumps = burst.slice(1).filter((s, i) => Math.abs(s.v - burst[i].v) > 0.05);
      expect(jumps).toEqual([]);
    });

    it('flaps a dragon\u2019s wings slowly and evenly, never further than a little', () => {
      const all = samples(0, WING_BEAT * 3, 0.01, wingFlap);
      expect(Math.max(...all.map(s => s.v))).toBeCloseTo(WING_FLAP, 3);
      expect(Math.min(...all.map(s => s.v))).toBeCloseTo(-WING_FLAP, 3);
      expect(wingFlap(0.3)).toBeCloseTo(wingFlap(0.3 + WING_BEAT), 9);
      expect(WING_BEAT).toBeGreaterThan(1);
    });
  });
});
