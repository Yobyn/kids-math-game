import * as THREE from 'three';
import { BODY_TYPES, defaultAvatar } from '../avatar/avatar-model';
import { ARM_RIG, FOREARM_RIG, buildAvatar, disposeAvatar } from './build-avatar';
import { figureFor } from './figure';
import { BREATH_RISE, BREATH_SECONDS, WAVE_SECONDS, eyesOpen } from './motion';
import { Rig, WAVING_SIDE } from './rig';

/** Every mesh's world position, so a pose can be checked to leave nothing behind. */
function snapshot(root: THREE.Object3D): number[] {
  root.updateMatrixWorld(true);
  const out: number[] = [];
  root.traverse(node => {
    node.matrixWorld.elements.forEach(e => out.push(e));
  });
  return out;
}

function boxOf(node: THREE.Object3D): THREE.Box3 {
  // Its parents too: a pose turns the joints above it
  node.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(node);
}

/** The first moment the eyes are fully shut. */
function shutMoment(): number {
  for (let t = 0; t < 20; t += 0.001) {
    if (eyesOpen(t) < 0.02) {
      return t;
    }
  }
  throw new Error('no blink');
}

describe('Rig', () => {
  const models: THREE.Group[] = [];
  function build(bodyType: typeof BODY_TYPES[number], extra = {}) {
    const model = buildAvatar({ ...defaultAvatar(), bodyType, hat: 'cap', glasses: 'round-glasses', top: 'hoodie', ...extra } as any);
    models.push(model);
    return model;
  }
  afterEach(() => models.splice(0).forEach(disposeAvatar));

  it('finds both arms, both elbows and both eyes on every figure', () => {
    BODY_TYPES.forEach(bodyType => {
      const model = build(bodyType);
      const count = (name: string) => {
        let n = 0;
        model.traverse(node => (n += node.name === name ? 1 : 0));
        return n;
      };
      expect([count(ARM_RIG), count(FOREARM_RIG), count('eye')]).toEqual([2, 2, 2]);
    });
  });

  it('leaves the character exactly as built at the first moment, and after rest()', () => {
    BODY_TYPES.forEach(bodyType => {
      const model = build(bodyType);
      const built = snapshot(model);
      const rig = new Rig(model);
      rig.pose(0, null);
      expect(snapshot(model)).toEqual(built);
      rig.pose(BREATH_SECONDS / 2, WAVE_SECONDS / 2);
      expect(snapshot(model)).not.toEqual(built);
      rig.rest();
      expect(snapshot(model)).toEqual(built);
    });
  });

  it('lifts the head and everything on it together on a breath in, so nothing comes apart', () => {
    const model = build('boy');
    const parts = ['head-group', 'hair', 'hat', 'glasses'].map(name => model.getObjectByName(name)!);
    const before = parts.map(part => part.position.y);
    new Rig(model).pose(BREATH_SECONDS / 2, null);
    parts.forEach((part, i) => expect(part.position.y - before[i]).toBeCloseTo(BREATH_RISE, 9));
    // Still inside the collar: the neck reaches further into the head than the breath lifts it
    expect(BREATH_RISE).toBeLessThan(0.2);
  });

  it('shuts the eyes to a line on a blink, and opens them again', () => {
    const model = build('girl');
    const rig = new Rig(model);
    const eyes: THREE.Object3D[] = [];
    model.traverse(node => node.name === 'eye' && eyes.push(node));
    const open = eyes.map(eye => eye.scale.y);
    const t = shutMoment();
    rig.pose(t, null);
    eyes.forEach((eye, i) => {
      expect(eye.scale.y).toBeLessThan(open[i] * 0.15);
      expect(eye.scale.y).toBeGreaterThan(0);
      // Only the height: a blink does not change the eye's width
      expect(eye.scale.x).toBe(1);
    });
    rig.pose(t + 1, null);
    eyes.forEach((eye, i) => expect(eye.scale.y).toBeCloseTo(open[i], 9));
  });

  it('waves one hand up above the shoulder and out to its side, with the other hand still down', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const model = build(bodyType);
      new Rig(model).pose(0, WAVE_SECONDS / 2);
      const hands: THREE.Object3D[] = [];
      model.traverse(node => node.name === 'hand' && hands.push(node));
      const waving = hands.map(boxOf).find(box => Math.sign(box.getCenter(new THREE.Vector3()).x) === WAVING_SIDE)!;
      const resting = hands.map(boxOf).find(box => Math.sign(box.getCenter(new THREE.Vector3()).x) !== WAVING_SIDE)!;
      expect(waving.min.y).toBeGreaterThan(figure.shoulder[1]);
      expect(WAVING_SIDE * waving.getCenter(new THREE.Vector3()).x).toBeGreaterThan(figure.shoulder[0] + 1);
      expect(resting.max.y).toBeLessThan(figure.belt);
    });
  });

  it('never swings the waving arm into the head or the body', () => {
    BODY_TYPES.forEach(bodyType => {
      const model = build(bodyType, { hairStyle: 'afro', hat: 'wizard' });
      const rig = new Rig(model);
      const head = boxOf(model.getObjectByName('head-group')!).union(boxOf(model.getObjectByName('hair')!));
      const figure = figureFor(bodyType);
      const hits: string[] = [];
      for (let t = 0; t <= WAVE_SECONDS; t += 0.05) {
        rig.pose(0, t);
        model.traverse(node => {
          if (node.name === 'hand' || node.name === 'forearm') {
            const box = boxOf(node);
            if (box.intersectsBox(head)) {
              hits.push(`${bodyType} ${node.name} in the head at ${t.toFixed(2)}s`);
            }
            // Out beside the torso, never across it
            if (Math.min(Math.abs(box.min.x), Math.abs(box.max.x)) < figure.shoulder[0] * 0.5 && box.max.y > figure.belt) {
              hits.push(`${bodyType} ${node.name} across the body at ${t.toFixed(2)}s`);
            }
          }
        });
      }
      expect(hits).toEqual([]);
    });
  });
});
