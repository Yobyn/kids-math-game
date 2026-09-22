import {
  FIT_ATTRIBUTE,
  Fit,
  SHORT_MAX_HEIGHT,
  VIEWPORT_CONTENT,
  WIDE_MIN_WIDTH,
  isShort,
  layoutFor
} from './screen-fit';

/** Real devices, both ways up, as the numbers a browser actually reports. */
const DEVICES: { name: string; portrait: [number, number]; fit: [Fit, Fit] }[] = [
  { name: 'small phone',    portrait: [360, 740],  fit: ['stack', 'short'] },
  { name: 'phone',          portrait: [390, 844],  fit: ['stack', 'short'] },
  { name: 'large phone',    portrait: [430, 932],  fit: ['stack', 'short'] },
  { name: 'small tablet',   portrait: [768, 1024], fit: ['stack', 'stack'] },
  { name: 'tablet',         portrait: [820, 1180], fit: ['stack', 'wide'] },
  { name: 'large tablet',   portrait: [1024, 1366], fit: ['stack', 'wide'] }
];

describe('screen-fit: which shape the screen is', () => {
  it('stacks on every phone held upright', () => {
    DEVICES.forEach(device => {
      const [width, height] = device.portrait;
      expect(layoutFor({ width, height })).toBe(device.fit[0], device.name);
    });
  });

  it('knows a phone on its side from a tablet on its side', () => {
    // The whole reason this is not `(orientation: landscape)`: both are
    // landscape, and they want opposite layouts
    DEVICES.forEach(device => {
      const [width, height] = device.portrait;
      expect(layoutFor({ width: height, height: width })).toBe(device.fit[1], device.name);
    });
  });

  it('calls a phone on its side short', () => {
    expect(layoutFor({ width: 844, height: 390 })).toBe('short');
    expect(isShort({ width: 844, height: 390 })).toBe(true);
  });

  it('does not call a tablet on its side short, however wide it is', () => {
    expect(isShort({ width: 1180, height: 820 })).toBe(false);
    expect(isShort({ width: 1366, height: 1024 })).toBe(false);
  });

  it('switches at the height it says it does', () => {
    const wide = SHORT_MAX_HEIGHT + 400;
    expect(layoutFor({ width: wide, height: SHORT_MAX_HEIGHT })).toBe('short');
    expect(layoutFor({ width: wide, height: SHORT_MAX_HEIGHT + 1 }))
      .not.toBe('short');
  });

  it('needs the screen to be wider than it is tall before it is short', () => {
    // A short, NARROW window is a phone-shaped column and stacks fine
    expect(layoutFor({ width: 320, height: 500 })).toBe('stack');
    expect(layoutFor({ width: 520, height: 500 })).toBe('short');
  });

  it('calls a big screen wide, and only from the width it says', () => {
    expect(layoutFor({ width: WIDE_MIN_WIDTH - 1, height: 900 })).toBe('stack');
    expect(layoutFor({ width: WIDE_MIN_WIDTH, height: 900 })).toBe('wide');
  });

  it('prefers short over wide when a screen is both', () => {
    // A 1200x400 window is wide enough for the wide rule and too short to
    // stack; too short is the one that hurts, so it wins
    expect(layoutFor({ width: 1200, height: 400 })).toBe('short');
  });

  it('sweeps every size a browser is likely to report', () => {
    for (let width = 280; width <= 1600; width += 20) {
      for (let height = 280; height <= 1400; height += 20) {
        const fit = layoutFor({ width, height });
        expect(['stack', 'short', 'wide']).toContain(fit);

        if (fit === 'short') {
          expect(height).toBeLessThanOrEqual(SHORT_MAX_HEIGHT);
          expect(width).toBeGreaterThan(height);
        }
        if (fit === 'wide') {
          expect(width).toBeGreaterThanOrEqual(WIDE_MIN_WIDTH);
          expect(height).toBeGreaterThan(SHORT_MAX_HEIGHT);
        }
      }
    }
  });

  it('never leaves a size without a layout', () => {
    for (let width = 100; width <= 2000; width += 37) {
      for (let height = 100; height <= 2000; height += 41) {
        expect(layoutFor({ width, height })).toBeTruthy();
      }
    }
  });

  it('falls back to stacking on anything it cannot read', () => {
    // Stacking works everywhere, so it is what a nonsense size gets
    expect(layoutFor(null)).toBe('stack');
    expect(layoutFor(undefined)).toBe('stack');
    expect(layoutFor({ width: NaN, height: 800 })).toBe('stack');
    expect(layoutFor({ width: 800, height: NaN })).toBe('stack');
    expect(layoutFor({ width: 0, height: 0 })).toBe('stack');
    expect(layoutFor({ width: -900, height: -400 })).toBe('stack');
    expect(layoutFor({ width: Infinity, height: 400 })).toBe('stack');
  });
});

describe('screen-fit: the viewport the game asks for', () => {
  it('asks for the safe areas, or env() would be zero everywhere', () => {
    expect(VIEWPORT_CONTENT).toContain('viewport-fit=cover');
  });

  it('never blocks pinch zoom', () => {
    // Blocking it fails WCAG 1.4.4 and takes away the one thing a low-vision
    // player has. The usual excuse is iOS zooming on inputs under 16px, and
    // every input here is 1rem.
    expect(VIEWPORT_CONTENT).not.toContain('user-scalable');
    expect(VIEWPORT_CONTENT).not.toContain('maximum-scale');
  });

  it('still asks for device width at natural scale', () => {
    expect(VIEWPORT_CONTENT).toContain('width=device-width');
    expect(VIEWPORT_CONTENT).toContain('initial-scale=1');
  });

  it('publishes on an attribute a stylesheet can read', () => {
    expect(FIT_ATTRIBUTE).toBe('data-fit');
  });
});
