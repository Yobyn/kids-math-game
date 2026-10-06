import * as THREE from 'three';
import { Avatar, defaultAvatar } from '../avatar/avatar-model';
import { CREATURE_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT, buildCreature } from './creatures';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, GLOW_LOW, GLOW_SECONDS, eyesOpen } from './motion';
import { PET_TAIL, PET_WING } from './pets';
import { Rig } from './rig';
import { framedBox } from './still-renderer';
import { STILL_VERSION } from '../avatar/avatar-still.service';

function dragon(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'creature', stage, ...extra };
}

/** Everything solid in it: the glow is light, and not measured. */
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

describe('the Creatures family: a dragon that grows', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('grows from a hatchling to a dragon about as tall as a kid hero', () => {
    const heights = [1, 2, 3].map(stage => solidBox(build(dragon(stage)).getObjectByName(CREATURE)!).max.y);
    heights.forEach((height, i) => expect(height).toBeCloseTo(STAGE_HEIGHT[i], 3));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Math.abs(heights[2] - figureFor('boy').headY - figureFor('boy').headScale[1])).toBeLessThan(1.5);
  });

  it('rings the full dragon with its glow: the bright ring just round its wingtips and from its feet to over its horns, clear in the middle', () => {
    const root = build(dragon(3));
    root.updateMatrixWorld(true);
    const glow = root.getObjectByName(CREATURE_GLOW) as THREE.Sprite;
    // How bright the glow is out from its middle, read off the picture it is drawn with
    const picture = glow.material.map!.image as HTMLCanvasElement;
    const row = picture.getContext('2d')!.getImageData(0, Math.floor(picture.height / 2), picture.width, 1).data;
    const half = picture.width / 2;
    const out: number[] = [];
    for (let x = Math.floor(half); x < picture.width; x++) {
      out.push(row[x * 4 + 3]);
    }
    const brightest = out.indexOf(Math.max(...out)) / (out.length - 1);
    // Clear in the middle, so the dragon is not washed over
    out.slice(0, Math.floor(out.length / 2)).forEach(alpha => expect(alpha).toBe(0));
    const at = glow.getWorldPosition(new THREE.Vector3());
    const size = glow.getWorldScale(new THREE.Vector3());
    const body = solidBox(root.getObjectByName(CREATURE)!);
    // Across: just round the tips of its wings
    const across = Math.max(-body.min.x, body.max.x);
    const ringAcross = (brightest * size.x) / 2;
    expect(ringAcross).toBeGreaterThanOrEqual(across);
    expect(ringAcross).toBeLessThan(across * 1.15);
    // Up and down: over its horns, and down to its feet
    const ringUp = (brightest * size.y) / 2;
    const tall = body.max.y - body.min.y;
    expect(at.y + ringUp).toBeGreaterThanOrEqual(body.max.y);
    expect(at.y + ringUp).toBeLessThan(body.max.y + tall * 0.1);
    expect(at.y - ringUp).toBeLessThan(body.min.y + tall * 0.1);
  });

  it('re-draws the pictures on other screens when the glow changes: STILL_VERSION goes up with its size', () => {
    // Saved pictures are kept by version; a new glow with the old version would leave them showing the old one
    const glow = build(dragon(3)).getObjectByName(CREATURE_GLOW)!;
    expect({ version: STILL_VERSION, glow: [glow.scale.x, glow.scale.y] }).toEqual({ version: 8, glow: [7.4, 8.6] });
  });

  it('hatches at stage 1, grows small wings at 2, and spreads big ones with a glow at 3', () => {
    const [one, two, three] = [1, 2, 3].map(stage => build(dragon(stage)));
    expect(one.getObjectByName('creature-egg')).toBeTruthy();
    expect(named(one, PET_WING).length).toBe(0);
    expect(two.getObjectByName('creature-egg')).toBeUndefined();
    expect(named(two, PET_WING).length).toBe(2);
    expect(named(three, PET_WING).length).toBe(2);
    const span = (root: THREE.Object3D) => {
      const box = new THREE.Box3();
      named(root, PET_WING).forEach(wing => box.expandByObject(wing));
      return box.max.x - box.min.x;
    };
    expect(span(three)).toBeGreaterThan(span(two) * 1.3);
    expect(named(three, 'creature-spike').length).toBeGreaterThan(2);
    expect(named(two, 'creature-spike').length).toBe(0);
    expect(named(three, CREATURE_GLOW).length).toBe(1);
    expect(named(two, CREATURE_GLOW).length + named(one, CREATURE_GLOW).length).toBe(0);
    // A tail to wag from the young dragon on; the hatchling is still in its egg
    expect(named(one, PET_TAIL).length).toBe(0);
    expect(named(two, PET_TAIL).length).toBe(1);
  });

  it('stands on its own stand, facing forward, whatever the stage', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(dragon(stage));
      const box = solidBox(root.getObjectByName(CREATURE)!);
      expect(box.min.y).withContext(`stage ${stage}`).toBeGreaterThanOrEqual(-1e-6);
      expect(box.min.y).withContext(`stage ${stage}`).toBeLessThan(0.3);
      // Its feet (or its egg) on the stand, not over the edge
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
      low.forEach(p => expect(Math.hypot(p.x, p.z)).withContext(`stage ${stage}`).toBeLessThan(CREATURE_STAND_RADIUS));
      // The snout in front of the face
      const head = new THREE.Box3().setFromObject(root.getObjectByName(CREATURE_HEAD)!).getCenter(new THREE.Vector3());
      const snout = new THREE.Box3().setFromObject(root.getObjectByName('creature-snout')!).getCenter(new THREE.Vector3());
      expect(snout.z).withContext(`stage ${stage}`).toBeGreaterThan(head.z);
    });
  });

  it('frees what is its own when put away, and not the plane every glow shares', () => {
    const root = buildAvatar(dragon(3));
    const glow = root.getObjectByName(CREATURE_GLOW) as THREE.Sprite;
    const shared = spyOn(glow.geometry, 'dispose');
    const body = root.getObjectByName('creature-body') as THREE.Mesh;
    const own = spyOn(body.geometry, 'dispose').and.callThrough();
    disposeAvatar(root);
    expect(shared).not.toHaveBeenCalled();
    expect(own).toHaveBeenCalled();
  });

  it('builds a stage out of range as the nearest one there is', () => {
    expect(buildCreature(0).userData.stage).toBe(1);
    expect(buildCreature(7).userData.stage).toBe(3);
    expect(buildCreature(NaN).userData.stage).toBe(1);
  });

  it('is only itself: no kid hero, wardrobe, pet or back item on a dragon', () => {
    const root = build(dragon(2, { pet: 'puppy', back: 'cape', hat: 'crown', shoes: 'boots' } as Partial<Avatar>));
    ['body', 'head-group', 'hair', 'hat', 'pet', 'back', 'shoe'].forEach(name =>
      expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.userData.family).toBe('creature');
  });

  it('blinks, breathes, wags, flaps and glows, and is back exactly as built at rest', () => {
    const root = build(dragon(3));
    const rig = new Rig(root);
    const eyes = named(root, 'eye');
    expect(eyes.length).toBe(2);
    const open = eyes.map(eye => eye.scale.y);
    const head = root.getObjectByName(CREATURE_HEAD)!;
    const headY = head.position.y;
    const glow = (root.getObjectByName(CREATURE_GLOW) as THREE.Sprite).material.color;
    const lit = glow.clone();

    // A breath in lifts the head
    rig.pose(BREATH_SECONDS / 2, null);
    expect(head.position.y - headY).toBeCloseTo(BREATH_RISE, 9);
    // The glow dims and brightens
    rig.pose(GLOW_SECONDS / 2, null);
    expect(glow.g).toBeCloseTo(lit.g * GLOW_LOW, 6);
    // A blink closes the eyes
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
    expect(glow.equals(lit)).toBeTrue();
    eyes.forEach((eye, i) => expect(eye.scale.y).toBe(open[i]));
  });

  it('is pictured on other screens by its head, or whole, and never by its glow', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(dragon(stage));
      const figure = figureFor('boy');
      const whole = framedBox(root, 'full', figure);
      const portrait = framedBox(root, 'portrait', figure);
      expect(whole.equals(solidBox(root.getObjectByName(CREATURE)!))).withContext(`stage ${stage}`).toBeTrue();
      const head = new THREE.Box3().setFromObject(root.getObjectByName(CREATURE_HEAD)!);
      expect(portrait.containsBox(head)).withContext(`stage ${stage}`).toBeTrue();
      // With room round it, not cut off at the ears
      const room = (head.max.y - head.min.y) * 0.1;
      expect(portrait.max.y - head.max.y).withContext(`stage ${stage}`).toBeGreaterThan(room);
      expect(head.min.x - portrait.min.x).withContext(`stage ${stage}`).toBeGreaterThan(room);
      expect(portrait.max.y - portrait.min.y).withContext(`stage ${stage}`).toBeLessThan(whole.max.y - whole.min.y);
    });
  });
});
