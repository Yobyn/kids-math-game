import * as THREE from 'three';
import { Avatar, BODY_TYPES, NO_ITEM, WARDROBE, defaultAvatar } from '../avatar/avatar-model';
import { TOP_COLOURS, topColourOf } from '../avatar/top-colours';
import { FOREARM_RIG, buildAvatar, disposeAvatar } from './build-avatar';
import {
  BAND_FROM, BAND_TO, BELT_DROP, BELT_HEIGHT, GOLD, HERO_BLUE, HERO_RED, STAR_LIGHT,
  beltColour, heroAccent, isLegend, legendCape, wearsGear
} from './hero-gear';
import { figureFor } from './figure';
import { WAVE_SECONDS } from './motion';
import { Rig } from './rig';

const TOPS = [NO_ITEM, ...WARDROBE.filter(item => item.slot === 'top' && item.id !== NO_ITEM).map(item => item.id)];

function hero(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'kid', stage, hat: NO_ITEM, glasses: NO_ITEM, top: 'hoodie', ...extra };
}

function named(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse(node => node.name === name && out.push(node));
  return out;
}

function colourOf(mesh: THREE.Object3D): string {
  return '#' + ((mesh as THREE.Mesh).material as THREE.MeshToonMaterial).color.getHexString();
}

describe('the kid hero grows: hero gear by stage (Yobyn, 2026-09-27)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    root.updateMatrixWorld(true);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('wears the gear from the trained stage on, and a legend’s from the third', () => {
    expect([1, 2, 3].map(wearsGear)).toEqual([false, true, true]);
    expect([1, 2, 3].map(isLegend)).toEqual([false, false, true]);
  });

  it('picks a hero colour that stands out from the top: blue on a red, orange or pink one, red on the rest', () => {
    const blue = ['#ff5a5a', '#f28c28', '#e85aa7', '#b5302b', '#ff3b30'];
    const red = ['#f5c518', '#3dbb5e', '#8e5bd6', '#f2f2f5', '#2d2d38', '#3880ff', '#29b6f6', '#888888'];
    blue.forEach(colour => expect(heroAccent(colour)).withContext(colour).toBe(HERO_BLUE));
    red.forEach(colour => expect(heroAccent(colour)).withContext(colour).toBe(HERO_RED));
    // Every colour a top can be: never the gear in the top's own colour family
    TOPS.forEach(top => [undefined, ...TOP_COLOURS].forEach(topColour => {
      const colour = topColourOf({ ...hero(2), top, topColour } as Avatar);
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(colour).getHSL(hsl);
      const redTop = hsl.s > 0.35 && Math.min(hsl.h * 360, 360 - hsl.h * 360) < 40;
      expect(heroAccent(colour)).withContext(`${top} ${colour}`).toBe(redTop ? HERO_BLUE : HERO_RED);
    }));
  });

  it('is just the child’s own clothes at the beginner stage', () => {
    const root = build(hero(1));
    expect(named(root, 'hero-buckle').length).toBe(0);
    expect(named(root, 'wristband').length).toBe(0);
    expect(named(root, 'buckle').length).toBe(1);
    expect(root.getObjectByName('back')).toBeUndefined();
    expect(beltColour(1, '#3880ff')).toBeNull();
    const belt = root.getObjectByName('belt') as THREE.Mesh;
    expect((belt.geometry as THREE.CylinderGeometry).parameters.height).toBe(0.2);
    expect(belt.position.y).toBe(figureFor('boy').belt);
  });

  it('gives the trained hero a belt in the hero colour, a star on the buckle, and wristbands', () => {
    const root = build(hero(2, { topColour: '#3dbb5e' }));
    expect(colourOf(root.getObjectByName('belt')!)).toBe(HERO_RED);
    expect(named(root, 'buckle').length).toBe(0);
    const star = root.getObjectByName('hero-star') as THREE.Mesh;
    expect((star.material as THREE.Material).type).toBe('MeshToonMaterial');
    expect(colourOf(star)).toBe(HERO_RED);
    const bands = named(root, 'wristband');
    expect(bands.length).toBe(2);
    bands.forEach(band => expect(colourOf(band)).toBe(HERO_RED));
    expect(root.getObjectByName('back')).toBeUndefined();
    // Blue on a red top
    expect(colourOf(build(hero(2, { topColour: '#ff5a5a' })).getObjectByName('belt')!)).toBe(HERO_BLUE);
  });

  it('turns it all gold for a legend, the star shining, and puts on a cape in the hero colour', () => {
    const root = build(hero(3, { topColour: '#8e5bd6' }));
    expect(colourOf(root.getObjectByName('belt')!)).toBe(GOLD);
    named(root, 'wristband').forEach(band => expect(colourOf(band)).toBe(GOLD));
    const star = root.getObjectByName('hero-star') as THREE.Mesh;
    expect(star.material instanceof THREE.MeshBasicMaterial).toBeTrue();
    expect('#' + (star.material as THREE.MeshBasicMaterial).color.getHexString()).toBe(STAR_LIGHT);
    const back = root.getObjectByName('back')!;
    expect(back.userData.item).toBe('cape');
    expect(back.userData.legend).toBeTrue();
    expect(colourOf(back.getObjectByName('cape')!)).toBe(HERO_RED);
    expect(colourOf(build(hero(3, { topColour: '#ff5a5a' })).getObjectByName('cape')!)).toBe(HERO_BLUE);
  });

  it('leaves what the child put on their back there: the legend’s cape only goes on an empty back', () => {
    const backpack = build(hero(3, { back: 'backpack' })).getObjectByName('back')!;
    expect(backpack.userData.item).toBe('backpack');
    expect(backpack.userData.legend).toBeUndefined();
    const own = build(hero(3, { back: 'cape' })).getObjectByName('back')!;
    expect(own.userData.item).toBe('cape');
    expect(own.userData.legend).toBeUndefined();
    expect(legendCape(3, 'backpack', '#3880ff')).toBeNull();
    expect(legendCape(3, undefined, '#3880ff')).toBe(HERO_RED);
    expect(legendCape(3, NO_ITEM, '#3880ff')).toBe(HERO_RED);
    expect(legendCape(2, NO_ITEM, '#3880ff')).toBeNull();
  });

  it('wraps the hero belt round the trousers and the top’s hem, never inside them, on both figures', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => [2, 3].forEach(stage => {
      const root = build(hero(stage, { bodyType }));
      const belt = root.getObjectByName('belt') as THREE.Mesh;
      const { radiusTop, height } = (belt.geometry as THREE.CylinderGeometry).parameters;
      expect(height).toBe(BELT_HEIGHT);
      expect(belt.position.y).toBeCloseTo(figureFor(bodyType).belt - BELT_DROP, 9);
      ['hips', 'torso'].forEach(name => {
        const mesh = root.getObjectByName(name) as THREE.Mesh;
        const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
        const p = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) {
          p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
          if (Math.abs(p.y - belt.position.y) <= height / 2) {
            const inside = (p.x / radiusTop) ** 2 + (p.z / (radiusTop * belt.scale.z)) ** 2;
            if (inside > 1 + 1e-6) {
              misses.push(`${bodyType} ${stage} ${name} at y ${p.y.toFixed(2)}: ${inside.toFixed(3)}`);
            }
          }
        }
      });
      // The buckle on the front of it, facing out
      const buckle = root.getObjectByName('hero-buckle')!;
      expect(buckle.position.y).toBe(belt.position.y);
      expect(buckle.position.z).toBeGreaterThan(radiusTop * belt.scale.z);
      expect(Math.abs(buckle.position.x)).toBe(0);
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('fits each wristband round the arm just above the hand, over every top, on both figures', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => TOPS.forEach(top => {
      const root = build(hero(2, { bodyType, top }));
      const rigs = named(root, FOREARM_RIG);
      expect(rigs.length).withContext(`${bodyType} ${top}`).toBe(2);
      rigs.forEach(rig => {
        // Worn on the forearm, so it moves with it
        const band = rig.children.find(child => child.name === 'wristband') as THREE.Mesh;
        expect(band).withContext(`${bodyType} ${top}`).toBeTruthy();
        const { radiusTop, height } = (band.geometry as THREE.CylinderGeometry).parameters;
        // The arm's own surface under the band, found by looking in at it from all round
        const arm: THREE.Object3D[] = [];
        rig.traverse(node => (node as THREE.Mesh).isMesh && node !== band && node.parent !== band
          && !node.name.endsWith(':outline') && arm.push(node));
        const centre = band.getWorldPosition(new THREE.Vector3());
        const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(band.getWorldQuaternion(new THREE.Quaternion()));
        const side = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
        let snug = Infinity;
        for (let k = -0.45; k <= 0.45; k += 0.15) {
          for (let a = 0; a < 16; a++) {
            const out = side.clone().applyAxisAngle(axis, (a / 16) * Math.PI * 2);
            const on = centre.clone().addScaledVector(axis, k * height);
            const ray = new THREE.Raycaster(on.clone().addScaledVector(out, 3), out.clone().negate());
            const hit = ray.intersectObjects(arm, false)[0];
            if (hit) {
              const across = 3 - hit.distance;
              snug = Math.min(snug, radiusTop - across);
              if (across > radiusTop - 0.01) {
                misses.push(`${bodyType} ${top} ${hit.object.name} ${across.toFixed(3)} > ${radiusTop.toFixed(3)}`);
              }
            }
          }
        }
        // Close round it, not a loose hoop
        expect(snug).withContext(`${bodyType} ${top} gap`).toBeLessThan(0.12);
      });
    }));
    expect(misses.slice(0, 5)).toEqual([]);
    expect(BAND_FROM).toBeLessThan(BAND_TO);
  });

  it('keeps the wristbands on through a whole wave, and back where they were built at rest', () => {
    const root = build(hero(3));
    const rig = new Rig(root);
    const bands = named(root, 'wristband');
    const hands = named(root, 'hand');
    const built = bands.map(band => band.getWorldPosition(new THREE.Vector3()));
    let moved = 0;
    for (let t = 0; t <= WAVE_SECONDS; t += 0.1) {
      rig.pose(t, t);
      root.updateMatrixWorld(true);
      bands.forEach((band, i) => {
        const at = band.getWorldPosition(new THREE.Vector3());
        moved = Math.max(moved, at.distanceTo(built[i]));
        // Next to its own hand, wherever the arm goes
        const hand = hands.reduce((a, b) => a.getWorldPosition(new THREE.Vector3()).distanceTo(at) < b.getWorldPosition(new THREE.Vector3()).distanceTo(at) ? a : b);
        expect(hand.getWorldPosition(new THREE.Vector3()).distanceTo(at)).toBeLessThan(1.5);
      });
    }
    expect(moved).toBeGreaterThan(1);
    rig.rest();
    root.updateMatrixWorld(true);
    bands.forEach((band, i) => expect(band.getWorldPosition(new THREE.Vector3()).distanceTo(built[i])).toBeLessThan(1e-9));
  });

  it('never changes a creature: the gear is the kid hero’s', () => {
    const root = build({ ...hero(3), family: 'creature' });
    ['belt', 'hero-buckle', 'wristband', 'back'].forEach(name => expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
  });
});
