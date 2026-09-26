import * as THREE from 'three';
import { ARM_RIG, FOREARM_RIG } from './build-avatar';
import { BREATH_ARMS, BREATH_RISE, WAVE_LIFT, WAVING_SIDE, breath, eyesOpen, tailWag, wave, wingFlap } from './motion';
import { PET_TAIL, PET_WING } from './pets';

/** The parts that share the head's transform, and so rise with it on a breath. */
const HEAD_PARTS = ['head-group', 'hair', 'hat', 'glasses'];
export { WAVING_SIDE };
/** A shut eye is not squashed to nothing: the lid line stays. */
const SHUT = 0.08;

interface Joint {
  node: THREE.Object3D;
  side: number;
}

/**
 * The joints of one built character, and a pose for any moment: breathing,
 * blinking, and a wave. Built once per model (the stage rebuilds the model
 * when the outfit changes, and the rig with it). `rest()` puts every joint
 * back exactly where build-avatar.ts put it.
 */
export class Rig {
  private heads: { node: THREE.Object3D; y: number }[] = [];
  private eyes: { node: THREE.Object3D; y: number }[] = [];
  private arms: Joint[] = [];
  private forearms: (Joint & { bend: number })[] = [];
  private tails: THREE.Object3D[] = [];
  private wings: { node: THREE.Object3D; side: number; z: number }[] = [];

  constructor(model: THREE.Object3D) {
    HEAD_PARTS.forEach(name => {
      const node = model.getObjectByName(name);
      if (node) {
        this.heads.push({ node, y: node.position.y });
      }
    });
    model.traverse(node => {
      if (node.name === 'eye') {
        this.eyes.push({ node, y: node.scale.y });
      } else if (node.name === ARM_RIG) {
        this.arms.push({ node, side: node.userData.side });
      } else if (node.name === FOREARM_RIG) {
        this.forearms.push({ node, side: node.parent!.userData.side, bend: node.rotation.x });
      } else if (node.name === PET_TAIL) {
        this.tails.push(node);
      } else if (node.name === PET_WING) {
        this.wings.push({ node, side: node.userData.side, z: node.rotation.z });
      }
    });
  }

  /**
   * The character `seconds` into standing there, and `waving` seconds into a
   * wave (or null when not waving).
   */
  pose(seconds: number, waving: number | null) {
    const b = breath(seconds);
    this.heads.forEach(({ node, y }) => (node.position.y = y + BREATH_RISE * b));
    const open = SHUT + (1 - SHUT) * eyesOpen(seconds);
    this.eyes.forEach(({ node, y }) => (node.scale.y = y * open));
    const arm = waving === null ? { lift: 0, bend: 0 } : wave(waving);
    // An arm swings out to its own side: a positive turn about z for the
    // character's left (+x), negative for the right
    this.arms.forEach(({ node, side }) => {
      const lift = side === WAVING_SIDE ? arm.lift : 0;
      node.rotation.z = side * (lift + BREATH_ARMS * b);
    });
    this.forearms.forEach(({ node, side, bend }) => {
      node.rotation.z = side * (side === WAVING_SIDE ? arm.bend : 0);
      // The elbow's forward bend eases out as the arm comes up to wave, and back after
      node.rotation.x = side === WAVING_SIDE ? bend * (1 - arm.lift / WAVE_LIFT) : bend;
    });
    // The pet's tail wags side to side, about its root
    this.tails.forEach(node => (node.rotation.y = tailWag(seconds)));
    this.wings.forEach(({ node, side, z }) => (node.rotation.z = z + side * wingFlap(seconds)));
  }

  /** Every joint back where it was built. */
  rest() {
    this.heads.forEach(({ node, y }) => (node.position.y = y));
    this.eyes.forEach(({ node, y }) => (node.scale.y = y));
    this.arms.forEach(({ node }) => (node.rotation.z = 0));
    this.forearms.forEach(({ node, bend }) => {
      node.rotation.z = 0;
      node.rotation.x = bend;
    });
    this.tails.forEach(node => (node.rotation.y = 0));
    this.wings.forEach(({ node, z }) => (node.rotation.z = z));
  }
}
