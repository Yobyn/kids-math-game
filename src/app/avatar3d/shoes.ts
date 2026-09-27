import * as THREE from 'three';
import { NO_ITEM } from '../avatar/avatar-model';
import { shade } from '../avatar/avatar-parts';
import { Figure, KNEE_FORWARD, legLength, legRadiusAlong } from './figure';
import { part, starShape, toon } from './toon';

/**
 * What the character stands in: the sneakers everyone starts with, and the
 * shoes to earn — high-tops, boots and light-up trainers.
 *
 * Every shoe is built on the same foot (the figure's own length and width,
 * flat on the stand). One that comes up the leg — the high-tops' collar, a
 * boot's shaft — is a tube round the trouser leg, along the leg's own slant.
 * The legs stand too close for a tube round the full hem (a fifth of a head
 * apart), so the trousers tuck in: inside a collar the leg narrows to
 * `TUCKED` of the hem, tapering to it just above (`legRadius`), and the
 * collar is that plus `SHOE_GAP`. build-avatar.ts builds the leg from the
 * same function, so the two fit on both figures by construction.
 */

/** Room between a shoe's collar and the trouser leg inside it: more than both outlines (0.04 and 0.025). */
export const SHOE_GAP = 0.08;
/** How narrow a trouser leg tucked into a collar is, as a share of its hem. */
export const TUCKED = 0.78;
/** How far above a collar the tucked leg widens back to its own width, in units. */
export const TAPER = 0.4;
/** The light-up trainers' soles, named so rig.ts can make them glow. */
export const SHOE_GLOW = 'shoe-glow';

const SOLE = '#e4e9ea';
const SHOE = '#2c3944';
const LACE = '#dfe6ea';

interface Look {
  upper: string;
  sole: THREE.Material;
  toe: string | null;
  laces: string | null;
  /** How far up the leg the collar comes, as a share of ankle to knee; 0 for none. */
  collar: number;
  soleHeight: number;
}

function look(id: string, colour: string): Look | null {
  switch (id) {
    case NO_ITEM:
      return { upper: SHOE, sole: toon(SOLE), toe: SOLE, laces: LACE, collar: 0, soleHeight: 0.26 };
    case 'high-tops':
      return { upper: colour, sole: toon(SOLE), toe: SOLE, laces: LACE, collar: 0.2, soleHeight: 0.26 };
    case 'boots':
      return { upper: colour, sole: toon(shade(colour, 0.55)), toe: null, laces: null, collar: 0.45, soleHeight: 0.32 };
    case 'light-up':
      // An unlit sole, so it reads as light, not as a colour in shadow
      return { upper: '#f2f4f7', sole: new THREE.MeshBasicMaterial({ color: colour }), toe: null, laces: colour, collar: 0, soleHeight: 0.26 };
    default:
      return null;
  }
}

/** How far up the leg a shoe comes, as a share of ankle to knee: 0 for one that stops at the ankle, or does not exist. */
export function collarShare(id: string): number {
  const style = look(id, '');
  return style ? style.collar : 0;
}

/**
 * The lower trouser leg's radius `s` up from the ankle, in a shoe whose
 * collar comes `share` of the way to the knee: its own (`legRadiusAlong`)
 * with no collar, tucked in inside one.
 */
export function legRadius(figure: Figure, s: number, share: number): number {
  if (share <= 0) {
    return legRadiusAlong(figure, s);
  }
  const top = legLength(figure) * share;
  const tucked = figure.legRadii[2] * TUCKED;
  if (s <= top) {
    return tucked;
  }
  const t = Math.min((s - top) / TAPER, 1);
  return tucked + (legRadiusAlong(figure, s) - tucked) * t;
}

/**
 * One shoe, for the leg on `side` (−1 or 1), standing on the floor (y 0).
 * Null for a shoe that does not exist.
 */
export function buildShoe(id: string, colour: string, figure: Figure, side: number): THREE.Group | null {
  const style = look(id, colour);
  if (!style) {
    return null;
  }
  const [footLength, footWidth] = figure.foot;
  const ankle = new THREE.Vector3(side * figure.ankle[0], figure.ankle[1], 0);
  const knee = new THREE.Vector3(side * figure.knee[0], figure.knee[1], KNEE_FORWARD);
  const group = new THREE.Group();
  group.name = 'shoe';
  group.userData.item = id;

  // The foot: a sole, an upper over it, a toe cap and laces. A collar, round
  // the tucked-in trousers, is narrower than the foot it stands on (a test
  // holds it)
  const foot = new THREE.Group();
  foot.position.set(ankle.x, 0, 0.18 * footLength);
  const sole = part(id === 'light-up' ? SHOE_GLOW : 'shoe-sole', new THREE.CylinderGeometry(0.5, 0.5, style.soleHeight, 28), style.sole, 0.02);
  sole.scale.set(footWidth, 1, footLength);
  sole.position.y = style.soleHeight / 2;
  const rise = style.soleHeight - 0.26;
  const upper = part('shoe-upper', new THREE.SphereGeometry(0.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), toon(style.upper), 0.025);
  upper.scale.set(footWidth * 0.94, 1.15, footLength * 0.94);
  upper.position.y = 0.24 + rise;
  foot.add(sole, upper);
  if (style.toe) {
    const toe = part('shoe-toe', new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(style.toe), 0.02);
    toe.scale.set(footWidth * 0.8, 0.5, footLength * 0.34);
    toe.position.set(0, 0.24 + rise, footLength * 0.3);
    foot.add(toe);
  }
  if (style.laces) {
    for (let i = 0; i < 3; i++) {
      const lace = part('shoe-lace', new THREE.BoxGeometry(footWidth * 0.5, 0.05, 0.06), toon(style.laces), 0.008);
      lace.position.set(0, 0.62 + rise + i * 0.1 - i * i * 0.02, footLength * (0.14 - i * 0.1));
      foot.add(lace);
    }
  }
  if (id === 'light-up') {
    // A stripe of the same light round the upper
    const stripe = part('shoe-stripe', new THREE.TorusGeometry(0.5, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: colour }), 0);
    stripe.rotation.x = Math.PI / 2;
    stripe.scale.set(footWidth * 0.94 * 0.93, footLength * 0.94 * 0.93, 1);
    stripe.position.y = 0.24 + 0.2;
    foot.add(stripe);
  }
  group.add(foot);

  if (style.collar > 0) {
    group.add(collar(style, figure, ankle, knee, side));
  }
  return group;
}

/**
 * A shoe's collar or a boot's shaft: a tube round the trouser leg from
 * inside the upper to `share` of the way to the knee, the leg's radius plus
 * the gap at every point, with a rolled rim at the top.
 */
function collar(style: Look, figure: Figure, ankle: THREE.Vector3, knee: THREE.Vector3, side: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'shoe-collar';
  const axis = knee.clone().sub(ankle);
  const length = axis.length() * style.collar;
  axis.normalize();
  // From the top of the sole, below the ankle
  const below = (ankle.y - style.soleHeight - 0.02) / axis.y;
  const points: THREE.Vector2[] = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const s = -below + ((length + below) * i) / steps;
    points.push(new THREE.Vector2(legRadius(figure, s, style.collar) + SHOE_GAP, s));
  }
  const cloth = toon(style.upper, { side: THREE.DoubleSide });
  const tube = part('shoe-shaft', new THREE.LatheGeometry(points, 32), cloth, 0.025);
  // A roll round the top, all of it outside the collar: clear of the leg
  // widening above it, and thin enough to stay clear of the other shoe's
  const rim = legRadius(figure, length, style.collar) + SHOE_GAP;
  const thick = 0.06;
  const roll = part('shoe-rim', new THREE.TorusGeometry(rim + thick, thick, 10, 32),
    toon(style.collar > 0.3 ? '#c9a27a' : shade(style.upper, 0.15)), 0.02);
  roll.rotation.x = Math.PI / 2;
  roll.position.y = length;
  // Lying along the leg: the tube is built up +y from the ankle, then turned onto the leg's slant
  const along = new THREE.Group();
  along.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  along.position.copy(ankle);
  along.add(tube, roll);
  if (style.laces) {
    // The laces go on up the front of the collar
    for (let i = 0; i < 2; i++) {
      const s = length * (0.3 + i * 0.35);
      const lace = part('shoe-lace', new THREE.BoxGeometry(0.3, 0.05, 0.06), toon(style.laces), 0.008);
      lace.position.set(0, s, legRadius(figure, s, style.collar) + SHOE_GAP + 0.02);
      along.add(lace);
    }
    // And a star on the outside
    const star = part('shoe-star', new THREE.ShapeGeometry(starShape(0.16, 0.07)), toon('#ffffff', { side: THREE.DoubleSide }), 0);
    const s = length * 0.45;
    star.position.set(side * (legRadius(figure, s, style.collar) + SHOE_GAP + 0.01), s, 0);
    star.rotation.y = side * Math.PI / 2;
    along.add(star);
  } else {
    // A boot's buckle, on the outside
    const buckle = part('shoe-buckle', new THREE.BoxGeometry(0.06, 0.18, 0.22), toon('#e3b53c'), 0.012);
    const s = length * 0.35;
    buckle.position.set(side * (legRadius(figure, s, style.collar) + SHOE_GAP + 0.03), s, 0);
    along.add(buckle);
  }
  group.add(along);
  return group;
}

/** The ids with a 3D shoe (besides the sneakers everyone has), for tests to hold the wardrobe to. */
export const SHOE_IDS = ['high-tops', 'boots', 'light-up'];
