import * as THREE from 'three';
import { Avatar, NO_ITEM, findItem, lighten } from '../avatar/avatar-model';
import { HATS_OVER_HAIR, shade } from '../avatar/avatar-parts';
import {
  EYE_DIRS, HAT_CAP, HAT_LIFT, Vec3, hairPoint, hatBrim, headPoint, normalise, puff, radiusAlong
} from './head-surface';
import { crownGrid, lineDir, part, scale, starShape, toon } from './toon';

/**
 * Hats and glasses in 3D. Like the hair, each is built against the head's
 * own surface rather than placed at a fixed size, so every item fits every
 * face shape by construction: a hat's shell is the head pushed out, ending
 * on the brim line; glasses sit where the eyes are on THIS face and their
 * arms run back along its side.
 *
 * Everything here is in head space: the origin is the head's centre. The
 * caller lifts the result to the head's height.
 */

/** Where the brim line is at angle `phi` round the head, as a direction. */
function brimDir(phi: number): Vec3 {
  return lineDir(Math.acos(hatBrim([Math.sin(phi), 0, Math.cos(phi)])), phi);
}

function brimPoint(avatar: Avatar, phi: number, lift = HAT_LIFT): Vec3 {
  return scale(headPoint(avatar.faceShape, brimDir(phi)), lift);
}

/**
 * The shell of a hat that covers the head: the head's surface pushed out
 * clear of the flattened hair, from the crown down to the brim, turned in
 * underneath. `peak` lifts the crown, for a beanie's soft point.
 */
function hatShell(avatar: Avatar, peak = 0): THREE.BufferGeometry {
  const shape = avatar.faceShape;
  return crownGrid(
    phi => hatBrim([Math.sin(phi), 0, Math.cos(phi)]),
    dir => scale(headPoint(shape, dir), HAT_LIFT + peak * Math.max(0, dir[1]) ** 4),
    dir => headPoint(shape, dir),
    72, 28
  );
}

/** A closed tube along the brim line: a beanie's cuff, a wizard's band. */
function brimBand(avatar: Avatar, radius: number, lift = HAT_LIFT, rise = 0): THREE.BufferGeometry {
  const points = Array.from({ length: 64 }, (_, i) => {
    const p = brimPoint(avatar, (i / 64) * Math.PI * 2, lift);
    return new THREE.Vector3(p[0], p[1] + rise, p[2]);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 128, radius, 10, true);
}

/**
 * A flat strip out from the brim line, `reach(phi)` wide: a cap's peak, a
 * wizard's brim. It tips down a little as it goes out.
 */
function brimStrip(avatar: Avatar, from: number, to: number, reach: (phi: number) => number, drop: number): THREE.BufferGeometry {
  const steps = 64;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const phi = from + (i / steps) * (to - from);
    const inner = brimPoint(avatar, phi, HAT_LIFT - 0.02);
    const out = reach(phi);
    positions.push(...inner);
    positions.push(inner[0] + Math.sin(phi) * out, inner[1] - drop * out, inner[2] + Math.cos(phi) * out);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** The top of the hat shell, straight up. */
function crownTop(avatar: Avatar, peak = 0): Vec3 {
  return scale(headPoint(avatar.faceShape, [0, 1, 0]), HAT_LIFT + peak);
}

function cap(avatar: Avatar, colour: string): THREE.Group {
  const hat = new THREE.Group();
  const cloth = toon(colour, { side: THREE.DoubleSide });
  hat.add(part('hat-shell', hatShell(avatar, 0.06), cloth, 0.03));
  // The peak: out over the forehead, widest at the middle
  const peak = brimStrip(avatar, -1.25, 1.25, phi => 0.62 * Math.max(0, Math.cos(phi * 1.2)) ** 0.6, 0.12);
  hat.add(part('hat-peak', peak, toon(shade(colour, 0.25), { side: THREE.DoubleSide }), 0.02));
  const button = part('hat-button', new THREE.SphereGeometry(0.09, 14, 10), toon(shade(colour, 0.3)), 0.015);
  button.position.set(...crownTop(avatar, 0.06));
  hat.add(button);
  return hat;
}

function beanie(avatar: Avatar, colour: string, bobble: boolean): THREE.Group {
  const hat = new THREE.Group();
  hat.add(part('hat-shell', hatShell(avatar, 0.16), toon(colour, { side: THREE.DoubleSide }), 0.03));
  const cuffColour = bobble ? '#f3e9e2' : shade(colour, 0.12);
  hat.add(part('hat-cuff', brimBand(avatar, 0.11, HAT_LIFT + 0.02, 0.08), toon(cuffColour), 0.025));
  if (bobble) {
    // A fluffy ball on top: a sphere with soft puffs over it
    const ball = new THREE.SphereGeometry(0.3, 32, 24);
    const position = ball.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const dir: Vec3 = [position.getX(i), position.getY(i), position.getZ(i)];
      const k = 1 + 0.12 * puff(dir, 40);
      position.setXYZ(i, dir[0] * k, dir[1] * k, dir[2] * k);
    }
    ball.computeVertexNormals();
    const bobbleMesh = part('hat-bobble', ball, toon('#f3e9e2'), 0.025);
    const top = crownTop(avatar, 0.16);
    bobbleMesh.position.set(top[0], top[1] + 0.24, top[2]);
    hat.add(bobbleMesh);
  }
  return hat;
}

function wizard(avatar: Avatar, colour: string): THREE.Group {
  const hat = new THREE.Group();
  const shape = avatar.faceShape;
  const cloth = toon(colour, { side: THREE.DoubleSide });
  // The brim, all the way round
  hat.add(part('hat-brim', brimStrip(avatar, 0, Math.PI * 2, () => 0.5, 0.06), toon(shade(colour, 0.12), { side: THREE.DoubleSide }), 0.02));
  // The cone: from the brim line to a tip that flops back, pushed clear of
  // the head wherever the straight line would cut into it
  const top = crownTop(avatar);
  const tip = new THREE.Vector3(0.15, top[1] + 1.35, -0.4);
  const columns = 48;
  const rows = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    for (let c = 0; c <= columns; c++) {
      const base = new THREE.Vector3(...brimPoint(avatar, (c / columns) * Math.PI * 2));
      const p = base.clone().lerp(tip, t);
      p.x += 0.12 * Math.sin(t * Math.PI) * t;
      const clear = radiusAlong(shape, [p.x, p.y, p.z]) * HAT_LIFT + 0.02;
      if (p.length() < clear) {
        p.setLength(clear);
      }
      positions.push(p.x, p.y, p.z);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c;
      const b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const cone = new THREE.BufferGeometry();
  cone.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  cone.setIndex(indices);
  cone.computeVertexNormals();
  hat.add(part('hat-cone', cone, cloth, 0.03));
  hat.add(part('hat-band', brimBand(avatar, 0.06, HAT_LIFT + 0.01, 0.1), toon('#ffd34d'), 0.015));
  // Two stars on the front of the cone
  [[0.3, 0.32, 0.16], [0.58, -0.2, 0.11]].forEach(([t, phi, size]) => {
    const base = new THREE.Vector3(...brimPoint(avatar, phi));
    const p = base.lerp(tip, t);
    const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape(size, size * 0.45)),
      new THREE.MeshBasicMaterial({ color: '#ffd34d', side: THREE.DoubleSide }));
    star.name = 'hat-star';
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    star.position.copy(p).addScaledVector(out, 0.04);
    star.lookAt(star.position.clone().add(out));
    hat.add(star);
  });
  return hat;
}

/**
 * A crown is worn IN the hair, not over it: it sits on top of whatever the
 * hair is, sunk a little into it, so it rides high on an afro and low on a
 * buzz cut.
 */
export function crownSeat(avatar: Avatar, radius: number): number {
  const surface = (dir: Vec3) => hairPoint(avatar.faceShape, avatar.hairStyle, avatar.hairTexture, dir)
    || headPoint(avatar.faceShape, dir);
  let lowest = Infinity;
  for (let i = 0; i < 16; i++) {
    const phi = (i / 16) * Math.PI * 2;
    // Walk down from the top until the surface is `radius` out from the middle
    for (let theta = 0; theta < Math.PI / 2; theta += 0.01) {
      const p = surface(lineDir(theta, phi));
      if (Math.hypot(p[0], p[2]) >= radius) {
        lowest = Math.min(lowest, p[1]);
        break;
      }
    }
  }
  return lowest - 0.08;
}

function crown(avatar: Avatar, colour: string): THREE.Group {
  const hat = new THREE.Group();
  const radius = 0.56;
  const seat = crownSeat(avatar, radius);
  const points = 5;
  const columns = points * 12;
  const positions: number[] = [];
  const indices: number[] = [];
  const tips: Vec3[] = [];
  for (let c = 0; c <= columns; c++) {
    const phi = (c / columns) * Math.PI * 2;
    const wave = 1 - Math.abs(((c / columns) * points * 2) % 2 - 1); // 1 at each point
    const height = 0.22 + 0.26 * wave;
    const x = Math.sin(phi) * radius;
    const z = Math.cos(phi) * radius;
    positions.push(x, seat, z, x * 1.04, seat + height, z * 1.04);
    if (c % 12 === 6 && c < columns) {
      tips.push([x * 1.04, seat + height, z * 1.04]);
    }
    if (c < columns) {
      const a = c * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const band = new THREE.BufferGeometry();
  band.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  band.setIndex(indices);
  band.computeVertexNormals();
  hat.add(part('hat-crown', band, toon(colour, { side: THREE.DoubleSide }), 0.02));
  tips.forEach(p => {
    const ball = part('hat-crown-tip', new THREE.SphereGeometry(0.06, 12, 10), toon(lighten(colour, 0.35)), 0.012);
    ball.position.set(p[0], p[1] + 0.04, p[2]);
    hat.add(ball);
  });
  ['#c1442e', '#3f8fd6', '#3f8fd6'].forEach((gem, i) => {
    const phi = [0, -0.7, 0.7][i];
    const stone = part('hat-gem', new THREE.SphereGeometry(i ? 0.055 : 0.07, 12, 10), toon(gem), 0.012);
    stone.scale.z = 0.6;
    stone.position.set(Math.sin(phi) * radius * 1.06, seat + 0.11, Math.cos(phi) * radius * 1.06);
    stone.lookAt(stone.position.clone().multiplyScalar(2));
    hat.add(stone);
  });
  return hat;
}

/** The hat, built for this face, or null when none is worn. */
export function buildHat(avatar: Avatar): THREE.Group | null {
  const item = findItem('hat', avatar.hat);
  if (!item || item.id === NO_ITEM) {
    return null;
  }
  let hat: THREE.Group;
  switch (item.id) {
    case 'cap': hat = cap(avatar, item.colour); break;
    case 'beanie': hat = beanie(avatar, item.colour, false); break;
    case 'bobble-hat': hat = beanie(avatar, item.colour, true); break;
    case 'wizard': hat = wizard(avatar, item.colour); break;
    case 'crown': hat = crown(avatar, item.colour); break;
    default: return null;
  }
  hat.name = 'hat';
  return hat;
}

/**
 * The outside of whatever is on the head at `dir` — hair where there is
 * hair (pressed flat under a hat), skin where there is none. Glasses' arms
 * run along it.
 */
function outside(avatar: Avatar, dir: Vec3): Vec3 {
  const capAt = HATS_OVER_HAIR.includes(avatar.hat) ? HAT_CAP : undefined;
  return hairPoint(avatar.faceShape, avatar.hairStyle, avatar.hairTexture, dir, capAt) || headPoint(avatar.faceShape, dir);
}

/** How far in front of the eye a lens sits, clear of the eyeball. */
export const LENS_OFFSET = 0.16;

/** The centre of each lens, in front of the eye on this face. */
export function lensCentres(avatar: Avatar): Vec3[] {
  return EYE_DIRS.map(dir => {
    const p = headPoint(avatar.faceShape, dir);
    return [p[0], p[1], p[2] + LENS_OFFSET] as Vec3;
  });
}

/** An arm from the lens's outer edge back along the side of the head to the ear. */
function arm(avatar: Avatar, from: Vec3, side: number, y: number, radius: number): THREE.BufferGeometry {
  const points = [new THREE.Vector3(...from)];
  for (let i = 0; i <= 6; i++) {
    const phi = side * (0.75 + (i / 6) * 0.95);
    const p = scale(outside(avatar, normalise([Math.sin(phi), y, Math.cos(phi)])), 1.04);
    points.push(new THREE.Vector3(...p));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 8, false);
}

function lensMaterial(colour: string, opacity: number): THREE.Material {
  return new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
}

function roundedLens(width: number, height: number, flatTop: boolean): THREE.Shape {
  const s = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  if (flatTop) {
    s.moveTo(-w, h);
    s.lineTo(w, h);
    s.quadraticCurveTo(w * 0.92, -h, 0, -h);
    s.quadraticCurveTo(-w * 0.92, -h, -w, h);
  } else {
    s.absellipse(0, 0, w, h, 0, Math.PI * 2, false, 0);
  }
  return s;
}

function glint(): THREE.Mesh {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.12), lensMaterial('#ffffff', 0.8));
  g.name = 'glasses-glint';
  g.position.set(-0.08, 0.05, 0.03);
  g.rotation.z = -0.8;
  return g;
}

/** The glasses, built for this face, or null when none are worn. */
export function buildGlasses(avatar: Avatar): THREE.Group | null {
  const item = findItem('glasses', avatar.glasses);
  if (!item || item.id === NO_ITEM) {
    return null;
  }
  const glasses = new THREE.Group();
  glasses.name = 'glasses';
  const centres = lensCentres(avatar);
  const eyeY = normalise(EYE_DIRS[0])[1];
  const lensWidth = 0.27;
  let frame = item.colour;
  const armRadius = 0.025;

  centres.forEach((c, i) => {
    const side = i === 0 ? -1 : 1;
    const lens = new THREE.Group();
    lens.name = 'lens';
    lens.position.set(...c);
    // Turned a little to follow the face round
    lens.rotation.y = side * 0.28;
    switch (item.id) {
      case 'round-glasses': {
        lens.add(part('glasses-frame', new THREE.TorusGeometry(0.25, 0.035, 10, 40), toon(frame), 0.012));
        lens.add(new THREE.Mesh(new THREE.CircleGeometry(0.25, 32), lensMaterial('#ffffff', 0.14)));
        lens.add(glint());
        break;
      }
      case 'shades': {
        frame = '#140e1f';
        const shape = roundedLens(0.54, 0.4, true);
        const solid = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false, curveSegments: 16 });
        solid.translate(0, 0, -0.02);
        lens.add(part('glasses-lens', solid, toon('#241b33'), 0.018));
        lens.add(glint());
        break;
      }
      case 'goggles': {
        frame = '#3f8f5a';
        const rim = part('glasses-frame', new THREE.CylinderGeometry(0.28, 0.28, 0.16, 32, 1, true), toon(frame, { side: THREE.DoubleSide }), 0.018);
        rim.rotation.x = Math.PI / 2;
        rim.position.z = -0.04;
        lens.add(rim);
        lens.add(part('glasses-frame', new THREE.TorusGeometry(0.28, 0.045, 10, 40), toon(frame), 0.012));
        lens.add(new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), lensMaterial('#9fe0b6', 0.38)));
        lens.add(glint());
        break;
      }
      case 'spooky-glasses': {
        frame = '#8a3f12';
        // A pumpkin: a flattened ball with six lobes round its middle
        const pumpkin = new THREE.SphereGeometry(0.26, 36, 18);
        const position = pumpkin.attributes.position as THREE.BufferAttribute;
        for (let v = 0; v < position.count; v++) {
          const x = position.getX(v);
          const y = position.getY(v);
          const lobe = 1 + 0.07 * Math.cos(Math.atan2(y, x) * 6);
          position.setXYZ(v, x * lobe, y * lobe * 0.92, position.getZ(v) * 0.3);
        }
        pumpkin.computeVertexNormals();
        lens.add(part('glasses-lens', pumpkin, toon('#e07b2a', { transparent: true, opacity: 0.92 }), 0.016));
        const stem = part('glasses-stem', new THREE.CylinderGeometry(0.025, 0.035, 0.12, 8), toon('#3f8f5a'), 0.01);
        stem.position.set(0.02, 0.27, 0);
        stem.rotation.z = -0.4;
        lens.add(stem);
        break;
      }
    }
    glasses.add(lens);

    // The arm, from the outer edge of the lens back to the ear
    if (item.id !== 'goggles') {
      const outer: Vec3 = [c[0] + side * lensWidth * Math.cos(0.28), c[1], c[2] - lensWidth * Math.sin(0.28)];
      glasses.add(part('glasses-arm', arm(avatar, outer, side, eyeY, armRadius), toon(frame), 0.01));
    }
  });
  if (item.id === 'goggles') {
    // A strap all the way round, over the hair
    const points = Array.from({ length: 48 }, (_, i) => {
      const phi = 0.62 + (i / 47) * (Math.PI * 2 - 1.24);
      return new THREE.Vector3(...scale(outside(avatar, normalise([Math.sin(phi), eyeY + 0.04, Math.cos(phi)])), 1.03));
    });
    // From the right-hand lens (+x), round the back, to the left-hand one
    points.unshift(new THREE.Vector3(centres[1][0] + lensWidth, centres[1][1], centres[1][2] - 0.1));
    points.push(new THREE.Vector3(centres[0][0] - lensWidth, centres[0][1], centres[0][2] - 0.1));
    glasses.add(part('glasses-strap', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 96, 0.06, 8, false),
      toon('#2f6b44'), 0.012));
  }

  // The bridge between the lenses
  const inner = centres.map((c, i) => new THREE.Vector3(c[0] + (i === 0 ? 1 : -1) * lensWidth * 0.95, c[1] + 0.03, c[2] + 0.02));
  const middle = new THREE.Vector3(0, centres[0][1] + 0.07, centres[0][2] + 0.1);
  const bridge = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(inner[0], middle, inner[1]), 12,
    item.id === 'goggles' ? 0.045 : 0.03, 8, false);
  glasses.add(part('glasses-bridge', bridge, toon(frame), 0.01));
  return glasses;
}
