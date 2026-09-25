import { FACE_SHAPES, HAIR_STYLES, HAIR_TEXTURES } from '../avatar/avatar-model';
import {
  BROW_DIRS, BROW_TOP, EAR_DIRS, EYE_DIRS, HAIR, HAT_BACK, HAT_CAP, HAT_FRONT, HAT_LIFT, SIDEBURN_AT, Vec3,
  azimuth, covered, hairPoint, hairline, hatBrim, headPoint, headRadius, normalise, puff, radiusAlong, spherePoints, textureRipple
} from './head-surface';

/** Directions all over a sphere, for checking a rule holds everywhere. */
function everywhere(count = 600): Vec3[] {
  return spherePoints(count);
}

function round(phi: number, y = 0): Vec3 {
  return normalise([Math.sin(phi), y, Math.cos(phi)]);
}

describe('head surface', () => {
  it('is a closed head about a unit across for every face shape', () => {
    for (const shape of FACE_SHAPES) {
      for (const dir of everywhere()) {
        const r = headRadius(shape, dir);
        expect(r).toBeGreaterThan(0.75, `${shape} too small at ${dir}`);
        expect(r).toBeLessThan(1.2, `${shape} too big at ${dir}`);
      }
    }
  });

  it('points in the direction it was asked about', () => {
    for (const shape of FACE_SHAPES) {
      const p = headPoint(shape, [0.3, 0.4, 0.8]);
      const d = normalise([0.3, 0.4, 0.8]);
      // Same side of every axis as the direction
      expect(Math.sign(p[0])).toBe(Math.sign(d[0]));
      expect(Math.sign(p[1])).toBe(Math.sign(d[1]));
      expect(Math.sign(p[2])).toBe(Math.sign(d[2]));
    }
  });

  it('is the same on both sides, so the character is not lopsided', () => {
    for (const shape of FACE_SHAPES) {
      for (const dir of everywhere(200)) {
        const left = headPoint(shape, dir);
        const right = headPoint(shape, [-dir[0], dir[1], dir[2]]);
        expect(right[0]).toBeCloseTo(-left[0], 9);
        expect(right[1]).toBeCloseTo(left[1], 9);
        expect(right[2]).toBeCloseTo(left[2], 9);
      }
    }
  });

  it('gives each face shape its own outline', () => {
    const chin: Vec3 = [0, -1, 0.2];
    const temple: Vec3 = [1, 0.4, 0.2];
    const widths = FACE_SHAPES.map(shape => headPoint(shape, temple)[0]);
    const chins = FACE_SHAPES.map(shape => headPoint(shape, chin)[1]);
    // Four different shapes, not one shape four times
    expect(new Set(widths.map(w => w.toFixed(3))).size).toBe(4);
    // An oval is longer than a round face; a heart is wider at the temples than at the jaw
    expect(headPoint('oval', [0, 1, 0])[1]).toBeGreaterThan(headPoint('round', [0, 1, 0])[1]);
    expect(chins[FACE_SHAPES.indexOf('oval')]).toBeLessThan(chins[FACE_SHAPES.indexOf('round')]);
    expect(headPoint('heart', temple)[0]).toBeGreaterThan(headPoint('heart', [1, -0.6, 0.2])[0]);
    // A square head is fuller at the corners than a round one
    const corner: Vec3 = [1, 1, 0.3];
    expect(headRadius('square', corner)).toBeGreaterThan(headRadius('round', corner) * 0.98);
  });

  it('puts the features on the front of the face and the ears on the sides', () => {
    for (const d of [...EYE_DIRS, ...BROW_DIRS]) {
      expect(d[2]).toBeGreaterThan(0.8);
    }
    expect(BROW_DIRS[0][1]).toBeGreaterThan(EYE_DIRS[0][1]);
    for (const d of EAR_DIRS) {
      expect(Math.abs(d[0])).toBeGreaterThan(0.95);
    }
    expect(BROW_TOP).toBeGreaterThan(BROW_DIRS[0][1]);
  });

  it('measures how far out the surface is along any ray, for every shape', () => {
    for (const shape of FACE_SHAPES) {
      for (const d of everywhere(300)) {
        const p = headPoint(shape, d);
        expect(radiusAlong(shape, p)).toBeCloseTo(Math.hypot(...p), 6);
      }
    }
  });

  it('measures angles round the head from the nose', () => {
    expect(azimuth([0, 0, 1])).toBeCloseTo(0, 9);
    expect(azimuth([1, 0, 0])).toBeCloseTo(Math.PI / 2, 9);
    expect(Math.abs(azimuth([0, 0, -1]))).toBeCloseTo(Math.PI, 9);
  });
});

describe('hairline', () => {
  it('never comes below the brows across the width of the brows, for any style', () => {
    // The brows reach about 0.55 rad either side of the nose
    for (const style of HAIR_STYLES) {
      for (let i = -60; i <= 60; i++) {
        const phi = (i / 60) * 0.6;
        expect(hairline(style, round(phi))).toBeGreaterThanOrEqual(BROW_TOP + 0.04 - 1e-9,
          `${style} covers the brows at ${phi.toFixed(2)}`);
      }
    }
  });

  it('leaves both eyes and both brows uncovered on every style', () => {
    for (const style of HAIR_STYLES) {
      for (const d of [...EYE_DIRS, ...BROW_DIRS]) {
        expect(covered(style, d)).toBe(false, `${style} covers a feature`);
      }
    }
  });

  it('is highest at the front and falls to the nape', () => {
    for (const style of HAIR_STYLES) {
      const front = hairline(style, round(0.5));
      const side = hairline(style, round(Math.PI / 2 + 0.3));
      const back = hairline(style, round(Math.PI));
      expect(front).toBeGreaterThan(side, style);
      expect(side).toBeGreaterThan(back, style);
      expect(back).toBeCloseTo(HAIR[style].back, 6);
    }
  });

  it('comes down into a sideburn in front of each ear', () => {
    for (const style of HAIR_STYLES) {
      const sideburn = hairline(style, round(SIDEBURN_AT));
      const withoutIt = HAIR[style].front + (HAIR[style].back - HAIR[style].front) * (1 - Math.cos(SIDEBURN_AT)) / 2;
      expect(sideburn).toBeCloseTo(withoutIt - HAIR[style].sideburn, 6);
      expect(hairline(style, round(-SIDEBURN_AT))).toBeCloseTo(sideburn, 9);
      // In front of the ear, not over it
      expect(SIDEBURN_AT).toBeLessThan(azimuth(EAR_DIRS[1]) - 0.2);
    }
  });

  it('dips into points along a fringe, only where the style has one', () => {
    const fringed = hairline('short', round(0));
    const plain = HAIR.short.front;
    expect(fringed).toBeLessThan(plain);
    expect(hairline('buzz', round(0))).toBeCloseTo(HAIR.buzz.front, 9);
  });
});

describe('hair', () => {
  it('grows outwards from the scalp, never into it, on all 36 face and style pairs in every texture', () => {
    for (const shape of FACE_SHAPES) {
      for (const style of HAIR_STYLES) {
        for (const texture of HAIR_TEXTURES) {
          const inside = everywhere(300).filter(dir => {
            const p = hairPoint(shape, style, texture, dir);
            return p && Math.hypot(...p) <= radiusAlong(shape, p);
          });
          expect(inside.length).toBe(0, `${shape}/${style}/${texture} inside the head`);
        }
      }
    }
  });

  it('is there exactly where the style covers the scalp', () => {
    for (const style of HAIR_STYLES) {
      for (const dir of everywhere(300)) {
        expect(hairPoint('round', style, 'smooth', dir) !== null).toBe(covered(style, dir));
      }
    }
  });

  it('thins towards the hairline instead of ending in a cliff', () => {
    const line = hairline('afro', round(Math.PI));
    const atEdge = hairPoint('round', 'afro', 'smooth', normalise([0, line + 0.001, -1]))!;
    const high = hairPoint('round', 'afro', 'smooth', normalise([0, 0.9, -0.3]))!;
    const edgeLift = Math.hypot(...atEdge) / radiusAlong('round', atEdge);
    const highLift = Math.hypot(...high) / radiusAlong('round', high);
    expect(edgeLift).toBeLessThan(highLift);
    expect(edgeLift).toBeGreaterThan(1);
  });

  it('stands further off the head for big styles than for a buzz cut', () => {
    const top: Vec3 = [0, 1, 0];
    const lift = (style: any) => Math.hypot(...hairPoint('round', style, 'smooth', top)!);
    expect(lift('afro')).toBeGreaterThan(lift('curly'));
    expect(lift('curly')).toBeGreaterThan(lift('short'));
    expect(lift('short')).toBeGreaterThan(lift('buzz'));
  });

  it('is pressed flat under a hat, curls and all, on every combination', () => {
    for (const shape of FACE_SHAPES) {
      for (const style of HAIR_STYLES) {
        for (const texture of HAIR_TEXTURES) {
          const standingUp = everywhere(300).filter(dir => {
            const p = hairPoint(shape, style, texture, dir, HAT_CAP);
            return p && Math.hypot(...p) / radiusAlong(shape, p) > 1 + HAT_CAP + 1e-6;
          });
          expect(standingUp.length).toBe(0, `${shape}/${style}/${texture}`);
        }
      }
    }
  });
});

describe('textures and puffs', () => {
  it('spreads puff centres evenly over the whole head, with none bunched at the crown', () => {
    const points = spherePoints(120);
    expect(points.length).toBe(120);
    let closest = Infinity;
    for (let i = 0; i < points.length; i++) {
      expect(Math.hypot(...points[i])).toBeCloseTo(1, 9);
      for (let j = i + 1; j < points.length; j++) {
        closest = Math.min(closest, Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1], points[i][2] - points[j][2]));
      }
    }
    // An even spread of 120 has neighbours about 0.33 apart; a grid of angles would put some almost on top of each other
    expect(closest).toBeGreaterThan(0.2);
    expect(spherePoints(120)).toBe(points);
  });

  it('peaks at 1 on a puff and falls to 0 between them', () => {
    const [centre] = spherePoints(50);
    expect(puff(centre, 50)).toBeCloseTo(1, 9);
    for (const dir of everywhere(200)) {
      const v = puff(dir, 50);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const values = everywhere(400).map(d => puff(d, 50));
    expect(Math.min(...values)).toBeLessThan(0.2);
    expect(puff(centre, 0)).toBe(0);
  });

  it('ripples wavy and coily hair a little and leaves smooth hair alone', () => {
    const ripples = (texture: any) => everywhere(300).map(d => textureRipple(texture, d));
    expect(ripples('smooth').every(v => v === 0)).toBe(true);
    for (const texture of ['wavy', 'coily']) {
      const values = ripples(texture);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.01, texture);
      expect(Math.max(...values.map(Math.abs))).toBeLessThan(0.06, texture);
    }
  });
});

describe('hat line', () => {
  it('sits above the brows at the front and comes down over the back', () => {
    expect(hatBrim(round(0))).toBeCloseTo(HAT_FRONT, 9);
    expect(hatBrim(round(Math.PI))).toBeCloseTo(HAT_BACK, 9);
    expect(HAT_FRONT).toBeGreaterThan(BROW_TOP);
    for (const d of BROW_DIRS) {
      expect(d[1]).toBeLessThan(hatBrim(d));
    }
    expect(hatBrim(round(Math.PI / 2))).toBeCloseTo((HAT_FRONT + HAT_BACK) / 2, 9);
  });

  it('stands clear of the flattened hair, so no hair pokes through a hat', () => {
    expect(HAT_LIFT).toBeGreaterThan(1 + HAT_CAP);
  });
});
