import * as THREE from 'three';
import { blob } from './pets';
import { part, toon } from './toon';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';

/**
 * The Robots family (Yobyn, 2026-09-27: "round bot / adds arms and antenna /
 * mech with jetpack"). Stage 1 is a round bot, one ball with a face; stage 2
 * grows a body, arms and legs, and an antenna; stage 3 is a mech, chunky and
 * strong, with a jetpack whose flames flicker.
 *
 * Made of the same soft round shapes as the dragon, so the families look like
 * one game. It is named the way the dragon is, so everything that knows the
 * dragon knows it too: the whole robot is the `creature` (stood on the stand,
 * grown in a celebration, pictured whole or by its head), its head is the
 * `creature-head` (it rises on a breath), its screen's eyes are `eye`s (they
 * blink) and whatever glows is a `creature-glow` (it pulses).
 */

export const ROBOT_TEAL = '#63c3d6';
const PANEL = '#eef3f6';
const METAL = '#b9c6cf';
const ACCENT = '#ff9f43';
const SCREEN = '#233042';
/** The light of its eyes and smile, and of what glows on it. */
export const ROBOT_LIGHT = '#7ff3ff';
const BLUSH = '#ff8fb1';
/** The jetpack's flames. */
export const FLAME = '#ffb347';

/** Something that shines: unlit, so it reads as light at every angle. */
function light(colour: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: colour });
}

/**
 * A robot's head: a round shell with a dark screen for a face, two big
 * glowing eyes that blink, a glowing smile and pink cheeks, bolts for ears,
 * and on the grown stages an antenna with a light at its tip.
 */
function robotHead(size: number, antenna: boolean): THREE.Group {
  const head = new THREE.Group();
  head.name = CREATURE_HEAD;
  const [rx, ry, rz] = [1.3 * size, 1.15 * size, 1.2 * size];
  head.add(blob('robot-shell', [rx, ry, rz], [0, 0, 0], toon(ROBOT_TEAL), 0.035));
  // The screen, set into the front of the shell
  head.add(blob('robot-screen', [rx * 0.74, ry * 0.6, rz * 0.3], [0, -0.05 * size, rz * 0.8], toon(SCREEN), 0.02));
  const front = rz * 0.8 + rz * 0.3;
  [-1, 1].forEach(side => {
    const eye = blob('eye', [0.17 * size, 0.23 * size, 0.05 * size], [side * 0.38 * size, 0.06 * size, front - 0.02 * size], light(ROBOT_LIGHT), 0);
    // A shine in each eye, as the dragon's have
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), light('#ffffff'));
    glint.name = 'robot-glint';
    glint.position.set(-0.35, 0.4, 0.8);
    eye.add(glint);
    head.add(eye);
    head.add(blob('robot-cheek', [0.13 * size, 0.08 * size, 0.03 * size], [side * 0.66 * size, -0.22 * size, front - 0.1 * size], toon(BLUSH), 0));
    // Bolts for ears
    const bolt = part('robot-ear', new THREE.CylinderGeometry(0.22 * size, 0.22 * size, 0.2 * size, 16), toon(ACCENT), 0.02);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(side * rx * 1.0, 0, 0);
    head.add(bolt);
  });
  // A smile, glowing
  const smile = part('robot-smile', new THREE.TorusGeometry(0.16 * size, 0.035 * size, 8, 16, Math.PI), light(ROBOT_LIGHT), 0);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.2 * size, front - 0.03 * size);
  head.add(smile);
  if (antenna) {
    const stalk = part('robot-antenna', new THREE.CylinderGeometry(0.05 * size, 0.07 * size, 0.7 * size, 10), toon(METAL), 0.015);
    stalk.position.set(0, ry + 0.3 * size, 0);
    head.add(stalk);
    // Its light, which pulses
    // (light has no ink line round it)
    const tip = blob(CREATURE_GLOW, [0.17 * size, 0.17 * size, 0.17 * size], [0, ry + 0.7 * size, 0], light(ACCENT), 0);
    head.add(tip);
  }
  return head;
}

/** Stage 1: a round bot, one ball that is all head, on two little feet. */
function roundBot(): THREE.Group {
  const robot = new THREE.Group();
  [-1, 1].forEach(side => robot.add(blob('robot-foot', [0.55, 0.32, 0.7], [side * 0.75, 0.32, 0.2], toon(ACCENT), 0.025)));
  const head = robotHead(1.45, false);
  head.position.y = 2.1;
  // A light panel on its tummy, and a bolt on top
  head.add(blob('robot-panel', [0.8, 0.42, 0.25], [0, -1.05, 1.3], toon(PANEL), 0.02));
  head.add(blob('robot-bolt', [0.2, 0.14, 0.2], [0, 1.72, 0], toon(ACCENT), 0.02));
  robot.add(head);
  return robot;
}

/** Legs on round feet, a round body with a panel on its chest, arms with claw hands, and a head on top. */
function botBody(robot: THREE.Group, mech: boolean) {
  const k = mech ? 1.3 : 1;
  const metal = toon(METAL);
  [-1, 1].forEach(side => {
    robot.add(blob('robot-leg', [0.45 * k, 0.62 * k, 0.45 * k], [side * 0.7, 0.8 * k, 0], metal, 0.025));
    robot.add(blob('robot-foot', [0.55 * k, 0.28 * k, 0.72 * k], [side * 0.72, 0.28 * k, 0.25 * k], toon(ACCENT), 0.025));
    robot.add(blob('robot-arm', [0.3 * k, 0.72 * k, 0.3 * k], [side * (1.55 * k), 2.35 * k, 0.15], metal, 0.025));
    robot.add(blob('robot-hand', [0.36 * k, 0.32 * k, 0.36 * k], [side * (1.62 * k), 1.5 * k, 0.3], toon(mech ? METAL : ACCENT), 0.025));
  });
  robot.add(blob('robot-body', [1.35 * k, 1.35 * k, 1.2 * k], [0, 2.4 * k, 0], toon(ROBOT_TEAL), 0.035));
  robot.add(blob('robot-panel', [0.8 * k, 0.65 * k, 0.3 * k], [0, 2.45 * k, 1.0 * k], toon(PANEL), 0.02));
}

/** Stage 2: a robot standing up, with arms, legs and an antenna. */
function robot(): THREE.Group {
  const bot = new THREE.Group();
  botBody(bot, false);
  // A button on its chest
  bot.add(blob('robot-button', [0.16, 0.16, 0.08], [0, 2.55, 1.28], toon(ACCENT), 0.01));
  const head = robotHead(1.05, true);
  head.position.y = 4.75;
  bot.add(head);
  return bot;
}

/**
 * Stage 3: a mech — chunkier, with shoulder pads and fists, a glowing core in
 * its chest, and a jetpack on its back with flames that flicker.
 */
function mech(): THREE.Group {
  const bot = new THREE.Group();
  botBody(bot, true);
  [-1, 1].forEach(side => bot.add(blob('robot-shoulder', [0.62, 0.48, 0.62], [side * 2.0, 4.1, 0.1], toon(ACCENT), 0.03)));
  // The core: a light in its chest, which pulses
  bot.add(blob(CREATURE_GLOW, [0.3, 0.3, 0.1], [0, 3.25, 1.62], light(ROBOT_LIGHT), 0));
  // The jetpack: two tanks on its back, nozzles below, and flames
  [-1, 1].forEach(side => {
    const tank = part('robot-jetpack', new THREE.CylinderGeometry(0.45, 0.45, 1.9, 20), toon(METAL), 0.03);
    tank.position.set(side * 0.62, 3.4, -1.75);
    bot.add(tank);
    bot.add(blob('robot-jetpack-cap', [0.45, 0.35, 0.45], [side * 0.62, 4.35, -1.75], toon(ACCENT), 0.02));
    const nozzle = part('robot-nozzle', new THREE.CylinderGeometry(0.3, 0.42, 0.35, 16), toon(SCREEN), 0.02);
    nozzle.position.set(side * 0.62, 2.28, -1.75);
    bot.add(nozzle);
    const flame = part(CREATURE_GLOW, new THREE.ConeGeometry(0.3, 0.9, 16), light(FLAME), 0);
    flame.rotation.x = Math.PI;
    flame.position.set(side * 0.62, 1.66, -1.75);
    bot.add(flame);
  });
  const head = robotHead(1.2, true);
  head.position.y = 6.1;
  bot.add(head);
  return bot;
}

/** The robot at a stage (1 to 3), scaled to its stage's height, standing at the origin. */
export function buildRobot(stage: number): THREE.Group {
  const at = Math.min(Math.max(Math.round(stage) || 1, 1), 3);
  const bot = at === 1 ? roundBot() : at === 2 ? robot() : mech();
  bot.name = CREATURE;
  bot.userData.stage = at;
  bot.userData.family = 'robot';
  // Scaled so the stage stands its height, measured as the dragon is: what glows left out
  bot.updateMatrixWorld(true);
  const box = new THREE.Box3();
  bot.traverse(node => {
    if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
      box.expandByObject(node);
    }
  });
  bot.scale.setScalar(STAGE_HEIGHT[at - 1] / box.max.y);
  return bot;
}
