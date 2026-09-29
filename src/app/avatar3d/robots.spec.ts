import * as THREE from 'three';
import { Avatar, defaultAvatar } from '../avatar/avatar-model';
import { CREATURE_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, GLOW_LOW, GLOW_SECONDS, eyesOpen } from './motion';
import { FLAME, ROBOT_LIGHT, buildRobot } from './robots';
import { Rig } from './rig';
import { framedBox } from './still-renderer';

function robot(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'robot', stage, ...extra };
}

/** Everything solid in it: what glows is light, and not measured. */
function solidBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse(node => (node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && box.expandByObject(node));
  return box;
}

function named(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse(node => node.name === name && out.push(node));
  return out;
}

function colourOf(mesh: THREE.Object3D): string {
  return '#' + ((mesh as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHexString();
}

describe('the Robots family: a round bot that grows into a mech (Yobyn, 2026-09-27)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('grows from a round bot to a mech about as tall as a kid hero', () => {
    const heights = [1, 2, 3].map(stage => solidBox(build(robot(stage)).getObjectByName(CREATURE)!).max.y);
    heights.forEach((height, i) => expect(height).toBeCloseTo(STAGE_HEIGHT[i], 3));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Math.abs(heights[2] - figureFor('boy').headY - figureFor('boy').headScale[1])).toBeLessThan(1.5);
  });

  it('is a round bot first, grows arms, legs and an antenna, then a jetpack', () => {
    const [one, two, three] = [1, 2, 3].map(stage => build(robot(stage)));
    // The round bot: all head, on its feet, no arms, no antenna
    expect(named(one, 'robot-body').length).toBe(0);
    expect(named(one, 'robot-arm').length).toBe(0);
    expect(named(one, 'robot-antenna').length).toBe(0);
    expect(named(one, 'robot-foot').length).toBe(2);
    // Arms and an antenna
    [two, three].forEach((grown, i) => {
      expect(named(grown, 'robot-arm').length).withContext(`stage ${i + 2}`).toBe(2);
      expect(named(grown, 'robot-hand').length).withContext(`stage ${i + 2}`).toBe(2);
      expect(named(grown, 'robot-leg').length).withContext(`stage ${i + 2}`).toBe(2);
      expect(named(grown, 'robot-antenna').length).withContext(`stage ${i + 2}`).toBe(1);
    });
    // Light has no ink line round it
    [one, two, three].forEach(root => named(root, CREATURE_GLOW).forEach(glow =>
      expect(glow.children.some(child => child.name.endsWith(':outline'))).toBeFalse()));
    // Only the mech has a jetpack, flames, shoulder pads and a glowing core
    expect(named(two, 'robot-jetpack').length + named(two, 'robot-shoulder').length).toBe(0);
    expect(named(three, 'robot-jetpack').length).toBe(2);
    expect(named(three, 'robot-shoulder').length).toBe(2);
    const flames = named(three, CREATURE_GLOW).filter(node => colourOf(node) === FLAME);
    expect(flames.length).toBe(2);
    // The flames point down, below the tanks, on its back
    three.updateMatrixWorld(true);
    const tanks = new THREE.Box3();
    named(three, 'robot-jetpack').forEach(tank => tanks.expandByObject(tank));
    flames.forEach(flame => {
      const box = new THREE.Box3().setFromObject(flame);
      expect(box.max.y).toBeLessThan(tanks.min.y);
      expect(box.getCenter(new THREE.Vector3()).z).toBeLessThan(0);
    });
    // And the mech is chunkier than the robot: wider across the shoulders, heavier in the leg
    const across = (root: THREE.Object3D) => {
      const box = solidBox(root.getObjectByName(CREATURE)!);
      return (box.max.x - box.min.x) / (box.max.y - box.min.y);
    };
    expect(across(three)).toBeGreaterThan(across(two));
  });

  it('has the dragon’s friendly face on a screen: glowing eyes with a shine, a smile, pink cheeks', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(robot(stage));
      const eyes = named(root, 'eye');
      expect(eyes.length).withContext(`stage ${stage}`).toBe(2);
      eyes.forEach(eye => {
        expect(colourOf(eye)).toBe(ROBOT_LIGHT);
        expect(eye.children.filter(child => child.name === 'robot-glint').length).toBe(1);
      });
      expect(named(root, 'robot-smile').length).toBe(1);
      expect(named(root, 'robot-cheek').length).toBe(2);
      // On the screen, in front of the head, facing forward
      root.updateMatrixWorld(true);
      const head = new THREE.Box3().setFromObject(root.getObjectByName('robot-shell')!).getCenter(new THREE.Vector3());
      const screen = new THREE.Box3().setFromObject(root.getObjectByName('robot-screen')!);
      expect(screen.getCenter(new THREE.Vector3()).z).withContext(`stage ${stage}`).toBeGreaterThan(head.z);
      eyes.forEach(eye => expect(eye.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(screen.getCenter(new THREE.Vector3()).z));
    });
  });

  it('stands on its own stand, feet on the floor, whatever the stage', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(robot(stage));
      const box = solidBox(root.getObjectByName(CREATURE)!);
      expect(box.min.y).withContext(`stage ${stage}`).toBeGreaterThanOrEqual(-1e-6);
      expect(box.min.y).withContext(`stage ${stage}`).toBeLessThan(0.3);
      const low: THREE.Vector3[] = [];
      root.getObjectByName(CREATURE)!.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && node.name !== CREATURE_GLOW) {
          const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < position.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            if (p.y < 0.5) {
              low.push(p);
            }
          }
        }
      });
      expect(low.length).withContext(`stage ${stage}`).toBeGreaterThan(0);
      low.forEach(p => expect(Math.hypot(p.x, p.z)).withContext(`stage ${stage}`).toBeLessThan(CREATURE_STAND_RADIUS));
      // Everything that glows above the floor too: the flames never reach the stand
      named(root, CREATURE_GLOW).forEach(glow => expect(new THREE.Box3().setFromObject(glow).min.y).toBeGreaterThan(0.5));
    });
  });

  it('keeps its head on its body: no gap between them at any stage', () => {
    [2, 3].forEach(stage => {
      const root = build(robot(stage));
      root.updateMatrixWorld(true);
      const head = new THREE.Box3().setFromObject(root.getObjectByName('robot-shell')!);
      const body = new THREE.Box3().setFromObject(root.getObjectByName('robot-body')!);
      expect(head.min.y).withContext(`stage ${stage}`).toBeLessThan(body.max.y);
    });
  });

  it('frees what is its own when put away', () => {
    const root = buildAvatar(robot(3));
    const body = root.getObjectByName('robot-body') as THREE.Mesh;
    const own = spyOn(body.geometry, 'dispose').and.callThrough();
    disposeAvatar(root);
    expect(own).toHaveBeenCalled();
  });

  it('builds a stage out of range as the nearest one there is', () => {
    expect(buildRobot(0).userData.stage).toBe(1);
    expect(buildRobot(7).userData.stage).toBe(3);
    expect(buildRobot(NaN).userData.stage).toBe(1);
    expect(buildRobot(2).userData.family).toBe('robot');
  });

  it('is only itself: no kid hero, wardrobe, pet or back item on a robot', () => {
    const root = build(robot(2, { pet: 'puppy', back: 'cape', hat: 'crown', shoes: 'boots' } as Partial<Avatar>));
    ['body', 'head-group', 'hair', 'hat', 'pet', 'back', 'shoe', 'creature-skull'].forEach(name =>
      expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.userData.family).toBe('robot');
  });

  it('blinks, breathes and glows, and is back exactly as built at rest', () => {
    const root = build(robot(3));
    const rig = new Rig(root);
    const eyes = named(root, 'eye');
    const open = eyes.map(eye => eye.scale.y);
    const head = root.getObjectByName(CREATURE_HEAD)!;
    const headY = head.position.y;
    const glows = named(root, CREATURE_GLOW).map(glow => ((glow as THREE.Mesh).material as THREE.MeshBasicMaterial).color);
    // The antenna's light, the core and both flames
    expect(glows.length).toBe(4);
    const lit = glows.map(colour => colour.clone());

    rig.pose(BREATH_SECONDS / 2, null);
    expect(head.position.y - headY).toBeCloseTo(BREATH_RISE, 9);
    rig.pose(GLOW_SECONDS / 2, null);
    glows.forEach((colour, i) => expect(colour.g).toBeCloseTo(lit[i].g * GLOW_LOW, 6));
    let shut = 0;
    for (let t = 0; t < 10; t += 0.01) {
      if (eyesOpen(t) < 0.05) {
        shut = t;
        break;
      }
    }
    rig.pose(shut, null);
    eyes.forEach((eye, i) => expect(eye.scale.y).toBeLessThan(open[i] * 0.2));

    rig.rest();
    expect(head.position.y).toBe(headY);
    glows.forEach((colour, i) => expect(colour.equals(lit[i])).toBeTrue());
    eyes.forEach((eye, i) => expect(eye.scale.y).toBe(open[i]));
  });

  it('is pictured on other screens by its head, or whole, and never by what glows', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(robot(stage));
      const figure = figureFor('boy');
      const whole = framedBox(root, 'full', figure);
      const portrait = framedBox(root, 'portrait', figure);
      expect(whole.equals(solidBox(root.getObjectByName(CREATURE)!))).withContext(`stage ${stage}`).toBeTrue();
      const head = new THREE.Box3().setFromObject(root.getObjectByName(CREATURE_HEAD)!);
      // The head, less its antenna's light, all in the portrait
      const shell = new THREE.Box3().setFromObject(root.getObjectByName('robot-shell')!);
      expect(portrait.containsBox(shell)).withContext(`stage ${stage}`).toBeTrue();
      // A close-up of the head once there is a body under it; the round bot is all head
      if (stage > 1) {
        expect(portrait.max.y - portrait.min.y).withContext(`stage ${stage}`).toBeLessThan(whole.max.y - whole.min.y);
      }
      expect(head.isEmpty()).toBeFalse();
    });
  });
});
