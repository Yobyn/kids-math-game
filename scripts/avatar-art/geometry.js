'use strict';

/**
 * The shape of a head, as numbers, and everything that has to sit on one.
 *
 * WHY THIS EXISTS. The character's hair used to be one fixed drawing per
 * style over a shared 100x100 box, and each face shape was another fixed
 * drawing over the same box. Nothing connected them. A style drawn for the
 * round face was reused unchanged on the square and heart faces, so of the
 * 36 face-and-hair combinations only the round ones had ever been fitted: on
 * the others the hair floated above the skull or cut into it, and the afro
 * sat as a flat arch above every head with skin showing underneath.
 *
 * SO THE HEAD IS NOW THE SOURCE OF TRUTH, and hair is GENERATED from it.
 * Each face outline is a function. Hair is a shell offset outward from that
 * outline along its normals, closed underneath by a hairline across the
 * forehead that starts and ends ON the outline. Built that way it cannot
 * float and cannot cut in, whatever face it is on — which is what
 * `avatar-art.test.js` checks for every combination rather than trusting.
 *
 * Plain JavaScript with no DOM and no dependencies, so it runs in `node
 * --test` and in the sprite generator alike. The app never loads it: it
 * ships only the SVG it produces (see build-sprite.js).
 */

const FACE_SHAPES = ['round', 'oval', 'square', 'heart'];
const HAIR_STYLES = ['short', 'long', 'curly', 'bun', 'afro', 'coils', 'braids', 'locs', 'buzz'];

/** Where the eyes and brows sit. Shared by every face, so glasses fit all. */
const EYE_Y = 52;
const EYES = [{ x: 39.5, y: EYE_Y }, { x: 60.5, y: EYE_Y }];
/** Half the width of the widest eye shape, which is what brows and hair must clear. */
const EYE_HALF_WIDTH = 6.4;
const EYE_HALF_HEIGHT = 6.8;
const BROW_Y = 42.6;

/** One point on a face outline. `a` is the angle from the top, clockwise. */
function facePoint(shape, a) {
  const s = Math.sin(a);
  const c = -Math.cos(a);              // -1 at the top, +1 at the chin
  switch (shape) {
    case 'round':
      return { x: 50 + 30 * s, y: 54 + 30 * c };
    case 'oval':
      return { x: 50 + 27 * s, y: 54 + 32 * c };
    case 'square': {
      // A superellipse: straight-ish sides, softened corners
      const n = 4.2;
      const f = v => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
      return { x: 50 + 31.5 * f(s), y: 54.5 + 29.5 * f(c) };
    }
    case 'heart': {
      // Broad through the temples, tapering to a soft point at the chin
      if (c <= 0) {
        return { x: 50 + 32 * s, y: 50 + 28 * c };
      }
      return { x: 50 + 32 * s * (1 - 0.42 * Math.pow(c, 1.6)), y: 50 + 37 * c };
    }
    default:
      throw new Error(`unknown face shape: ${shape}`);
  }
}

/** The whole outline, closed, starting at the crown and going clockwise. */
function outline(shape, n = 96) {
  return Array.from({ length: n }, (_, i) => facePoint(shape, (i / n) * Math.PI * 2));
}

/** The highest point of the head. */
function crownY(shape) {
  return facePoint(shape, 0).y;
}

/** The lowest point of the head. */
function chinY(shape) {
  return facePoint(shape, Math.PI).y;
}

/**
 * Where the outline crosses height `y` on one side, found on the outline
 * itself rather than solved, so it holds for any shape added later.
 */
function sidePoint(shape, y, side) {
  const steps = 2000;
  let best = null;
  // Right side runs a in (0, π), left side a in (π, 2π)
  const from = side === 'right' ? 0 : Math.PI;
  for (let i = 0; i <= steps; i++) {
    const a = from + (i / steps) * Math.PI;
    const p = facePoint(shape, a);
    const d = Math.abs(p.y - y);
    if (!best || d < best.d) {
      best = { d, a, p };
    }
  }
  return { ...best.p, a: best.a };
}

function halfWidthAt(shape, y) {
  return sidePoint(shape, y, 'right').x - 50;
}

/** Outward unit normal of the outline at angle `a`, from a small chord. */
function normalAt(shape, a) {
  const e = 1e-3;
  const p = facePoint(shape, a - e);
  const q = facePoint(shape, a + e);
  const tx = q.x - p.x;
  const ty = q.y - p.y;
  const len = Math.hypot(tx, ty) || 1;
  // Clockwise travel: outward is the tangent turned a quarter to the left
  return { x: ty / len, y: -tx / len };
}

/**
 * The hair styles, as the few numbers that make them differ. Everything else
 * is derived from the face they sit on.
 *
 *   thick   how far the hair stands off the scalp at the crown
 *   sideY   where the hair meets the face on each side (a sideburn)
 *   bumps   curls in the outline, as [count, depth]; 0 for none
 *   fringe  the hairline across the forehead, as [u, y] points where
 *           u runs -1..1 across the forehead between the two sideY points
 */
const STYLES = {
  short: { thick: 7, sideY: 47, bumps: 0,
    fringe: [[-1, 47], [-0.8, 41.2], [-0.5, 40.4], [-0.18, 37.6], [0.22, 32.4], [0.62, 32.8], [1, 47]] },
  long: { thick: 5, sideY: 50, bumps: 0,
    fringe: [[-1, 50], [-0.72, 40.4], [-0.34, 34.2], [0, 30.6], [0.34, 34.2], [0.72, 40.4], [1, 50]] },
  curly: { thick: 8, sideY: 49, bumps: [9, 3.2],
    fringe: [[-1, 49], [-0.74, 39.6], [-0.5, 37.4], [-0.25, 38.4], [0, 36.8], [0.25, 38.4], [0.5, 37.4], [0.74, 39.6], [1, 49]] },
  bun: { thick: 3.6, sideY: 46, bumps: 0,
    fringe: [[-1, 46], [-0.62, 34.8], [0, 31.4], [0.62, 34.8], [1, 46]] },
  afro: { thick: 15, sideY: 54, bumps: [13, 3],
    fringe: [[-1, 54], [-0.8, 40.4], [-0.45, 36.2], [0, 34.4], [0.45, 36.2], [0.8, 40.4], [1, 54]] },
  coils: { thick: 6.5, sideY: 48, bumps: [15, 2.5],
    fringe: [[-1, 48], [-0.75, 39.2], [-0.4, 36], [0, 34.6], [0.4, 36], [0.75, 39.2], [1, 48]] },
  braids: { thick: 4.4, sideY: 49, bumps: 0,
    fringe: [[-1, 49], [-0.72, 40], [-0.34, 34], [0, 30.4], [0.34, 34], [0.72, 40], [1, 49]] },
  locs: { thick: 5.2, sideY: 50, bumps: 0,
    fringe: [[-1, 50], [-0.72, 40.2], [-0.34, 34.4], [0, 31], [0.34, 34.4], [0.72, 40.2], [1, 50]] },
  buzz: { thick: 1.9, sideY: 46, bumps: 0,
    fringe: [[-1, 46], [-0.6, 33.6], [0, 30.6], [0.6, 33.6], [1, 46]] }
};

/** Smooth interpolation through [u, y] control points (Catmull-Rom in u). */
function sampleCurve(points, u) {
  if (u <= points[0][0]) return points[0][1];
  if (u >= points[points.length - 1][0]) return points[points.length - 1][1];
  let i = 0;
  while (points[i + 1][0] < u) i++;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(points.length - 1, i + 2)];
  const t = (u - p1[0]) / (p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
    + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
    + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
}

/**
 * The front of the hair: the shell over the skull and the hairline under it.
 * Returned as the points the drawing passes through, so the test checks what
 * is actually drawn.
 */
/**
 * How many points the outer edge is drawn through. Curls need three points
 * each so every valley between them is a real point, not an average; plain
 * hair needs far fewer. This is the resolution the sprite is drawn at AND the
 * one the test checks, so what passes is what a child sees.
 */
function stepsFor(style) {
  const def = STYLES[style];
  return def.bumps ? def.bumps[0] * 3 : 24;
}

function hairFront(shape, style, steps) {
  const def = STYLES[style];
  if (!def) {
    throw new Error(`unknown hair style: ${style}`);
  }
  steps = steps || stepsFor(style);
  const left = sidePoint(shape, def.sideY, 'left');
  const right = sidePoint(shape, def.sideY, 'right');

  // The outer edge: from the left side, over the crown, to the right side
  const aFrom = left.a - Math.PI * 2;   // negative, so the sweep passes 0 (the crown)
  const aTo = right.a;
  const outer = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = aFrom + (aTo - aFrom) * t;
    const p = facePoint(shape, a);
    const n = normalAt(shape, a);
    // Thinner where it meets the face, so a sideburn tapers rather than stops
    const taper = 0.45 + 0.55 * Math.sin(Math.PI * t);
    let thick = def.thick * taper;
    if (def.bumps) {
      const [count, depth] = def.bumps;
      thick += depth * Math.abs(Math.sin(Math.PI * count * t));
    }
    outer.push({ x: p.x + n.x * thick, y: p.y + n.y * thick, base: p, thick });
  }

  // The hairline, right to left, starting and ending ON the outline
  const halfW = (right.x - left.x) / 2;
  const fringe = [];
  const fSteps = 18;
  for (let i = 0; i <= fSteps; i++) {
    const u = 1 - (2 * i) / fSteps;
    const x = 50 + u * halfW;
    fringe.push({ x, y: sampleCurve(def.fringe, u) });
  }
  // Pin the ends to the outline exactly, so there is no seam to see
  fringe[0] = { x: right.x, y: right.y };
  fringe[fringe.length - 1] = { x: left.x, y: left.y };

  return { outer, fringe, polygon: [...outer, ...fringe], left, right, def };
}

/**
 * What hangs behind the head. Returns a list of closed shapes, since braids
 * and locs are several separate strands.
 */
function hairBack(shape, style) {
  const top = crownY(shape);
  const halfAt = y => halfWidthAt(shape, y);
  const def = STYLES[style];
  switch (style) {
    case 'long': {
      // Falls from behind the crown to the shoulders, a little wider than the head
      const shapeOut = [];
      const steps = 20;
      const reach = 0.52;              // how far round the head the offset shell goes
      for (let i = 0; i <= steps; i++) {
        const a = -Math.PI * reach + (2 * Math.PI * reach * i) / steps;
        const p = facePoint(shape, a);
        const n = normalAt(shape, a);
        shapeOut.push({ x: p.x + n.x * (def.thick + 2), y: p.y + n.y * (def.thick + 2) });
      }
      const r = shapeOut[shapeOut.length - 1];
      const l = shapeOut[0];
      const w = Math.max(halfAt(58), halfAt(50)) + def.thick + 1;
      const down = [
        { x: 50 + w + 1, y: 70 }, { x: 50 + w - 1, y: 86 }, { x: 50 + w - 6, y: 94 },
        { x: 50 + 11, y: 92 }, { x: 50 - 11, y: 92 },
        { x: 50 - w + 6, y: 94 }, { x: 50 - w + 1, y: 86 }, { x: 50 - w - 1, y: 70 }
      ];
      return [[...shapeOut, r, ...down, l].filter(Boolean)];
    }
    case 'curly':
    case 'coils':
    case 'afro': {
      // Volume behind and around the head, lower than the front shell reaches
      const extra = style === 'afro' ? 5 : 2.5;
      const reach = style === 'afro' ? 0.72 : 0.62;
      const [count, depth] = def.bumps;
      // Three points per curl, so every valley between curls is drawn exactly
      const steps = (count + 2) * 3;
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = -Math.PI * reach + 2 * Math.PI * reach * t;
        const p = facePoint(shape, a);
        const n = normalAt(shape, a);
        const thick = def.thick + extra + depth * Math.abs(Math.sin(Math.PI * (count + 2) * t));
        pts.push({ x: p.x + n.x * thick, y: p.y + n.y * thick });
      }
      // Close behind the face
      pts.push({ x: 50, y: facePoint(shape, Math.PI * reach).y - 6 });
      return [pts];
    }
    case 'bun': {
      const cy = top - 6.5;
      const r = 8.6;
      const pts = Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2;
        return { x: 50 + r * Math.cos(a), y: cy + r * 0.92 * Math.sin(a) };
      });
      return [pts];
    }
    case 'braids':
    case 'locs': {
      // Strands that start behind the head, just above the ears, and hang
      const strands = [];
      const lengths = style === 'braids' ? [96] : [86, 92];
      const width = style === 'braids' ? 7.4 : 5.8;
      for (const side of [-1, 1]) {
        lengths.forEach((bottom, k) => {
          const startY = 44 + k * 3;
          const x0 = 50 + side * (halfAt(startY) + (style === 'braids' ? 1.5 : 0.5 + k * 2.2));
          const x1 = 50 + side * (halfAt(Math.min(66, bottom - 8)) + 4 + k * 2.4);
          const pts = [];
          const steps = 6;
          // Down one edge and back up the other, a rounded strand
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const y = startY + (bottom - startY) * t;
            const x = x0 + (x1 - x0) * Math.sin(t * Math.PI / 2);
            pts.push({ x: x - side * width / 2, y });
          }
          pts.push({ x: x1, y: bottom + width / 2 });
          for (let i = steps; i >= 0; i--) {
            const t = i / steps;
            const y = startY + (bottom - startY) * t;
            const x = x0 + (x1 - x0) * Math.sin(t * Math.PI / 2);
            pts.push({ x: x + side * width / 2, y });
          }
          strands.push(pts);
        });
      }
      return strands;
    }
    default:
      return [];
  }
}

/** Ears: centred just inside the outline at ear height, so they always join the head. */
function ears(shape) {
  const y = 55;
  const l = sidePoint(shape, y, 'left');
  const r = sidePoint(shape, y, 'right');
  return [{ x: l.x + 1.2, y, rx: 5.4, ry: 7.6 }, { x: r.x - 1.2, y, rx: 5.4, ry: 7.6 }];
}

/**
 * Where a hat's brim sits: far enough down to hold, high enough above the
 * brows to leave the face readable. The app reads these numbers too (the
 * hat hides the hair above this line), and a test keeps the two in step.
 */
function hatLine(shape) {
  return Math.round((crownY(shape) + 13.5) * 10) / 10;
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y)
      && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

module.exports = {
  FACE_SHAPES, HAIR_STYLES, STYLES, EYES, EYE_Y, EYE_HALF_WIDTH, EYE_HALF_HEIGHT, BROW_Y,
  facePoint, outline, crownY, chinY, sidePoint, halfWidthAt, normalAt,
  hairFront, hairBack, ears, hatLine, pointInPolygon, sampleCurve, stepsFor
};
