import * as THREE from 'three';
import { Avatar, DEFAULT_TOP_COLOUR, findItem, NO_ITEM } from '../avatar/avatar-model';
import { HATS_OVER_HAIR, shade } from '../avatar/avatar-parts';
import {
  BROW_DIRS, EAR_DIRS, EYE_DIRS, HAT_CAP, Vec3, hairPoint, hairline, headPoint, normalise
} from './head-surface';
import { at, crownGrid, part, scale, starShape, surfaceGeometry, toon } from './toon';
import { buildGlasses, buildHat } from './wardrobe3d';
import { Figure, chinY, figureFor, hang, torsoRadius, wrist } from './figure';

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

  // The nose: a bridge down from between the eyes to a rounded tip
  const noseTone = toon(shade(skin, 0.08));
  const top = headPoint(shape, normalise([0, 0.0, 1]));
  const tip = headPoint(shape, normalise([0, -0.3, 1]));
  const bridge = part('nose', limb([0.055, 0.075, 0.09], new THREE.Vector3(top[0], top[1], top[2] - 0.02),
    new THREE.Vector3(tip[0], tip[1], tip[2] + 0.1), 12), noseTone, 0.012);
  head.add(bridge);
  const noseTip = part('nose-tip', new THREE.SphereGeometry(0.11, 16, 12), noseTone, 0.015);
  noseTip.scale.set(1.1, 0.85, 0.9);
  noseTip.position.set(tip[0], tip[1] + 0.01, tip[2] + 0.1);
  head.add(noseTip);
  [-1, 1].forEach(side => {
    const wing = part('nostril', new THREE.SphereGeometry(0.06, 10, 8), noseTone, 0.01);
    wing.position.set(side * 0.09, tip[1] - 0.02, tip[2] + 0.04);
    head.add(wing);
  });

  // A little colour in the cheeks
  EYE_DIRS.forEach(dir => {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20),
      new THREE.MeshBasicMaterial({ color: '#ff7aa2', transparent: true, opacity: 0.14 }));
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

/** How far a shut eye's line curves down, as a share of the eye's width. */
const SHUT_CURVE = 0.3;

/** How wide and how open each eye shape is, before the head's own narrowing. */
const EYE_SCALE: { [shape: string]: [number, number] } = {
  round: [1.35, 0.66],
  almond: [1.5, 0.5],
  wide: [1.6, 0.68],
  narrow: [1.5, 0.38]
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
    eye.lookAt(p[0] * 3, p[1] * 3, p[2] * 3 + 1.5);
    const white = part('eye-white', new THREE.SphereGeometry(0.13, 24, 18), toon('#fbf8f4'), 0.012);
    white.scale.set(sx, sy, 0.4);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), toon(avatar.eyeColour));
    iris.name = 'iris';
    iris.scale.set(1, Math.min(1, sy / 0.62), 0.3);
    iris.position.z = 0.045;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 12), new THREE.MeshBasicMaterial({ color: '#1a1026' }));
    pupil.name = 'pupil';
    pupil.scale.set(1, Math.min(1, sy / 0.62), 0.3);
    pupil.position.z = 0.058;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.name = 'glint';
    glint.position.set(-0.025, 0.02, 0.065);
    // The upper lid: a dark line over the top of the eye, which is what gives it its shape
    const lid = part('eye-lid', new THREE.TorusGeometry(0.13, 0.02, 6, 24, Math.PI), toon('#3a2230'), 0);
    lid.scale.set(sx, sy, 0.6);
    lid.position.z = 0.02;
    // The closed eye, shown only in the middle of a blink: a soft dark line
    // curving down, which is what a shut eye reads as at this size. The eye
    // is pressed flat to blink, so this undoes that on itself to keep its shape.
    const shut = part('eye-shut', new THREE.TorusGeometry(0.13, 0.024, 6, 24, Math.PI), toon('#3a2230'), 0);
    shut.rotation.z = Math.PI;
    shut.scale.set(sx, SHUT_CURVE, 0.6);
    shut.position.z = 0.03;
    shut.visible = false;
    eye.add(white, iris, pupil, glint, lid, shut);
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
    const brow = part('brow', new THREE.BoxGeometry(0.38, girl ? 0.045 : 0.07, 0.06), toon(shade(avatar.hairColour, 0.1)), 0);
    const p = headPoint(avatar.faceShape, normalise([dir[0], 0.24, dir[2]]));
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
export function curtainGeometry(avatar: Avatar, figure: Figure = figureFor(avatar.bodyType)): THREE.BufferGeometry {
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
    [-1, 1].forEach(side => {
      // Down to the jaw and no further, so they hang clear of the shoulders
      for (let i = 0; i < 5; i++) {
        const bead = part('hair-braid', new THREE.SphereGeometry(0.13 - i * 0.006, 14, 10), material, 0.018);
        bead.scale.set(1, 1.25, 1);
        bead.position.set(side * (0.8 - i * 0.02), -0.25 - i * 0.2, -0.35);
        hair.add(bead);
      }
      const tie = part('hair-tie', new THREE.SphereGeometry(0.07, 10, 8), toon('#d633eb'), 0.012);
      tie.position.set(side * 0.7, -1.25, -0.35);
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

/** A body part in the trousers' colour. */
const TROUSERS = '#a86f3f';
const BELT = '#2f2a3a';
const SHOE = '#2c3944';
const SOLE = '#e4e9ea';
const LACE = '#dfe6ea';

/**
 * A rounded tube from `from` to `to`, its radius following `radii` along the
 * way (first to last, straight between). A limb, a sleeve, a trouser leg.
 */
function limb(radii: number[], from: THREE.Vector3, to: THREE.Vector3, segments = 20): THREE.BufferGeometry {
  const length = from.distanceTo(to);
  const points = radii.map((r, i) => new THREE.Vector2(r, (1 - i / (radii.length - 1)) * length));
  // Close both ends so an outline does not show down the inside
  points.unshift(new THREE.Vector2(0.001, length));
  points.push(new THREE.Vector2(0.001, 0));
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
  const topColour = top && top.id !== NO_ITEM ? top.colour : DEFAULT_TOP_COLOUR;
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
  const [beltR] = girth(figure, figure.belt);
  const belt = part('belt', new THREE.CylinderGeometry(beltR * 1.04, beltR * 1.04, 0.2, 40, 1, true), toon(BELT, { side: THREE.DoubleSide }), 0.02);
  belt.position.y = figure.belt;
  belt.scale.z = depth;
  body.add(belt);
  const buckle = part('buckle', new THREE.BoxGeometry(0.34, 0.24, 0.06), toon('#c9a54a'), 0.015);
  buckle.position.set(0, figure.belt, beltR * 1.04 * depth + 0.02);
  body.add(buckle);

  [-1, 1].forEach(side => {
    const hip = new THREE.Vector3(side * figure.hip[0], figure.hip[1], 0);
    const knee = new THREE.Vector3(side * figure.knee[0], figure.knee[1], 0.04);
    const ankle = new THREE.Vector3(side * figure.ankle[0], figure.ankle[1], 0);
    const [rHip, rKnee, rHem] = figure.legRadii;
    body.add(part('leg', limb([rHip, rHip * 0.92], hip, knee), trousers, 0.04));
    body.add(part('leg', limb([rKnee * 1.02, rKnee, rHem, rHem * 1.05], knee, ankle), trousers, 0.04));
    // Cargo pockets on the outside of each thigh, as in the reference
    const mid = hip.clone().lerp(knee, 0.45);
    const pocket = part('cargo-pocket', new THREE.BoxGeometry(0.14, 1.3, 0.8), toon(shade(TROUSERS, 0.08)), 0.02);
    pocket.position.set(mid.x + side * (rHip * 0.92), mid.y, 0);
    body.add(pocket);
    const flap = part('cargo-flap', new THREE.BoxGeometry(0.18, 0.3, 0.86), toon(shade(TROUSERS, 0.16)), 0.02);
    flap.position.set(mid.x + side * (rHip * 0.94), mid.y + 0.62, 0);
    body.add(flap);

    // Sneakers: a white sole, a dark upper, laces over the top
    const [footLength, footWidth] = figure.foot;
    const shoe = new THREE.Group();
    shoe.name = 'shoe';
    shoe.position.set(ankle.x, 0, 0.18 * footLength);
    const sole = part('shoe-sole', new THREE.CylinderGeometry(0.5, 0.5, 0.26, 28), toon(SOLE), 0.02);
    sole.scale.set(footWidth, 1, footLength);
    sole.position.y = 0.13;
    const upperShoe = part('shoe-upper', new THREE.SphereGeometry(0.5, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), toon(SHOE), 0.025);
    upperShoe.scale.set(footWidth * 0.94, 1.15, footLength * 0.94);
    upperShoe.position.y = 0.24;
    const toe = part('shoe-toe', new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(SOLE), 0.02);
    toe.scale.set(footWidth * 0.8, 0.5, footLength * 0.34);
    toe.position.set(0, 0.24, footLength * 0.3);
    shoe.add(sole, upperShoe, toe);
    for (let i = 0; i < 3; i++) {
      const lace = part('shoe-lace', new THREE.BoxGeometry(footWidth * 0.5, 0.05, 0.06), toon(LACE), 0.008);
      lace.position.set(0, 0.62 + i * 0.1 - i * i * 0.02, footLength * (0.14 - i * 0.1));
      shoe.add(lace);
    }
    body.add(shoe);

    // Arms hang from the shoulder: a round shoulder, then the upper arm and forearm
    const shoulder = new THREE.Vector3(side * figure.shoulder[0], figure.shoulder[1], 0);
    const elbowXY = hang(figure.shoulder, figure.upperArm, figure.armSwing, 1);
    const wristXY = wrist(figure);
    const elbow = new THREE.Vector3(side * elbowXY[0], elbowXY[1], 0.08);
    const wristV = new THREE.Vector3(side * wristXY[0], wristXY[1], 0.18);
    const [rShoulder, rElbow, rWrist] = figure.armRadii;
    const cap = part('shoulder', new THREE.SphereGeometry(rShoulder * 1.08, 20, 14), cloth, 0.04);
    cap.position.copy(shoulder);
    body.add(cap);
    if (cut === 'short') {
      // A short sleeve ends above the elbow; below it is a bare arm
      const sleeveEnd = shoulder.clone().lerp(elbow, 0.55);
      body.add(part('arm', limb([rShoulder * 1.05, rShoulder], shoulder, sleeveEnd), cloth, 0.04));
      body.add(part('bare-arm', limb([rElbow * 0.8, rElbow * 0.78], sleeveEnd, elbow), skin, 0.035));
      body.add(part('forearm', limb([rElbow * 0.78, rWrist * 0.75], elbow, wristV), skin, 0.035));
    } else {
      body.add(part('arm', limb([rShoulder, rElbow * 1.05], shoulder, elbow), cloth, 0.04));
      body.add(part('forearm', limb([rElbow, rWrist * 1.02], elbow, wristV), cloth, 0.04));
      // A ribbed cuff at the wrist
      const cuff = part('cuff', limb([rWrist * 1.12, rWrist * 1.12], wristV.clone().lerp(elbow, 0.12), wristV), toon(shade(topColour, 0.12)), 0.02);
      body.add(cuff);
      if (cut === 'hoodie') {
        // The red of the shirt underneath shows at the wrist, as in the reference
        const under = part('undershirt-cuff', limb([rWrist * 1.0, rWrist * 0.98], wristV, wristV.clone().add(wristV.clone().sub(elbow).normalize().multiplyScalar(0.12))), toon('#b5302b'), 0.015);
        body.add(under);
      }
    }
    // A hand: palm, fingers together, and a thumb, hanging relaxed
    const hand = new THREE.Group();
    hand.name = 'hand';
    const down = wristV.clone().sub(elbow).normalize();
    hand.position.copy(wristV);
    hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
    const palm = part('palm', new THREE.SphereGeometry(0.5, 18, 14), skin, 0.025);
    palm.scale.set(0.44, figure.handLength * 0.6, 0.7);
    palm.position.y = -figure.handLength * 0.28;
    const fingers = part('fingers', new THREE.SphereGeometry(0.5, 18, 14), skin, 0.025);
    fingers.scale.set(0.38, figure.handLength * 0.6, 0.62);
    fingers.position.set(0, -figure.handLength * 0.68, 0.04);
    fingers.rotation.x = 0.25;
    const thumb = part('thumb', new THREE.SphereGeometry(0.5, 12, 10), skin, 0.02);
    thumb.scale.set(0.2, figure.handLength * 0.4, 0.2);
    thumb.position.set(-side * 0.02, -figure.handLength * 0.36, 0.34);
    thumb.rotation.x = 0.5;
    hand.add(palm, fingers, thumb);
    body.add(hand);
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
    const hoodRing = new THREE.TorusGeometry(figure.neckRadius * 1.9, 0.3, 14, 40, Math.PI * 2 - gap);
    hoodRing.rotateX(Math.PI / 2);
    hoodRing.rotateY(-(Math.PI / 2 + gap / 2));
    const hood = part('hood', hoodRing, toon(shade(topColour, 0.06)), 0.04);
    hood.rotation.x = -0.18;
    hood.position.set(0, collarY - 0.05, -0.08);
    hood.scale.set(1.2, 1, 1);
    // Round off the two ends of the roll either side of the V
    [Math.PI / 2 + gap / 2, Math.PI / 2 - gap / 2].forEach(angle => {
      const end = part('hood-end', new THREE.SphereGeometry(0.3, 14, 10), toon(shade(topColour, 0.06)), 0.03);
      end.position.set(Math.cos(angle) * figure.neckRadius * 1.9, 0, Math.sin(angle) * figure.neckRadius * 1.9);
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
    [-1, 1].forEach(side => {
      const x = side * 0.3;
      const [chestR] = girth(figure, collarY - 0.9);
      const string = part('hoodie-string', new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), toon('#dfe6ea'), 0.012);
      string.position.set(x, collarY - 0.75, chestR * depth + 0.06);
      string.rotation.x = -0.12;
      body.add(string);
      const tip = part('hoodie-string-tip', new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), toon('#9aa5ab'), 0.01);
      tip.position.set(x, collarY - 1.4, chestR * depth + 0.13);
      body.add(tip);
    });
    const pocketY = figure.hem + 0.95;
    const [pocketR] = girth(figure, pocketY);
    const pocket = part('hoodie-pocket', new THREE.BoxGeometry(1.5, 0.95, 0.08), toon(shade(topColour, 0.1)), 0.02);
    pocket.position.set(0, pocketY, pocketR * depth + 0.03);
    body.add(pocket);
  } else {
    // A plain round neckline
    const neckline = part('neckline', new THREE.TorusGeometry(figure.neckRadius * 1.18, 0.07, 8, 28), toon(shade(topColour, 0.14)), 0.012);
    neckline.rotation.x = Math.PI / 2;
    neckline.position.y = collarY + 0.04;
    body.add(neckline);
  }

  if (top && top.id === 'striped') {
    for (let i = 0; i < 5; i++) {
      const y = figure.hem + 0.5 + i * 0.62;
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
    const y = figure.hem + (figure.shoulder[1] - figure.hem) * 0.62;
    mesh.position.set(0, y, girth(figure, y)[0] * depth + 0.03);
    body.add(mesh);
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
function buildPedestal(radius: number): THREE.Group {
  const pedestal = new THREE.Group();
  pedestal.name = 'pedestal';
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

/**
 * The whole character, standing on the origin, in the figure of the body
 * type picked. The head and everything on it (hair, a hat, glasses) share
 * one position and one scale, so what fits the head in its own space fits it
 * here, on every figure.
 */
export function buildAvatar(avatar: Avatar): THREE.Group {
  const figure = figureFor(avatar.bodyType);
  const root = new THREE.Group();
  root.name = 'avatar';
  root.add(buildPedestal(figure.ankle[0] + figure.foot[1] + 0.9));
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
  return root;
}

/** How long one blink takes, shut and open again, in milliseconds. */
export const BLINK_MS = 180;
/** How open an eye is at the bottom of a blink: a line, not nothing. */
export const EYE_SHUT = 0.08;

/**
 * How open the eyes are `t` milliseconds into a blink, 1 being wide open:
 * they close quickly and open a little more slowly, the way a real blink
 * does. Wide open before the blink starts and after it ends.
 */
export function blinkOpenness(t: number): number {
  const closing = BLINK_MS * 0.4;
  if (t <= 0 || t >= BLINK_MS) {
    return 1;
  }
  if (t < closing) {
    return 1 - (t / closing) * (1 - EYE_SHUT);
  }
  return EYE_SHUT + ((t - closing) / (BLINK_MS - closing)) * (1 - EYE_SHUT);
}

/** Below this, an eye in a blink is drawn as the closed line rather than a squashed eye. */
export const SHUT_BELOW = 0.35;

/**
 * Opens or closes a built character's eyes, 1 wide open. Each eye is pressed
 * flat top to bottom, lid and all, and near the bottom of the blink the
 * closed line takes its place, so it reads as shut whatever the eye's shape.
 * Nothing else on the face moves.
 */
export function setEyesOpen(root: THREE.Object3D, openness: number) {
  const shut = openness < SHUT_BELOW;
  root.traverse(object => {
    if (object.name !== 'eye') {
      return;
    }
    object.scale.y = openness;
    // The closed line, or the open eye pressed flat: never both at once
    object.children.forEach(child => {
      if (child.name === 'eye-shut') {
        child.visible = shut;
        child.scale.y = SHUT_CURVE / openness;
      } else {
        child.visible = !shut;
      }
    });
  });
}

/** Frees every geometry and material under a built character. */
export function disposeAvatar(root: THREE.Object3D) {
  root.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
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

