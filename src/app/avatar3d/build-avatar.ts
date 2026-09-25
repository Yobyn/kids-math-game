import * as THREE from 'three';
import { Avatar, DEFAULT_TOP_COLOUR, findItem, NO_ITEM } from '../avatar/avatar-model';
import { HATS_OVER_HAIR, shade } from '../avatar/avatar-parts';
import {
  BROW_DIRS, EAR_DIRS, EYE_DIRS, HAT_CAP, MOUTH_DIR, NOSE_DIR, Vec3, hairPoint, hairline, headPoint, normalise
} from './head-surface';
import { at, crownGrid, part, scale, starShape, surfaceGeometry, toon } from './toon';
import { buildGlasses, buildHat } from './wardrobe3d';

/**
 * The child's character, built in 3D from the same choices the 2D drawing
 * uses. Nothing here touches the DOM or WebGL: it makes a three.js group of
 * meshes, which a viewer draws and a test can measure.
 *
 * The look is toon: flat bands of light and a dark outline round every part,
 * which reads at any angle and on any screen, and matches the drawn game.
 */

/**
 * The body's proportions, in one place. The head (about 2 across) sits on
 * a body a little taller than itself: big enough to read as a child with a
 * big head rather than a head on a peg, and still chibi.
 */
export const BODY = {
  /** Where the torso starts (the waist) and how tall it is. */
  waist: 0.95,
  torsoHeight: 1.38,
  /** How much wider than deep the torso is. */
  torsoScale: [1.12, 1, 0.74] as [number, number, number],
  /** Where each arm hangs from, and how far out it swings. */
  shoulder: [0.68, 1.9] as [number, number],
  armLength: 1.0,
  armSwing: 0.24,
  /** The hips' radius, before the torso's width and depth are applied. */
  hips: 0.62
};

/** The head's centre: just above the top of the torso, on a short neck. */
const HEAD_Y = BODY.waist + BODY.torsoHeight + 1.05;

/**
 * The torso's outline from waist to collar, as (radius, height) — rounded at
 * the hem, fullest at the chest, then a long soft slope over the shoulders to
 * the collar. No ledge: the arms hang from the slope.
 */
const TORSO_PROFILE: [number, number][] = [
  [0.001, 0], [0.58, 0.02], [0.66, 0.15], [0.68, 0.5], [0.7, 0.85],
  [0.67, 1.05], [0.56, 1.22], [0.36, 1.33], [0.2, 1.37], [0.001, 1.38]
];

/** How far out the torso is at `h` above the waist (the lathe is straight between points). */
export function torsoRadius(h: number): number {
  const p = TORSO_PROFILE;
  if (h <= p[0][1]) {
    return p[0][0];
  }
  for (let i = 1; i < p.length; i++) {
    if (h <= p[i][1]) {
      const t = (h - p[i - 1][1]) / (p[i][1] - p[i - 1][1]);
      return p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t;
    }
  }
  return p[p.length - 1][0];
}

/** A point on the front of the torso at `h` above the waist, nudged out by `out`. */
function chest(h: number, out = 0.01): number {
  return torsoRadius(h) * BODY.torsoScale[2] + out;
}

function buildHead(avatar: Avatar): THREE.Group {
  const head = new THREE.Group();
  head.name = 'head-group';
  head.position.y = HEAD_Y;
  const skin = avatar.skin;
  const shape = avatar.faceShape;

  head.add(part('head', surfaceGeometry(d => headPoint(shape, d), d => headPoint(shape, d)), toon(skin), 0.045));

  // Ears, tucked a little into the side of the head
  EAR_DIRS.forEach((dir, i) => {
    const ear = part('ear', new THREE.SphereGeometry(0.2, 20, 16), toon(skin), 0.02);
    ear.scale.set(0.55, 1, 0.8);
    at(ear, headPoint(shape, dir), 0.97);
    head.add(ear);
  });

  // Nose: a soft bump in a slightly deeper tone
  const nose = part('nose', new THREE.SphereGeometry(0.1, 16, 12), toon(shade(skin, 0.12)), 0);
  nose.scale.set(1, 0.85, 0.7);
  at(nose, headPoint(shape, NOSE_DIR), 1.0);
  head.add(nose);

  // Cheeks
  EYE_DIRS.forEach(dir => {
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20),
      new THREE.MeshBasicMaterial({ color: '#ff7aa2', transparent: true, opacity: 0.35 }));
    cheek.name = 'cheek';
    const p = headPoint(shape, normalise([dir[0] * 1.15, -0.2, dir[2]]));
    at(cheek, p, 1.005);
    cheek.lookAt(p[0] * 2, p[1] * 2, p[2] * 2);
    head.add(cheek);
  });

  head.add(buildEyes(avatar));
  head.add(buildBrows(avatar));
  head.add(buildMouth(avatar));
  return head;
}

const EYE_SCALE: { [shape: string]: [number, number] } = {
  round: [1, 1],
  almond: [1.25, 0.72],
  wide: [1.2, 1.1],
  narrow: [1.25, 0.5]
};

function buildEyes(avatar: Avatar): THREE.Group {
  const eyes = new THREE.Group();
  eyes.name = 'eyes';
  const [sx, sy] = EYE_SCALE[avatar.eyeShape] || EYE_SCALE.round;
  EYE_DIRS.forEach((dir, i) => {
    const eye = new THREE.Group();
    eye.name = 'eye';
    const p = headPoint(avatar.faceShape, dir);
    at(eye, p, 0.99);
    eye.lookAt(p[0] * 3, p[1] * 3, p[2] * 3 + 1.5);
    const white = part('eye-white', new THREE.SphereGeometry(0.17, 24, 18), toon('#ffffff'), 0.018);
    white.scale.set(sx, sy, 0.45);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), toon(avatar.eyeColour));
    iris.name = 'iris';
    iris.scale.set(Math.min(sx, 1.05), Math.min(sy, 1), 0.3);
    iris.position.z = 0.065;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: '#1a1026' }));
    pupil.name = 'pupil';
    pupil.scale.set(1, Math.min(sy, 1), 0.3);
    pupil.position.z = 0.085;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.name = 'glint';
    glint.position.set(-0.035, 0.035 * sy, 0.1);
    eye.add(white, iris, pupil, glint);
    eyes.add(eye);
  });
  return eyes;
}

function buildBrows(avatar: Avatar): THREE.Group {
  const brows = new THREE.Group();
  brows.name = 'brows';
  BROW_DIRS.forEach((dir, i) => {
    const brow = part('brow', new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), toon(shade(avatar.hairColour, 0.1)), 0);
    const p = headPoint(avatar.faceShape, dir);
    at(brow, p, 1.01);
    brow.rotation.z = Math.PI / 2 + (i === 0 ? -0.18 : 0.18);
    brow.rotation.y = i === 0 ? -0.35 : 0.35;
    brows.add(brow);
  });
  return brows;
}

function buildMouth(avatar: Avatar): THREE.Group {
  const mouth = new THREE.Group();
  mouth.name = 'mouth';
  const p = headPoint(avatar.faceShape, MOUTH_DIR);
  at(mouth, p, 1.0);
  mouth.lookAt(p[0] * 3, p[1] * 3, p[2] * 3 + 2);
  const lip = toon('#8e2f4a');
  switch (avatar.mouthShape) {
    case 'grin': {
      const shape = new THREE.Shape();
      shape.moveTo(-0.22, 0.03);
      shape.quadraticCurveTo(0, -0.28, 0.22, 0.03);
      shape.lineTo(-0.22, 0.03);
      const grin = part('mouth-shape', new THREE.ShapeGeometry(shape, 16), new THREE.MeshBasicMaterial({ color: '#5a1a2e' }), 0);
      const teeth = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.06), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      teeth.position.set(0, 0.0, 0.002);
      mouth.add(grin, teeth);
      break;
    }
    case 'open': {
      const open = part('mouth-shape', new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: '#5a1a2e' }), 0);
      open.scale.set(1, 0.85, 1);
      const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#e0607e' }));
      tongue.position.set(0, -0.04, 0.002);
      mouth.add(open, tongue);
      break;
    }
    case 'soft': {
      const soft = part('mouth-shape', new THREE.TorusGeometry(0.1, 0.022, 8, 20, Math.PI * 0.6), lip, 0);
      soft.rotation.z = Math.PI + Math.PI * 0.2;
      soft.position.y = 0.06;
      mouth.add(soft);
      break;
    }
    case 'smile':
    default: {
      const smile = part('mouth-shape', new THREE.TorusGeometry(0.17, 0.026, 8, 24, Math.PI * 0.8), lip, 0);
      smile.rotation.z = Math.PI + Math.PI * 0.1;
      smile.position.y = 0.1;
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
export function curtainGeometry(avatar: Avatar): THREE.BufferGeometry {
  const columns = 48;
  const rows = 24;
  const from = Math.PI * 0.56;
  const to = Math.PI * 1.44;
  const top = 0.1;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= columns; c++) {
      const phi = from + (c / columns) * (to - from);
      const middle = Math.cos((c / columns - 0.5) * Math.PI); // 1 at the centre back
      const length = 1.35 + 0.2 * middle;
      const y = top - v * length;
      const start = hairPoint(avatar.faceShape, 'long', avatar.hairTexture,
        normalise([Math.sin(phi), top, Math.cos(phi)])) || headPoint(avatar.faceShape, [Math.sin(phi), top, Math.cos(phi)]);
      const reach = Math.hypot(start[0], start[2]);
      // Out over the shoulders, then in a little at the very ends
      const radius = reach * (1 + 0.1 * Math.sin(v * Math.PI * 0.8)) - 0.12 * v ** 4;
      positions.push(Math.sin(phi) * radius, y, Math.cos(phi) * radius * 0.92);
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

function buildHair(avatar: Avatar): THREE.Group {
  const hair = new THREE.Group();
  hair.name = 'hair';
  hair.position.y = HEAD_Y;
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
    hair.add(part('hair-long', curtainGeometry(avatar), material, 0.025));
  }
  if (style === 'bun' && !hatCovers) {
    const bun = part('hair-bun', new THREE.SphereGeometry(0.36, 24, 18), material, 0.025);
    at(bun, headPoint(shape, normalise([0, 0.82, -0.5])), 1.18);
    hair.add(bun);
  }
  if (style === 'braids') {
    [-1, 1].forEach(side => {
      for (let i = 0; i < 7; i++) {
        const bead = part('hair-braid', new THREE.SphereGeometry(0.13 - i * 0.006, 14, 10), material, 0.018);
        bead.scale.set(1, 1.25, 1);
        bead.position.set(side * (0.78 - i * 0.02), -0.25 - i * 0.2, -0.35);
        hair.add(bead);
      }
      const tie = part('hair-tie', new THREE.SphereGeometry(0.07, 10, 8), toon('#d633eb'), 0.012);
      tie.position.set(side * 0.64, -1.68, -0.35);
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

function buildBody(avatar: Avatar): THREE.Group {
  const body = new THREE.Group();
  body.name = 'body';
  const top = findItem('top', avatar.top);
  const topColour = top && top.id !== NO_ITEM ? top.colour : DEFAULT_TOP_COLOUR;
  const cloth = toon(topColour);
  const skin = toon(avatar.skin);
  const trousers = toon('#3b3663');
  const [sx, sy, sz] = BODY.torsoScale;

  const torso = part('torso', new THREE.LatheGeometry(TORSO_PROFILE.map(([r, h]) => new THREE.Vector2(r, h)), 40), cloth, 0.025);
  torso.position.y = BODY.waist;
  torso.scale.set(sx, sy, sz);
  body.add(torso);

  // Hips, in the trousers, joining the legs to the torso
  const hips = part('hips', new THREE.SphereGeometry(BODY.hips, 28, 16), trousers, 0.022);
  hips.scale.set(sx, 0.5, sz);
  hips.position.y = BODY.waist + 0.04;
  body.add(hips);

  if (top && top.id === 'striped') {
    for (let i = 0; i < 4; i++) {
      const h = 0.25 + i * 0.24;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(torsoRadius(h + 0.05), torsoRadius(h - 0.05), 0.1, 40, 1, true),
        toon('#ffffff'));
      band.name = 'stripe';
      band.position.y = BODY.waist + h;
      band.scale.set(sx * 1.01, 1, sz * 1.01);
      body.add(band);
    }
  }
  if (top && (top.id === 'star-tee' || top.id === 'flower-tee')) {
    const decal = top.id === 'star-tee' ? starShape(0.24, 0.1) : flowerShape(0.22);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(decal, 12),
      new THREE.MeshBasicMaterial({ color: top.id === 'star-tee' ? '#ffd166' : '#ff8fb8' }));
    mesh.name = 'decal';
    mesh.position.set(0, BODY.waist + 0.8, chest(0.8));
    body.add(mesh);
  }
  if (top && top.id === 'hoodie') {
    // The hood, hanging down the upper back below the head
    const hood = part('hood', new THREE.SphereGeometry(0.5, 24, 16), toon(shade(topColour, 0.08)), 0.022);
    hood.scale.set(1.1, 0.8, 0.42);
    hood.position.set(0, BODY.waist + 1.05, -chest(1.05, 0.08));
    body.add(hood);
    const lining = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 12), toon(shade(topColour, 0.3)));
    lining.name = 'hood-lining';
    lining.scale.set(1.1, 0.7, 0.3);
    lining.position.set(0, BODY.waist + 1.15, -chest(1.05, 0.2));
    body.add(lining);
    // Drawstrings and a pocket, so it reads as a hoodie from the front too
    [-1, 1].forEach(side => {
      const string = part('hoodie-string', new THREE.CylinderGeometry(0.028, 0.028, 0.4, 8), toon('#f3e9e2'), 0.01);
      string.position.set(side * 0.16, BODY.waist + 1.02, chest(1.02, 0.02));
      string.rotation.x = -0.3;
      body.add(string);
    });
    const pocket = part('hoodie-pocket', new THREE.BoxGeometry(0.78, 0.32, 0.06), toon(shade(topColour, 0.12)), 0.015);
    pocket.position.set(0, BODY.waist + 0.32, chest(0.32, 0.02));
    pocket.rotation.x = -0.05;
    body.add(pocket);
  }

  // Neck, from inside the collar up into the head
  const neck = part('neck', new THREE.CylinderGeometry(0.22, 0.24, 0.5, 16), skin, 0.02);
  neck.position.y = BODY.waist + BODY.torsoHeight;
  body.add(neck);

  const [shoulderX, shoulderY] = BODY.shoulder;
  [-1, 1].forEach(side => {
    // A round shoulder in the sleeve, so the arm grows out of the slope
    const cap = part('shoulder', new THREE.SphereGeometry(0.23, 18, 14), cloth, 0.022);
    cap.position.set(side * (shoulderX - 0.02), shoulderY - 0.02, 0);
    body.add(cap);
    // The arm hangs from the shoulder, swung a little away from the body
    const arm = new THREE.Group();
    arm.name = 'arm-pivot';
    arm.position.set(side * shoulderX, shoulderY, 0);
    arm.rotation.z = side * BODY.armSwing;
    const sleeve = part('arm', new THREE.CylinderGeometry(0.21, 0.17, BODY.armLength * 0.82, 16), cloth, 0.022);
    sleeve.position.y = -BODY.armLength * 0.41;
    arm.add(sleeve);
    const cuff = part('cuff', new THREE.TorusGeometry(0.16, 0.035, 8, 20), toon(shade(topColour, 0.15)), 0.01);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -BODY.armLength * 0.8;
    arm.add(cuff);
    const hand = part('hand', new THREE.SphereGeometry(0.19, 18, 14), skin, 0.02);
    hand.scale.set(0.9, 1.05, 0.85);
    hand.position.y = -BODY.armLength * 0.94;
    arm.add(hand);
    body.add(arm);

    const leg = part('leg', new THREE.CylinderGeometry(0.24, 0.21, 0.82, 16), trousers, 0.022);
    leg.position.set(side * 0.3, 0.55, 0);
    body.add(leg);
    const shoe = part('shoe', new THREE.SphereGeometry(0.25, 18, 12), toon('#f2f0ff'), 0.02);
    shoe.scale.set(1, 0.55, 1.4);
    shoe.position.set(side * 0.3, 0.12, 0.09);
    body.add(shoe);
  });
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
function buildPedestal(): THREE.Group {
  const pedestal = new THREE.Group();
  pedestal.name = 'pedestal';
  const top = part('pedestal-top', new THREE.CylinderGeometry(1.25, 1.35, 0.18, 48), toon('#3a2f6e'), 0.02);
  top.position.y = -0.1;
  pedestal.add(top);
  const blue = new THREE.Color('#3880ff');
  const magenta = new THREE.Color('#d633eb');
  const ring = new THREE.TorusGeometry(1.3, 0.04, 8, 96);
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

/** The whole character, standing on the origin, about 3.5 units tall. */
export function buildAvatar(avatar: Avatar): THREE.Group {
  const root = new THREE.Group();
  root.name = 'avatar';
  root.add(buildPedestal());
  root.add(buildBody(avatar));
  root.add(buildHead(avatar));
  root.add(buildHair(avatar));
  const hat = buildHat(avatar);
  const glasses = buildGlasses(avatar);
  [hat, glasses].forEach(item => {
    if (item) {
      item.position.y = HEAD_Y;
      root.add(item);
    }
  });
  return root;
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

export { HEAD_Y };
