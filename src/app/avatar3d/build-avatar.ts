import * as THREE from 'three';
import { Avatar, HATCHLINGS, findItem, NO_ITEM } from '../avatar/avatar-model';
import { topColourOf } from '../avatar/top-colours';
import { HATS_OVER_HAIR, shade } from '../avatar/avatar-parts';
import {
  BROW_DIRS, EAR_DIRS, EYE_DIRS, HAT_CAP, Vec3, hairPoint, hairline, headPoint, normalise
} from './head-surface';
import { at, crownGrid, part, scale, starShape, surfaceGeometry, toon } from './toon';
import { buildGlasses, buildHat } from './wardrobe3d';
import { buildEgg, buildHatched, buildPet } from './pets';
import { buildShoe, collarShare, legRadius } from './shoes';
import { buildCreature } from './creatures';
import { buildRobot } from './robots';
import { buildAnimal } from './animals';
import { buildSpace } from './space';
import { buildPizza } from './pizza';
import { Around, BackMap, buildBackItem } from './back-items';
import { WAVING_SIDE } from './motion';
import { BELT_DROP, BELT_HEIGHT, beltColour, heroBuckle, legendCape, wearsGear, wristband, BAND_TO } from './hero-gear';
import { Figure, KNEE_FORWARD, chinY, figureFor, hang, legLength, lowerLegRadii, torsoRadius, wrist } from './figure';

/** The joints an arm turns at, by name, for rig.ts. */
export const ARM_RIG = 'arm-rig';
export const FOREARM_RIG = 'forearm-rig';

/**
 * The child's character, built in 3D from the same choices the 2D drawing
 * uses. Nothing here touches the DOM or WebGL: it makes a three.js group of
 * meshes, which a viewer draws and a test can measure.
 *
 * The look is toon: flat bands of light and a dark outline round every part,
 * which reads at any angle and on any screen, and matches the drawn game.
 */

/** Where the mouth sits: lower than a cartoon's, with room for a chin. */
const MOUTH_AT: Vec3 = normalise([0, -0.52, 0.86]);

function buildHead(avatar: Avatar, figure: Figure): THREE.Group {
  const head = new THREE.Group();
  head.name = 'head-group';
  head.position.y = figure.headY;
  head.scale.set(...figure.headScale);
  const skin = avatar.skin;
  const shape = avatar.faceShape;

  head.add(part('head', surfaceGeometry(d => headPoint(shape, d), d => headPoint(shape, d)), toon(skin), 0.035));

  // Ears, level with the eyes and nose, tucked into the side of the head
  EAR_DIRS.forEach(dir => {
    const ear = part('ear', new THREE.SphereGeometry(0.24, 20, 16), toon(skin), 0.018);
    ear.scale.set(0.42, 1.05, 0.72);
    at(ear, headPoint(shape, normalise([dir[0], -0.14, dir[2]])), 0.97);
    head.add(ear);
  });

  // The nose: a small round button, as the dragon's face has (NOSE_SIZE)
  const noseTone = toon(shade(skin, 0.08));
  const tip = headPoint(shape, normalise([0, -0.26, 1]));
  const n = NOSE_SIZE;
  const noseTip = part('nose-tip', new THREE.SphereGeometry(0.11 * n, 16, 12), noseTone, 0.015);
  noseTip.scale.set(1.25, 0.95, 0.8);
  noseTip.position.set(tip[0], tip[1], tip[2] + 0.03 * n);
  head.add(noseTip);

  // Rosy cheeks, round and soft, under each eye
  EYE_DIRS.forEach(dir => {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24),
      new THREE.MeshBasicMaterial({ color: '#ff6f96', transparent: true, opacity: 0.38 }));
    cheek.name = 'cheek';
    const p = headPoint(shape, normalise([dir[0] * 1.15, -0.26, dir[2]]));
    at(cheek, p, 1.005);
    cheek.lookAt(p[0] * 2, p[1] * 2, p[2] * 2);
    head.add(cheek);
  });

  head.add(buildEyes(avatar));
  head.add(buildBrows(avatar));
  head.add(buildMouth(avatar));
  return head;
}

/**
 * The stylised face (figure.ts, STYLE): eyes a little bigger than measured,
 * and a smaller nose. The eyes grow only so far that the widest one still
 * sits inside a round lens (a test holds it).
 */
export const EYE_SIZE = 1.18;
export const NOSE_SIZE = 0.55;
/** The white of the eye's radius, and the iris's: a big iris, as stylised eyes have. */
export const EYE_WHITE = 0.13;
export const IRIS = 0.11;

/** How wide and how open each eye shape is, before the head's own narrowing. */
export const EYE_SCALE: { [shape: string]: [number, number] } = {
  round: [1.35, 0.92],
  almond: [1.5, 0.72],
  wide: [1.6, 0.9],
  narrow: [1.5, 0.52]
};

function buildEyes(avatar: Avatar): THREE.Group {
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  const [sx, sy] = EYE_SCALE[avatar.eyeShape] || EYE_SCALE.round;
  const girl = avatar.bodyType === 'girl';
  EYE_DIRS.forEach((dir, i) => {
    const side = i === 0 ? -1 : 1;
    const eye = new THREE.Group();
    eye.name = 'eye';
    const p = headPoint(avatar.faceShape, dir);
    at(eye, p, 0.985);
    eye.scale.set(EYE_SIZE, EYE_SIZE, 1);
    eye.lookAt(p[0] * 3, p[1] * 3, p[2] * 3 + 1.5);
    const white = part('eye-white', new THREE.SphereGeometry(EYE_WHITE, 24, 18), toon('#fbf8f4'), 0.012);
    white.scale.set(sx, sy, 0.4);
    // A big iris is most of what makes a stylised face friendly; it is kept
    // inside the white of even the narrowest eye (a test holds it)
    const tall = Math.min(1, (EYE_WHITE * sy * 0.92) / IRIS);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(IRIS, 20, 16), toon(avatar.eyeColour));
    iris.name = 'iris';
    iris.scale.set(1, tall, 0.3);
    iris.position.z = 0.045;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(IRIS * 0.48, 16, 12), new THREE.MeshBasicMaterial({ color: '#1a1026' }));
    pupil.name = 'pupil';
    pupil.scale.set(1, tall, 0.3);
    pupil.position.z = 0.058;
    // Two shines, a big one and a little one, as the dragon's eyes have
    const glint = new THREE.Mesh(new THREE.SphereGeometry(IRIS * 0.34, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.name = 'glint';
    glint.position.set(-IRIS * 0.34, IRIS * 0.34 * tall, 0.066);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(IRIS * 0.15, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    shine.name = 'glint';
    shine.position.set(IRIS * 0.36, -IRIS * 0.38 * tall, 0.066);
    // The upper lid: a dark line over the top of the eye, which is what gives it its shape
    const lid = part('eye-lid', new THREE.TorusGeometry(0.13, 0.02, 6, 24, Math.PI), toon('#3a2230'), 0);
    lid.scale.set(sx, sy, 0.6);
    lid.position.z = 0.02;
    eye.add(white, iris, pupil, glint, shine, lid);
    if (girl) {
      // Lashes: a small flick at the outer corner
      const lash = part('eye-lash', new THREE.ConeGeometry(0.02, 0.09, 6), toon('#3a2230'), 0);
      lash.position.set(side * 0.13 * sx, 0.03, 0.02);
      lash.rotation.z = -side * 1.1;
      eye.add(lash);
    }
    eyes.add(eye);
  });
  return eyes;
}

function buildBrows(avatar: Avatar): THREE.Group {
  const brows = new THREE.Group();
  brows.name = 'brows';
  const girl = avatar.bodyType === 'girl';
  BROW_DIRS.forEach((dir, i) => {
    const brow = part('brow', new THREE.BoxGeometry(0.32, girl ? 0.04 : 0.055, 0.05), toon(shade(avatar.hairColour, 0.1)), 0);
    const p = headPoint(avatar.faceShape, normalise([dir[0], 0.34, dir[2]]));
    at(brow, p, 1.005);
    // A boy's brows sit a little lower in the middle; a girl's arch
    brow.rotation.z = (i === 0 ? 1 : -1) * (girl ? -0.12 : 0.1);
    brow.rotation.y = i === 0 ? -0.35 : 0.35;
    brows.add(brow);
  });
  return brows;
}

function buildMouth(avatar: Avatar): THREE.Group {
  const mouth = new THREE.Group();
  mouth.name = 'mouth';
  const p = headPoint(avatar.faceShape, MOUTH_AT);
  at(mouth, p, 1.0);
  mouth.lookAt(p[0] * 3, p[1] * 3, p[2] * 3 + 2);
  const lip = toon(shade(avatar.skin, 0.35));
  switch (avatar.mouthShape) {
    case 'grin': {
      const shape = new THREE.Shape();
      shape.moveTo(-0.17, 0.03);
      shape.quadraticCurveTo(0, -0.17, 0.17, 0.03);
      shape.lineTo(-0.17, 0.03);
      const grin = part('mouth-shape', new THREE.ShapeGeometry(shape, 16), new THREE.MeshBasicMaterial({ color: '#5a1a2e' }), 0);
      const teeth = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.045), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      teeth.position.set(0, 0.005, 0.002);
      mouth.add(grin, teeth);
      break;
    }
    case 'open': {
      const open = part('mouth-shape', new THREE.CircleGeometry(0.08, 24), new THREE.MeshBasicMaterial({ color: '#5a1a2e' }), 0);
      open.scale.set(1.1, 0.8, 1);
      const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ color: '#e0607e' }));
      tongue.position.set(0, -0.03, 0.002);
      mouth.add(open, tongue);
      break;
    }
    case 'soft': {
      const soft = part('mouth-shape', new THREE.TorusGeometry(0.08, 0.018, 8, 20, Math.PI * 0.5), lip, 0);
      soft.rotation.z = Math.PI + Math.PI * 0.25;
      soft.position.y = 0.05;
      mouth.add(soft);
      break;
    }
    case 'smile':
    default: {
      const smile = part('mouth-shape', new THREE.TorusGeometry(0.14, 0.02, 8, 24, Math.PI * 0.6), lip, 0);
      smile.rotation.z = Math.PI + Math.PI * 0.2;
      smile.position.y = 0.09;
      mouth.add(smile);
    }
  }
  return mouth;
}

/**
 * The hair over the scalp: rows from the crown down to exactly the hairline
 * at every angle, so there is no ragged edge from a sphere's grid meeting a
 * curve it was not built along. One row past the hairline turns the edge
 * under, back into the scalp, so thick hair ends in a rounded lip rather
 * than an open shelf.
 */
export function hairShellGeometry(avatar: Avatar, capAt?: number): THREE.BufferGeometry {
  const style = avatar.hairStyle;
  const columns = style === 'afro' || style === 'coils' || style === 'curly' ? 128 : 96;
  return crownGrid(
    phi => hairline(style, [Math.sin(phi), 0, Math.cos(phi)]),
    (dir, edge) => hairPoint(avatar.faceShape, style, avatar.hairTexture,
      // Just above the line, so the edge still counts as covered
      edge ? [dir[0], dir[1] + 1e-6, dir[2]] : dir, capAt) || headPoint(avatar.faceShape, dir),
    dir => scale(headPoint(avatar.faceShape, dir), 0.97),
    columns
  );
}

/**
 * Long hair falling down the back: a sheet that starts inside the shell at
 * the back of the head, hugs it round behind the ears, and falls past the
 * shoulders, a little longer in the middle and with its ends turned in.
 */
/**
 * How low, in the head's own units, a braid can hang on this figure: found by
 * going down from the head until a bead where a braid hangs (out at the side
 * of the neck, a little behind) would touch the body, less a bead's height.
 * On a tall figure the neck is long and the braids reach the jaw; on a
 * stylised one the big head sits close to the shoulders, and they stop sooner.
 */
export function braidEnd(figure: Figure): number {
  const [sx, sy, sz] = figure.headScale;
  const x = 0.72 * sx;
  const z = -0.35 * sz;
  const reach = 0.16 * sy;
  for (let y = -0.25; y > -1.3; y -= 0.01) {
    const world = figure.headY + y * sy - reach;
    const r = torsoRadius(figure, world);
    const inside = r > 0 && (x / r) ** 2 + (z / (r * figure.torsoDepth)) ** 2 < 1.25;
    if (inside) {
      return y + 0.02;
    }
  }
  return -1.3;
}

export function curtainGeometry(avatar: Avatar, figure: Figure = seatedFigure(avatar)): THREE.BufferGeometry {
  const columns = 48;
  const rows = 32;
  const top = 0.1;
  const [sx, sy, sz] = figure.headScale;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    // Full width round the back of the head, narrowing lower down so the
    // ends fall between the shoulders rather than through them
    const narrow = v * v * (3 - 2 * v);
    const from = Math.PI * (0.56 + 0.16 * narrow);
    const to = Math.PI * (1.44 - 0.16 * narrow);
    for (let c = 0; c <= columns; c++) {
      const phi = from + (c / columns) * (to - from);
      const middle = Math.cos((c / columns - 0.5) * Math.PI); // 1 at the centre back
      const length = 2.9 + 0.35 * middle;
      const y = top - v * length;
      const start = hairPoint(avatar.faceShape, 'long', avatar.hairTexture,
        normalise([Math.sin(phi), top, Math.cos(phi)])) || headPoint(avatar.faceShape, [Math.sin(phi), top, Math.cos(phi)]);
      let radius = Math.hypot(start[0], start[2]) * (1 + 0.08 * Math.sin(Math.min(v * 2, 1) * Math.PI * 0.5));
      // Lower down it lies on the back: never inside the torso, which is
      // measured in this head's own (narrowed) space
      const w = torsoRadius(figure, figure.headY + y * sy);
      if (w > 0) {
        const a = w / sx;
        const b = (w * figure.torsoDepth) / sz;
        const onBack = 1 / Math.sqrt((Math.sin(phi) / a) ** 2 + (Math.cos(phi) / b) ** 2);
        radius = Math.max(radius, onBack + 0.14);
      }
      positions.push(Math.sin(phi) * radius, y, Math.cos(phi) * radius);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c;
      const b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function hairColour(avatar: Avatar): string {
  return avatar.hairColour;
}

function buildHair(avatar: Avatar, figure: Figure): THREE.Group {
  const hair = new THREE.Group();
  hair.name = 'hair';
  hair.position.y = figure.headY;
  hair.scale.set(...figure.headScale);
  const style = avatar.hairStyle;
  const shape = avatar.faceShape;
  const hatCovers = HATS_OVER_HAIR.includes(avatar.hat);
  const colour = hairColour(avatar);
  const material = toon(colour, { side: THREE.DoubleSide });

  // The shell over the scalp: a grid running from the crown down to exactly
  // the hairline all the way round, so the edge is smooth on every face.
  const shell = hairShellGeometry(avatar, hatCovers ? HAT_CAP : undefined);
  hair.add(part('hair-shell', shell, material, 0.028));

  if (style === 'long') {
    hair.add(part('hair-long', curtainGeometry(avatar, figure), material, 0.025));
  }
  if (style === 'bun' && !hatCovers) {
    const bun = part('hair-bun', new THREE.SphereGeometry(0.36, 24, 18), material, 0.025);
    at(bun, headPoint(shape, normalise([0, 0.82, -0.5])), 1.18);
    hair.add(bun);
  }
  if (style === 'braids') {
    // Down towards the shoulders and no further: as far as a braid can hang
    // on THIS figure before it would meet the body (braidEnd)
    const end = braidEnd(figure);
    const step = Math.min(0.2, (-0.25 - end) / 5);
    [-1, 1].forEach(side => {
      for (let i = 0; i < 5; i++) {
        const bead = part('hair-braid', new THREE.SphereGeometry(0.13 - i * 0.006, 14, 10), material, 0.018);
        bead.scale.set(1, 1.25, 1);
        bead.position.set(side * (0.8 - i * 0.02), -0.25 - i * step, -0.35);
        hair.add(bead);
      }
      const tie = part('hair-tie', new THREE.SphereGeometry(0.07, 10, 8), toon('#d633eb'), 0.012);
      tie.position.set(side * 0.7, -0.25 - 5 * step, -0.35);
      hair.add(tie);
    });
  }
  if (style === 'locs') {
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * 0.35 + (i / 12) * Math.PI * 1.3; // round the back half
      const x = Math.sin(a) * 0.95;
      const z = Math.cos(a) * 0.85;
      const loc = part('hair-loc', new THREE.CylinderGeometry(0.07, 0.06, 1.05, 10), material, 0.015);
      loc.position.set(x, -0.55, z - 0.05);
      hair.add(loc);
    }
  }
  return hair;
}

/** How far round the neck the hood's roll lies, in neck widths: snug, not a bar across the shoulders. */
export const HOOD_RING = 1.3;

/** Where the hoodie's pouch pocket is, up from the hem towards the collar; how tall; how far round the tummy it reaches. */
export const POCKET_AT = 0.28;
/** How far in front of the chest a hoodie's string hangs, at its closest: its own radius and its outline, and a little room. */
export const STRING_GAP = 0.065;
export const POCKET_HEIGHT = 0.8;
export const POCKET_ARC = 1.1;

/** How far the stand reaches beyond where the hands hang. */
export const STAND_BEYOND_HANDS = 0.45;

/** A body part in the trousers' colour. */
const TROUSERS = '#a86f3f';
const BELT = '#2f2a3a';

/**
 * How much slimmer the forearm starts than the upper arm ends: its rounded
 * start lies inside the upper arm's, clear of it by more than either
 * surface's facets stray from the true curve, so they never cross.
 */
export const ELBOW_INSIDE = 0.94;

/** How many steps round a limb's rounded end, from its side to its tip. */
export const DOME_STEPS = 8;

/**
 * A rounded tube from `from` to `to`, its radius following `radii` along the
 * way (first to last, straight between). A limb, a sleeve, a trouser leg.
 * Either end can be rounded: a dome as wide as the tube there, round the end
 * point, made in the same surface as the tube. A joint is then one smooth
 * surface; a separate ball as wide as the tube it meets is not, its facets
 * and the tube's crossing in a frayed band (Yobyn, 2026-10-05: "Kid hero
 * needs more graphics").
 */
function limb(radii: number[], from: THREE.Vector3, to: THREE.Vector3, segments = 20, round: { from?: boolean; to?: boolean } = {}): THREE.BufferGeometry {
  const length = from.distanceTo(to);
  const points = radii.map((r, i) => new THREE.Vector2(r, (1 - i / (radii.length - 1)) * length));
  // Close both ends so an outline does not show down the inside: flat, or round
  const dome = (r: number, y: number, up: number) => Array.from({ length: DOME_STEPS }, (_, k) => {
    const angle = (Math.PI / 2) * (k / DOME_STEPS);
    return new THREE.Vector2(Math.max(r * Math.sin(angle), 0.001), y + up * r * Math.cos(angle));
  });
  points.unshift(...(round.from ? dome(radii[0], length, 1) : [new THREE.Vector2(0.001, length)]));
  points.push(...(round.to ? dome(radii[radii.length - 1], 0, -1).reverse() : [new THREE.Vector2(0.001, 0)]));
  const geometry = new THREE.LatheGeometry(points.reverse(), segments);
  const up = new THREE.Vector3(0, 1, 0);
  const direction = from.clone().sub(to).normalize();
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction)));
  geometry.translate(to.x, to.y, to.z);
  return geometry;
}

/** The torso's own surface at a height: [half-width, half-depth]. */
function girth(figure: Figure, y: number): [number, number] {
  const r = torsoRadius(figure, y);
  return [r, r * figure.torsoDepth];
}

/** A crew-neck top's collar band, how thick round. */
export const COLLAR_BAND = 0.13;

/**
 * The trim on a crew-neck top's collar and sleeve ends, as on a ringer tee:
 * white, or on a light top a dark one, so it always shows (Yobyn,
 * 2026-10-05: "Kid hero needs more graphics").
 */
export function ringerTrim(topColour: string): string {
  return new THREE.Color(topColour).getHSL({ h: 0, s: 0, l: 0 }).l > 0.7 ? '#2d2d38' : '#f4f6f7';
}

/** Which kind of sleeve and neckline a top has. */
export function topCut(top: string): 'long' | 'short' | 'hoodie' {
  if (top === 'hoodie') {
    return 'hoodie';
  }
  return top === 'star-tee' || top === 'flower-tee' ? 'short' : 'long';
}

function buildBody(avatar: Avatar, figure: Figure): THREE.Group {
  const body = new THREE.Group();
  body.name = 'body';
  const top = findItem('top', avatar.top);
  // Its own colour, or the one the child chose for it (top-colours.ts)
  const topColour = topColourOf(avatar);
  const cut = topCut(avatar.top);
  const cloth = toon(topColour);
  const skin = toon(avatar.skin);
  const trousers = toon(TROUSERS);
  const depth = figure.torsoDepth;

  // The top: the torso from the hem up to the collar, in the top's colour
  const upper = figure.torso.filter(([, y]) => y >= figure.hem - 0.3);
  const torso = part('torso', new THREE.LatheGeometry(upper.map(([r, y]) => new THREE.Vector2(r, y)), 40), cloth, 0.05);
  torso.scale.z = depth;
  body.add(torso);
  // A ribbed band at the hem
  const [hemR] = girth(figure, figure.hem);
  const band = part('hem-band', new THREE.CylinderGeometry(hemR * 1.03, hemR * 1.03, 0.28, 40, 1, true), toon(shade(topColour, 0.1), { side: THREE.DoubleSide }), 0.03);
  band.position.y = figure.hem;
  band.scale.z = depth;
  body.add(band);

  // Trousers: from the crotch to the belt, then down each leg
  const lower = figure.torso.filter(([, y]) => y <= figure.belt + 0.2);
  const pelvis = part('hips', new THREE.LatheGeometry(lower.map(([r, y]) => new THREE.Vector2(r * 1.01, y)), 40), trousers, 0.05);
  pelvis.scale.z = depth;
  body.add(pelvis);
  // The trousers' own belt, or a hero's from the trained stage on (hero-gear.ts)
  const heroBelt = beltColour(avatar.stage, topColour);
  const beltHeight = heroBelt ? BELT_HEIGHT : 0.2;
  const beltY = figure.belt - (heroBelt ? BELT_DROP : 0);
  const beltR = Math.max(...[-0.5, 0, 0.5].map(k => girth(figure, beltY + k * beltHeight)[0])) * 1.04;
  const belt = part('belt', new THREE.CylinderGeometry(beltR, beltR, beltHeight, 40, 1, true), toon(heroBelt || BELT, { side: THREE.DoubleSide }), 0.02);
  belt.position.y = beltY;
  belt.scale.z = depth;
  body.add(belt);
  if (heroBelt) {
    const buckle = heroBuckle(avatar.stage, topColour);
    buckle.position.set(0, beltY, beltR * depth + 0.05);
    body.add(buckle);
  } else {
    const buckle = part('buckle', new THREE.BoxGeometry(0.34, 0.24, 0.06), toon('#c9a54a'), 0.015);
    buckle.position.set(0, beltY, beltR * depth + 0.02);
    body.add(buckle);
  }

  [-1, 1].forEach(side => {
    const hip = new THREE.Vector3(side * figure.hip[0], figure.hip[1], 0);
    const knee = new THREE.Vector3(side * figure.knee[0], figure.knee[1], KNEE_FORWARD);
    const ankle = new THREE.Vector3(side * figure.ankle[0], figure.ankle[1], 0);
    const [rHip] = figure.legRadii;
    // Rounded at the knee, so the leg bends softly rather than breaking at a seam
    body.add(part('leg', limb([rHip, rHip * 0.92], hip, knee, 20, { to: true }), trousers, 0.04));
    // Tucked into a shoe that comes up the leg (shoes.ts), or down to the hem
    const worn = avatar.shoes && avatar.shoes !== NO_ITEM ? findItem('shoes', avatar.shoes) : undefined;
    const share = worn ? collarShare(worn.id) : 0;
    const radii = share > 0
      ? Array.from({ length: 17 }, (_, i) => legRadius(figure, legLength(figure) * (1 - i / 16), share))
      : lowerLegRadii(figure);
    body.add(part('leg', limb(radii, knee, ankle), trousers, 0.04));

    // What the character stands in (shoes.ts): the sneakers, or a pair won
    body.add((worn && buildShoe(worn.id, worn.colour, figure, side)) || buildShoe(NO_ITEM, '', figure, side)!);

    // Arms hang from the shoulder: a round shoulder, then the upper arm and forearm
    const shoulder = new THREE.Vector3(side * figure.shoulder[0], figure.shoulder[1], 0);
    const elbowXY = hang(figure.shoulder, figure.upperArm, figure.armSwing, 1);
    const wristXY = wrist(figure);
    const elbow = new THREE.Vector3(side * elbowXY[0], elbowXY[1], 0.08);
    const wristV = new THREE.Vector3(side * wristXY[0], wristXY[1], 0.18);
    const [rShoulder, rElbow, rWrist] = figure.armRadii;
    // The arm turns at the shoulder and bends at the elbow (motion.ts, rig.ts):
    // the upper arm hangs from a joint at the shoulder, the forearm and hand
    // from one at the elbow. At rest every part is exactly where it was built.
    const upper = new THREE.Group();
    upper.name = ARM_RIG;
    upper.userData.side = side;
    upper.position.copy(shoulder);
    const lower = new THREE.Group();
    lower.name = FOREARM_RIG;
    lower.position.copy(elbow).sub(shoulder);
    // A relaxed arm, not a mannequin's: the forearm bends a little forward
    lower.rotation.x = -figure.elbowBend;
    upper.add(lower);
    body.add(upper);
    const onUpper = (mesh: THREE.Object3D) => {
      mesh.position.sub(shoulder);
      upper.add(mesh);
    };
    const onLower = (mesh: THREE.Object3D) => {
      mesh.position.sub(elbow);
      lower.add(mesh);
    };
    // Each part of the arm rounded where it turns: the sleeve's top at the
    // shoulder, the upper arm at the elbow, and the forearm starting a little
    // slimmer inside it, so the bend stays covered and the two never fight
    // The forearm's radius where it starts at the elbow and where it ends at the wrist
    const forearmRadii = cut === 'short' ? [rElbow * 0.78 * ELBOW_INSIDE, rWrist * 0.75] : [rElbow * 1.05 * ELBOW_INSIDE, rWrist * 1.02];
    if (cut === 'short') {
      // A short sleeve ends above the elbow; below it is a bare arm
      const sleeveEnd = shoulder.clone().lerp(elbow, 0.55);
      onUpper(part('arm', limb([rShoulder * 1.05, rShoulder], shoulder, sleeveEnd, 20, { from: true }), cloth, 0.04));
      // A hem band round the end of the sleeve, in the trim
      onUpper(part('sleeve-hem', limb([rShoulder * 1.08, rShoulder * 1.08], sleeveEnd.clone().lerp(shoulder, 0.25), sleeveEnd), toon(ringerTrim(topColour)), 0.02));
      onUpper(part('bare-arm', limb([rElbow * 0.8, rElbow * 0.78], sleeveEnd, elbow, 20, { to: true }), skin, 0.035));
      onLower(part('forearm', limb(forearmRadii, elbow, wristV, 20, { from: true }), skin, 0.035));
    } else {
      onUpper(part('arm', limb([rShoulder, rElbow * 1.05], shoulder, elbow, 20, { from: true, to: true }), cloth, 0.04));
      onLower(part('forearm', limb(forearmRadii, elbow, wristV, 20, { from: true }), cloth, 0.04));
      // A ribbed cuff at the wrist: the hoodie's a shade of it, a crew top's in its trim
      const cuffColour = cut === 'hoodie' ? shade(topColour, 0.12) : ringerTrim(topColour);
      onLower(part('cuff', limb([rWrist * 1.12, rWrist * 1.12], wristV.clone().lerp(elbow, 0.12), wristV), toon(cuffColour), 0.02));
      if (cut === 'hoodie') {
        // The red of the shirt underneath shows at the wrist, as in the reference
        onLower(part('undershirt-cuff', limb([rWrist * 1.0, rWrist * 0.98], wristV, wristV.clone().add(wristV.clone().sub(elbow).normalize().multiplyScalar(0.12))), toon('#b5302b'), 0.015));
      }
    }
    if (wearsGear(avatar.stage)) {
      // A wristband over the sleeve, or the bare arm, just above the hand
      // (over the cuff on a long sleeve)
      const [atWrist, atElbow] = [cut === 'short' ? forearmRadii[1] : rWrist * 1.12, forearmRadii[0]];
      const under = Math.max(atWrist, atWrist + (atElbow - atWrist) * BAND_TO);
      onLower(wristband(avatar.stage, topColour, wristV, elbow, under + 0.05));
    }
    // A hand: palm, fingers together, and a thumb, hanging relaxed
    const hand = new THREE.Group();
    hand.name = 'hand';
    const down = wristV.clone().sub(elbow).normalize();
    hand.position.copy(wristV);
    hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
    const palm = part('palm', new THREE.SphereGeometry(0.5, 18, 14), skin, 0.025);
    palm.scale.set(0.58, figure.handLength * 0.62, 0.78);
    palm.position.y = -figure.handLength * 0.28;
    const fingers = part('fingers', new THREE.SphereGeometry(0.5, 18, 14), skin, 0.025);
    fingers.scale.set(0.52, figure.handLength * 0.6, 0.7);
    fingers.position.set(0, -figure.handLength * 0.68, 0.04);
    fingers.rotation.x = 0.25;
    const thumb = part('thumb', new THREE.SphereGeometry(0.5, 12, 10), skin, 0.02);
    thumb.scale.set(0.26, figure.handLength * 0.42, 0.26);
    thumb.position.set(-side * 0.02, -figure.handLength * 0.36, 0.34);
    thumb.rotation.x = 0.5;
    hand.add(palm, fingers, thumb);
    onLower(hand);
  });

  // The neck, from inside the collar up into the head
  const neckTop = chinY(figure) + 0.5;
  const neckBottom = figure.torso[figure.torso.length - 1][1] - 0.6;
  const neck = part('neck', new THREE.CylinderGeometry(figure.neckRadius * 0.95, figure.neckRadius, neckTop - neckBottom, 20), skin, 0.03);
  neck.position.y = (neckTop + neckBottom) / 2;
  body.add(neck);

  const collarY = figure.torso[figure.torso.length - 1][1] - 0.12;
  if (cut === 'hoodie') {
    // The hood, lying round the back of the neck; a red collar underneath;
    // drawstrings with metal tips; a pouch pocket — all read off the reference
    // A thick roll right round the neck, open in a V at the front
    const gap = Math.PI * 0.28;
    const hoodRing = new THREE.TorusGeometry(HOOD_RING * figure.neckRadius, 0.18, 14, 40, Math.PI * 2 - gap);
    hoodRing.rotateX(Math.PI / 2);
    hoodRing.rotateY(-(Math.PI / 2 + gap / 2));
    const hood = part('hood', hoodRing, toon(shade(topColour, 0.06)), 0.04);
    hood.rotation.x = -0.18;
    hood.position.set(0, collarY - 0.05, -0.08);
    hood.scale.set(1.05, 1, 1);
    // Round off the two ends of the roll either side of the V
    [Math.PI / 2 + gap / 2, Math.PI / 2 - gap / 2].forEach(angle => {
      const end = part('hood-end', new THREE.SphereGeometry(0.18, 14, 10), toon(shade(topColour, 0.06)), 0.03);
      end.position.set(Math.cos(angle) * figure.neckRadius * HOOD_RING, 0, Math.sin(angle) * figure.neckRadius * HOOD_RING);
      hood.add(end);
    });
    body.add(hood);
    // and the hood itself lying on the upper back
    const back = part('hood-back', new THREE.SphereGeometry(0.9, 24, 16), toon(shade(topColour, 0.06)), 0.035);
    back.scale.set(1.1, 0.75, 0.35);
    back.position.set(0, collarY - 0.7, -girth(figure, collarY - 0.7)[0] * depth - 0.05);
    body.add(back);
    const collar = part('undershirt-collar', new THREE.TorusGeometry(figure.neckRadius * 1.08, 0.1, 10, 28), toon('#b5302b'), 0.015);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = collarY + 0.02;
    body.add(collar);
    // Short drawstrings, hanging straight down in front of the chest, just
    // clear of its fullest point: a round chest bulges between their ends
    [-1, 1].forEach(side => {
      const x = side * 0.28;
      const [topY, endY] = [collarY - 0.35, collarY - 1.05];
      const surface = (y: number) => Math.sqrt(Math.max(girth(figure, y)[0] ** 2 - x * x, 0)) * depth;
      const z = Math.max(...Array.from({ length: 9 }, (_, i) => surface(topY + ((endY - 0.16 - topY) * i) / 8))) + STRING_GAP;
      const string = part('hoodie-string', new THREE.CylinderGeometry(0.035, 0.035, topY - endY, 8), toon('#dfe6ea'), 0.012);
      string.position.set(x, (topY + endY) / 2, z);
      body.add(string);
      const tip = part('hoodie-string-tip', new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), toon('#9aa5ab'), 0.01);
      tip.position.set(x, endY - 0.08, z);
      body.add(tip);
    });
    // The pouch pocket on the tummy, curved round it
    const pocketY = figure.hem + (collarY - figure.hem) * POCKET_AT;
    const [pocketR] = girth(figure, pocketY);
    const pouch = new THREE.CylinderGeometry(pocketR * 1.02, pocketR * 1.02, POCKET_HEIGHT, 24, 1, true, -POCKET_ARC / 2, POCKET_ARC);
    const pocket = part('hoodie-pocket', pouch, toon(shade(topColour, 0.1), { side: THREE.DoubleSide }), 0.02);
    pocket.position.y = pocketY;
    pocket.scale.z = depth;
    body.add(pocket);
  } else {
    // A crew collar: a rolled band in the trim, round where the neck meets the body
    const neckline = part('neckline', new THREE.TorusGeometry(figure.neckRadius * 1.18, COLLAR_BAND, 12, 32), toon(ringerTrim(topColour)), 0.02);
    neckline.rotation.x = Math.PI / 2;
    neckline.position.y = collarY + 0.02;
    body.add(neckline);
    if (!top || top.id === NO_ITEM) {
      // The plain top: a patch pocket on the left of the chest, with a band of the trim along its top
      const y = figure.hem + (collarY - figure.hem) * 0.6;
      const [r] = girth(figure, y);
      const x = r * 0.42;
      const z = Math.sqrt(r * r - x * x) * depth;
      const pocket = new THREE.Group();
      pocket.name = 'chest-pocket';
      pocket.position.set(x, y, z);
      // Facing out from the body there: leaning back as the chest rounds in
      // towards the collar, and turned round the oval of the chest
      const rise = 0.05;
      const slope = (Math.sqrt(girth(figure, y + rise)[0] ** 2 - x * x) - Math.sqrt(girth(figure, y - rise)[0] ** 2 - x * x)) * depth / (2 * rise);
      pocket.rotation.order = 'YXZ';
      pocket.rotation.x = Math.atan(slope);
      pocket.rotation.y = Math.atan2(x, z / (depth * depth));
      const patch = part('chest-pocket-patch', new THREE.BoxGeometry(0.6, 0.6, 0.1), toon(shade(topColour, 0.16)), 0.015);
      const band = part('chest-pocket-band', new THREE.BoxGeometry(0.62, 0.1, 0.11), toon(ringerTrim(topColour)), 0.01);
      band.position.y = 0.27;
      pocket.add(patch, band);
      body.add(pocket);
    }
  }

  if (top && top.id === 'striped') {
    // Spread over the chest between the hem and the collar, whatever its height
    const span = collarY - figure.hem;
    for (let i = 0; i < 5; i++) {
      const y = figure.hem + span * (0.13 + i * 0.17);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(torsoRadius(figure, y + 0.1) * 1.012, torsoRadius(figure, y - 0.1) * 1.012, 0.2, 40, 1, true),
        toon('#ffffff'));
      band.name = 'stripe';
      band.position.y = y;
      band.scale.z = depth * 1.012;
      body.add(band);
    }
  }
  if (top && (top.id === 'star-tee' || top.id === 'flower-tee')) {
    const decal = top.id === 'star-tee' ? starShape(0.5, 0.22) : flowerShape(0.45);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(decal, 12),
      new THREE.MeshBasicMaterial({ color: top.id === 'star-tee' ? '#ffd166' : '#ff8fb8' }));
    mesh.name = 'decal';
    // A chest print: up on the chest, clear of the neckline
    const y = figure.hem + (collarY - figure.hem) * 0.58;
    mesh.position.set(0, y, girth(figure, y)[0] * depth + 0.03);
    body.add(mesh);
    if (top.id === 'flower-tee') {
      // A yellow middle, so it reads as a flower
      const middle = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: '#ffd166' }));
      middle.name = 'decal-middle';
      middle.position.set(0, y, girth(figure, y)[0] * depth + 0.04);
      body.add(middle);
    }
  }
  return body;
}

function flowerShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const rr = r * (0.65 + 0.35 * Math.abs(Math.cos(a * 2.5)));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) { s.moveTo(x, y); } else { s.lineTo(x, y); }
  }
  return s;
}

/**
 * A low round stand under the feet with a ring in the particle field's
 * colours, so the character is standing somewhere rather than floating in
 * the dark.
 */
function buildPedestal(radius: number, name = 'pedestal'): THREE.Group {
  const pedestal = new THREE.Group();
  pedestal.name = name;
  const top = part('pedestal-top', new THREE.CylinderGeometry(radius, radius * 1.08, 0.18, 48), toon('#3a2f6e'), 0.02);
  top.position.y = -0.1;
  pedestal.add(top);
  const blue = new THREE.Color('#3880ff');
  const magenta = new THREE.Color('#d633eb');
  const ring = new THREE.TorusGeometry(radius * 1.04, 0.06, 8, 96);
  const position = ring.attributes.position as THREE.BufferAttribute;
  const colour = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const t = (Math.atan2(position.getY(i), position.getX(i)) / Math.PI + 1) / 2;
    const c = blue.clone().lerp(magenta, 1 - Math.abs(2 * t - 1));
    colour.set([c.r, c.g, c.b], i * 3);
  }
  ring.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  const glow = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ vertexColors: true }));
  glow.name = 'pedestal-ring';
  glow.rotation.x = Math.PI / 2;
  glow.position.y = -0.01;
  pedestal.add(glow);
  return pedestal;
}

/** A pet's own stand. */
export const PET_STAND_RADIUS = 1.35;
/** The gap between the two stands' edges: the pet as near the edge of a phone's stage as it can be and stay in view (pets.spec). */
export const PET_STAND_GAP = 0.45;
/**
 * Pets are drawn larger than life, up to the character's knee: at a pet's
 * true size beside a teenager, a phone shows a kitten as a few pixels.
 */
export const PET_SCALE = 1.45;

/**
 * The pet, on its own small stand beside the character's: on the side away
 * from the waving arm, a little forward, and turned a little toward the
 * character and the camera. It never touches the character, because the two
 * stands do not touch and nothing of the character reaches down beside it.
 */
function buildPetBeside(avatar: Avatar, standRadius: number): THREE.Group | null {
  const item = avatar.pet && avatar.pet !== NO_ITEM ? findItem('pet', avatar.pet) : undefined;
  const pet = item ? buildPet(item.id, item.colour) : companion(avatar);
  if (!pet) {
    return null;
  }
  const group = new THREE.Group();
  group.name = 'pet';
  group.add(buildPedestal(PET_STAND_RADIUS, 'pet-pedestal'));
  pet.scale.setScalar(pet.userData.scale || PET_SCALE);
  group.add(pet);
  // Both stands flare out 8% at the foot
  group.position.set(-WAVING_SIDE * (standRadius * 1.08 + PET_STAND_GAP + PET_STAND_RADIUS * 1.08), 0, 0.3);
  group.rotation.y = WAVING_SIDE * 0.35;
  return group;
}

/** A just-hatched pet's size, against a grown one's PET_SCALE. */
export const HATCHED_SCALE = 1.0;

/**
 * Without a pet of their own chosen, the kid hero's companion grows with them
 * (Yobyn, 2026-10-05): a closed egg for a Beginner, hatched into their pet
 * when they are Trained, the pet grown up for a Legend.
 */
function companion(avatar: Avatar): THREE.Group | null {
  const id = HATCHLINGS.indexOf(avatar.hatchling) >= 0 ? avatar.hatchling : HATCHLINGS[0];
  const colour = findItem('pet', id)!.colour;
  if (avatar.stage <= 1) {
    return buildEgg(colour);
  }
  if (avatar.stage === 2) {
    const hatched = buildHatched(id, colour);
    hatched!.userData.scale = HATCHED_SCALE;
    return hatched;
  }
  return buildPet(id, colour);
}

/** How far above the collar the chin rests: the head sits on the body, with no neck showing, as the dragon's does. */
export const CHIN_REST = 0.05;

/**
 * The figure of the body type picked, with the head seated on it for this
 * face: a round face, a square one and an oval one reach down to different
 * depths, and each chin rests just on the collar. Everything on the head
 * (hair, a hat, glasses) is built on this figure, so it moves with the head.
 */
export function seatedFigure(avatar: Avatar): Figure {
  const figure = figureFor(avatar.bodyType);
  const collar = figure.torso[figure.torso.length - 1][1];
  const chin = headPoint(avatar.faceShape, [0, -1, 0])[1];
  return { ...figure, headY: collar + CHIN_REST - chin * figure.headScale[1] };
}

/**
 * The whole character, standing on the origin, in the figure of the body
 * type picked. The head and everything on it (hair, a hat, glasses) share
 * one position and one scale, so what fits the head in its own space fits it
 * here, on every figure.
 */
export function buildAvatar(avatar: Avatar): THREE.Group {
  if (avatar.family !== 'kid') {
    return buildCreatureOnStand(avatar);
  }
  const figure = seatedFigure(avatar);
  const root = new THREE.Group();
  root.name = 'avatar';
  // Wide enough for the feet, and for the hands hanging out at the sides: nothing reaches past it towards a pet
  const standRadius = Math.max(figure.ankle[0] + figure.foot[1] + 0.9, wrist(figure)[0] + STAND_BEYOND_HANDS);
  root.add(buildPedestal(standRadius));
  const pet = buildPetBeside(avatar, standRadius);
  if (pet) {
    root.add(pet);
  }
  root.add(buildBody(avatar, figure));
  root.add(buildHead(avatar, figure));
  root.add(buildHair(avatar, figure));
  const hat = buildHat(avatar);
  const glasses = buildGlasses(avatar);
  [hat, glasses].forEach(item => {
    if (item) {
      item.position.y = figure.headY;
      item.scale.set(...figure.headScale);
      root.add(item);
    }
  });
  const back = buildBackBehind(avatar, figure, root);
  if (back) {
    root.add(back);
  }
  return root;
}

/**
 * The backpack or cape, built round the character already on the stand:
 * everything but its arms (which it goes behind or inside), the stands and
 * the pet. See back-items.ts.
 */
function buildBackBehind(avatar: Avatar, figure: Figure, root: THREE.Group): THREE.Group | null {
  const item = avatar.back && avatar.back !== NO_ITEM ? findItem('back', avatar.back) : undefined;
  if (item) {
    return buildBackItem(item.id, item.colour, figure, aroundCharacter(root, figure));
  }
  // A legend's cape, with nothing else on their back (hero-gear.ts)
  const legend = legendCape(avatar.stage, avatar.back, topColourOf(avatar));
  const cape = legend ? buildBackItem('cape', legend, figure, aroundCharacter(root, figure)) : null;
  if (cape) {
    cape.userData.legend = true;
  }
  return cape;
}

/**
 * What a back item is built round (back-items.ts `Around`): the map of
 * everything on the stand but the arms, the stands and the pet; how far back
 * the arms reach; and the meshes the straps go over.
 *
 * How far back the arms reach is measured as they hang, and holds however
 * they move: an arm turns at the shoulder about z, which keeps every point's
 * depth, and the elbow's soft bend eases out only as the arm comes up, when
 * the forearm is out to the side (a test holds it through a whole wave).
 */
export function aroundCharacter(root: THREE.Group, figure: Figure): Around {
  root.updateMatrixWorld(true);
  const meshes: THREE.Mesh[] = [];
  let armBack = 0;
  const visit = (node: THREE.Object3D, arm: boolean) => {
    if (node.name === 'pedestal' || node.name === 'pet') {
      return;
    }
    const inArm = arm || node.name === ARM_RIG;
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh && !node.name.endsWith(':outline')) {
      if (inArm) {
        const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const p = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
          armBack = Math.max(armBack, -p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).z);
        }
      } else {
        meshes.push(mesh);
      }
    }
    node.children.forEach(child => visit(child, inArm));
  };
  visit(root, false);
  const reach = figure.shoulder[0] + figure.armRadii[0] * 2;
  const map = new BackMap(meshes, -reach, reach, figure.ankle[1], chinY(figure) + 1);
  return { map, armBack, meshes };
}

/** A creature's stand: a little wider than the kid hero's, for a grown dragon's feet. */
export const CREATURE_STAND_RADIUS = 3.1;

/**
 * A character from another family (creatures.ts) on its stand, at the stage
 * it has grown to. The kid hero's wardrobe, pet and back items are the kid
 * hero's: a creature's look is its stage.
 */
function buildCreatureOnStand(avatar: Avatar): THREE.Group {
  const root = new THREE.Group();
  root.name = 'avatar';
  root.userData.family = avatar.family;
  root.add(buildPedestal(CREATURE_STAND_RADIUS));
  const build = { robot: buildRobot, animal: buildAnimal, space: buildSpace, pizza: buildPizza }[avatar.family as string] || buildCreature;
  root.add(build(avatar.stage));
  return root;
}

/** Frees every geometry and material under a built character. */
export function disposeAvatar(root: THREE.Object3D) {
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    // A sprite's geometry is one plane every sprite shares: not this character's to free
    if (mesh.geometry && !(object as THREE.Sprite).isSprite) {
      mesh.geometry.dispose();
    }
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach(m => m.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

