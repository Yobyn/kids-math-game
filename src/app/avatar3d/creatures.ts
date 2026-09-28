import * as THREE from 'three';
import { lighten } from '../avatar/avatar-model';
import { shade } from '../avatar/avatar-parts';
import { PET_WING, blob, eyes, tail } from './pets';
import { part, toon } from './toon';

/**
 * The Creatures family (Yobyn, 2026-09-27): a dragon that grows with the
 * child. Stage 1 is a baby hatching out of its egg, stage 2 a young dragon
 * with small wings, stage 3 a full dragon with a glow round it.
 *
 * Built from the same round shapes as the pets, but character-sized: the
 * full dragon stands about as tall as the kid hero. It faces forward (+z),
 * standing on the floor at the origin. Its joints and eyes are named the way
 * rig.ts already animates them — a `pet-tail` wags, `pet-wing`s flap, `eye`s
 * blink and the head (`creature-head`) rises on a breath — so it is alive the
 * moment it is built.
 */

export const CREATURE = 'creature';
export const CREATURE_HEAD = 'creature-head';
/** The full dragon's glow, named so rig.ts can make it pulse. */
export const CREATURE_GLOW = 'creature-glow';

export const DRAGON_GREEN = '#4fae6a';
const HORN = '#f3e2b3';
const BLUSH = '#f08aa0';

/** How tall each stage stands, in units (the kid hero is about 11.9). */
export const STAGE_HEIGHT = [7, 9.5, 12];

/** Two eyes that blink: the pets' eyes, renamed for the rig. */
function blinkingEyes(head: [number, number, number], spread: number, forward: number, size: number): THREE.Group {
  const group = eyes(head, spread, forward, size);
  group.children.forEach(eye => (eye.name = 'eye'));
  return group;
}

/** A dragon's head: round, with a snout, nostrils, blushing cheeks, eyes and horns. */
function dragonHead(scales: THREE.Material, belly: THREE.Material, colour: string, horn: number): THREE.Group {
  const head = new THREE.Group();
  head.name = CREATURE_HEAD;
  head.add(blob('creature-skull', [1.25, 1.1, 1.15], [0, 0, 0], scales, 0.035));
  head.add(blob('creature-snout', [0.72, 0.5, 0.6], [0, -0.3, 0.9], belly, 0.03));
  [-1, 1].forEach(side => {
    head.add(blob('creature-nostril', [0.07, 0.05, 0.04], [side * 0.22, -0.15, 1.46], toon(shade(colour, 0.5)), 0));
    head.add(blob('creature-cheek', [0.2, 0.12, 0.06], [side * 0.8, -0.35, 0.86], toon(BLUSH), 0));
    const hornMesh = part('creature-horn', new THREE.ConeGeometry(0.16 * horn, 0.7 * horn, 12), toon(HORN), 0.02);
    hornMesh.position.set(side * 0.55, 1.0, -0.15);
    hornMesh.rotation.set(-0.4, 0, -side * 0.35);
    head.add(hornMesh);
  });
  head.add(blinkingEyes([0, 0.05, 0.2], 0.52, 0.86, 0.2));
  return head;
}

/** Wings from the shoulders, folded back, on joints that flap. */
function wings(colour: string, size: number, at: [number, number, number]): THREE.Group[] {
  return [-1, 1].map(side => {
    const wing = new THREE.Group();
    wing.name = PET_WING;
    wing.userData.side = side;
    wing.position.set(side * at[0], at[1], at[2]);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.45, 0.55, 0.95, 0.75);
    shape.lineTo(0.8, 0.35);
    shape.lineTo(0.9, 0.1);
    shape.lineTo(0.6, -0.05);
    shape.quadraticCurveTo(0.3, -0.1, 0, 0);
    const membrane = part('creature-wing', new THREE.ShapeGeometry(shape, 12), toon(shade(colour, 0.15), { side: THREE.DoubleSide }), 0);
    membrane.scale.set(side * size, size, size);
    membrane.rotation.y = side * -0.6;
    wing.add(membrane);
    return wing;
  });
}

/** Stage 1: a baby dragon hatching, its head and hands out of a cracked egg, a bit of shell on its head. */
function hatchling(colour: string): THREE.Group {
  const scales = toon(colour);
  const belly = toon(lighten(colour, 0.55));
  const shellColour = toon('#f6efe0', { side: THREE.DoubleSide });
  const dragon = new THREE.Group();

  // The bottom of the egg, its top edge broken in a zigzag
  const columns = 24;
  const shellGeometry = new THREE.SphereGeometry(1, columns, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58);
  const position = shellGeometry.attributes.position as THREE.BufferAttribute;
  const rim = Math.cos(Math.PI * 0.42);
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getY(i) - rim) < 1e-6) {
      const column = Math.round((Math.atan2(position.getZ(i), position.getX(i)) / (Math.PI * 2)) * columns + columns) % columns;
      position.setY(i, rim + (column % 2 ? 0.14 : -0.06));
    }
  }
  shellGeometry.computeVertexNormals();
  const shell = part('creature-egg', shellGeometry, shellColour, 0.03);
  shell.scale.set(1.9, 2.3, 1.9);
  shell.position.y = 2.3;
  dragon.add(shell);
  // Speckles on the shell: on its surface, facing out, all the way round
  [[0.62, 0.3], [0.7, 1.4], [0.78, 2.5], [0.66, 3.4], [0.74, 4.3], [0.6, 5.3]].forEach(([polar, around]) => {
    const out = new THREE.Vector3(Math.sin(Math.PI * polar) * Math.sin(around), Math.cos(Math.PI * polar), Math.sin(Math.PI * polar) * Math.cos(around));
    const speckle = blob('creature-speckle', [0.18, 0.13, 0.04], [out.x * 1.9, 2.3 + out.y * 2.3, out.z * 1.9], toon('#9fd3a8'), 0);
    speckle.lookAt(speckle.position.clone().add(new THREE.Vector3(out.x / 1.9, out.y / 2.3, out.z / 1.9)));
    dragon.add(speckle);
  });

  // The baby, its head and hands over the edge
  const head = dragonHead(scales, belly, colour, 0.55);
  head.position.set(0, 4.4, 0.15);
  // A cap of shell still on its head
  const cap = part('creature-shell-cap', new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.32), shellColour, 0.025);
  cap.scale.set(1.0, 0.9, 1.0);
  cap.position.set(0.1, 0.72, -0.1);
  cap.rotation.z = -0.25;
  head.add(cap);
  dragon.add(head);
  dragon.add(blob('creature-body', [1.1, 1.0, 1.0], [0, 3.1, 0], scales));
  [-1, 1].forEach(side => dragon.add(blob('creature-hand', [0.32, 0.26, 0.3], [side * 1.05, 2.85, 1.2], scales, 0.02)));
  return dragon;
}

/** Stages 2 and 3: a dragon standing up — big head, round belly, short legs, wings and a tail. */
function dragon(colour: string, stage: number): THREE.Group {
  const grown = stage === 3;
  const scales = toon(colour);
  const belly = toon(lighten(colour, 0.55));
  const creature = new THREE.Group();

  // Legs and feet
  [-1, 1].forEach(side => {
    creature.add(blob('creature-leg', [0.55, 0.75, 0.6], [side * 0.8, 0.8, 0], scales));
    creature.add(blob('creature-foot', [0.5, 0.25, 0.7], [side * 0.85, 0.25, 0.3], scales, 0.025));
    [-1, 0, 1].forEach(toe => creature.add(blob('creature-claw', [0.08, 0.08, 0.1], [side * 0.85 + toe * 0.22, 0.2, 0.98], toon(HORN), 0)));
  });
  // Body and belly
  creature.add(blob('creature-body', [1.45, 1.7, 1.3], [0, 2.5, 0], scales));
  creature.add(blob('creature-belly', [1.0, 1.35, 0.5], [0, 2.4, 0.95], belly, 0.02));
  // Arms, a little forward
  [-1, 1].forEach(side => creature.add(blob('creature-arm', [0.32, 0.6, 0.35], [side * 1.45, 2.9, 0.45], scales, 0.025)));
  // Head
  const head = dragonHead(scales, belly, colour, grown ? 1.3 : 0.8);
  head.position.set(0, 5.0, 0.2);
  creature.add(head);
  // Tail, curling round behind
  const tailRadius = grown ? 0.32 : 0.24;
  const tailGroup = tail([0, 1.4, -1.1], grown
    // The grown dragon holds its long tail up behind it, off the ground past the stand's edge
    ? [[0, 0, 0], [0.3, -0.3, -0.8], [0.9, 0.1, -1.4], [1.4, 0.7, -1.3]]
    : [[0, 0, 0], [0.4, -0.5, -0.7], [1.0, -0.8, -0.8]], tailRadius, scales);
  if (grown) {
    const spade = part('creature-tail-spike', new THREE.ConeGeometry(0.3, 0.6, 4), toon(HORN), 0.015);
    spade.position.set(1.4, 1.0, -1.3);
    tailGroup.add(spade);
  }
  creature.add(tailGroup);
  // Wings: small on the young dragon, spread wide on the grown one
  wings(colour, grown ? 2.6 : 1.4, [0.7, 3.6, -0.9]).forEach(wing => creature.add(wing));
  if (grown) {
    // Spikes down the back
    for (let i = 0; i < 4; i++) {
      const spike = part('creature-spike', new THREE.ConeGeometry(0.2 - i * 0.02, 0.5 - i * 0.05, 8), toon(HORN), 0.015);
      spike.position.set(0, 3.9 - i * 0.7, -1.15 - Math.sin(i / 3) * 0.2);
      spike.rotation.x = -0.5;
      creature.add(spike);
    }
    // And the glow: a soft ring of light round it, facing the camera from
    // every side, clear in the middle so the dragon is not washed over
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTexture(), color: '#9dffb8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glow.name = CREATURE_GLOW;
    glow.scale.set(9, 10, 1);
    glow.position.y = 3.3;
    creature.add(glow);
  }
  return creature;
}

/**
 * A ring of light, clear in the middle and fading out at the edge, drawn once
 * and shared: the glow round the full dragon.
 */
let halo: THREE.Texture | null = null;
let burst: THREE.Texture | null = null;

/** A round light, brightest in the middle: the flash of an evolution. Drawn once and shared. */
export function burstTexture(): THREE.Texture {
  if (!burst) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    burst = new THREE.CanvasTexture(canvas);
  }
  return burst;
}

export function haloTexture(): THREE.Texture {
  if (!halo) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.62, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    halo = new THREE.CanvasTexture(canvas);
  }
  return halo;
}

/** The creature at a stage (1 to 3), scaled to its stage's height, standing at the origin. */
export function buildCreature(stage: number, colour = DRAGON_GREEN): THREE.Group {
  const at = Math.min(Math.max(Math.round(stage) || 1, 1), 3);
  const creature = at === 1 ? hatchling(colour) : dragon(colour, at);
  creature.name = CREATURE;
  creature.userData.stage = at;
  // Scaled so the stage stands its height, the glow left out of the measure
  creature.updateMatrixWorld(true);
  const box = new THREE.Box3();
  creature.traverse(node => {
    if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
      box.expandByObject(node);
    }
  });
  creature.scale.setScalar(STAGE_HEIGHT[at - 1] / box.max.y);
  return creature;
}
