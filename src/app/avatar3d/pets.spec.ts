import * as THREE from 'three';
import { Avatar, BODY_TYPES, NO_ITEM, PET_ITEMS, defaultAvatar } from '../avatar/avatar-model';
import { BASE_CENTRE, BASE_DISTANCE, bodyFraming } from './avatar-stage.component';
import { PET_STAND_RADIUS, buildAvatar, disposeAvatar } from './build-avatar';
import { figureFor } from './figure';
import { WAVE_SECONDS, WAVING_SIDE } from './motion';
import { PET_IDS, PET_TAIL, PET_WING, buildPet } from './pets';
import { Rig } from './rig';
import { framedBox } from './still-renderer';

const PETS = PET_ITEMS.filter(item => item.id !== NO_ITEM);

function avatar(extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), hat: 'cap', top: 'hoodie', ...extra };
}

function boxOf(node: THREE.Object3D): THREE.Box3 {
  node.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(node);
}

describe('pets', () => {
  const built: THREE.Object3D[] = [];
  const keep = <T extends THREE.Object3D>(o: T): T => {
    built.push(o);
    return o;
  };
  afterEach(() => built.splice(0).forEach(o => disposeAvatar(o as THREE.Group)));

  it('has a 3D pet for every pet in the wardrobe, and none that cannot be won', () => {
    expect(PET_IDS.sort()).toEqual(PETS.map(item => item.id).sort());
  });

  it('builds no pet for no pet, or for one that does not exist', () => {
    expect(buildPet(NO_ITEM, '#ffffff')).toBeNull();
    expect(buildPet('unicorn', '#ffffff')).toBeNull();
    expect(keep(buildAvatar(avatar())).getObjectByName('pet')).toBeUndefined();
    expect(keep(buildAvatar(avatar({ pet: 'unicorn' }))).getObjectByName('pet')).toBeUndefined();
  });

  it('builds each pet its own way, in its own colour', () => {
    const shapes = PETS.map(item => {
      const pet = keep(buildPet(item.id, item.colour)!);
      const body = pet.getObjectByName('pet-body') as THREE.Mesh;
      expect((body.material as THREE.MeshToonMaterial).color.getHexString()).toBe(item.colour.slice(1).toLowerCase(), item.id);
      let meshes = 0;
      pet.traverse(o => (meshes += (o as THREE.Mesh).isMesh ? 1 : 0));
      return `${item.id}:${meshes}`;
    });
    expect(new Set(shapes.map(s => s.split(':')[1])).size).toBe(PETS.length);
    // Every pet has a tail that can wag; the dragon has wings that can flap
    PETS.forEach(item => expect(keep(buildPet(item.id, item.colour)!).getObjectByName(PET_TAIL)).toBeTruthy(item.id));
    let wings = 0;
    keep(buildPet('dragon', '#4fae6a')!).traverse(o => (wings += o.name === PET_WING ? 1 : 0));
    expect(wings).toBe(2);
  });

  it('looks forward, out of the stand, not at its back', () => {
    PETS.forEach(item => {
      const pet = keep(buildPet(item.id, item.colour)!);
      const body = boxOf(pet.getObjectByName('pet-body')!).getCenter(new THREE.Vector3());
      const eyes: THREE.Object3D[] = [];
      pet.traverse(o => o.name === 'pet-eye' && eyes.push(o));
      expect(eyes.length).toBe(2);
      eyes.forEach(eye => expect(boxOf(eye).getCenter(new THREE.Vector3()).z).toBeGreaterThan(body.z + 0.3, item.id));
    });
  });

  it('sits on its own stand, beside the character’s, and comes up to about the knee', () => {
    BODY_TYPES.forEach(bodyType => PETS.forEach(item => {
      const figure = figureFor(bodyType);
      const root = keep(buildAvatar(avatar({ bodyType, pet: item.id })));
      const group = root.getObjectByName('pet')!;
      const pet = boxOf(group.getObjectByName('pet-' + item.id)!);
      // Round stands, so measured by centre and radius (a box round a turned one is too big)
      const radius = (name: string) =>
        ((root.getObjectByName(name)!.getObjectByName('pedestal-top') as THREE.Mesh).geometry as THREE.CylinderGeometry).parameters.radiusBottom;
      const centre = new THREE.Vector3();
      group.getObjectByName('pet-pedestal')!.getWorldPosition(centre);
      // On the stand's top, not floating over it or sunk into it
      expect(Math.abs(pet.min.y - boxOf(group.getObjectByName('pet-pedestal')!).max.y)).toBeLessThan(0.12, `${bodyType} ${item.id}`);
      // The two stands do not touch
      expect(Math.hypot(centre.x, centre.z) - radius('pedestal') - radius('pet-pedestal')).toBeGreaterThan(0.1, `${bodyType} ${item.id}`);
      const height = pet.max.y - pet.min.y;
      expect(height).toBeGreaterThan(figure.knee[1] * 0.6, `${bodyType} ${item.id}`);
      expect(height).toBeLessThan(figure.knee[1] * 1.05, `${bodyType} ${item.id}`);
    }));
  });

  it('sits on the side away from the waving arm, so the wave is never over it', () => {
    BODY_TYPES.forEach(bodyType => {
      const root = keep(buildAvatar(avatar({ bodyType, pet: 'puppy' })));
      const centre = new THREE.Vector3();
      root.getObjectByName('pet')!.getWorldPosition(centre);
      expect(Math.sign(centre.x)).toBe(-WAVING_SIDE);
      // And turned a little towards the character, not away
      expect(Math.sign(root.getObjectByName('pet')!.rotation.y)).toBe(WAVING_SIDE);
    });
  });

  it('never touches the character, standing, breathing or waving, whatever it wears', () => {
    const looks: Partial<Avatar>[] = [
      { hairStyle: 'long', top: 'striped' }, { hairStyle: 'braids', top: 'hoodie' }, { hairStyle: 'afro', hat: 'wizard' },
      { hairStyle: 'locs', top: 'none' }
    ];
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => looks.forEach(look => PETS.forEach(item => {
      const root = keep(buildAvatar(avatar({ bodyType, ...look, pet: item.id } as Partial<Avatar>)));
      const rig = new Rig(root);
      const group = root.getObjectByName('pet')!;
      for (let t = 0; t <= WAVE_SECONDS; t += 0.1) {
        rig.pose(2 + t, t);
        const pet = boxOf(group);
        root.children.filter(child => child !== group && child.name !== 'pedestal').forEach(child => child.traverse(node => {
          if ((node as THREE.Mesh).isMesh && boxOf(node).intersectsBox(pet)) {
            misses.push(`${bodyType} ${look.hairStyle} ${item.id}: ${node.name} at ${t.toFixed(1)}s`);
          }
        }));
      }
    })));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('stays in view all the way round, on a phone held upright or on its side', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => PETS.forEach(item => {
      const root = keep(buildAvatar(avatar({ bodyType, pet: item.id, hat: 'wizard', hairStyle: 'afro' })));
      const whole = boxOf(root);
      // The real shapes, not a box round them: a box round a round stand has
      // corners the stand never reaches. The stand's rim, top and bottom...
      const standCentre = new THREE.Vector3();
      root.getObjectByName('pet-pedestal')!.getWorldPosition(standCentre);
      const rim = PET_STAND_RADIUS * 1.08;
      const corners: THREE.Vector3[] = [];
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        [-0.19, 0].forEach(y => corners.push(new THREE.Vector3(standCentre.x + Math.cos(a) * rim, y, standCentre.z + Math.sin(a) * rim)));
      }
      // ...and the animal on it
      const animal = boxOf(root.getObjectByName('pet-' + item.id)!);
      [0, 1, 2, 3, 4, 5, 6, 7].forEach(i => corners.push(new THREE.Vector3(
        i & 1 ? animal.max.x : animal.min.x, i & 2 ? animal.max.y : animal.min.y, i & 4 ? animal.max.z : animal.min.z)));
      // As the stage frames the body: its own framing, from its own starting height
      [0.8, 1, 1.5].forEach(aspect => {
        const { distance, centre } = bodyFraming(whole, 30, aspect, boxOf(root.getObjectByName('pet')!));
        const camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 200);
        const up = new THREE.Vector3(0, 3, BASE_DISTANCE).normalize();
        for (let a = 0; a < 360; a += 15) {
          const turn = (a * Math.PI) / 180;
          const across = Math.hypot(up.x, up.z);
          camera.position.set(Math.sin(turn) * across * distance, centre + up.y * distance, Math.cos(turn) * across * distance);
          camera.lookAt(0, centre, 0);
          camera.updateMatrixWorld(true);
          const out = corners.map(c => c.clone().project(camera)).filter(p => Math.abs(p.x) > 1 || Math.abs(p.y) > 1);
          if (out.length) {
            misses.push(`${bodyType} ${item.id} at ${a}° aspect ${aspect}`);
          }
        }
      });
    }));
    expect(BASE_CENTRE).toBeGreaterThan(0);
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('is not in the pictures of the character on other screens', () => {
    BODY_TYPES.forEach(bodyType => {
      const without = keep(buildAvatar(avatar({ bodyType })));
      const withPet = keep(buildAvatar(avatar({ bodyType, pet: 'dragon' })));
      (['portrait', 'full'] as const).forEach(framingKind => {
        const a = framedBox(without, framingKind, figureFor(bodyType));
        const b = framedBox(withPet, framingKind, figureFor(bodyType));
        expect(b.equals(a)).toBeTrue();
      });
    });
  });

  it('wags its tail and flaps its wings, and is back exactly as built at rest', () => {
    const root = keep(buildAvatar(avatar({ pet: 'dragon' })));
    const rig = new Rig(root);
    const tail = root.getObjectByName(PET_TAIL)!;
    const wings: THREE.Object3D[] = [];
    root.traverse(o => o.name === PET_WING && wings.push(o));
    const built = wings.map(w => w.rotation.z);
    let wagged = 0;
    let flapped = 0;
    for (let t = 0; t < 8; t += 0.05) {
      rig.pose(t, null);
      wagged = Math.max(wagged, Math.abs(tail.rotation.y));
      flapped = Math.max(flapped, ...wings.map((w, i) => Math.abs(w.rotation.z - built[i])));
    }
    expect(wagged).toBeGreaterThan(0.2);
    expect(flapped).toBeGreaterThan(0.1);
    // The two wings flap together, mirrored, not one up and one down
    rig.pose(0.55, null);
    expect(wings[0].rotation.z - built[0]).toBeCloseTo(-(wings[1].rotation.z - built[1]), 9);
    rig.pose(1.3, null);
    expect(tail.rotation.y).not.toBe(0);
    rig.rest();
    expect(tail.rotation.y).toBe(0);
    wings.forEach((w, i) => expect(w.rotation.z).toBe(built[i]));
  });
});
