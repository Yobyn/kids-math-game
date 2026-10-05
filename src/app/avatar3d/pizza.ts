import * as THREE from 'three';
import { blob, eyes } from './pets';
import { limb } from './space';
import { part, starShape, toon } from './toon';
import { CREATURE, CREATURE_FACE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';

/**
 * The Silly objects family (Yobyn, 2026-09-27: "plain pizza slice / pizza
 * with a cape / super pizza with extra toppings"). A slice of pizza standing
 * on little legs, its point down and its crust on top, with a face in the
 * cheese: stage 1 is plain cheese; stage 2 has pepperoni and a red cape;
 * stage 3 is the super pizza, with extra toppings, a gold-trimmed cape and
 * sparkles.
 *
 * Made of soft, rounded shapes like the dragon and named the way the dragon
 * is: the whole pizza is the `creature`, the slice (face, toppings, arms and
 * cape with it) is the `creature-head` (it rises on a breath), its face and
 * crust the `creature-face` (what a portrait shows), its `eye`s
 * blink, and the super pizza's sparkles are `creature-glow`s (they pulse).
 */

export const CHEESE = '#ffd166';
export const CRUST = '#d9954b';
export const CAPE_RED = '#e63946';
export const GOLD = '#f4c430';
const DOUGH = '#f2c27b';
const PEPPERONI = '#c0392b';
const OLIVE = '#2b2b33';
const MUSHROOM = '#efe0c8';
const BASIL = '#3fa34d';
const SHOES = '#5b6cff';
const MOUTH = '#5a2a1a';
const BLUSH = '#ff8fb1';

/** How the slice stands: its point at LEGS above the floor, SLICE tall to the crust, HALF wide at the crust. */
export const LEGS = 1.0;
const SLICE = 4.5;
const HALF = 2.0;
/** The front of the cheese, where the face and the toppings sit. */
export const CHEESE_FRONT = 0.42;

/** How wide the slice is, either side of its middle, at a height (in the slice's own frame, point at LEGS). */
export function halfWidthAt(y: number): number {
  return (HALF * (y - LEGS)) / SLICE;
}

/** A triangle, point down at the origin, `half` wide either side at `height`. */
function triangle(half: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(half, height);
  shape.lineTo(-half, height);
  shape.closePath();
  return shape;
}

/** A slab of a triangle, rounded at its edges, centred on z = 0. */
function slab(name: string, half: number, height: number, depth: number, round: number, material: THREE.Material, outline: number): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(triangle(half, height), { depth, bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelSegments: 4, curveSegments: 8 });
  geometry.translate(0, 0, -depth / 2);
  return part(name, geometry, material, outline);
}

/** A topping, flat on the cheese at (x, y). */
function topping(name: string, mesh: THREE.Mesh, x: number, y: number): THREE.Mesh {
  mesh.name = name;
  mesh.position.set(x, y, CHEESE_FRONT + 0.02);
  return mesh;
}

function pepperoni(x: number, y: number): THREE.Mesh {
  const slice = part('pizza-pepperoni', new THREE.CylinderGeometry(0.32, 0.32, 0.06, 24), toon(PEPPERONI), 0.012);
  slice.rotation.x = Math.PI / 2;
  return topping('pizza-pepperoni', slice, x, y);
}

function olive(x: number, y: number): THREE.Mesh {
  return topping('pizza-olive', part('pizza-olive', new THREE.TorusGeometry(0.1, 0.05, 8, 16), toon(OLIVE), 0.008), x, y);
}

function mushroom(x: number, y: number): THREE.Mesh {
  return topping('pizza-mushroom', blob('pizza-mushroom', [0.18, 0.13, 0.05], [0, 0, 0], toon(MUSHROOM), 0.01), x, y);
}

function basil(x: number, y: number): THREE.Mesh {
  const leaf = topping('pizza-basil', blob('pizza-basil', [0.2, 0.09, 0.04], [0, 0, 0], toon(BASIL), 0.01), x, y);
  leaf.rotation.z = 0.5;
  return leaf;
}

/** A cape's outline: the top across the slice's shoulders, flaring out to a wavy hem. */
function capeShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-1.8, 0);
  shape.lineTo(1.8, 0);
  shape.lineTo(2.2, -4.5);
  shape.quadraticCurveTo(1.1, -4.2, 0, -4.5);
  shape.quadraticCurveTo(-1.1, -4.2, -2.2, -4.5);
  shape.closePath();
  return shape;
}

/** Hung from the top of the slice, behind it, the bottom swinging back away from the legs. */
function hang(name: string, shape: THREE.Shape, colour: string): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 12 });
  const mesh = part(name, geometry, toon(colour, { side: THREE.DoubleSide }), 0.02);
  mesh.position.set(0, LEGS + SLICE - 0.05, -0.55);
  mesh.rotation.x = 0.25;
  return mesh;
}

/** A red cape. */
function cape(): THREE.Mesh {
  return hang('pizza-cape', capeShape(), CAPE_RED);
}

/** The super pizza's gold trim: a band round the cape's sides and hem, just outside its edge. */
function capeTrim(): THREE.Mesh {
  const g = 1.06;
  const band = new THREE.Shape();
  // Down the outside, round the hem, up to the top...
  band.moveTo(-1.8 * g, 0);
  band.lineTo(-2.2 * g, -4.5 * g);
  band.quadraticCurveTo(-1.1 * g, -4.2 * g, 0, -4.5 * g);
  band.quadraticCurveTo(1.1 * g, -4.2 * g, 2.2 * g, -4.5 * g);
  band.lineTo(1.8 * g, 0);
  // ...and back along the cape's own edge
  band.lineTo(1.8, 0);
  band.lineTo(2.2, -4.5);
  band.quadraticCurveTo(1.1, -4.2, 0, -4.5);
  band.quadraticCurveTo(-1.1, -4.2, -2.2, -4.5);
  band.lineTo(-1.8, 0);
  band.closePath();
  return hang('pizza-cape-trim', band, GOLD);
}

/** The slice, by stage: dough and cheese, the crust, cheese dripping over the edges, the face, arms, toppings and cape. */
function slice(at: number): THREE.Group {
  const head = new THREE.Group();
  head.name = CREATURE_HEAD;
  const dough = slab('pizza-slice', HALF, SLICE, 0.5, 0.15, toon(DOUGH), 0.03);
  dough.position.y = LEGS;
  head.add(dough);
  const cheese = slab('pizza-cheese', HALF * 0.88, SLICE * 0.88, 0.06, 0.06, toon(CHEESE), 0);
  cheese.position.set(0, LEGS + SLICE * 0.09, 0.3);
  head.add(cheese);
  // Cheese dripping over the edges: more of it on the super pizza
  const drips = at === 3 ? [0.35, 0.55, 0.75] : [0.45, 0.7];
  drips.forEach((t, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    const y = LEGS + SLICE * t;
    head.add(blob('pizza-drip', [0.13, 0.26, 0.08], [side * (halfWidthAt(y) - 0.02), y - 0.18, 0.36], toon(CHEESE), 0.015));
  });
  // The face, in the cheese near the top where the slice is widest, under the crust: what a portrait shows
  const face = new THREE.Group();
  face.name = CREATURE_FACE;
  head.add(face);
  face.add(blob('pizza-crust', [HALF + 0.25, 0.45, 0.6], [0, LEGS + SLICE + 0.1, 0], toon(CRUST), 0.03));
  const eyeY = LEGS + SLICE * 0.72;
  const pair = eyes([0, eyeY - 0.26 * 0.6, 0], 0.55, CHEESE_FRONT + 0.06, 0.26);
  pair.children.forEach(eye => (eye.name = 'eye'));
  face.add(pair);
  [-1, 1].forEach(side => face.add(blob('pizza-cheek', [0.2, 0.12, 0.04], [side * 0.95, LEGS + SLICE * 0.6, CHEESE_FRONT + 0.02], toon(BLUSH), 0)));
  const smile = part('pizza-smile', new THREE.TorusGeometry(0.3, 0.05, 8, 16, Math.PI), toon(MOUTH), 0);
  smile.rotation.z = Math.PI;
  smile.position.set(0, LEGS + SLICE * 0.55, CHEESE_FRONT + 0.03);
  face.add(smile);
  // Arms from its sides, with white gloves
  [-1, 1].forEach(side => {
    const y = LEGS + SLICE * 0.45;
    const shoulder = new THREE.Vector3(side * (halfWidthAt(y) - 0.05), y, 0);
    const hand = new THREE.Vector3(side * 1.65, LEGS + SLICE * 0.3, 0.35);
    head.add(limb('pizza-arm', shoulder, hand.clone().lerp(shoulder, 0.12), 0.11, toon(CRUST)));
    head.add(blob('pizza-hand', [0.22, 0.2, 0.22], [hand.x, hand.y, hand.z], toon('#ffffff'), 0.02));
  });
  // Toppings, around the face: none on the plain slice
  if (at >= 2) {
    head.add(pepperoni(0, LEGS + SLICE * 0.29));
    [-1, 1].forEach(side => head.add(pepperoni(side * 1.3, LEGS + SLICE * 0.88)));
  }
  if (at === 3) {
    [-1, 1].forEach(side => {
      head.add(olive(side * 0.75, LEGS + SLICE * 0.92));
      head.add(mushroom(side * 0.42, LEGS + SLICE * 0.41));
    });
    head.add(basil(0, LEGS + SLICE * 0.15));
  }
  if (at >= 2) {
    head.add(cape());
    [-1, 1].forEach(side => head.add(blob('pizza-clasp', [0.16, 0.16, 0.08], [side * 1.55, LEGS + SLICE - 0.25, CHEESE_FRONT + 0.03], toon(GOLD), 0.015)));
  }
  if (at === 3) {
    // A gold trim round the cape, and sparkles above the crust
    head.add(capeTrim());
    [-1, 1].forEach(side => {
      const sparkle = new THREE.Mesh(new THREE.ShapeGeometry(starShape(0.32, 0.13)), new THREE.MeshBasicMaterial({ color: '#fff3a8', side: THREE.DoubleSide }));
      sparkle.name = CREATURE_GLOW;
      sparkle.position.set(side * 1.3, LEGS + SLICE + 1.0, 0.3);
      sparkle.rotation.z = side * 0.3;
      head.add(sparkle);
    });
  }
  return head;
}

/** The pizza at a stage (1 to 3), scaled to its stage's height, standing at the origin. */
export function buildPizza(stage: number): THREE.Group {
  const at = Math.min(Math.max(Math.round(stage) || 1, 1), 3);
  const pizza = new THREE.Group();
  // Little legs from its point, in blue sneakers
  [-1, 1].forEach(side => {
    pizza.add(limb('pizza-leg', new THREE.Vector3(side * 0.1, LEGS + 0.3, 0), new THREE.Vector3(side * 0.45, 0.35, 0.05), 0.1, toon(CRUST)));
    pizza.add(blob('pizza-shoe', [0.3, 0.2, 0.42], [side * 0.5, 0.2, 0.15], toon(SHOES), 0.02));
  });
  pizza.add(slice(at));
  pizza.name = CREATURE;
  pizza.userData.stage = at;
  pizza.userData.family = 'pizza';
  // Scaled so the stage stands its height, measured as the dragon is: what glows left out
  pizza.updateMatrixWorld(true);
  const box = new THREE.Box3();
  pizza.traverse(node => {
    if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
      box.expandByObject(node);
    }
  });
  pizza.scale.setScalar(STAGE_HEIGHT[at - 1] / box.max.y);
  return pizza;
}
