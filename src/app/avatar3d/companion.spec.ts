import * as THREE from 'three';
import { Avatar, FAMILIES, HATCHLINGS, PET_ITEMS, defaultAvatar } from '../avatar/avatar-model';
import { HATCHED_SCALE, PET_SCALE, buildAvatar, disposeAvatar } from './build-avatar';
import { EGG_ROCK, Rig } from './rig';
import { PET_EGG } from './pets';
import { tailWag } from './motion';

function kid(stage: number, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), stage, hatchling: 'puppy', ...extra };
}

function boxOf(node: THREE.Object3D): THREE.Box3 {
  node.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(node);
}

/** A part's box in the frame of the stand it sits on (the stand is turned a little towards the camera). */
function boxOnStand(node: THREE.Object3D, stand: THREE.Object3D): THREE.Box3 {
  stand.updateWorldMatrix(true, true);
  const toStand = stand.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  node.traverse(part => {
    const mesh = part as THREE.Mesh;
    if (mesh.isMesh && !part.name.endsWith(':outline')) {
      const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        box.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toStand));
      }
    }
  });
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

/** The animals on the pet stand: a pet is built as `pet-<id>`. */
function animals(root: THREE.Object3D): string[] {
  const out: string[] = [];
  root.getObjectByName('pet')?.traverse(node => node.name.startsWith('pet-') && HATCHLINGS.indexOf(node.name.slice(4)) >= 0 && out.push(node.name.slice(4)));
  return out;
}

describe('the kid hero’s egg, which hatches into a pet that grows up (Yobyn, 2026-10-05)', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    root.updateMatrixWorld(true);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('gives a Beginner a closed egg in a nest on the pet’s stand, speckled in the colour of what is inside', () => {
    HATCHLINGS.forEach(id => {
      const root = build(kid(1, { hatchling: id }));
      const stand = root.getObjectByName('pet')!;
      expect(stand).withContext(id).toBeTruthy();
      // Closed: no animal yet, and no broken shell
      expect(animals(root)).withContext(id).toEqual([]);
      expect(named(root, 'pet-shell').length).toBe(0);
      const egg = stand.getObjectByName('pet-egg-shell')!;
      expect(egg).withContext(id).toBeTruthy();
      // Its spots are the colour of the pet it will be
      const spots = named(root, 'pet-egg-spot');
      expect(spots.length).toBeGreaterThan(2);
      const colour = PET_ITEMS.find(item => item.id === id)!.colour;
      spots.forEach(spot => expect(colourOf(spot)).withContext(id).toBe(colour));
      // Sitting in its nest, on the stand: its foot inside the nest's ring, above the stand's top
      const nest = boxOf(stand.getObjectByName('pet-nest')!);
      const shell = boxOf(egg);
      expect(shell.min.y).toBeLessThan(nest.max.y);
      expect(shell.min.y).toBeGreaterThan(boxOf(stand.getObjectByName('pet-pedestal')!).max.y - 0.05);
      expect(nest.containsPoint(new THREE.Vector3((shell.min.x + shell.max.x) / 2, shell.min.y, (shell.min.z + shell.max.z) / 2))).toBeTrue();
    });
  });

  it('hatches for a Trained hero into their own pet, small, sitting in the bottom of its shell', () => {
    HATCHLINGS.forEach(id => {
      const root = build(kid(2, { hatchling: id }));
      expect(animals(root)).withContext(id).toEqual([id]);
      expect(named(root, 'pet-egg-shell').length).toBe(0);
      // In the bottom half of the shell: its body in the cup, the open side up
      const cup = boxOf(root.getObjectByName('pet-shell')!);
      const body = boxOf(root.getObjectByName('pet-' + id)!.getObjectByName('pet-body')!);
      expect(cup.min.y).toBeLessThan(body.min.y + 0.05);
      expect(cup.max.y).toBeGreaterThan(body.min.y);
      expect(cup.max.y).toBeLessThan(body.max.y);
      // The top half of the shell beside it, not on it, and on the stand
      const stand = root.getObjectByName('pet')!;
      const top = boxOnStand(root.getObjectByName('pet-shell-top')!, stand);
      expect(top.intersectsBox(boxOnStand(root.getObjectByName('pet-' + id)!.getObjectByName('pet-body')!, stand))).withContext(id).toBeFalse();
      const reach = Math.max(-top.min.x, top.max.x, -top.min.z, top.max.z);
      const rim = boxOnStand(stand.getObjectByName('pet-pedestal')!, stand);
      expect(reach).withContext(id).toBeLessThan(rim.max.x);
    });
  });

  it('grows the pet up for a Legend: the same pet, bigger than when it hatched, out of its shell', () => {
    HATCHLINGS.forEach(id => {
      const baby = build(kid(2, { hatchling: id }));
      const grown = build(kid(3, { hatchling: id }));
      expect(animals(grown)).withContext(id).toEqual([id]);
      expect(named(grown, 'pet-shell').length + named(grown, 'pet-shell-top').length).toBe(0);
      const height = (root: THREE.Object3D) => {
        const box = boxOf(root.getObjectByName('pet-' + id)!);
        return box.max.y - box.min.y;
      };
      expect(height(grown)).withContext(id).toBeGreaterThan(height(baby) * 1.3);
    });
    // Grown, as big as a pet won in the wardrobe
    expect(PET_SCALE).toBeGreaterThan(HATCHED_SCALE);
    const won = build({ ...defaultAvatar(), stage: 3, pet: 'puppy' });
    const grown = build(kid(3));
    expect(boxOf(grown.getObjectByName('pet-puppy')!).max.y).toBeCloseTo(boxOf(won.getObjectByName('pet-puppy')!).max.y, 6);
  });

  it('is the pet picked for the child, whatever the stage: one egg, one pet', () => {
    HATCHLINGS.forEach(id => [2, 3].forEach(stage => expect(animals(build(kid(stage, { hatchling: id })))).toEqual([id])));
  });

  it('steps aside for a pet the child has won and chosen, at every stage', () => {
    [1, 2, 3].forEach(stage => {
      const root = build(kid(stage, { pet: 'kitten', hatchling: 'dragon' }));
      expect(animals(root)).withContext(`stage ${stage}`).toEqual(['kitten']);
      expect(named(root, 'pet-egg-shell').length + named(root, 'pet-shell').length).toBe(0);
    });
  });

  it('is the kid hero’s: no egg beside any other family', () => {
    FAMILIES.filter(family => family !== 'kid').forEach(family => [1, 2, 3].forEach(stage => {
      const root = build(kid(stage, { family }));
      expect(root.getObjectByName('pet')).withContext(`${family} ${stage}`).toBeUndefined();
    }));
  });

  it('rocks on its foot now and then, as if something inside is moving, and is back as built at rest', () => {
    const root = build(kid(1));
    const rig = new Rig(root);
    const egg = root.getObjectByName(PET_EGG)!;
    const foot = boxOf(egg).min.y;
    let rocked = 0;
    let at = 0;
    for (let t = 0; t < 10; t += 0.05) {
      rig.pose(t, null);
      if (Math.abs(egg.rotation.z) > rocked) {
        rocked = Math.abs(egg.rotation.z);
        at = t;
      }
    }
    expect(rocked).toBeCloseTo(Math.abs(tailWag(at)) * EGG_ROCK, 9);
    expect(rocked).toBeGreaterThan(0.1);
    // Gently: it rocks, it does not fall over
    expect(rocked).toBeLessThan(0.35);
    // About its foot, so its foot stays down in the nest
    rig.pose(at, null);
    expect(Math.abs(boxOf(egg).min.y - foot)).toBeLessThan(0.15);
    rig.rest();
    expect(egg.rotation.z).toBe(0);
  });
});
