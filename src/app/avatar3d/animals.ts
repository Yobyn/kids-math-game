import * as THREE from 'three';
import { lighten } from '../avatar/avatar-model';
import { shade } from '../avatar/avatar-parts';
import { blob, eyes, tail } from './pets';
import { part, starShape, toon } from './toon';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';

/**
 * The Animals family (Yobyn, 2026-09-27: "plain animal in hoodie / adds gear
 * for its hobby / pro version with trophy"). The animal is a bear cub, and
 * its hobby is football: stage 1 is the bear in a cosy hoodie; stage 2 adds
 * its football gear — a sweatband, football boots and a ball at its feet;
 * stage 3 is the pro, holding up a gold trophy that sparkles.
 *
 * Made of the dragon's soft round shapes and named the way the dragon is:
 * the whole bear is the `creature`, its head the `creature-head` (it rises on
 * a breath), its `eye`s blink, its little tail is a `pet-tail` (it wags) and
 * the trophy's sparkle is a `creature-glow` (it pulses).
 */

export const BEAR_BROWN = '#b07a4f';
export const HOODIE = '#6c7cf2';
const NOSE = '#3b2a22';
const BLUSH = '#f08aa0';
/** The football kit: boots, the sweatband, the ball. */
export const BOOTS = '#2fbf71';
export const SWEATBAND = '#e63946';
export const GOLD = '#f4c430';

/** Two eyes that blink: the pets' eyes, renamed for the rig. */
function blinkingEyes(head: [number, number, number], spread: number, forward: number, size: number): THREE.Group {
  const group = eyes(head, spread, forward, size);
  group.children.forEach(eye => (eye.name = 'eye'));
  return group;
}

/** A bear's head: round, with round ears, a light muzzle, a button nose, blushing cheeks and eyes that blink. */
function bearHead(fur: THREE.Material, light: THREE.Material): THREE.Group {
  const head = new THREE.Group();
  head.name = CREATURE_HEAD;
  head.add(blob('animal-skull', [1.3, 1.15, 1.15], [0, 0, 0], fur, 0.035));
  [-1, 1].forEach(side => {
    head.add(blob('animal-ear', [0.4, 0.4, 0.22], [side * 0.88, 0.92, -0.1], fur, 0.025));
    head.add(blob('animal-ear-inner', [0.22, 0.22, 0.08], [side * 0.88, 0.9, 0.08], light, 0));
    head.add(blob('animal-cheek', [0.2, 0.12, 0.06], [side * 0.78, -0.32, 0.86], toon(BLUSH), 0));
  });
  head.add(blob('animal-muzzle', [0.55, 0.4, 0.35], [0, -0.32, 0.92], light, 0.025));
  head.add(blob('animal-nose', [0.18, 0.13, 0.1], [0, -0.16, 1.26], toon(NOSE), 0.015));
  head.add(blinkingEyes([0, 0.12, 0.2], 0.48, 0.86, 0.17));
  return head;
}

/**
 * The bear cub, the same at every stage: fur legs and paws, a body in its
 * hoodie (a hood bunched behind its neck, strings and a pocket), sleeves,
 * a round head and a stubby tail. `holding` bends its arms forward to hold
 * something in front of its tummy.
 */
function bearCub(boots: boolean, holding: boolean): THREE.Group {
  const bear = new THREE.Group();
  const fur = toon(BEAR_BROWN);
  const light = toon(lighten(BEAR_BROWN, 0.55));
  const cloth = toon(HOODIE);
  const trim = toon(shade(HOODIE, 0.15));
  [-1, 1].forEach(side => {
    bear.add(blob('animal-leg', [0.55, 0.62, 0.6], [side * 0.7, 0.68, 0], fur));
    bear.add(blob('animal-foot', [0.5, 0.28, 0.7], [side * 0.72, 0.28, 0.28], boots ? toon(BOOTS) : fur, 0.025));
    if (boots) {
      // A white stripe down each boot
      bear.add(blob('animal-boot-stripe', [0.08, 0.2, 0.5], [side * 0.72 + side * 0.4, 0.33, 0.28], toon('#ffffff'), 0.01));
    } else {
      bear.add(blob('animal-pad', [0.26, 0.08, 0.3], [side * 0.72, 0.22, 0.72], light, 0));
    }
  });
  // The hoodie: the body, a pocket, the hood bunched behind the neck, the strings
  bear.add(blob('animal-hoodie', [1.35, 1.5, 1.2], [0, 2.3, 0], cloth, 0.035));
  bear.add(blob('animal-pocket', [0.75, 0.33, 0.22], [0, 1.8, 1.02], trim, 0.02));
  bear.add(blob('animal-hood', [0.9, 0.45, 0.5], [0, 3.55, -0.75], trim, 0.025));
  [-1, 1].forEach(side => {
    const string = part('animal-hoodie-string', new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), toon('#ffffff'), 0.01);
    string.position.set(side * 0.25, 3.15, 1.12);
    string.rotation.x = -0.35;
    bear.add(string);
  });
  // Sleeves and paws: at its sides, or forward, holding something in front of it
  [-1, 1].forEach(side => {
    const sleeve = blob('animal-sleeve', [0.34, 0.65, 0.36], holding ? [side * 1.15, 2.55, 0.75] : [side * 1.4, 2.55, 0.3], cloth, 0.025);
    if (holding) {
      sleeve.rotation.set(-0.9, 0, side * 0.45);
    }
    bear.add(sleeve);
    bear.add(blob('animal-paw', [0.3, 0.28, 0.3], holding ? [side * 0.62, 2.3, 1.42] : [side * 1.5, 1.85, 0.45], fur, 0.02));
  });
  // A stubby tail, which wags
  bear.add(tail([0, 1.55, -1.1], [[0, 0, 0], [0, 0.05, -0.2]], 0.26, fur));
  const head = bearHead(fur, light);
  head.position.set(0, 4.75, 0.1);
  bear.add(head);
  return bear;
}

/** Football kit for a head: a sweatband round the forehead. */
function sweatband(head: THREE.Object3D) {
  const band = part('animal-sweatband', new THREE.TorusGeometry(1.2, 0.12, 10, 32), toon(SWEATBAND), 0.02);
  band.rotation.x = Math.PI / 2 - 0.25;
  band.position.set(0, 0.42, 0.02);
  band.scale.set(1.04, 0.97, 1);
  head.add(band);
}

/** A football at its feet: white, with dark patches. */
function football(): THREE.Group {
  const ball = new THREE.Group();
  ball.name = 'animal-football';
  const radius = 0.42;
  ball.add(part('animal-ball', new THREE.SphereGeometry(radius, 24, 18), toon('#ffffff'), 0.02));
  [[0, 0, 1], [0.8, 0.45, 0.4], [-0.8, 0.45, 0.4], [0.5, -0.7, 0.5], [-0.5, -0.7, 0.5], [0, 0.95, -0.3]].forEach(([x, y, z]) => {
    const out = new THREE.Vector3(x, y, z).normalize();
    const patch = blob('animal-ball-patch', [0.16, 0.16, 0.03], [out.x * radius, out.y * radius, out.z * radius], toon('#2b2b33'), 0);
    patch.lookAt(out.clone().multiplyScalar(radius * 2));
    ball.add(patch);
  });
  // In front of its right boot, on the stand
  ball.position.set(1.05, radius + 0.03, 1.05);
  return ball;
}

/** The pro's trophy: a gold cup on a stem and a base, with two handles and a sparkle. */
function trophy(): THREE.Group {
  const cup = new THREE.Group();
  cup.name = 'animal-trophy';
  const gold = toon(GOLD);
  const profile = [[0.001, 0], [0.34, 0], [0.34, 0.12], [0.12, 0.2], [0.09, 0.45], [0.16, 0.55], [0.46, 0.75], [0.52, 1.15], [0.001, 1.15]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  cup.add(part('animal-trophy-cup', new THREE.LatheGeometry(profile, 28), gold, 0.02));
  [-1, 1].forEach(side => {
    const handle = part('animal-trophy-handle', new THREE.TorusGeometry(0.18, 0.045, 8, 16, Math.PI), gold, 0.012);
    handle.rotation.z = -side * Math.PI / 2;
    handle.position.set(side * 0.5, 0.95, 0);
    cup.add(handle);
  });
  // Its sparkle, which pulses
  const sparkle = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.2, 0.08)), new THREE.MeshBasicMaterial({ color: '#fff6c2', side: THREE.DoubleSide }));
  sparkle.name = CREATURE_GLOW;
  sparkle.position.set(0.3, 1.1, 0.4);
  cup.add(sparkle);
  cup.position.set(0, 1.55, 1.55);
  return cup;
}

/** The bear at a stage (1 to 3), scaled to its stage's height, standing at the origin. */
export function buildAnimal(stage: number): THREE.Group {
  const at = Math.min(Math.max(Math.round(stage) || 1, 1), 3);
  const bear = bearCub(at >= 2, at === 3);
  if (at >= 2) {
    sweatband(bear.getObjectByName(CREATURE_HEAD)!);
  }
  if (at === 2) {
    bear.add(football());
  }
  if (at === 3) {
    bear.add(trophy());
  }
  bear.name = CREATURE;
  bear.userData.stage = at;
  bear.userData.family = 'animal';
  // Scaled so the stage stands its height, measured as the dragon is: what glows left out
  bear.updateMatrixWorld(true);
  const box = new THREE.Box3();
  bear.traverse(node => {
    if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
      box.expandByObject(node);
    }
  });
  bear.scale.setScalar(STAGE_HEIGHT[at - 1] / box.max.y);
  return bear;
}
