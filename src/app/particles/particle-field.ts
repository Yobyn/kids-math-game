/**
 * The maths behind the particle backdrop, kept free of the DOM so it can be
 * tested directly: a ring of points that drift outward and rotate, coloured
 * blue through magenta by their angle.
 */

export interface FieldParticle {
  /** Angle around the ring, radians. */
  angle: number;
  /** Distance from the centre, as a fraction of the ring radius. */
  radius: number;
  /** Radians per second — inner points sweep faster, as dust in a disc does. */
  spin: number;
  /** Fraction of the ring radius per second. */
  drift: number;
  size: number;
  alpha: number;
  /** 0 at the blue end of the ring, 1 at the magenta end. */
  hueMix: number;
}

export const RING_INNER = 0.62;
export const RING_OUTER = 1.0;
/** Past this the particle has left the ring and is recycled inward. */
export const RING_FADE = 1.18;

const BLUE = { r: 56, g: 128, b: 255 };
const MAGENTA = { r: 214, g: 51, b: 235 };

function random(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createParticle(seedRadius?: number): FieldParticle {
  const angle = Math.random() * Math.PI * 2;
  const radius = seedRadius ?? random(RING_INNER, RING_OUTER);
  return {
    angle,
    radius,
    // Closer in, faster around
    spin: random(0.02, 0.07) * (RING_OUTER / Math.max(radius, RING_INNER)),
    drift: random(0.005, 0.035),
    size: random(0.6, 2.1),
    alpha: random(0.25, 0.95),
    hueMix: angleToHueMix(angle)
  };
}

export function createField(count: number): FieldParticle[] {
  return Array.from({ length: count }, () => createParticle());
}

/**
 * Blue at the top-left of the ring, magenta at the bottom-right, mirrored so
 * the two ends meet without a seam.
 */
export function angleToHueMix(angle: number): number {
  const turns = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const half = turns / Math.PI;
  return half <= 1 ? half : 2 - half;
}

export function particleColour(particle: FieldParticle): string {
  const mix = Math.min(Math.max(particle.hueMix, 0), 1);
  const r = Math.round(BLUE.r + (MAGENTA.r - BLUE.r) * mix);
  const g = Math.round(BLUE.g + (MAGENTA.g - BLUE.g) * mix);
  const b = Math.round(BLUE.b + (MAGENTA.b - BLUE.b) * mix);
  return `rgba(${r}, ${g}, ${b}, ${particle.alpha.toFixed(3)})`;
}

/** Advances one particle by `seconds`, recycling it inward once it fades out. */
export function stepParticle(particle: FieldParticle, seconds: number): FieldParticle {
  const angle = particle.angle + particle.spin * seconds;
  const radius = particle.radius + particle.drift * seconds;

  if (radius >= RING_FADE) {
    return createParticle(RING_INNER);
  }

  return { ...particle, angle, radius, hueMix: angleToHueMix(angle) };
}

/** Fades particles out as they leave the ring, so nothing pops. */
export function edgeFade(radius: number): number {
  if (radius <= RING_OUTER) {
    return 1;
  }
  return Math.max(0, 1 - (radius - RING_OUTER) / (RING_FADE - RING_OUTER));
}
