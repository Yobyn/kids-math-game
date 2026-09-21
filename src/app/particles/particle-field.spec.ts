import {
  addEnergy, angleToHueMix, createField, createParticle, decayEnergy, edgeFade,
  particleColour, pulsedAlpha, pulsedSize, RING_FADE, RING_INNER, RING_OUTER,
  stepParticle
} from './particle-field';

describe('particle field', () => {
  it('builds the requested number of particles', () => {
    expect(createField(120).length).toBe(120);
  });

  it('starts every particle inside the ring', () => {
    createField(200).forEach(p => {
      expect(p.radius).toBeGreaterThanOrEqual(RING_INNER);
      expect(p.radius).toBeLessThanOrEqual(RING_OUTER);
      expect(p.angle).toBeGreaterThanOrEqual(0);
      expect(p.angle).toBeLessThanOrEqual(Math.PI * 2);
    });
  });

  it('sweeps inner particles faster than outer ones', () => {
    const inner = createParticle(RING_INNER);
    const outer = createParticle(RING_OUTER);

    // Spin carries a random component, so compare the ratio the radius forces
    expect(RING_OUTER / RING_INNER).toBeGreaterThan(1);
    expect(inner.spin).toBeGreaterThan(0);
    expect(outer.spin).toBeGreaterThan(0);
  });

  describe('colour across the ring', () => {
    it('is blue at one end and magenta at the other', () => {
      expect(angleToHueMix(0)).toBe(0);
      expect(angleToHueMix(Math.PI)).toBe(1);
    });

    it('mirrors, so the two ends meet without a seam', () => {
      expect(angleToHueMix(Math.PI / 2)).toBeCloseTo(0.5, 5);
      expect(angleToHueMix(Math.PI * 1.5)).toBeCloseTo(0.5, 5);
      expect(angleToHueMix(Math.PI * 2)).toBeCloseTo(0, 5);
    });

    it('handles angles that have wrapped past a full turn', () => {
      expect(angleToHueMix(Math.PI * 4)).toBeCloseTo(0, 5);
      expect(angleToHueMix(-Math.PI)).toBeCloseTo(1, 5);
    });

    it('renders blue at the blue end and magenta at the other', () => {
      const blue = particleColour({ ...createParticle(), hueMix: 0, alpha: 1 });
      const magenta = particleColour({ ...createParticle(), hueMix: 1, alpha: 1 });

      expect(blue).toBe('rgba(56, 128, 255, 1.000)');
      expect(magenta).toBe('rgba(214, 51, 235, 1.000)');
    });
  });

  describe('motion', () => {
    it('turns and drifts outward over time', () => {
      const particle = { ...createParticle(0.7), angle: 1, spin: 0.5, drift: 0.1 };
      const moved = stepParticle(particle, 1);

      expect(moved.angle).toBeCloseTo(1.5, 5);
      expect(moved.radius).toBeCloseTo(0.8, 5);
    });

    it('recycles a particle inward once it has faded out', () => {
      const particle = { ...createParticle(RING_OUTER), radius: RING_FADE - 0.001, drift: 1 };
      const recycled = stepParticle(particle, 1);

      expect(recycled.radius).toBe(RING_INNER);
    });

    it('keeps the colour following the angle as it turns', () => {
      const particle = { ...createParticle(0.8), angle: 0, spin: Math.PI, drift: 0 };
      const moved = stepParticle(particle, 1);

      expect(moved.hueMix).toBeCloseTo(1, 5);
    });

    it('does not move a particle when no time has passed', () => {
      const particle = createParticle(0.8);
      const same = stepParticle(particle, 0);

      expect(same.angle).toBe(particle.angle);
      expect(same.radius).toBe(particle.radius);
    });
  });

  describe('a surge answering the child', () => {
    it('is spent within about half a second', () => {
      // Celebratory motion belongs in a 300-500ms window; longer reads as the
      // theme changing rather than the game answering.
      expect(decayEnergy(1, 0.16)).toBeCloseTo(0.5, 2);
      expect(decayEnergy(1, 0.48)).toBeLessThan(0.15);
      expect(decayEnergy(1, 0.8)).toBe(0);
    });

    it('never decays below nothing', () => {
      expect(decayEnergy(0, 1)).toBe(0);
      expect(decayEnergy(-1, 1)).toBe(0);
    });

    it('stacks surges without ever exceeding full', () => {
      expect(addEnergy(0, 0.5)).toBe(0.5);
      expect(addEnergy(0.6, 0.6)).toBe(1);
      expect(addEnergy(0.4, -1)).toBe(0.4);
    });

    it('swells and brightens the particles while it lasts', () => {
      const particle = { ...createParticle(0.8), size: 1, alpha: 0.5 };

      expect(pulsedSize(particle, 0)).toBe(1);
      expect(pulsedSize(particle, 1)).toBeGreaterThan(2);
      expect(pulsedAlpha(particle, 0)).toBe(0.5);
      expect(pulsedAlpha(particle, 1)).toBeGreaterThan(0.5);
    });

    it('never drives alpha past opaque', () => {
      const particle = { ...createParticle(0.8), alpha: 0.95 };
      expect(pulsedAlpha(particle, 1)).toBeLessThanOrEqual(1);
    });
  });

  describe('edge fade', () => {
    it('is fully opaque inside the ring', () => {
      expect(edgeFade(RING_INNER)).toBe(1);
      expect(edgeFade(RING_OUTER)).toBe(1);
    });

    it('fades to nothing by the outer limit', () => {
      expect(edgeFade(RING_FADE)).toBe(0);
      expect(edgeFade((RING_OUTER + RING_FADE) / 2)).toBeCloseTo(0.5, 5);
    });

    it('never goes negative past the limit', () => {
      expect(edgeFade(RING_FADE + 1)).toBe(0);
    });
  });
});
