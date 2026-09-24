import {
  BURST_LIFE, BurstPool, burstAlpha, MAX_BURSTS, RIPPLE_RADIUS, rippleRadius, sparkColour,
  sparkDistance, SPARK_DRAG, SPARK_SPEED_MAX, SPARK_SPEED_MIN, SPARKS_PER_BURST, tapHueMix
} from './tap-burst';
import { angleToHueMix, fieldColour, PULSE_HALF_LIFE, decayEnergy } from './particle-field';

/** A seeded generator, so a burst's shape is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('tap burst: the two vocabularies stay apart', () => {
  it('is spent well before a reward surge is', () => {
    // How long a full surge takes to snap to nothing
    let energy = 1;
    let surge = 0;
    while (energy > 0) {
      energy = decayEnergy(energy, 0.01);
      surge += 0.01;
    }
    expect(BURST_LIFE).toBeLessThan(surge * 0.8);
    expect(surge).toBeGreaterThan(PULSE_HALF_LIFE * 2);
  });

  it('lives inside the ~300ms a small movement on a phone is given', () => {
    expect(BURST_LIFE).toBeGreaterThanOrEqual(0.2);
    expect(BURST_LIFE).toBeLessThanOrEqual(0.3);
  });

  it('stays under the finger: no spark travels further than a key-and-a-bit', () => {
    for (let age = 0; age <= BURST_LIFE; age += 0.01) {
      expect(sparkDistance(SPARK_SPEED_MAX, age)).toBeLessThanOrEqual(SPARK_SPEED_MAX / SPARK_DRAG);
    }
    expect(SPARK_SPEED_MAX / SPARK_DRAG).toBeLessThan(80);
    expect(RIPPLE_RADIUS).toBeLessThan(80);
  });

  it('still leaves the key: even the slowest spark clears a fingertip', () => {
    expect(sparkDistance(SPARK_SPEED_MIN, BURST_LIFE / 2)).toBeGreaterThan(15);
  });
});

describe('tap burst: timing', () => {
  it('is fully bright at contact and gone at the end of its life', () => {
    expect(burstAlpha(0)).toBe(1);
    expect(burstAlpha(BURST_LIFE)).toBe(0);
    expect(burstAlpha(BURST_LIFE * 2)).toBe(0);
  });

  it('only ever fades', () => {
    let last = burstAlpha(0);
    for (let age = 0.01; age <= BURST_LIFE; age += 0.01) {
      const alpha = burstAlpha(age);
      expect(alpha).toBeLessThanOrEqual(last);
      last = alpha;
    }
  });

  it('flies out fast and settles, never going backwards', () => {
    let last = 0;
    let lastGain = Infinity;
    for (let age = 0.01; age <= BURST_LIFE; age += 0.01) {
      const distance = sparkDistance(400, age);
      expect(distance).toBeGreaterThan(last);
      expect(distance - last).toBeLessThan(lastGain + 1e-9);
      lastGain = distance - last;
      last = distance;
    }
    expect(sparkDistance(400, 0)).toBe(0);
    expect(sparkDistance(400, -1)).toBe(0);
  });

  it('grows the contact ring quickly, to its full size and no further', () => {
    expect(rippleRadius(0)).toBe(0);
    expect(rippleRadius(BURST_LIFE / 3)).toBeGreaterThan(RIPPLE_RADIUS / 2);
    expect(rippleRadius(BURST_LIFE)).toBe(RIPPLE_RADIUS);
    expect(rippleRadius(BURST_LIFE * 3)).toBe(RIPPLE_RADIUS);
  });
});

describe('tap burst: colour comes from the ring', () => {
  it('takes the ring\'s own colour at the bearing of the tap', () => {
    const width = 400;
    const height = 800;
    for (const [x, y] of [[0, 0], [400, 0], [0, 800], [400, 800], [200, 100], [350, 400]]) {
      expect(tapHueMix(x, y, width, height))
        .toBeCloseTo(angleToHueMix(Math.atan2(y - height / 2, x - width / 2)), 10);
    }
  });

  it('is blue on one side of the screen and magenta on the other, like the ring', () => {
    const blueSide = tapHueMix(390, 400, 400, 800);
    const magentaSide = tapHueMix(10, 400, 400, 800);
    expect(blueSide).toBeLessThan(0.1);
    expect(magentaSide).toBeGreaterThan(0.9);
  });

  it('draws in exactly the ring\'s colour, at the alpha asked for', () => {
    const pool = new BurstPool(seeded(1));
    pool.burst(10, 10, 0.4);
    const { r, g, b } = fieldColour(0.4);
    expect(sparkColour(pool.bursts[0], 0.5)).toBe(`rgba(${r}, ${g}, ${b}, 0.500)`);
    expect(sparkColour(pool.bursts[0], 3)).toContain('1.000');
    expect(sparkColour(pool.bursts[0], -1)).toContain('0.000');
  });
});

describe('tap burst: bounded work', () => {
  it('allocates its pool once, and a child mashing the keypad never grows it', () => {
    const pool = new BurstPool(seeded(2));
    const slots = pool.bursts;
    const first = pool.bursts[0];
    const firstAngles = first.angles;

    for (let tap = 0; tap < 500; tap++) {
      pool.burst(tap % 390, tap % 844, 0.5);
      pool.step(0.016);
    }

    expect(pool.bursts).toBe(slots);
    expect(pool.bursts.length).toBe(MAX_BURSTS);
    expect(pool.bursts[0]).toBe(first);
    expect(first.angles).toBe(firstAngles);
    expect(first.angles.length).toBe(SPARKS_PER_BURST);
    expect(pool.alive).toBeLessThanOrEqual(MAX_BURSTS);
  });

  it('replaces the OLDEST burst when every slot is busy', () => {
    const pool = new BurstPool(seeded(3));
    for (let i = 0; i < MAX_BURSTS; i++) {
      pool.burst(i, 0, 0);
      pool.step(0.01);
    }
    pool.burst(99, 0, 0);

    const xs = pool.bursts.map(burst => burst.x);
    expect(xs).toContain(99);
    expect(xs).not.toContain(0);
    expect(pool.alive).toBe(MAX_BURSTS);
  });

  it('keeps a small, fixed number of sparks on screen however fast the taps come', () => {
    expect(MAX_BURSTS * SPARKS_PER_BURST).toBeLessThanOrEqual(100);
  });

  it('empties itself once every burst is spent, so the loop can stop', () => {
    const pool = new BurstPool(seeded(4));
    pool.burst(1, 1, 0);
    pool.burst(2, 2, 0);
    expect(pool.step(BURST_LIFE / 2)).toBe(2);
    expect(pool.step(BURST_LIFE / 2)).toBe(0);
    expect(pool.alive).toBe(0);
  });

  it('does not let a negative step bring a burst back to life', () => {
    const pool = new BurstPool(seeded(5));
    pool.burst(1, 1, 0);
    pool.step(-5);
    expect(pool.bursts[0].age).toBe(0);
  });

  it('can be cleared at once', () => {
    const pool = new BurstPool(seeded(6));
    pool.burst(1, 1, 0);
    pool.clear();
    expect(pool.alive).toBe(0);
  });
});

describe('tap burst: shape', () => {
  it('scatters all the way round the point, never off to one side', () => {
    for (let seed = 1; seed < 40; seed++) {
      const pool = new BurstPool(seeded(seed));
      pool.burst(0, 0, 0);
      const { angles } = pool.bursts[0];
      let x = 0;
      let y = 0;
      angles.forEach(angle => { x += Math.cos(angle); y += Math.sin(angle); });
      // Twelve unit vectors spread evenly sum to ~0; clumped ones do not
      expect(Math.hypot(x, y)).toBeLessThan(SPARKS_PER_BURST * 0.3);
    }
  });

  it('launches every spark within its speed range, at a visible size', () => {
    const pool = new BurstPool(seeded(7));
    pool.burst(0, 0, 0);
    pool.bursts[0].speeds.forEach(speed => {
      expect(speed).toBeGreaterThanOrEqual(SPARK_SPEED_MIN);
      expect(speed).toBeLessThanOrEqual(SPARK_SPEED_MAX);
    });
    pool.bursts[0].sizes.forEach(size => {
      expect(size).toBeGreaterThanOrEqual(1);
      expect(size).toBeLessThanOrEqual(4);
    });
  });

  it('starts where the finger is, fresh', () => {
    const pool = new BurstPool(seeded(8));
    pool.burst(120, 340, 0.3);
    const burst = pool.bursts[0];
    expect([burst.x, burst.y, burst.age, burst.hueMix, burst.live]).toEqual([120, 340, 0, 0.3, true]);
  });
});
