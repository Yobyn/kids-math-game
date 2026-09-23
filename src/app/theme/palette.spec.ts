import {
  AA_LARGE,
  contrastRatio,
  fieldHex,
  parseHex,
  relativeLuminance,
  stepColour
} from './palette';
import { createParticle, particleColour } from '../particles/particle-field';

describe('the palette, taken from the particle field', () => {
  it('starts the grades at the field\'s own blue and ends them at its magenta', () => {
    // The whole claim: these are points ON the ring, not lookalikes of it
    expect(stepColour(1, 10)).toBe('#3880ff');
    expect(stepColour(10, 10)).toBe('#d633eb');
  });

  it('agrees with the colour the field actually draws, at the same point', () => {
    // If the field's colour maths ever changes, the grades follow it
    const particle = { ...createParticle(), hueMix: 0.5, alpha: 1 };
    const drawn = particleColour(particle).match(/\d+/g)!.slice(0, 3).map(Number);
    const hex = fieldHex(0.5);
    expect([1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))).toEqual(drawn);
  });

  it('walks the ring in order, so the grades read as one journey', () => {
    const reds = Array.from({ length: 10 }, (_, i) => parseHex(stepColour(i + 1, 10))!.r);
    const greens = Array.from({ length: 10 }, (_, i) => parseHex(stepColour(i + 1, 10))!.g);
    for (let i = 1; i < 10; i++) {
      expect(reds[i]).toBeGreaterThan(reds[i - 1]); // toward magenta
      expect(greens[i]).toBeLessThan(greens[i - 1]);
    }
  });

  it('gives every grade a different colour', () => {
    const colours = new Set(Array.from({ length: 10 }, (_, i) => stepColour(i + 1, 10)));
    expect(colours.size).toBe(10);
  });

  it('keeps the number on every grade badge readable', () => {
    // White, bold and large on the ring colour. Large text needs 3:1.
    for (let grade = 1; grade <= 10; grade++) {
      const ratio = contrastRatio('#ffffff', stepColour(grade, 10));
      expect(ratio).withContext(`grade ${grade}`).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('never divides by zero or walks off the ring', () => {
    expect(stepColour(1, 1)).toBe('#3880ff');
    expect(stepColour(0, 10)).toBe(stepColour(1, 10));
    expect(stepColour(99, 10)).toBe(stepColour(10, 10));
  });

  it('works for any length of ordered choice, not just ten', () => {
    // The difficulty screen uses three: blue, the middle, magenta
    expect(stepColour(1, 3)).toBe('#3880ff');
    expect(stepColour(2, 3)).toBe(fieldHex(0.5));
    expect(stepColour(3, 3)).toBe('#d633eb');
  });
});

describe('the contrast arithmetic the theme is held to', () => {
  it('knows the ends of the scale', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3880ff', '#3880ff')).toBeCloseTo(1, 5);
  });

  it('does not care which colour comes first', () => {
    expect(contrastRatio('#221c3f', '#f4f2fc')).toBeCloseTo(contrastRatio('#f4f2fc', '#221c3f'), 10);
  });

  it('reproduces the failure that started this: the old equals sign', () => {
    // Green #4caf50 on white measured 2.78:1 — below AA even as large text
    expect(contrastRatio('#4caf50', '#ffffff')).toBeLessThan(AA_LARGE);
  });

  it('reads short hex and refuses anything else', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex('not a colour')).toBeNull();
    expect(parseHex('#12345')).toBeNull();
    expect(() => relativeLuminance('red')).toThrow();
  });
});
