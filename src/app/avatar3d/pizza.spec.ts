import * as THREE from 'three';
import { Avatar, defaultAvatar } from '../avatar/avatar-model';
import { CREATURE_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD, STAGE_HEIGHT } from './creatures';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, GLOW_LOW, GLOW_SECONDS, eyesOpen } from './motion';
import { CAPE_RED, GOLD, buildPizza } from './pizza';
import { Rig } from './rig';
import { framedBox } from './still-renderer';

function pizza(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), family: 'pizza', stage, ...extra };
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

const TOPPINGS = ['pizza-pepperoni', 'pizza-olive', 'pizza-mushroom', 'pizza-basil'];

function toppingsOf(root: THREE.Object3D): THREE.Object3D[] {
  return TOPPINGS.reduce((all, name) => all.concat(named(root, name)), [] as THREE.Object3D[]);
}

/** The eight corners of a box. */
function corners(box: THREE.Box3): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  [box.min.x, box.max.x].forEach(x => [box.min.y, box.max.y].forEach(y => [box.min.z, box.max.z].forEach(z => out.push(new THREE.Vector3(x, y, z)))));
  return out;
}

describe('the Silly objects family: a slice of pizza that grows into a super pizza (Yobyn, 2026-09-27)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    root.updateMatrixWorld(true);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('grows from a slice to a super pizza about as tall as a kid hero', () => {
    const heights = [1, 2, 3].map(stage => solidBox(build(pizza(stage)).getObjectByName(CREATURE)!).max.y);
    heights.forEach((height, i) => expect(height).toBeCloseTo(STAGE_HEIGHT[i], 3));
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(Math.abs(heights[2] - figureFor('boy').headY - figureFor('boy').headScale[1])).toBeLessThan(1.5);
  });

  it('is a plain slice first, then has a cape, then is a super pizza with extra toppings', () => {
    const [one, two, three] = [1, 2, 3].map(stage => build(pizza(stage)));
    // Always the slice, its crust and cheese
    [one, two, three].forEach((root, i) => ['pizza-slice', 'pizza-crust', 'pizza-cheese'].forEach(name =>
      expect(named(root, name).length).withContext(`stage ${i + 1} ${name}`).toBe(1)));
    // Plain: no toppings, no cape
    expect(toppingsOf(one).length).toBe(0);
    expect(named(one, 'pizza-cape').length).toBe(0);
    // A red cape from stage 2, held on with gold clasps
    [two, three].forEach((root, i) => {
      const capes = named(root, 'pizza-cape');
      expect(capes.length).withContext(`stage ${i + 2}`).toBe(1);
      expect(colourOf(capes[0])).toBe(CAPE_RED);
      const clasps = named(root, 'pizza-clasp');
      expect(clasps.length).withContext(`stage ${i + 2}`).toBe(2);
      clasps.forEach(clasp => expect(colourOf(clasp)).toBe(GOLD));
    });
    // Extra toppings on the super pizza: more of them, and kinds the caped pizza has not got
    expect(toppingsOf(two).length).toBeGreaterThan(0);
    expect(toppingsOf(three).length).toBeGreaterThan(toppingsOf(two).length);
    const kinds = (root: THREE.Object3D) => TOPPINGS.filter(name => named(root, name).length > 0).length;
    expect(kinds(three)).toBeGreaterThan(kinds(two));
    // And only the super pizza has the gold trim and the sparkles
    expect(named(two, 'pizza-cape-trim').length + named(two, CREATURE_GLOW).length).toBe(0);
    expect(named(three, 'pizza-cape-trim').length).toBe(1);
    expect(colourOf(named(three, 'pizza-cape-trim')[0])).toBe(GOLD);
    expect(named(three, CREATURE_GLOW).length).toBe(2);
  });

  it('keeps every topping flat on the cheese, on the slice, and off its face', () => {
    [2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const slice = root.getObjectByName('pizza-slice') as THREE.Mesh;
      slice.geometry.computeBoundingBox();
      const shape = slice.geometry.boundingBox!;
      const toSlice = slice.matrixWorld.clone().invert();
      const cheese = boxOf(root.getObjectByName('pizza-cheese')!);
      const face = [...named(root, 'eye'), ...named(root, 'pizza-smile'), ...named(root, 'pizza-cheek')].map(boxOf);
      const scale = root.getObjectByName(CREATURE)!.scale.x;
      const misses: string[] = [];
      toppingsOf(root).forEach((topping, i) => {
        const box = boxOf(topping);
        const name = `${topping.name} ${i}`;
        // On the slice's triangle: its point at the bottom, as wide as the crust at the top
        corners(box).forEach(corner => {
          const p = corner.clone().applyMatrix4(toSlice);
          if (p.y < 0 || p.y > shape.max.y || Math.abs(p.x) > (shape.max.x * p.y) / shape.max.y) {
            misses.push(`${name} off the slice`);
          }
        });
        // Lying on the cheese: not sunk into it, not floating in front of it
        if (Math.abs(box.min.z - cheese.max.z) > 0.08 * scale) {
          misses.push(`${name} not on the cheese`);
        }
        if (face.some(feature => feature.intersectsBox(box))) {
          misses.push(`${name} on its face`);
        }
      });
      expect(Array.from(new Set(misses))).withContext(`stage ${stage}`).toEqual([]);
    });
  });

  it('has the dragon’s friendly face in the cheese, up where the slice is widest', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const cheese = boxOf(root.getObjectByName('pizza-cheese')!);
      const slice = boxOf(root.getObjectByName('pizza-slice')!);
      const middle = (slice.min.y + slice.max.y) / 2;
      const eyes = named(root, 'eye');
      expect(eyes.length).withContext(`stage ${stage}`).toBe(2);
      eyes.forEach(eye => {
        const at = eye.getWorldPosition(new THREE.Vector3());
        expect(at.z).withContext(`stage ${stage}`).toBeGreaterThan(cheese.max.z - 0.05);
        expect(at.y).withContext(`stage ${stage}`).toBeGreaterThan(middle);
      });
      // A smile under its eyes, on the front of the cheese
      const smile = boxOf(root.getObjectByName('pizza-smile')!);
      eyes.forEach(eye => expect(smile.max.y).toBeLessThan(eye.getWorldPosition(new THREE.Vector3()).y));
      expect(smile.max.z).toBeGreaterThan(cheese.max.z);
      expect(named(root, 'pizza-cheek').length).toBe(2);
    });
  });

  it('wears its cape behind it, hanging from its shoulders and swinging out past its sides, gold only at the edge', () => {
    [2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const cape = boxOf(root.getObjectByName('pizza-cape')!);
      const slice = boxOf(root.getObjectByName('pizza-slice')!);
      const crust = boxOf(root.getObjectByName('pizza-crust')!);
      // Behind the slice, from up by the crust, clear of its feet
      expect(cape.max.z).withContext(`stage ${stage}`).toBeLessThan(slice.min.z);
      expect(cape.max.y).withContext(`stage ${stage}`).toBeGreaterThan(crust.min.y);
      named(root, 'pizza-shoe').forEach(shoe => expect(cape.min.y).toBeGreaterThan(boxOf(shoe).max.y));
      // Showing either side of the slice from the front
      expect(cape.max.x).toBeGreaterThan(slice.max.x);
      expect(cape.min.x).toBeLessThan(slice.min.x);
      // The clasps at the top corners, in front
      named(root, 'pizza-clasp').forEach(clasp => {
        const at = centreOf(clasp);
        expect(at.z).toBeGreaterThan(slice.max.z - (slice.max.z - slice.min.z) / 2);
        expect(at.y).toBeGreaterThan(crust.min.y - (slice.max.y - slice.min.y) * 0.15);
      });
    });
    // The super pizza's trim goes round the cape's edge: from behind, the middle of the cape is still red
    const root = build(pizza(3));
    const cape = root.getObjectByName('pizza-cape')!;
    const middle = centreOf(cape);
    const ray = new THREE.Raycaster(new THREE.Vector3(middle.x, middle.y, -100), new THREE.Vector3(0, 0, 1));
    const hits = ray.intersectObject(root, true).filter(hit => !hit.object.name.endsWith(':outline'));
    expect(hits[0].object.name).toBe('pizza-cape');
    const trim = boxOf(root.getObjectByName('pizza-cape-trim')!);
    expect(trim.containsPoint(middle)).toBeTrue();
    expect(trim.min.y).toBeLessThan(boxOf(cape).min.y);
  });

  it('puts the super pizza’s sparkles above its crust', () => {
    const root = build(pizza(3));
    const crust = boxOf(root.getObjectByName('pizza-crust')!);
    const sparkles = named(root, CREATURE_GLOW);
    expect(sparkles.length).toBe(2);
    sparkles.forEach(sparkle => expect(boxOf(sparkle).min.y).toBeGreaterThan(crust.max.y));
    expect(Math.sign(centreOf(sparkles[0]).x)).toBe(-Math.sign(centreOf(sparkles[1]).x));
  });

  it('stands on little legs from its point, arms out of its sides, a glove on each', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const slice = boxOf(root.getObjectByName('pizza-slice')!);
      const shoes = named(root, 'pizza-shoe').map(boxOf);
      const legs = named(root, 'pizza-leg').map(boxOf);
      expect(legs.length).withContext(`stage ${stage}`).toBe(2);
      legs.forEach(leg => {
        expect(leg.intersectsBox(slice)).withContext(`stage ${stage}`).toBeTrue();
        expect(shoes.some(shoe => shoe.intersectsBox(leg))).withContext(`stage ${stage}`).toBeTrue();
      });
      const hands = named(root, 'pizza-hand').map(boxOf);
      const arms = named(root, 'pizza-arm');
      expect(arms.length).withContext(`stage ${stage}`).toBe(2);
      arms.forEach(arm => {
        const box = boxOf(arm);
        expect(box.intersectsBox(slice)).withContext(`stage ${stage}`).toBeTrue();
        const middle = box.getCenter(new THREE.Vector3());
        const hand = hands.find(h => Math.sign(h.getCenter(new THREE.Vector3()).x) === Math.sign(middle.x))!;
        expect(hand.intersectsBox(box)).withContext(`stage ${stage}`).toBeTrue();
        // Out from its side, the glove further out than the arm's middle
        expect(Math.abs(hand.getCenter(new THREE.Vector3()).x)).toBeGreaterThan(Math.abs(middle.x));
        // The arm runs along its own length to the glove
        const along = new THREE.Vector3(0, 1, 0).applyQuaternion(arm.getWorldQuaternion(new THREE.Quaternion()));
        expect(Math.abs(along.dot(hand.getCenter(new THREE.Vector3()).sub(middle).normalize()))).toBeGreaterThan(0.95);
      });
    });
  });

  it('stands on its own stand, on the floor, whatever the stage', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const box = solidBox(root.getObjectByName(CREATURE)!);
      expect(box.min.y).withContext(`stage ${stage}`).toBeGreaterThanOrEqual(-1e-6);
      expect(box.min.y).withContext(`stage ${stage}`).toBeLessThan(0.3);
      named(root, 'pizza-shoe').forEach(shoe => {
        const feet = boxOf(shoe);
        expect(feet.min.y).toBeLessThan(0.05);
        [feet.min.x, feet.max.x].forEach(x => [feet.min.z, feet.max.z].forEach(z =>
          expect(Math.hypot(x, z)).withContext(`stage ${stage}`).toBeLessThan(CREATURE_STAND_RADIUS)));
      });
      // Its point up off the floor, on its legs
      expect(boxOf(root.getObjectByName('pizza-slice')!).min.y).toBeGreaterThan(boxOf(named(root, 'pizza-shoe')[0]).max.y);
    });
  });

  it('frees what is its own when put away', () => {
    const root = buildAvatar(pizza(3));
    const slice = root.getObjectByName('pizza-slice') as THREE.Mesh;
    const own = spyOn(slice.geometry, 'dispose').and.callThrough();
    disposeAvatar(root);
    expect(own).toHaveBeenCalled();
  });

  it('builds a stage out of range as the nearest one there is', () => {
    expect(buildPizza(0).userData.stage).toBe(1);
    expect(buildPizza(7).userData.stage).toBe(3);
    expect(buildPizza(NaN).userData.stage).toBe(1);
    expect(buildPizza(2).userData.family).toBe('pizza');
  });

  it('is only itself: no kid hero, wardrobe, pet or back item on the pizza', () => {
    const root = build(pizza(2, { pet: 'puppy', back: 'backpack', hat: 'crown', shoes: 'boots' } as Partial<Avatar>));
    ['body', 'head-group', 'hair', 'hat', 'pet', 'back', 'shoe', 'creature-skull', 'robot-shell', 'animal-skull', 'space-skull'].forEach(name =>
      expect(root.getObjectByName(name)).withContext(name).toBeUndefined());
    expect(root.getObjectByName('pedestal')).toBeTruthy();
    expect(root.userData.family).toBe('pizza');
  });

  it('blinks, breathes and sparkles, and is back exactly as built at rest', () => {
    [1, 3].forEach(stage => {
      const root = build(pizza(stage));
      const rig = new Rig(root);
      const eyes = named(root, 'eye');
      const open = eyes.map(eye => eye.scale.y);
      const head = root.getObjectByName(CREATURE_HEAD)!;
      const headY = head.position.y;
      const glows = named(root, CREATURE_GLOW).map(glow => ((glow as THREE.Mesh).material as THREE.MeshBasicMaterial).color);
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

  it('is pictured on other screens by its slice and face, or whole, and never by what glows', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(pizza(stage));
      const figure = figureFor('boy');
      const whole = framedBox(root, 'full', figure);
      const portrait = framedBox(root, 'portrait', figure);
      expect(whole.equals(solidBox(root.getObjectByName(CREATURE)!))).withContext(`stage ${stage}`).toBeTrue();
      // Its face and crust, close in: the eyes, the smile and the crust in it, the legs well out of it
      named(root, 'eye').forEach(eye => expect(portrait.containsPoint(eye.getWorldPosition(new THREE.Vector3()))).withContext(`stage ${stage}`).toBeTrue());
      expect(portrait.containsBox(boxOf(root.getObjectByName('pizza-smile')!))).withContext(`stage ${stage}`).toBeTrue();
      expect(portrait.containsBox(boxOf(root.getObjectByName('pizza-crust')!))).withContext(`stage ${stage}`).toBeTrue();
      named(root, 'pizza-shoe').forEach(shoe => expect(portrait.intersectsBox(boxOf(shoe))).withContext(`stage ${stage}`).toBeFalse());
      expect(portrait.max.y - portrait.min.y).withContext(`stage ${stage}`).toBeLessThan((whole.max.y - whole.min.y) * 0.75);
    });
  });
});
