import * as THREE from 'three';
import { lighten } from '../avatar/avatar-model';
import { shade } from '../avatar/avatar-parts';
import { part, toon } from './toon';

/**
 * The pets a child can earn, in the stage's toon look: a kitten, a puppy and
 * a baby dragon, each sitting on its own small stand beside the character's.
 *
 * Built from a few round shapes, like the character's hands and shoes, and
 * sized the way a pet sits by a person: up to about the knee. Each one sits
 * on the floor at its own origin, facing forward (+z); build-avatar.ts puts
 * it beside the stand. A tail hangs from a `pet-tail` joint at its root, and
 * the dragon's wings from `pet-wing` joints at the shoulder, so rig.ts can
 * wag and flap them.
 */

export const PET_TAIL = 'pet-tail';
export const PET_WING = 'pet-wing';

const EYE = '#1a1026';
const NOSE_PINK = '#e58a9a';

/** A round shape: a sphere scaled to [x, y, z] radii, at a point. */
function blob(name: string, radii: [number, number, number], at: [number, number, number], material: THREE.Material, outline = 0.02): THREE.Mesh {
  const mesh = part(name, new THREE.SphereGeometry(1, 24, 18), material, outline);
  mesh.scale.set(...radii);
  mesh.position.set(...at);
  return mesh;
}

/** Two eyes with a glint, looking forward from a head centred at `head`. */
function eyes(head: [number, number, number], spread: number, forward: number, size: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pet-eyes';
  [-1, 1].forEach(side => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshBasicMaterial({ color: EYE }));
    eye.name = 'pet-eye';
    eye.scale.set(1, 1.2, 0.6);
    eye.position.set(head[0] + side * spread, head[1] + size * 0.6, head[2] + forward);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(size * 0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    glint.position.set(-size * 0.3, size * 0.4, size * 0.5);
    eye.add(glint);
    group.add(eye);
  });
  return group;
}

/** A curled tail from the joint at its root, along a few points. */
function tail(root: [number, number, number], points: [number, number, number][], radius: number, material: THREE.Material): THREE.Group {
  const joint = new THREE.Group();
  joint.name = PET_TAIL;
  joint.position.set(...root);
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  joint.add(part('pet-tail-shape', new THREE.TubeGeometry(curve, 24, radius, 10, false), material, 0.015));
  const tip = blob('pet-tail-tip', [radius, radius, radius], points[points.length - 1], material, 0.015);
  joint.add(tip);
  return joint;
}

function kitten(colour: string): THREE.Group {
  const fur = toon(colour);
  const cream = toon(lighten(colour, 0.7));
  const pet = new THREE.Group();
  pet.add(blob('pet-body', [0.55, 0.62, 0.62], [0, 0.62, 0], fur));
  pet.add(blob('pet-chest', [0.36, 0.42, 0.3], [0, 0.72, 0.36], cream, 0.012));
  [-1, 1].forEach(side => pet.add(blob('pet-paw', [0.16, 0.12, 0.2], [side * 0.22, 0.1, 0.46], cream, 0.012)));
  const head: [number, number, number] = [0, 1.45, 0.2];
  pet.add(blob('pet-head', [0.46, 0.4, 0.4], head, fur));
  pet.add(blob('pet-muzzle', [0.2, 0.13, 0.12], [0, 1.34, 0.55], cream, 0.01));
  pet.add(blob('pet-nose', [0.05, 0.04, 0.03], [0, 1.42, 0.66], toon(NOSE_PINK), 0));
  [-1, 1].forEach(side => {
    const ear = part('pet-ear', new THREE.ConeGeometry(0.16, 0.34, 4), fur, 0.015);
    ear.position.set(side * 0.27, 1.82, 0.16);
    ear.rotation.z = -side * 0.35;
    pet.add(ear);
  });
  pet.add(eyes(head, 0.17, 0.34, 0.07));
  pet.add(tail([0, 0.35, -0.5], [[0, 0, 0], [0.2, 0.25, -0.25], [0.35, 0.8, -0.3], [0.25, 1.15, -0.1]], 0.08, fur));
  return pet;
}

function puppy(colour: string): THREE.Group {
  const fur = toon(colour);
  const dark = toon(shade(colour, 0.35));
  const light = toon(lighten(colour, 0.55));
  const pet = new THREE.Group();
  pet.add(blob('pet-body', [0.62, 0.7, 0.72], [0, 0.7, 0], fur));
  pet.add(blob('pet-chest', [0.4, 0.46, 0.32], [0, 0.8, 0.42], light, 0.012));
  [-1, 1].forEach(side => pet.add(blob('pet-paw', [0.19, 0.14, 0.24], [side * 0.26, 0.12, 0.54], light, 0.012)));
  const head: [number, number, number] = [0, 1.62, 0.22];
  pet.add(blob('pet-head', [0.5, 0.46, 0.46], head, fur));
  pet.add(blob('pet-muzzle', [0.26, 0.2, 0.26], [0, 1.48, 0.6], light, 0.012));
  pet.add(blob('pet-nose', [0.09, 0.07, 0.06], [0, 1.58, 0.86], toon(EYE), 0));
  pet.add(blob('pet-tongue', [0.07, 0.03, 0.08], [0, 1.33, 0.78], toon(NOSE_PINK), 0));
  [-1, 1].forEach(side => {
    // Floppy ears, hanging down the sides of the head
    const ear = blob('pet-ear', [0.13, 0.36, 0.22], [side * 0.5, 1.5, 0.18], dark, 0.015);
    ear.rotation.z = side * 0.25;
    pet.add(ear);
  });
  pet.add(eyes(head, 0.2, 0.4, 0.075));
  pet.add(tail([0, 0.5, -0.62], [[0, 0, 0], [0, 0.3, -0.2], [0, 0.65, -0.25]], 0.09, fur));
  return pet;
}

function dragon(colour: string): THREE.Group {
  const scales = toon(colour);
  const belly = toon(lighten(colour, 0.55));
  const horn = toon('#f3e2b3');
  const pet = new THREE.Group();
  pet.add(blob('pet-body', [0.6, 0.72, 0.66], [0, 0.72, 0], scales));
  pet.add(blob('pet-chest', [0.38, 0.52, 0.3], [0, 0.78, 0.4], belly, 0.012));
  [-1, 1].forEach(side => pet.add(blob('pet-paw', [0.18, 0.13, 0.24], [side * 0.26, 0.12, 0.5], scales, 0.012)));
  const head: [number, number, number] = [0, 1.66, 0.24];
  pet.add(blob('pet-head', [0.46, 0.42, 0.44], head, scales));
  pet.add(blob('pet-muzzle', [0.3, 0.2, 0.3], [0, 1.52, 0.6], scales, 0.012));
  [-1, 1].forEach(side => {
    pet.add(blob('pet-nostril', [0.035, 0.03, 0.02], [side * 0.1, 1.58, 0.89], toon(shade(colour, 0.5)), 0));
    const hornMesh = part('pet-horn', new THREE.ConeGeometry(0.08, 0.36, 10), horn, 0.012);
    hornMesh.position.set(side * 0.2, 2.08, 0.08);
    hornMesh.rotation.x = -0.35;
    hornMesh.rotation.z = -side * 0.2;
    pet.add(hornMesh);
    // Small wings from the shoulders, folded back: a joint each, so they can flap
    const wing = new THREE.Group();
    wing.name = PET_WING;
    wing.userData.side = side;
    wing.position.set(side * 0.38, 1.1, -0.28);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.45, 0.55, 0.95, 0.75);
    shape.lineTo(0.8, 0.35);
    shape.lineTo(0.9, 0.1);
    shape.lineTo(0.6, -0.05);
    shape.quadraticCurveTo(0.3, -0.1, 0, 0);
    const membrane = part('pet-wing-shape', new THREE.ShapeGeometry(shape, 12), toon(shade(colour, 0.15), { side: THREE.DoubleSide }), 0);
    membrane.scale.x = side;
    membrane.rotation.y = side * -0.6;
    wing.add(membrane);
    pet.add(wing);
  });
  pet.add(eyes(head, 0.19, 0.36, 0.07));
  pet.add(tail([0, 0.3, -0.55], [[0, 0, 0], [0.3, -0.1, -0.4], [0.7, 0, -0.5], [0.95, 0.2, -0.35]], 0.11, scales));
  // A spade on the tail's tip
  const spade = part('pet-tail-spike', new THREE.ConeGeometry(0.13, 0.28, 4), horn, 0.012);
  spade.position.set(0.95, 0.4, -0.35);
  pet.getObjectByName(PET_TAIL)!.add(spade);
  return pet;
}

const BUILDERS: { [id: string]: (colour: string) => THREE.Group } = { kitten, puppy, dragon };

/** The pet with this id, sitting at the origin facing forward; null for no pet or one that does not exist. */
export function buildPet(id: string, colour: string): THREE.Group | null {
  const build = BUILDERS[id];
  if (!build) {
    return null;
  }
  const pet = build(colour);
  pet.name = 'pet-' + id;
  return pet;
}

/** The ids with a 3D pet, for tests to hold the wardrobe to. */
export const PET_IDS = Object.keys(BUILDERS);
