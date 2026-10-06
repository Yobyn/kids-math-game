import * as THREE from 'three';
import { Avatar, BODY_TYPES, BodyType, NO_ITEM, SHOE_ITEMS, defaultAvatar } from '../avatar/avatar-model';
import { buildAvatar, disposeAvatar } from './build-avatar';
import { KNEE_FORWARD, figureFor, legLength, legRadiusAlong, lowerLegRadii } from './figure';
import { GLOW_LOW, GLOW_SECONDS, glow } from './motion';
import { Rig } from './rig';
import { SHOE_GLOW, SHOE_IDS, SNEAKER, TAPER, TUCKED, buildShoe, collarShare, legRadius } from './shoes';
import { framedBox } from './still-renderer';

const ITEMS = SHOE_ITEMS.filter(item => item.id !== NO_ITEM);
const WITH_COLLAR = ['high-tops', 'boots'];
/**
 * The least room between a collar and the leg in it: enough for both
 * outlines, the trousers' (0.04) and the collar's (0.025), not to meet.
 */
const ROOM = 0.065;

function dress(bodyType: BodyType, shoes: string, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), bodyType, top: 'hoodie', shoes, ...extra };
}

function meshes(root: THREE.Object3D, name?: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse(node => (node as THREE.Mesh).isMesh && !node.name.endsWith(':outline') && (!name || node.name === name) && out.push(node as THREE.Mesh));
  return out;
}

function vertices(list: THREE.Mesh[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  list.forEach(mesh => {
    const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  return out;
}

/** Where a point is on a leg: how far up it from the ankle, and how far out from its middle. */
function onLeg(bodyType: BodyType, side: number, p: THREE.Vector3): { s: number; r: number } {
  const figure = figureFor(bodyType);
  const ankle = new THREE.Vector3(side * figure.ankle[0], figure.ankle[1], 0);
  const axis = new THREE.Vector3(side * figure.knee[0], figure.knee[1], KNEE_FORWARD).sub(ankle).normalize();
  const d = p.clone().sub(ankle);
  const s = d.dot(axis);
  return { s, r: d.sub(axis.multiplyScalar(s)).length() };
}

describe('shoes', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('has a 3D pair of everything that can be won, and builds nothing for shoes that do not exist', () => {
    expect(SHOE_IDS.slice().sort()).toEqual(ITEMS.map(item => item.id).sort());
    expect(buildShoe('flippers', '#ffffff', figureFor('boy'), 1)).toBeNull();
    expect(collarShare('flippers')).toBe(0);
    // An unknown pair on a saved character is the sneakers, not bare feet
    const root = build({ ...dress('boy', NO_ITEM), shoes: 'flippers' } as Avatar);
    expect(meshes(root).filter(mesh => mesh.name === 'shoe-sole').length).toBe(2);
  });

  it('keeps the trousers down to the hem in the sneakers everyone starts with', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, NO_ITEM));
      expect(meshes(root, 'shoe-shaft').length).toBe(0);
      expect(meshes(root, 'shoe-sole').length).toBe(2);
      // Nothing tucks in: without a collar a leg is its own width all the way
      [0, 0.3, 1, legLength(figure)].forEach(s => expect(legRadius(figure, s, 0)).toBe(legRadiusAlong(figure, s)));
      // Full at the knee and flaring a touch at the hem, as they always were
      const [, rKnee, rHem] = figure.legRadii;
      expect(lowerLegRadii(figure)).toEqual([rKnee * 1.02, rKnee, rHem, rHem * 1.05]);
      expect(legRadiusAlong(figure, 0)).toBeCloseTo(lowerLegRadii(figure)[3], 9);
      expect(legRadiusAlong(figure, legLength(figure))).toBeCloseTo(lowerLegRadii(figure)[0], 9);
    });
  });

  it('builds each pair in its own colour, the light-up soles unlit so they read as light', () => {
    ITEMS.forEach(item => {
      const root = build(dress('girl', item.id));
      const coloured = item.id === 'light-up' ? SHOE_GLOW : 'shoe-upper';
      meshes(root, coloured).forEach(mesh => expect((mesh.material as THREE.MeshBasicMaterial).color.getHexString()).toBe(item.colour.slice(1).toLowerCase()));
      expect(meshes(root, coloured).length).toBe(2);
      expect(meshes(root, SHOE_GLOW).every(mesh => (mesh.material as THREE.Material).type === 'MeshBasicMaterial')).toBeTrue();
    });
    expect(collarShare('light-up')).toBe(0);
    WITH_COLLAR.forEach(id => expect(collarShare(id)).toBeGreaterThan(0));
    // Boots come further up the leg than high-tops
    expect(collarShare('boots')).toBeGreaterThan(collarShare('high-tops'));
  });

  it('makes every pair chunky, as the bear\u2019s boots and the robot\u2019s feet are: bigger round than the foot', () => {
    BODY_TYPES.forEach(bodyType => [NO_ITEM, ...SHOE_IDS].forEach(id => {
      const figure = figureFor(bodyType);
      const [footLength, footWidth] = figure.foot;
      const root = build(dress(bodyType, id));
      root.getObjectByName('body')!.children.filter(c => c.name === 'shoe').forEach(shoe => {
        const size = new THREE.Box3().setFromObject(meshes(shoe, id === 'light-up' ? SHOE_GLOW : 'shoe-sole')[0]).getSize(new THREE.Vector3());
        expect(size.x).withContext(`${bodyType} ${id} width`).toBeGreaterThan(footWidth * 1.1);
        expect(size.z).withContext(`${bodyType} ${id} length`).toBeGreaterThan(footLength * 1.1);
        // On a thick sole: a third of the shoe's height, or more
        const foot = new THREE.Box3().setFromObject(shoe.getObjectByName('shoe-foot')!);
        expect(size.y / (foot.max.y - foot.min.y)).withContext(`${bodyType} ${id} sole`).toBeGreaterThan(1 / 3);
      });
    }));
  });

  it('starts everyone in bright sneakers, and every pair stands out from the trousers', () => {
    // Bright, as the robot's feet and the bear's boots are: not the dark slate they were
    const sneaker = new THREE.Color(SNEAKER).getHSL({ h: 0, s: 0, l: 0 });
    expect(sneaker.l).toBeGreaterThan(0.5);
    expect(sneaker.s).toBeGreaterThan(0.5);
    BODY_TYPES.forEach(bodyType => [NO_ITEM, ...SHOE_IDS].forEach(id => {
      const root = build(dress(bodyType, id));
      const trousers = (meshes(root, 'leg')[0].material as THREE.MeshToonMaterial).color;
      const upper = (meshes(root, 'shoe-upper')[0].material as THREE.MeshToonMaterial).color;
      const apart = Math.hypot(upper.r - trousers.r, upper.g - trousers.g, upper.b - trousers.b);
      expect(apart).withContext(`${bodyType} ${id}`).toBeGreaterThan(0.25);
    }));
  });

  it('shows the laces: lying on the toe box, in front of the trouser hem', () => {
    BODY_TYPES.forEach(bodyType => [NO_ITEM, 'high-tops'].forEach(id => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, id));
      const hemFront = legRadiusAlong(figure, 0);
      root.getObjectByName('body')!.children.filter(c => c.name === 'shoe').forEach(shoe => {
        const upper = meshes(shoe, 'shoe-upper')[0];
        const laces = meshes(shoe, 'shoe-lace').filter(lace => lace.parent!.name === 'shoe-foot');
        expect(laces.length).withContext(`${bodyType} ${id}`).toBe(3);
        laces.forEach(lace => {
          const at = lace.getWorldPosition(new THREE.Vector3());
          // In front of the trousers, where they are seen
          expect(at.z).withContext(`${bodyType} ${id}`).toBeGreaterThan(hemFront + 0.05);
          // On the toe box: the toe box right under it, not floating above it or sunk in it
          const hit = new THREE.Raycaster(at.clone().setY(at.y + 2), new THREE.Vector3(0, -1, 0)).intersectObject(upper)[0];
          expect(hit).withContext(`${bodyType} ${id}`).toBeDefined();
          expect(Math.abs(at.y - hit.point.y)).withContext(`${bodyType} ${id}`).toBeLessThan(0.05);
        });
        // The toe cap reaching past the toe box, so the two never lie on each other
        const toe = new THREE.Box3().setFromObject(meshes(shoe, 'shoe-toe')[0]);
        expect(toe.max.z).withContext(`${bodyType} ${id}`).toBeGreaterThan(new THREE.Box3().setFromObject(upper).max.z + 0.05);
      });
    }));
  });

  it('stands every pair flat on the stand, on both figures', () => {
    BODY_TYPES.forEach(bodyType => [NO_ITEM, ...SHOE_IDS].forEach(id => {
      const root = build(dress(bodyType, id));
      const standRadius = ((root.getObjectByName('pedestal')!.getObjectByName('pedestal-top') as THREE.Mesh).geometry as THREE.CylinderGeometry).parameters.radiusTop;
      const points = vertices(root.children.find(c => c.name === 'body')!.children
        .filter(c => c.name === 'shoe').reduce((all, shoe) => all.concat(meshes(shoe)), [] as THREE.Mesh[]));
      expect(Math.min(...points.map(p => p.y))).withContext(`${bodyType} ${id}`).toBeCloseTo(0, 6);
      expect(Math.max(...points.map(p => Math.hypot(p.x, p.z)))).withContext(`${bodyType} ${id}`).toBeLessThan(standRadius);
    }));
  });

  it('keeps the two shoes of a pair apart, by room for both outlines', () => {
    BODY_TYPES.forEach(bodyType => [NO_ITEM, ...SHOE_IDS].forEach(id => {
      const root = build(dress(bodyType, id));
      const [left, right] = root.getObjectByName('body')!.children.filter(c => c.name === 'shoe')
        .map(shoe => new THREE.Box3().setFromObject(shoe)).sort((a, b) => a.min.x - b.min.x);
      expect(right.min.x - left.max.x).withContext(`${bodyType} ${id}`).toBeGreaterThan(0.05);
    }));
  });

  it('stands a collar on its own shoe: down to the top of the sole, and no wider than it', () => {
    BODY_TYPES.forEach(bodyType => WITH_COLLAR.forEach(id => {
      const root = build(dress(bodyType, id));
      root.getObjectByName('body')!.children.filter(c => c.name === 'shoe').forEach(shoe => {
        const sole = meshes(shoe, 'shoe-sole')[0];
        const top = new THREE.Box3().setFromObject(sole).max.y;
        const shaft = vertices(meshes(shoe, 'shoe-shaft'));
        const bottom = Math.min(...shaft.map(p => p.y));
        expect(bottom).withContext(`${bodyType} ${id}`).toBeGreaterThan(top);
        expect(bottom).withContext(`${bodyType} ${id}`).toBeLessThan(top + 0.1);
        // Its bottom ring inside the sole's own width, so it does not hang over the edge
        const centre = sole.getWorldPosition(new THREE.Vector3()).x;
        shaft.filter(p => p.y < bottom + 0.01).forEach(p =>
          expect(Math.abs(p.x - centre)).withContext(`${bodyType} ${id}`).toBeLessThan(sole.scale.x / 2));
      });
    }));
  });

  it('tucks the trousers into a collar, narrowing just above it and no more', () => {
    BODY_TYPES.forEach(bodyType => WITH_COLLAR.forEach(id => {
      const figure = figureFor(bodyType);
      const share = collarShare(id);
      const top = legLength(figure) * share;
      const tucked = figure.legRadii[2] * TUCKED;
      expect(legRadius(figure, 0, share)).toBeCloseTo(tucked, 9);
      expect(legRadius(figure, top, share)).toBeCloseTo(tucked, 9);
      // Widening back to its own width over the taper, and its own above that
      expect(legRadius(figure, top + TAPER / 2, share)).toBeGreaterThan(tucked);
      expect(legRadius(figure, top + TAPER / 2, share)).toBeLessThan(legRadiusAlong(figure, top + TAPER / 2));
      expect(legRadius(figure, top + TAPER, share)).toBeCloseTo(legRadiusAlong(figure, top + TAPER), 9);
      expect(legRadius(figure, legLength(figure), share)).toBeCloseTo(legRadiusAlong(figure, legLength(figure)), 9);
      // Narrower than the hem, which is what lets two collars stand side by side
      expect(tucked).toBeLessThan(lowerLegRadii(figure)[3] * 0.85);
    }));
  });

  it('keeps every collar and rim clear of the trouser leg inside it, at every height, on both figures', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => WITH_COLLAR.forEach(id => {
      const root = build(dress(bodyType, id));
      const body = root.getObjectByName('body')!;
      [-1, 1].forEach(side => {
        const onThisSide = (list: THREE.Mesh[]) => vertices(list).filter(p => Math.sign(p.x) === side).map(p => onLeg(bodyType, side, p));
        // The leg's outline up its length: the widest point of each ring
        const rings = new Map<string, { s: number; r: number }>();
        onThisSide(meshes(body, 'leg')).filter(p => p.r > 0.01).forEach(p => {
          const key = p.s.toFixed(3);
          rings.set(key, { s: p.s, r: Math.max(rings.get(key)?.r ?? 0, p.r) });
        });
        const outline = Array.from(rings.values()).sort((a, b) => a.s - b.s);
        const legAt = (s: number) => {
          const i = outline.findIndex(p => p.s >= s);
          if (i <= 0) {
            return (i === 0 ? outline[0] : outline[outline.length - 1]).r;
          }
          const [a, b] = [outline[i - 1], outline[i]];
          return a.r + (b.r - a.r) * (s - a.s) / (b.s - a.s);
        };
        ['shoe-shaft', 'shoe-rim'].forEach(name => onThisSide(meshes(body, name)).forEach(q => {
          if (q.s < outline[0].s) {
            return;
          }
          // Outside the leg, and as far from it as room for both outlines, however it slopes
          let nearest = Infinity;
          for (let i = 1; i < outline.length; i++) {
            const [a, b] = [outline[i - 1], outline[i]];
            const along = Math.max(0, Math.min(1, ((q.s - a.s) * (b.s - a.s) + (q.r - a.r) * (b.r - a.r)) / ((b.s - a.s) ** 2 + (b.r - a.r) ** 2)));
            nearest = Math.min(nearest, Math.hypot(q.s - a.s - along * (b.s - a.s), q.r - a.r - along * (b.r - a.r)));
          }
          if (q.r < legAt(q.s) || nearest < ROOM) {
            misses.push(`${bodyType} ${id} ${name}: ${nearest.toFixed(3)} from the leg at ${q.s.toFixed(2)} up`);
          }
        }));
      });
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('is not in the pictures of the character on other screens, which stop at the hips', () => {
    BODY_TYPES.forEach(bodyType => (['portrait', 'full'] as const).forEach(framing => {
      const figure = figureFor(bodyType);
      const without = framedBox(build(dress(bodyType, NO_ITEM)), framing, figure);
      SHOE_IDS.forEach(id => expect(framedBox(build(dress(bodyType, id)), framing, figure).equals(without)).withContext(`${bodyType} ${id} ${framing}`).toBeTrue());
    }));
  });

  describe('light-up soles', () => {
    it('glow up and down: full at first, dimmest halfway, and round again', () => {
      expect(glow(0)).toBe(1);
      expect(glow(GLOW_SECONDS / 2)).toBeCloseTo(GLOW_LOW, 9);
      expect(glow(GLOW_SECONDS)).toBeCloseTo(1, 9);
      for (let t = 0; t < GLOW_SECONDS * 2; t += 0.05) {
        expect(glow(t)).toBeGreaterThanOrEqual(GLOW_LOW - 1e-9);
        expect(glow(t)).toBeLessThanOrEqual(1);
      }
      // Never so dim they stop reading as lit
      expect(GLOW_LOW).toBeGreaterThan(0.4);
    });

    it('glow on the character, and are back exactly as built at rest', () => {
      const root = build(dress('boy', 'light-up'));
      const soles = meshes(root, SHOE_GLOW).map(mesh => (mesh.material as THREE.MeshBasicMaterial).color);
      const built = soles.map(colour => colour.clone());
      const rig = new Rig(root);
      rig.pose(0, null);
      soles.forEach((colour, i) => expect(colour.equals(built[i])).toBeTrue());
      rig.pose(GLOW_SECONDS / 2, null);
      soles.forEach((colour, i) => expect(colour.r).toBeCloseTo(built[i].r * GLOW_LOW, 6));
      rig.rest();
      soles.forEach((colour, i) => expect(colour.equals(built[i])).toBeTrue());
    });
  });
});
