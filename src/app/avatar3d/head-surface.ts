import { FaceShape, HairStyle, HairTexture } from '../avatar/avatar-model';

/**
 * The 3D character's head, as arithmetic.
 *
 * Every part that sits on the head — hair, ears, eyes, brows, hats, glasses —
 * is placed against ONE surface per face shape, the same way the 2D sprite
 * placed everything against one outline. That is what makes every
 * combination fit by construction rather than by tuning: hair is a shell
 * grown out of this surface, so it cannot float above a square head or cut
 * into a heart-shaped one.
 *
 * Coordinates: the head is centred on the origin with a radius of about 1;
 * +y is up, +z faces the viewer, +x is the character's left (our right).
 * Nothing here imports three.js, so it can be tested as plain numbers.
 */

export type Vec3 = [number, number, number];

export function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * The point on the head's surface in the direction `dir` (need not be unit
 * length). Each face shape is a sphere pushed about in a different way.
 */
export function headPoint(shape: FaceShape, dir: Vec3): Vec3 {
  const [x, y, z] = normalise(dir);
  switch (shape) {
    case 'oval': {
      const jaw = y < 0 ? 1 - 0.18 * y * y : 1;
      return [x * 0.88 * jaw, y * 1.12, z * 0.92];
    }
    case 'square': {
      // A superellipsoid: flatter sides, squarer jaw and brow
      const n = 2.6;
      const r = 1 / Math.pow(Math.abs(x) ** n + Math.abs(y) ** n + Math.abs(z) ** n, 1 / n);
      return [x * r * 0.98, y * r * 0.94, z * r * 0.88];
    }
    case 'heart': {
      // Wide at the temples, tapering to a soft point at the chin
      let sx = 1 + 0.1 * Math.max(y, 0);
      let sy = 1;
      let sz = 0.94;
      if (y < 0) {
        const t = Math.pow(-y, 1.5);
        sx *= 1 - 0.38 * t;
        sz *= 1 - 0.12 * t;
        sy = 1.1;
      }
      return [x * sx, y * sy, z * sz];
    }
    case 'round':
    default: {
      const jaw = y < 0 ? 1 - 0.12 * y * y : 1;
      return [x * jaw, y, z * 0.94];
    }
  }
}

/** How far the surface is from the centre in direction `dir`. */
export function headRadius(shape: FaceShape, dir: Vec3): number {
  const p = headPoint(shape, dir);
  return Math.hypot(p[0], p[1], p[2]);
}

/**
 * How far the surface is from the centre along the RAY `ray`. Not the same
 * as `headRadius`: `headPoint` stretches each shape, so the point it gives
 * for a direction is not quite in that direction. This finds the direction
 * whose point IS on the ray, which is what "inside the head" means.
 */
export function radiusAlong(shape: FaceShape, ray: Vec3): number {
  const u = normalise(ray);
  let d = u;
  for (let i = 0; i < 20; i++) {
    const p = normalise(headPoint(shape, d));
    d = normalise([d[0] + u[0] - p[0], d[1] + u[1] - p[1], d[2] + u[2] - p[2]]);
  }
  return headRadius(shape, d);
}

/** Where the face looks from: angle round the head, 0 straight ahead. */
export function azimuth(dir: Vec3): number {
  return Math.atan2(dir[0], dir[2]);
}

/**
 * Where eyes, brows and the mouth sit, as directions from the centre. The
 * surface in those directions is where they are placed, so they sit ON every
 * face shape rather than hovering in front of one.
 */
export const EYE_DIRS: Vec3[] = [normalise([-0.36, 0.02, 0.93]), normalise([0.36, 0.02, 0.93])];
export const BROW_DIRS: Vec3[] = [normalise([-0.36, 0.3, 0.88]), normalise([0.36, 0.3, 0.88])];
export const MOUTH_DIR: Vec3 = normalise([0, -0.42, 0.9]);
export const NOSE_DIR: Vec3 = normalise([0, -0.16, 1]);
export const EAR_DIRS: Vec3[] = [normalise([-1, -0.05, 0.02]), normalise([1, -0.05, 0.02])];

/** The highest point of the brows, as a height on the head (y of the direction). */
export const BROW_TOP = 0.36;

export interface HairShape {
  /** How far the hair stands off the scalp, as a fraction of the head's radius. */
  thickness: number;
  /** The hairline over the forehead, as the y of a unit direction. */
  front: number;
  /** The hairline at the back of the neck. */
  back: number;
  /** A fringe: how far the front edge dips between its points, and how many. */
  fringe: [number, number];
  /** Round puffs over the whole shell: how tall, and how many over a whole sphere. */
  bumps: [number, number];
  /** How far the hair comes down in front of the ears. */
  sideburn: number;
}

/**
 * Nine styles as nine sets of numbers, all grown from the same surface. The
 * front hairline is never below the brows — tested — so no style covers the
 * eyes on any face.
 */
export const HAIR: { [style in HairStyle]: HairShape } = {
  short: { thickness: 0.1, front: 0.46, back: -0.3, fringe: [0.07, 5], bumps: [0, 0], sideburn: 0.22 },
  buzz: { thickness: 0.03, front: 0.5, back: -0.25, fringe: [0, 0], bumps: [0, 0], sideburn: 0.18 },
  long: { thickness: 0.12, front: 0.48, back: -0.45, fringe: [0.05, 3], bumps: [0, 0], sideburn: 0.3 },
  curly: { thickness: 0.2, front: 0.5, back: -0.35, fringe: [0.06, 7], bumps: [0.1, 70], sideburn: 0.22 },
  bun: { thickness: 0.07, front: 0.5, back: -0.25, fringe: [0, 0], bumps: [0, 0], sideburn: 0.12 },
  afro: { thickness: 0.55, front: 0.52, back: -0.3, fringe: [0, 0], bumps: [0.07, 110], sideburn: 0.16 },
  coils: { thickness: 0.28, front: 0.5, back: -0.3, fringe: [0, 0], bumps: [0.09, 200], sideburn: 0.18 },
  braids: { thickness: 0.07, front: 0.5, back: -0.3, fringe: [0, 0], bumps: [0, 0], sideburn: 0.12 },
  locs: { thickness: 0.12, front: 0.5, back: -0.4, fringe: [0, 0], bumps: [0.04, 150], sideburn: 0.2 }
};

/** Where the sideburns fall: this far round from the nose, in radians (about 69°). */
export const SIDEBURN_AT = 1.2;

/**
 * The hairline's height round the head: highest over the forehead, falling
 * past the temples to the nape, with the fringe's points along the front.
 */
export function hairline(style: HairStyle, dir: Vec3): number {
  const shape = HAIR[style];
  const phi = azimuth(dir);
  const behind = (1 - Math.cos(phi)) / 2; // 0 in front, 1 behind
  let line = shape.front + (shape.back - shape.front) * behind;
  // A sideburn just in front of each ear, so the side of the hair is not
  // one straight cut from forehead to nape
  line -= shape.sideburn * Math.exp(-(((Math.abs(phi) - SIDEBURN_AT) / 0.24) ** 2));
  const [depth, points] = shape.fringe;
  if (depth > 0 && Math.abs(phi) < Math.PI / 3) {
    // Points of the fringe hang down; never below the brows
    const dip = depth * Math.max(0, Math.cos(phi * points * 2));
    line = Math.max(line - dip, BROW_TOP + 0.04);
  }
  return line;
}

/** True where the style's hair covers the scalp. */
export function covered(style: HairStyle, dir: Vec3): boolean {
  const d = normalise(dir);
  return d[1] >= hairline(style, d);
}

/**
 * `count` points spread evenly over a sphere (a Fibonacci lattice). Puffs
 * are laid out on these rather than on a grid of angles, which would bunch
 * them into spikes at the crown.
 */
export function spherePoints(count: number): Vec3[] {
  const cached = POINTS.get(count);
  if (cached) {
    return cached;
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: Vec3[] = Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r] as Vec3;
  });
  POINTS.set(count, points);
  return points;
}
const POINTS = new Map<number, Vec3[]>();

/**
 * How far `dir` is up the nearest of `count` round puffs: 1 on a puff's
 * centre, 0 in the valley between puffs. Smooth everywhere but the valleys.
 */
export function puff(dir: Vec3, count: number): number {
  if (count <= 0) {
    return 0;
  }
  const d = normalise(dir);
  // A puff reaches about as far as the gap to its neighbours
  const reach = Math.sqrt((4 * Math.PI) / count) * 0.75;
  let best = 0;
  for (const p of spherePoints(count)) {
    const angle = Math.acos(Math.max(-1, Math.min(1, d[0] * p[0] + d[1] * p[1] + d[2] * p[2])));
    if (angle < reach) {
      const t = angle / reach;
      best = Math.max(best, (1 - t * t) ** 2);
    }
  }
  return best;
}

/** Extra ripple from the hair's texture, as a fraction of the radius. */
export function textureRipple(texture: HairTexture, dir: Vec3): number {
  const d = normalise(dir);
  switch (texture) {
    case 'wavy':
      // Waves running across the head in 3D, so none of them meet in a point
      return 0.022 * (Math.sin(9 * (0.8 * d[0] + 0.6 * d[1])) + Math.sin(9 * (0.6 * d[2] - 0.8 * d[1]))) / 2;
    case 'coily':
      return 0.045 * puff(d, 260);
    default:
      return 0;
  }
}

/**
 * Where the hair's outer surface is in direction `dir`, or null where there
 * is no hair. Thickness eases to nothing at the hairline, so the edge tucks
 * into the skin instead of ending in a cliff.
 */
export function hairPoint(
  shape: FaceShape, style: HairStyle, texture: HairTexture, dir: Vec3, capAt?: number
): Vec3 | null {
  const d = normalise(dir);
  const line = hairline(style, d);
  if (d[1] < line) {
    return null;
  }
  const spec = HAIR[style];
  const ease = Math.min(1, (d[1] - line) / 0.18);
  const [bumpHeight, bumpCount] = spec.bumps;
  let height = spec.thickness + bumpHeight * puff(d, bumpCount) + textureRipple(texture, d);
  if (capAt !== undefined) {
    // Under a hat, curls and all are pressed flat
    height = Math.min(height, capAt);
  }
  const lift = 1 + height * (0.35 + 0.65 * ease);
  const p = headPoint(shape, d);
  return [p[0] * lift, p[1] * lift, p[2] * lift];
}

/**
 * Where a hat's edge sits round the head: above the brows at the front,
 * tipped back so it comes down over the back of the head. A hat never
 * reaches the brows on any face — tested.
 */
export const HAT_FRONT = 0.44;
export const HAT_BACK = 0.02;

export function hatBrim(dir: Vec3): number {
  const behind = (1 - Math.cos(azimuth(dir))) / 2;
  return HAT_FRONT + (HAT_BACK - HAT_FRONT) * behind;
}

/** How far out a hat sits: clear of the flattened hair, which is at most this. */
export const HAT_CAP = 0.08;
export const HAT_LIFT = 1 + HAT_CAP + 0.05;
