import * as THREE from 'three';
import { Avatar, defaultAvatar } from '../avatar/avatar-model';
import { CREATURE_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, GLOW_LOW, GLOW_SECONDS, eyesOpen } from './motion';
import { Rig } from './rig';
import { BOOTS, GOLD, RAY_GLOW, buildSpace } from './space';
import { framedBox } from './still-renderer';

function alien(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'space', stage, ...extra };
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

function centreOf(node: THREE.Object3D): THREE.Vector3 {
  return boxOf(node).getCenter(new THREE.Vector3());
}

/** Every point of a mesh's own shape (not its ink line), where it is in the world. */
function pointsOf(mesh: THREE.Mesh): THREE.Vector3[] {
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    out.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  }
  return out;
}

describe('the Space family: an alien who grows from a pod to a captain (Yobyn, 2026-09-27)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    root.updateMatrixWorld(true);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('grows from an alien in a pod to a captain about as tall as a kid hero', () => {
    const heights = [1, 2, 3].map(stage => solidBox(build(alien(stage)).getObjectByName(CREATURE)!).max.y);
    heights.forEach((height, i) => expect(height).toBeCloseTo(STAGE_HEIGHT[i], 3));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Math.abs(heights[2] - figureFor('boy').headY - figureFor('boy').headScale[1])).toBeLessThan(1.5);
  });

  it('is an alien in a pod first, then out in a space suit with boots and a ray gun, then a captain with a ship', () => {
    const [one, two, three] = [1, 2, 3].map(stage => build(alien(stage)));
    // In its pod, under a dome: no suit, boots or ray gun yet
    expect(named(one, 'space-pod').length).toBe(1);
    expect(named(one, 'space-dome').length).toBe(1);
    ['space-suit', 'space-boot', 'space-ray-gun', 'space-cap', 'space-ship'].forEach(name =>
      expect(named(one, name).length).withContext(name).toBe(0));
    // Out of the pod, in its suit and red space boots
    [two, three].forEach((root, i) => {
      expect(named(root, 'space-pod').length + named(root, 'space-dome').length).withContext(`stage ${i + 2}`).toBe(0);
      expect(named(root, 'space-suit').length).withContext(`stage ${i + 2}`).toBe(1);
      const boots = named(root, 'space-boot');
      expect(boots.length).withContext(`stage ${i + 2}`).toBe(2);
      boots.forEach(boot => expect(colourOf(boot)).toBe(BOOTS));
    });
    // The ray gun on stage 2; the captain's cap, gold and ship on stage 3
    expect(named(two, 'space-ray-gun').length).toBe(1);
    ['space-cap', 'space-ship', 'space-epaulette', 'space-captain-star'].forEach(name =>
      expect(named(two, name).length).withContext(name).toBe(0));
    expect(named(three, 'space-cap').length).toBe(1);
    expect(named(three, 'space-ship').length).toBe(1);
    expect(named(three, 'space-epaulette').length).toBe(2);
    [...named(three, 'space-epaulette'), ...named(three, 'space-captain-star'), ...named(three, 'space-cap-band')].forEach(gold =>
      expect(colourOf(gold)).withContext(gold.name).toBe(GOLD));
  });

  it('sits in its pod with all of itself under the glass dome, the dome on the pod', () => {
    const root = build(alien(1));
    const dome = root.getObjectByName('space-dome') as THREE.Mesh;
    const pod = boxOf(root.getObjectByName('space-pod')!);
    const toDome = dome.matrixWorld.clone().invert();
    // Its head (eyes, antennae and their lights too), body and hands: every point inside the dome
    const alienParts: THREE.Mesh[] = [];
    root.getObjectByName(CREATURE_HEAD)!.traverse(node => (node as THREE.Mesh).isMesh && !node.name.endsWith(':outline') && alienParts.push(node as THREE.Mesh));
    alienParts.push(...(named(root, 'space-body') as THREE.Mesh[]), ...(named(root, 'space-hand') as THREE.Mesh[]));
    expect(alienParts.length).toBeGreaterThan(8);
    const outside = alienParts.filter(part => pointsOf(part).some(p => p.clone().applyMatrix4(toDome).length() >= 1));
    expect(outside.map(part => part.name)).toEqual([]);
    // Something of it above the pod, to be seen through the glass
    expect(boxOf(root.getObjectByName(CREATURE_HEAD)!).min.y).toBeGreaterThan(pod.max.y);
    // The dome rests on the pod, as wide as it
    const glass = boxOf(dome);
    expect(Math.abs(glass.min.y - pod.max.y)).toBeLessThan(0.05);
    expect(Math.abs((glass.max.x - glass.min.x) - (pod.max.x - pod.min.x))).toBeLessThan(0.3);
    // See-through, and with no ink line to fill it in
    const material = dome.material as THREE.MeshToonMaterial;
    expect(material.transparent).toBeTrue();
    expect(material.opacity).toBeLessThan(0.5);
    expect(dome.children.some(child => child.name.endsWith(':outline'))).toBeFalse();
  });

  it('holds its ray gun up in its right hand, pointing at the sky, clear of its head', () => {
    const root = build(alien(2));
    const gun = root.getObjectByName('space-ray-gun')!;
    const tip = named(gun, CREATURE_GLOW);
    expect(tip.length).toBe(1);
    expect(colourOf(tip[0])).toBe(RAY_GLOW);
    const hands = named(root, 'space-hand').map(boxOf);
    const holding = hands.filter(hand => hand.intersectsBox(boxOf(root.getObjectByName('space-ray-gun-grip')!)));
    expect(holding.length).toBe(1);
    // Its right hand (+x, as the bear's ball is by its right foot)
    const hand = holding[0].getCenter(new THREE.Vector3());
    expect(hand.x).toBeGreaterThan(0);
    // Pointing up: the tip high above the hand, the barrel more up than across
    const end = centreOf(tip[0]);
    const along = end.clone().sub(hand);
    expect(along.y).toBeGreaterThan(Math.hypot(along.x, along.z) * 2);
    // Out to its side, never across its face
    const head = boxOf(root.getObjectByName('space-skull')!);
    expect(boxOf(gun).intersectsBox(head)).toBeFalse();
    expect(boxOf(gun).min.x).toBeGreaterThan(0);
  });

  it('keeps each hand on the end of its own sleeve', () => {
    [2, 3].forEach(stage => {
      const root = build(alien(stage));
      const sleeves = named(root, 'space-sleeve').map(boxOf);
      const hands = named(root, 'space-hand').map(boxOf);
      expect(sleeves.length).withContext(`stage ${stage}`).toBe(2);
      expect(hands.length).withContext(`stage ${stage}`).toBe(2);
      hands.forEach(hand => {
        const side = Math.sign(hand.getCenter(new THREE.Vector3()).x);
        const own = sleeves.find(sleeve => Math.sign(sleeve.getCenter(new THREE.Vector3()).x) === side)!;
        expect(own.intersectsBox(hand)).withContext(`stage ${stage}`).toBeTrue();
        // The hand at the far end, below the shoulder
        expect(hand.getCenter(new THREE.Vector3()).y).withContext(`stage ${stage}`).toBeLessThan(own.getCenter(new THREE.Vector3()).y);
      });
    });
  });

  it('wears the captain’s cap on its head, its antennae poking out of the top, a gold star at the front', () => {
    const root = build(alien(3));
    const skull = boxOf(root.getObjectByName('space-skull')!);
    const crown = boxOf(root.getObjectByName('space-cap-crown')!);
    // On the head, on top: sitting on it, not floating above it
    expect(crown.intersectsBox(skull)).toBeTrue();
    expect(crown.getCenter(new THREE.Vector3()).y).toBeGreaterThan(skull.getCenter(new THREE.Vector3()).y + (skull.max.y - skull.min.y) / 4);
    // The cap moves with the head as it breathes
    let parent = root.getObjectByName('space-cap')!.parent;
    while (parent && parent.name !== CREATURE_HEAD) {
      parent = parent.parent;
    }
    expect(parent).toBeTruthy();
    // The antennae's lights above the cap
    named(root.getObjectByName(CREATURE_HEAD)!, CREATURE_GLOW).forEach(light => expect(boxOf(light).min.y).toBeGreaterThan(crown.max.y));
    // The star and the peak at the front
    const star = centreOf(root.getObjectByName('space-cap-star')!);
    expect(star.z).toBeGreaterThan(crown.getCenter(new THREE.Vector3()).z);
    expect(centreOf(root.getObjectByName('space-cap-peak')!).z).toBeGreaterThan(skull.getCenter(new THREE.Vector3()).z);
    // Gold on its shoulders, one either side, on top of its suit
    const suit = boxOf(root.getObjectByName('space-suit')!);
    const shoulders = named(root, 'space-epaulette').map(centreOf);
    expect(Math.sign(shoulders[0].x)).toBe(-Math.sign(shoulders[1].x));
    shoulders.forEach(shoulder => expect(shoulder.y).toBeGreaterThan(suit.getCenter(new THREE.Vector3()).y));
  });

  it('has its saucer hovering behind it, over its shoulder, where it can be seen from the front', () => {
    const root = build(alien(3));
    const ship = boxOf(root.getObjectByName('space-ship')!);
    const suit = boxOf(root.getObjectByName('space-suit')!);
    const skull = boxOf(root.getObjectByName('space-skull')!);
    const middle = ship.getCenter(new THREE.Vector3());
    // Behind it
    expect(middle.z).toBeLessThan(suit.min.z);
    // Hovering, up by its head, not standing on the stand
    expect(ship.min.y).toBeGreaterThan(suit.max.y);
    // Out past its head, so it shows from the front
    expect(ship.min.x).toBeLessThan(skull.min.x - (skull.max.x - skull.min.x) / 4);
    // The captain is the tallest thing there
    expect(ship.max.y).toBeLessThan(solidBox(root.getObjectByName(CREATURE)!).max.y);
    // Lights round its rim
    expect(named(root.getObjectByName('space-ship')!, CREATURE_GLOW).length).toBe(8);
  });

  it('has the dragon’s friendly face: big eyes that blink, rosy cheeks, a smile, and two antennae with lights', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(alien(stage));
      const skull = centreOf(root.getObjectByName('space-skull')!);
      const eyes = named(root, 'eye');
      expect(eyes.length).withContext(`stage ${stage}`).toBe(2);
      eyes.forEach(eye => expect(eye.getWorldPosition(new THREE.Vector3()).z).toBeGreaterThan(skull.z));
      expect(named(root, 'space-cheek').length).toBe(2);
      expect(centreOf(root.getObjectByName('space-smile')!).z).toBeGreaterThan(skull.z);
      const antennae = named(root, 'space-antenna');
      expect(antennae.length).withContext(`stage ${stage}`).toBe(2);
      antennae.forEach(antenna => {
        const base = antenna.getWorldPosition(new THREE.Vector3());
        const light = named(antenna, CREATURE_GLOW);
        expect(light.length).toBe(1);
        const tip = centreOf(light[0]);
        // Up out of the top of its head, leaning out
        expect(tip.y).toBeGreaterThan(boxOf(root.getObjectByName('space-skull')!).max.y);
        expect(Math.abs(tip.x)).toBeGreaterThan(Math.abs(base.x));
      });
    });
  });

  it('stands on its own stand, on the floor, whatever the stage', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(alien(stage));
      const box = solidBox(root.getObjectByName(CREATURE)!);
      expect(box.min.y).withContext(`stage ${stage}`).toBeGreaterThanOrEqual(-1e-6);
      expect(box.min.y).withContext(`stage ${stage}`).toBeLessThan(0.3);
      const low: THREE.Vector3[] = [];
      root.getObjectByName(CREATURE)!.traverse(node => {
        if ((node as THREE.Mesh).isMesh && node.name !== CREATURE_GLOW && !node.name.endsWith(':outline')) {
          pointsOf(node as THREE.Mesh).forEach(p => p.y < 0.5 && low.push(p));
        }
      });
      expect(low.length).withContext(`stage ${stage}`).toBeGreaterThan(0);
      const beyond = low.filter(p => Math.hypot(p.x, p.z) >= CREATURE_STAND_RADIUS);
      expect(beyond.length).withContext(`stage ${stage}`).toBe(0);
    });
  });

  it('keeps its head on its body once it is out of the pod', () => {
    [2, 3].forEach(stage => {
      const root = build(alien(stage));
      const head = boxOf(root.getObjectByName('space-skull')!);
      const suit = boxOf(root.getObjectByName('space-suit')!);
      expect(head.min.y).withContext(`stage ${stage}`).toBeLessThan(suit.max.y);
    });
  });

  it('frees what is its own when put away', () => {
    const root = buildAvatar(alien(3));
    const suit = root.getObjectByName('space-suit') as THREE.Mesh;
    const own = spyOn(suit.geometry, 'dispose').and.callThrough();
    disposeAvatar(root);
    expect(own).toHaveBeenCalled();
  });

  it('builds a stage out of range as the nearest one there is', () => {
    expect(buildSpace(0).userData.stage).toBe(1);
    expect(buildSpace(7).userData.stage).toBe(3);
    expect(buildSpace(NaN).userData.stage).toBe(1);
    expect(buildSpace(2).userData.family).toBe('space');
  });

  it('is only itself: no kid hero, wardrobe, pet or back item on the alien', () => {
    const root = build(alien(2, { pet: 'puppy', back: 'cape', hat: 'crown', shoes: 'boots' } as Partial<Avatar>));
    ['body', 'head-group', 'hair', 'hat', 'pet', 'back', 'shoe', 'creature-skull', 'robot-shell', 'animal-skull'].forEach(name =>
      expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.userData.family).toBe('space');
  });

  it('blinks, breathes and glows, and is back exactly as built at rest', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(alien(stage));
      const rig = new Rig(root);
      const eyes = named(root, 'eye');
      const open = eyes.map(eye => eye.scale.y);
      const head = root.getObjectByName(CREATURE_HEAD)!;
      const headY = head.position.y;
      const glows = named(root, CREATURE_GLOW).map(glow => ((glow as THREE.Mesh).material as THREE.MeshBasicMaterial).color);
      // The antennae's lights, and the pod's, the ray gun's or the saucer's
      expect(glows.length).withContext(`stage ${stage}`).toBe([8, 3, 10][stage - 1]);
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
  });

  it('is pictured on other screens by its head, or whole, and never by what glows', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(alien(stage));
      const figure = figureFor('boy');
      const whole = framedBox(root, 'full', figure);
      const portrait = framedBox(root, 'portrait', figure);
      expect(whole.equals(solidBox(root.getObjectByName(CREATURE)!))).withContext(`stage ${stage}`).toBeTrue();
      const skull = boxOf(root.getObjectByName('space-skull')!);
      expect(portrait.containsBox(skull)).withContext(`stage ${stage}`).toBeTrue();
      expect(portrait.max.y - portrait.min.y).withContext(`stage ${stage}`).toBeLessThan(whole.max.y - whole.min.y);
    });
  });
});
