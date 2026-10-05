import * as THREE from 'three';
import { blob, eyes } from './pets';
import { part, starShape, toon } from './toon';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';

/**
 * The Space family (Yobyn, 2026-09-27: "alien in pod / adds ray gun and boots
 * / alien captain with ship behind"). Stage 1 is a little alien peeping out
 * of a round pod under a glass dome; stage 2 has climbed out in its space
 * suit, with red space boots and a ray gun; stage 3 is the captain, in a
 * captain's cap with gold on its shoulders, its flying saucer hovering
 * behind it.
 *
 * Made of the dragon's soft round shapes and named the way the dragon is:
 * the whole alien is the `creature`, its head the `creature-head` (it rises
 * on a breath), its `eye`s blink, and the tips of its antennae, the pod's and
 * the saucer's lights and the ray gun's tip are `creature-glow`s (they pulse).
 */

export const ALIEN_GREEN = '#8fd16a';
export const SUIT = '#7b5cff';
export const BOOTS = '#ff5a5f';
export const GOLD = '#f4c430';
const SILVER = '#d5dde8';
const GLASS = '#bfe9ff';
const CAP = '#2b2d6e';
const MOUTH = '#3b1f3a';
const BLUSH = '#ff8fb1';
/** The pod's and the saucer's lights. */
export const SPACE_LIGHT = '#ffe066';
/** The light at the ray gun's tip. */
export const RAY_GLOW = '#7dffb0';

/** Something that shines: unlit, so it reads as light at every angle. Each light its own, so each pulses once. */
function light(colour: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: colour });
}

/** Glass: pale and see-through, and drawn without an ink line (one would fill it in). */
function glass(): THREE.MeshToonMaterial {
  return toon(GLASS, { transparent: true, opacity: 0.28, depthWrite: false });
}

/** A round limb from one point to another, as thick as `radius`. */
function limb(name: string, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const along = to.clone().sub(from);
  const mesh = blob(name, [radius, along.length() / 2, radius], [0, 0, 0], material, 0.025);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
  return mesh;
}

/**
 * An alien's head: wide and round, with big eyes that blink, rosy cheeks, a
 * smile, and two antennae with a light at each tip.
 */
function alienHead(size: number): THREE.Group {
  const head = new THREE.Group();
  head.name = CREATURE_HEAD;
  const [rx, ry, rz] = [1.2 * size, 1.0 * size, 1.0 * size];
  head.add(blob('space-skull', [rx, ry, rz], [0, 0, 0], toon(ALIEN_GREEN), 0.035));
  const pair = eyes([0, 0.02 * size, 0], 0.42 * size, 0.86 * size, 0.2 * size);
  pair.children.forEach(eye => (eye.name = 'eye'));
  head.add(pair);
  [-1, 1].forEach(side => {
    head.add(blob('space-cheek', [0.16 * size, 0.09 * size, 0.05 * size], [side * 0.68 * size, -0.3 * size, 0.79 * rz], toon(BLUSH), 0));
    // An antenna, leaning out, with its light at the tip
    const antenna = new THREE.Group();
    antenna.name = 'space-antenna';
    antenna.position.set(side * 0.45 * size, ry * 0.85, 0);
    antenna.rotation.z = -side * 0.35;
    const length = 0.75 * size;
    const stalk = part('space-antenna-stalk', new THREE.CylinderGeometry(0.05 * size, 0.07 * size, length, 10), toon(ALIEN_GREEN), 0.015);
    stalk.position.y = length / 2;
    antenna.add(stalk);
    antenna.add(blob(CREATURE_GLOW, [0.15 * size, 0.15 * size, 0.15 * size], [0, length, 0], light(SPACE_LIGHT), 0));
    head.add(antenna);
  });
  const smile = part('space-smile', new THREE.TorusGeometry(0.18 * size, 0.035 * size, 8, 16, Math.PI), toon(MOUTH), 0);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.3 * size, 0.94 * rz);
  head.add(smile);
  return head;
}

/** Stage 1: the alien in its pod, peeping out from under a glass dome, the pod's lights round its side. */
function inPod(): THREE.Group {
  const alien = new THREE.Group();
  const podTop = 1.0;
  const profile = [[0.001, 0], [1.0, 0], [1.3, 0.15], [1.65, 0.55], [1.8, 0.85], [1.75, podTop], [0.001, podTop]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  alien.add(part('space-pod', new THREE.LatheGeometry(profile, 32), toon(SILVER), 0.03));
  const rim = part('space-pod-rim', new THREE.TorusGeometry(1.76, 0.1, 10, 40), toon(SUIT), 0.015);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = podTop;
  alien.add(rim);
  for (let i = 0; i < 6; i++) {
    const turn = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const lamp = blob(CREATURE_GLOW, [0.13, 0.13, 0.08], [Math.sin(turn) * 1.72, 0.6, Math.cos(turn) * 1.72], light(SPACE_LIGHT), 0);
    lamp.rotation.y = turn;
    alien.add(lamp);
  }
  // The alien, sitting in it: a little body, two hands on the glass, and its head
  alien.add(blob('space-body', [0.75, 0.62, 0.62], [0, 1.5, 0], toon(ALIEN_GREEN), 0.03));
  [-1, 1].forEach(side => alien.add(blob('space-hand', [0.22, 0.2, 0.22], [side * 0.62, 1.6, 0.68], toon(ALIEN_GREEN), 0.02)));
  const head = alienHead(0.9);
  head.position.y = 2.55;
  alien.add(head);
  // The dome over it, and a shine on the glass
  const dome = part('space-dome', new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass(), 0);
  dome.scale.set(1.8, 3.5, 1.8);
  dome.position.y = podTop;
  alien.add(dome);
  alien.add(blob('space-dome-shine', [0.16, 0.38, 0.05], [-0.95, 3.0, 1.13], new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }), 0));
  return alien;
}

/** The ray gun, pointing along +z from the hand: a yellow body, a silver barrel with rings, and a light at its tip. */
function rayGun(): THREE.Group {
  const gun = new THREE.Group();
  gun.name = 'space-ray-gun';
  gun.add(blob('space-ray-gun-grip', [0.1, 0.22, 0.12], [0, -0.14, 0.05], toon(CAP), 0.015));
  gun.add(blob('space-ray-gun-body', [0.2, 0.2, 0.38], [0, 0.1, 0.28], toon(GOLD), 0.02));
  const barrel = part('space-ray-gun-barrel', new THREE.CylinderGeometry(0.09, 0.09, 0.55, 12), toon(SILVER), 0.015);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.1, 0.8);
  gun.add(barrel);
  [0.68, 0.88].forEach(z => {
    const ring = part('space-ray-gun-ring', new THREE.TorusGeometry(0.13, 0.04, 8, 16), toon(BOOTS), 0.01);
    ring.position.set(0, 0.1, z);
    gun.add(ring);
  });
  gun.add(blob(CREATURE_GLOW, [0.13, 0.13, 0.13], [0, 0.1, 1.1], light(RAY_GLOW), 0));
  return gun;
}

/**
 * The alien standing in its space suit: legs in red space boots, a round
 * suit with a belt and a silver collar, arms with green hands, and its head.
 * `armed` holds the ray gun up in its right hand; otherwise both arms hang
 * at its sides.
 */
function suited(armed: boolean, size: number): THREE.Group {
  const alien = new THREE.Group();
  const suit = toon(SUIT);
  const green = toon(ALIEN_GREEN);
  [-1, 1].forEach(side => {
    alien.add(blob('space-leg', [0.4, 0.55, 0.42], [side * 0.6, 1.05, 0], suit, 0.025));
    alien.add(blob('space-boot', [0.52, 0.4, 0.72], [side * 0.64, 0.4, 0.22], toon(BOOTS), 0.025));
    alien.add(blob('space-boot-cuff', [0.47, 0.13, 0.5], [side * 0.62, 0.78, 0.1], toon(SILVER), 0.02));
  });
  alien.add(blob('space-suit', [1.1, 1.2, 1.0], [0, 2.35, 0], suit, 0.035));
  alien.add(blob('space-belt', [1.04, 0.16, 0.95], [0, 1.85, 0], toon(GOLD), 0.02));
  alien.add(blob('space-collar', [0.62, 0.18, 0.58], [0, 3.45, 0], toon(SILVER), 0.02));
  [-1, 1].forEach(side => {
    const shoulder = new THREE.Vector3(side * 0.95, 3.0, 0.05);
    const holding = armed && side === 1;
    const hand = holding ? new THREE.Vector3(side * 1.45, 2.45, 0.55) : new THREE.Vector3(side * 1.4, 1.75, 0.2);
    // The sleeve runs from the shoulder to just short of the hand, which closes its end
    const wrist = hand.clone().lerp(shoulder, 0.12);
    alien.add(limb('space-sleeve', shoulder, wrist, 0.3, suit));
    alien.add(blob('space-hand', [0.26, 0.24, 0.26], [hand.x, hand.y, hand.z], green, 0.02));
    if (holding) {
      // Raised, pointing at the sky
      const gun = rayGun();
      gun.position.copy(hand);
      gun.rotation.set(-Math.PI / 2, 0, -0.2);
      alien.add(gun);
    }
  });
  const head = alienHead(size);
  head.position.y = 3.45 + size * 0.95;
  alien.add(head);
  return alien;
}

/** Stage 2: out of the pod, in its suit and space boots, with a ray gun and a planet on its chest. */
function spaceman(): THREE.Group {
  const alien = suited(true, 1);
  alien.add(blob('space-badge', [0.2, 0.2, 0.08], [0.45, 2.8, 0.86], toon(GOLD), 0.015));
  return alien;
}

/** The captain's cap: a navy crown with a gold band, a peak, and a gold star. */
function captainsCap(head: THREE.Object3D, size: number) {
  const cap = new THREE.Group();
  cap.name = 'space-cap';
  const brimAt = 0.7 * size;
  const crown = part('space-cap-crown', new THREE.CylinderGeometry(0.95 * size, 0.86 * size, 0.55 * size, 28), toon(CAP), 0.025);
  crown.position.y = brimAt + 0.275 * size;
  cap.add(crown);
  const band = part('space-cap-band', new THREE.TorusGeometry(0.88 * size, 0.06 * size, 8, 32), toon(GOLD), 0.01);
  band.rotation.x = Math.PI / 2;
  band.position.y = brimAt + 0.06 * size;
  cap.add(band);
  const peak = blob('space-cap-peak', [0.75 * size, 0.07 * size, 0.45 * size], [0, brimAt, 0.72 * size], toon(CAP), 0.02);
  peak.rotation.x = 0.2;
  cap.add(peak);
  const star = part('space-cap-star', new THREE.ShapeGeometry(starShape(0.2 * size, 0.09 * size)), toon(GOLD, { side: THREE.DoubleSide }), 0);
  star.position.set(0, brimAt + 0.32 * size, 0.93 * size);
  cap.add(star);
  head.add(cap);
}

/** The captain's flying saucer: a silver hull, a glass dome on top, lights round its rim. */
function saucer(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'space-ship';
  const profile = [[0.001, -0.22], [0.55, -0.22], [1.2, -0.02], [1.25, 0.04], [1.14, 0.1], [0.55, 0.2], [0.001, 0.2]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  ship.add(part('space-ship-hull', new THREE.LatheGeometry(profile, 40), toon(SILVER), 0.03));
  const dome = part('space-ship-dome', new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(GLASS), 0.02);
  dome.position.y = 0.18;
  ship.add(dome);
  for (let i = 0; i < 8; i++) {
    const turn = (i / 8) * Math.PI * 2;
    ship.add(blob(CREATURE_GLOW, [0.09, 0.07, 0.09], [Math.sin(turn) * 1.22, 0.03, Math.cos(turn) * 1.22], light(SPACE_LIGHT), 0));
  }
  // Hovering behind the captain, over its shoulder, tipped towards us so its top shows
  ship.position.set(-2.2, 4.75, -1.2);
  ship.rotation.set(0.35, 0, -0.15);
  ship.scale.setScalar(0.82);
  return ship;
}

/** Stage 3: the captain, in a cap, gold on its shoulders and a gold star, its saucer behind it. */
function captain(): THREE.Group {
  const size = 1.05;
  const alien = suited(false, size);
  [-1, 1].forEach(side => alien.add(blob('space-epaulette', [0.42, 0.14, 0.42], [side * 0.8, 3.2, 0], toon(GOLD), 0.02)));
  const star = part('space-captain-star', new THREE.ShapeGeometry(starShape(0.28, 0.12)), toon(GOLD, { side: THREE.DoubleSide }), 0);
  star.position.set(0.45, 2.8, 0.88);
  alien.add(star);
  captainsCap(alien.getObjectByName(CREATURE_HEAD)!, size);
  alien.add(saucer());
  return alien;
}

/** The alien at a stage (1 to 3), scaled to its stage's height, standing at the origin. */
export function buildSpace(stage: number): THREE.Group {
  const at = Math.min(Math.max(Math.round(stage) || 1, 1), 3);
  const alien = at === 1 ? inPod() : at === 2 ? spaceman() : captain();
  alien.name = CREATURE;
  alien.userData.stage = at;
  alien.userData.family = 'space';
  // Scaled so the stage stands its height, measured as the dragon is: what glows left out
  alien.updateMatrixWorld(true);
  const box = new THREE.Box3();
  alien.traverse(node => {
    if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
      box.expandByObject(node);
    }
  });
  alien.scale.setScalar(STAGE_HEIGHT[at - 1] / box.max.y);
  return alien;
}
