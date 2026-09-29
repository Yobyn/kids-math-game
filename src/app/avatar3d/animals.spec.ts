import * as THREE from 'three';
import { Avatar, defaultAvatar } from '../avatar/avatar-model';
import { CREATURE_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { BOOTS, GOLD, SWEATBAND, buildAnimal } from './animals';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, GLOW_LOW, GLOW_SECONDS, eyesOpen, tailWag } from './motion';
import { PET_TAIL } from './pets';
import { Rig } from './rig';
import { framedBox } from './still-renderer';

function bear(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'animal', stage, ...extra };
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

function boxOf(node: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(node);
}

describe('the Animals family: a bear cub whose hobby is football (Yobyn, 2026-09-27)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    root.updateMatrixWorld(true);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('grows from a cub to a champion about as tall as a kid hero', () => {
    const heights = [1, 2, 3].map(stage => solidBox(build(bear(stage)).getObjectByName(CREATURE)!).max.y);
    heights.forEach((height, i) => expect(height).toBeCloseTo(STAGE_HEIGHT[i], 3));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Math.abs(heights[2] - figureFor('boy').headY - figureFor('boy').headScale[1])).toBeLessThan(1.5);
  });

  it('is a plain bear in a hoodie first, then in its football gear, then a champion with a trophy', () => {
    const [one, two, three] = [1, 2, 3].map(stage => build(bear(stage)));
    // Always the bear in its hoodie
    [one, two, three].forEach((root, i) => {
      expect(named(root, 'animal-hoodie').length).withContext(`stage ${i + 1}`).toBe(1);
      expect(named(root, 'animal-hood').length).withContext(`stage ${i + 1}`).toBe(1);
    });
    // The cub: bare paws, no gear
    expect(named(one, 'animal-pad').length).toBe(2);
    ['animal-sweatband', 'animal-football', 'animal-trophy', 'animal-boot-stripe'].forEach(name =>
      expect(named(one, name).length).withContext(name).toBe(0));
    named(one, 'animal-foot').forEach(foot => expect(colourOf(foot)).not.toBe(BOOTS));
    // The footballer and the champion: a sweatband and football boots
    [two, three].forEach((root, i) => {
      expect(named(root, 'animal-sweatband').length).withContext(`stage ${i + 2}`).toBe(1);
      named(root, 'animal-sweatband').forEach(band => expect(colourOf(band)).toBe(SWEATBAND));
      named(root, 'animal-foot').forEach(foot => expect(colourOf(foot)).withContext(`stage ${i + 2}`).toBe(BOOTS));
    });
    // The ball for the footballer, the trophy for the champion
    expect(named(two, 'animal-football').length).toBe(1);
    expect(named(two, 'animal-trophy').length).toBe(0);
    expect(named(three, 'animal-trophy').length).toBe(1);
    expect(named(three, 'animal-football').length).toBe(0);
    named(three, 'animal-trophy-cup').forEach(cup => expect(colourOf(cup)).toBe(GOLD));
  });

  it('keeps its ball on the stand by its right foot, resting on the floor', () => {
    const root = build(bear(2));
    const ball = boxOf(root.getObjectByName('animal-ball')!);
    expect(ball.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(ball.min.y).toBeLessThan(0.1);
    const centre = ball.getCenter(new THREE.Vector3());
    expect(Math.hypot(centre.x, centre.z) + (ball.max.x - ball.min.x) / 2).toBeLessThan(CREATURE_STAND_RADIUS);
    // By a foot, not under the bear
    const feet = named(root, 'animal-foot').map(foot => boxOf(foot).getCenter(new THREE.Vector3()));
    const right = feet.reduce((a, b) => (b.x > a.x ? b : a));
    expect(centre.x).toBeGreaterThan(right.x);
    expect(centre.distanceTo(right)).toBeLessThan(2);
  });

  it('holds its trophy up in front of its tummy, in both paws', () => {
    const root = build(bear(3));
    const cup = boxOf(root.getObjectByName('animal-trophy-cup')!);
    const hoodie = boxOf(root.getObjectByName('animal-hoodie')!);
    const middle = cup.getCenter(new THREE.Vector3());
    // In front of it, in the middle, above its feet and below its head
    expect(Math.abs(middle.x)).toBeLessThan(0.05);
    expect(cup.max.z).toBeGreaterThan(hoodie.max.z);
    const head = boxOf(root.getObjectByName(CREATURE_HEAD)!);
    expect(cup.max.y).toBeLessThan(head.min.y + (head.max.y - head.min.y) * 0.35);
    // A paw either side, each touching it
    const paws = named(root, 'animal-paw').map(boxOf);
    expect(paws.length).toBe(2);
    paws.forEach(paw => expect(paw.intersectsBox(cup.clone().expandByScalar(0.05))).toBeTrue());
    expect(Math.sign(paws[0].getCenter(new THREE.Vector3()).x)).toBe(-Math.sign(paws[1].getCenter(new THREE.Vector3()).x));
  });

  it('has the dragon’s friendly face: eyes that blink, a muzzle and a button nose in front, rosy cheeks, round ears', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(bear(stage));
      expect(named(root, 'eye').length).withContext(`stage ${stage}`).toBe(2);
      expect(named(root, 'animal-cheek').length).toBe(2);
      expect(named(root, 'animal-ear').length).toBe(2);
      const skull = boxOf(root.getObjectByName('animal-skull')!).getCenter(new THREE.Vector3());
      const nose = boxOf(root.getObjectByName('animal-nose')!).getCenter(new THREE.Vector3());
      const muzzle = boxOf(root.getObjectByName('animal-muzzle')!);
      expect(nose.z).withContext(`stage ${stage}`).toBeGreaterThan(skull.z);
      expect(nose.z).toBeGreaterThan(muzzle.getCenter(new THREE.Vector3()).z);
      // Ears on top, either side
      named(root, 'animal-ear').forEach(ear => expect(boxOf(ear).getCenter(new THREE.Vector3()).y).toBeGreaterThan(skull.y));
    });
  });

  it('stands on its own stand, feet on the floor, head on its body', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(bear(stage));
      const box = solidBox(root.getObjectByName(CREATURE)!);
      expect(box.min.y).withContext(`stage ${stage}`).toBeGreaterThanOrEqual(-1e-6);
      expect(box.min.y).withContext(`stage ${stage}`).toBeLessThan(0.3);
      named(root, 'animal-foot').forEach(foot => {
        const feet = boxOf(foot);
        [feet.min.x, feet.max.x].forEach(x => [feet.min.z, feet.max.z].forEach(z =>
          expect(Math.hypot(x, z)).withContext(`stage ${stage}`).toBeLessThan(CREATURE_STAND_RADIUS)));
      });
      const head = boxOf(root.getObjectByName('animal-skull')!);
      const body = boxOf(root.getObjectByName('animal-hoodie')!);
      expect(head.min.y).withContext(`stage ${stage}`).toBeLessThan(body.max.y);
    });
  });

  it('frees what is its own when put away', () => {
    const root = buildAvatar(bear(3));
    const hoodie = root.getObjectByName('animal-hoodie') as THREE.Mesh;
    const own = spyOn(hoodie.geometry, 'dispose').and.callThrough();
    disposeAvatar(root);
    expect(own).toHaveBeenCalled();
  });

  it('builds a stage out of range as the nearest one there is', () => {
    expect(buildAnimal(0).userData.stage).toBe(1);
    expect(buildAnimal(7).userData.stage).toBe(3);
    expect(buildAnimal(NaN).userData.stage).toBe(1);
    expect(buildAnimal(2).userData.family).toBe('animal');
  });

  it('is only itself: no kid hero, wardrobe, pet or back item on the bear', () => {
    const root = build(bear(2, { pet: 'puppy', back: 'cape', hat: 'crown', shoes: 'boots' } as Partial<Avatar>));
    ['body', 'head-group', 'hair', 'hat', 'pet', 'back', 'shoe', 'creature-skull', 'robot-shell'].forEach(name =>
      expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.userData.family).toBe('animal');
  });

  it('blinks, breathes, wags its tail and sparkles, and is back exactly as built at rest', () => {
    const root = build(bear(3));
    const rig = new Rig(root);
    const eyes = named(root, 'eye');
    const open = eyes.map(eye => eye.scale.y);
    const head = root.getObjectByName(CREATURE_HEAD)!;
    const headY = head.position.y;
    const tails = named(root, PET_TAIL);
    expect(tails.length).toBe(1);
    const glows = named(root, CREATURE_GLOW).map(glow => ((glow as THREE.Mesh).material as THREE.MeshBasicMaterial).color);
    expect(glows.length).toBe(1);
    const lit = glows[0].clone();

    rig.pose(BREATH_SECONDS / 2, null);
    expect(head.position.y - headY).toBeCloseTo(BREATH_RISE, 9);
    rig.pose(GLOW_SECONDS / 2, null);
    expect(glows[0].g).toBeCloseTo(lit.g * GLOW_LOW, 6);
    // The tail wags
    let wagging = 0;
    for (let t = 0; t < 10; t += 0.05) {
      if (Math.abs(tailWag(t)) > 0.1) {
        wagging = t;
        break;
      }
    }
    rig.pose(wagging, null);
    expect(Math.abs(tails[0].rotation.y)).toBeGreaterThan(0.1);
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
    expect(glows[0].equals(lit)).toBeTrue();
    expect(tails[0].rotation.y).toBe(0);
    eyes.forEach((eye, i) => expect(eye.scale.y).toBe(open[i]));
    // Nothing glows before it is a champion
    expect(named(build(bear(2)), CREATURE_GLOW).length).toBe(0);
  });

  it('is pictured on other screens by its head, or whole, and never by what glows', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(bear(stage));
      const figure = figureFor('boy');
      const whole = framedBox(root, 'full', figure);
      const portrait = framedBox(root, 'portrait', figure);
      expect(whole.equals(solidBox(root.getObjectByName(CREATURE)!))).withContext(`stage ${stage}`).toBeTrue();
      expect(portrait.containsBox(boxOf(root.getObjectByName('animal-skull')!))).withContext(`stage ${stage}`).toBeTrue();
      expect(portrait.max.y - portrait.min.y).withContext(`stage ${stage}`).toBeLessThan(whole.max.y - whole.min.y);
    });
  });
});
