import * as THREE from 'three';
import { Avatar, BACK_ITEMS, BODY_TYPES, BodyType, HAIR_STYLES, HairStyle, NO_ITEM, defaultAvatar } from '../avatar/avatar-model';
import { BACK, BACK_IDS, BackMap, buildBackItem, eachSurfacePoint, roundedBox, taut } from './back-items';
import { ARM_RIG, aroundCharacter, buildAvatar, disposeAvatar } from './build-avatar';
import { figureFor, torsoRadius } from './figure';
import { BREATH_SECONDS, WAVE_SECONDS } from './motion';
import { Rig } from './rig';
import { framedBox } from './still-renderer';

const ITEMS = BACK_ITEMS.filter(item => item.id !== NO_ITEM).map(item => item.id);
/**
 * The least room between a back item and what it is clear of: enough for
 * both outlines, the top's (0.05) and the item's (up to 0.04), not to meet.
 */
const ROOM = 0.09;
/** What goes over the shoulders and down the front, rather than on the back. */
const OVER_SHOULDER = ['backpack-strap', 'backpack-buckle'];

function dress(bodyType: BodyType, back: string, extra: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), bodyType, hat: 'cap', top: 'hoodie', back, ...extra };
}

/** The meshes of a built character, sorted: the back item, the arms, and everything else on the stand. */
function sort(root: THREE.Object3D): { item: THREE.Mesh[]; arms: THREE.Mesh[]; rest: THREE.Mesh[] } {
  root.updateMatrixWorld(true);
  const sorted = { item: [] as THREE.Mesh[], arms: [] as THREE.Mesh[], rest: [] as THREE.Mesh[] };
  const visit = (node: THREE.Object3D, into: THREE.Mesh[] | null) => {
    if (node.name === 'pedestal' || node.name === 'pet') {
      return;
    }
    const list = node.name === BACK ? sorted.item : node.name === ARM_RIG ? sorted.arms : into;
    if ((node as THREE.Mesh).isMesh && !node.name.endsWith(':outline')) {
      (list || sorted.rest).push(node as THREE.Mesh);
    }
    node.children.forEach(child => visit(child, list));
  };
  visit(root, null);
  return sorted;
}

/** Whether a mesh is on the head: the head, hair, a hat or glasses. */
function onHead(mesh: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (['head-group', 'hair', 'hat', 'glasses'].indexOf(node.name) >= 0) {
      return true;
    }
  }
  return false;
}

function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse(node => (node as THREE.Mesh).isMesh && !node.name.endsWith(':outline') && out.push(node as THREE.Mesh));
  return out;
}

function vertices(meshes: THREE.Mesh[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  meshes.forEach(mesh => {
    const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
  });
  return out;
}

/**
 * How far back the rest of the character reaches, cell by cell across and
 * down: a plainer map than the one the items are built with (its own cells,
 * no running maximum down the back), so it checks them rather than repeats
 * them.
 */
function backmost(meshes: THREE.Mesh[], cell = 0.1): (x: number, y: number) => number {
  const cells = new Map<string, number>();
  meshes.forEach(mesh => eachSurfacePoint(mesh, cell / 2, (x, y, z) => {
    const key = `${Math.round(x / cell)},${Math.round(y / cell)}`;
    cells.set(key, Math.min(cells.get(key) ?? Infinity, z));
  }));
  return (x, y) => {
    let most = Infinity;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        most = Math.min(most, cells.get(`${Math.round(x / cell) + i},${Math.round(y / cell) + j}`) ?? Infinity);
      }
    }
    return most;
  };
}

describe('back items', () => {
  const built: THREE.Object3D[] = [];
  const build = (avatar: Avatar) => {
    const root = buildAvatar(avatar);
    built.push(root);
    return root;
  };
  afterEach(() => built.splice(0).forEach(root => disposeAvatar(root)));

  it('has a 3D item for everything that goes on the back, and none that cannot be won', () => {
    expect(BACK_IDS.slice().sort()).toEqual(ITEMS.slice().sort());
  });

  it('builds nothing for nothing on the back, or for something that does not exist', () => {
    expect(build(dress('boy', NO_ITEM)).getObjectByName(BACK)).toBeUndefined();
    expect(build(dress('boy', 'jetpack')).getObjectByName(BACK)).toBeUndefined();
    const figure = figureFor('boy');
    const map = new BackMap([], -1, 1, 0, 1);
    expect(buildBackItem('jetpack', '#ffffff', figure, { map, armBack: 0, meshes: [] })).toBeNull();
    ITEMS.forEach(id => expect(build(dress('girl', id)).getObjectByName(BACK)!.userData.item).toBe(id));
  });

  it('builds each in its own colour', () => {
    BACK_ITEMS.filter(item => item.id !== NO_ITEM).forEach(item => {
      const main = build(dress('boy', item.id)).getObjectByName(item.id === 'cape' ? 'cape' : 'backpack-bag') as THREE.Mesh;
      expect((main.material as THREE.MeshToonMaterial).color.getHexString()).toBe(item.colour.slice(1).toLowerCase());
    });
  });

  it('carries the backpack on the back, between the belt and the collar', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, 'backpack'));
      root.updateMatrixWorld(true);
      const bag = new THREE.Box3().setFromObject(root.getObjectByName('backpack-bag')!);
      const collar = figure.torso[figure.torso.length - 1][1];
      expect(bag.min.y).toBeGreaterThan(figure.belt);
      expect(bag.max.y).toBeLessThan(collar);
      expect(bag.max.z).toBeLessThan(0);
      expect(bag.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 6);
      // A backpack a child would carry: most of the width of the back
      expect(bag.max.x - bag.min.x).toBeGreaterThan(torsoRadius(figure, figure.belt));
    });
  });

  it('hangs the cape from the collar to below the knee, wider at the hem, all of it behind', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, 'cape'));
      root.updateMatrixWorld(true);
      const points = vertices([root.getObjectByName('cape') as THREE.Mesh]);
      const box = new THREE.Box3().setFromPoints(points);
      const collar = figure.torso[figure.torso.length - 1][1];
      expect(box.max.y).toBeLessThan(collar);
      expect(box.max.y).toBeGreaterThan(collar - 0.3);
      expect(box.min.y).toBeLessThan(figure.knee[1]);
      expect(box.min.y).toBeGreaterThan(figure.ankle[1]);
      expect(box.max.z).toBeLessThan(0);
      const across = (y: number) => {
        const row = points.filter(p => Math.abs(p.y - y) < 1e-6);
        return Math.max(...row.map(p => p.x)) - Math.min(...row.map(p => p.x));
      };
      expect(across(box.min.y)).toBeGreaterThan(across(box.max.y) * 2);
      // As wide as the shoulders at the hem, so it shows either side from the front
      expect(across(box.min.y) / 2).toBeGreaterThan(figure.shoulder[0]);
    });
  });

  // One per figure and item: each builds eighteen characters
  BODY_TYPES.forEach(bodyType => ITEMS.forEach(id => it(`stays clear of everything on the back, as a ${bodyType}’s ${id} — hair, braids, a hood, a hat — with every hair style and top`, () => {
    const misses: string[] = [];
    HAIR_STYLES.forEach((hairStyle: HairStyle) => ['striped', 'hoodie'].forEach(top => {
      const root = build(dress(bodyType, id, { hairStyle, top, hat: hairStyle === 'afro' ? 'wizard' : 'cap' }));
      const { item, rest } = sort(root);
      const behind = backmost(rest);
      item.filter(mesh => OVER_SHOULDER.indexOf(mesh.name) < 0).forEach(mesh => vertices([mesh]).forEach(p => {
        if (p.z > behind(p.x, p.y) - ROOM) {
          misses.push(`${bodyType} ${hairStyle} ${top} ${id}: ${mesh.name} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
        }
      }));
      disposeAvatar(built.pop()!);
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  })));

  BODY_TYPES.forEach(bodyType => it(`lies a ${bodyType}’s straps on the top, over the shoulder and down the front, and under the chin`, () => {
    const misses: string[] = [];
    HAIR_STYLES.forEach((hairStyle: HairStyle) => ['striped', 'hoodie'].forEach(top => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, 'backpack', { hairStyle, top }));
      const { item, rest } = sort(root);
      const straps = vertices(item.filter(mesh => mesh.name === 'backpack-strap'));
      straps.forEach(p => {
        // Outside the torso, which is round across and figure.torsoDepth as deep
        const r = torsoRadius(figure, p.y);
        if (r > 0 && Math.hypot(p.x, p.z / figure.torsoDepth) < r) {
          misses.push(`${bodyType} ${hairStyle} ${top}: strap in the torso at y ${p.y.toFixed(2)}`);
        }
      });
      // Below the head, wherever it is over the shoulder
      const head = vertices(rest.filter(mesh => mesh.name === 'head'));
      straps.forEach(p => {
        const above = head.filter(h => Math.abs(h.x - p.x) < 0.15 && Math.abs(h.z - p.z) < 0.15);
        if (above.some(h => h.y < p.y + 0.02)) {
          misses.push(`${bodyType} ${hairStyle} ${top}: strap in the head at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
        }
      });
      // Clear of what they go over — the top, a hood — by room for both
      // outlines, from where they leave the bag. Hair falls over them.
      const near = new THREE.Box3().setFromPoints(straps).expandByScalar(0.3);
      const over: THREE.Vector3[] = [];
      rest.filter(mesh => !onHead(mesh)).forEach(mesh => eachSurfacePoint(mesh, 0.05, (x, y, z) => over.push(new THREE.Vector3(x, y, z)), near));
      item.filter(mesh => mesh.name === 'backpack-strap').forEach(strap => {
        const rings = vertices([strap]);
        for (let k = 4; k < rings.length; k++) {
          const p = rings[k];
          const nearest = Math.min(...over.filter(q => Math.abs(q.x - p.x) < 0.3).map(q => q.distanceTo(p)));
          if (nearest < 0.06) {
            misses.push(`${bodyType} ${hairStyle} ${top}: strap ${nearest.toFixed(3)} from what it goes over at y ${p.y.toFixed(2)}`);
          }
        }
        // Pulled taut: seen from the side, it only ever turns one way over the top
        const path = rings.filter((_, k) => k % 4 === 0).slice(1);
        for (let k = 0; k + 2 < path.length; k++) {
          const [a, b, c] = [path[k], path[k + 1], path[k + 2]];
          if ((b.z - a.z) * (c.y - b.y) - (b.y - a.y) * (c.z - b.z) > 1e-9) {
            misses.push(`${bodyType} ${hairStyle} ${top}: strap slack at y ${b.y.toFixed(2)}`);
          }
        }
      });
      // Seen from the front and from behind, coming over the shoulder
      const zs = straps.map(p => p.z);
      if (!(Math.max(...zs) > torsoRadius(figure, figure.belt) * figure.torsoDepth && Math.min(...zs) < -torsoRadius(figure, figure.belt) * figure.torsoDepth)) {
        misses.push(`${bodyType} ${hairStyle} ${top}: straps not over the shoulder`);
      }
      disposeAvatar(built.pop()!);
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  }));

  it('lets hair fall over the straps: the straps go the same way whatever the hair', () => {
    BODY_TYPES.forEach(bodyType => {
      // From where they leave the bag, which sits on long hair: past the first two rings
      const straps = (hairStyle: HairStyle) => meshesOf(build(dress(bodyType, 'backpack', { hairStyle, hat: NO_ITEM })))
        .filter(mesh => mesh.name === 'backpack-strap')
        .map(strap => vertices([strap]).slice(8).map(p => p.toArray().map(v => v.toFixed(6)).join()));
      const short = straps('short');
      (['long', 'braids', 'locs', 'afro'] as HairStyle[]).forEach(hairStyle => expect(straps(hairStyle)).withContext(hairStyle).toEqual(short));
    });
  });

  it('never meets an arm, standing, breathing or waving: the bag and cape are behind them, the straps inside them', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => ITEMS.forEach(id => (['long', 'braids'] as HairStyle[]).forEach(hairStyle => {
      const root = build(dress(bodyType, id, { hairStyle }));
      const rig = new Rig(root);
      const { item } = sort(root);
      const onBack = vertices(item.filter(mesh => OVER_SHOULDER.indexOf(mesh.name) < 0));
      const overShoulder = vertices(item.filter(mesh => OVER_SHOULDER.indexOf(mesh.name) >= 0));
      const front = Math.max(...onBack.map(p => p.z));
      const inside = overShoulder.length ? Math.max(...overShoulder.map(p => Math.abs(p.x))) : 0;
      for (let t = 0; t <= WAVE_SECONDS; t += 0.05) {
        rig.pose(BREATH_SECONDS / 2 + t, t);
        const arms = vertices(sort(root).arms);
        const back = Math.min(...arms.map(p => p.z));
        if (back < front + ROOM) {
          misses.push(`${bodyType} ${hairStyle} ${id}: an arm ${(front - back).toFixed(2)} into the ${id} at ${t.toFixed(2)}s`);
        }
        const nearest = Math.min(...arms.map(p => Math.abs(p.x)));
        if (overShoulder.length && nearest < inside + ROOM) {
          misses.push(`${bodyType} ${hairStyle}: an arm over a strap at ${t.toFixed(2)}s`);
        }
      }
      disposeAvatar(built.pop()!);
    })));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  it('lets the cape fall, never tuck back in at the waist: down the middle, it only ever hangs further back', () => {
    BODY_TYPES.forEach(bodyType => ['long', 'short'].forEach(hairStyle => {
      const root = build(dress(bodyType, 'cape', { hairStyle: hairStyle as HairStyle, top: 'striped' }));
      const points = vertices([root.getObjectByName('cape') as THREE.Mesh]);
      const across = points.filter(p => p.y === points[0].y).length;
      const middle = points.filter((_, i) => i % across === (across - 1) / 2);
      middle.forEach(p => expect(p.x).toBeCloseTo(0, 9));
      for (let i = 1; i < middle.length; i++) {
        expect(middle[i].z).withContext(`${bodyType} ${hairStyle} at y ${middle[i].y.toFixed(2)}`).toBeLessThanOrEqual(middle[i - 1].z + 1e-9);
      }
    }));
  });

  it('keeps the cape further back than an arm reaches, even where there is nothing else to clear', () => {
    const figure = figureFor('boy');
    const cape = buildBackItem('cape', '#c8324a', figure, { map: new BackMap([], -5, 5, -1, 20), armBack: 2, meshes: [] })!;
    cape.updateMatrixWorld(true);
    expect(Math.max(...vertices(meshesOf(cape)).map(p => p.z))).toBeLessThan(-2 - ROOM);
  });

  it('measures how far back the arms reach, waving too, and leaves them out of what the items clear', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = build(dress(bodyType, NO_ITEM, { hairStyle: 'long' }));
      const arms = sort(root).arms;
      const atRest = Math.max(...vertices(arms).map(p => -p.z));
      const around = aroundCharacter(root, figure);
      expect(around.armBack).toBeCloseTo(atRest, 9);
      arms.forEach(mesh => expect(around.meshes.indexOf(mesh)).toBe(-1));
      // Where a hand hangs, beside the legs, there is nothing to clear
      const hand = new THREE.Box3().setFromObject(root.getObjectByName('hand')!).getCenter(new THREE.Vector3());
      expect(around.map.furthest(hand.x, 0.05, hand.y, hand.y)).toBe(-Infinity);
      // However an arm moves, it is never further back than that
      const rig = new Rig(root);
      let reach = 0;
      for (let t = 0; t <= WAVE_SECONDS; t += 0.05) {
        rig.pose(BREATH_SECONDS / 2 + t, t);
        reach = Math.max(reach, ...vertices(sort(root).arms).map(p => -p.z));
      }
      expect(reach).toBeLessThanOrEqual(around.armBack);
    });
  });

  it('is not in the pictures of the character on other screens, which are taken from the front', () => {
    BODY_TYPES.forEach(bodyType => (['portrait', 'full'] as const).forEach(framing => {
      const figure = figureFor(bodyType);
      const without = framedBox(build(dress(bodyType, NO_ITEM)), framing, figure);
      ITEMS.forEach(id => expect(framedBox(build(dress(bodyType, id)), framing, figure).equals(without)).toBeTrue());
    }));
  });

  describe('the pieces they are made of', () => {
    it('maps how far back each part reaches, and nothing where there is nothing', () => {
      // A flat square facing forward, 1 back, from x -1 to 1 and y 0 to 2
      const square = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      square.position.set(0, 1, -1);
      square.updateMatrixWorld(true);
      const map = new BackMap([square], -3, 3, -1, 4);
      expect(map.furthest(0, 0.1, 0.9, 1.1)).toBeCloseTo(1, 9);
      // In the middle of the one big triangle too, not only at its corners
      expect(map.furthest(0.5, 0.05, 0.5, 0.5)).toBeCloseTo(1, 9);
      expect(map.furthest(2.8, 0.05, 1, 1)).toBe(-Infinity);
      expect(map.furthest(0, 0.1, 3.5, 3.8)).toBe(-Infinity);
    });

    it('covers a triangle in points no further apart than asked, and skips one outside a box', () => {
      const triangle = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0), new THREE.Vector3(0, 2, 0)]));
      triangle.updateMatrixWorld(true);
      const points: THREE.Vector3[] = [];
      eachSurfacePoint(triangle, 0.1, (x, y, z) => points.push(new THREE.Vector3(x, y, z)));
      // Every point of the triangle has one of them near
      [[0.5, 0.5], [1.4, 0.3], [0.05, 1.9], [0.66, 0.66]].forEach(([x, y]) =>
        expect(Math.min(...points.map(p => Math.hypot(p.x - x, p.y - y)))).toBeLessThan(0.1));
      expect(points.every(p => p.x >= -1e-9 && p.y >= -1e-9 && p.x + p.y <= 2 + 1e-9)).toBeTrue();
      let counted = 0;
      eachSurfacePoint(triangle, 0.1, () => counted++, new THREE.Box3(new THREE.Vector3(5, 5, -1), new THREE.Vector3(6, 6, 1)));
      expect(counted).toBe(0);
    });

    it('pulls a strap straight across a dip, and keeps it on a round shoulder', () => {
      const over = [[0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1]].map(([y, z]) => new THREE.Vector2(y, z));
      expect(taut(over)).toEqual(over);
      const dipped = [...over.slice(0, 3), new THREE.Vector2(0.3, 0.5), ...over.slice(3)];
      expect(taut(dipped)).toEqual(over);
    });

    it('makes a rounded box as big as asked, with no seam in its outline', () => {
      const geometry = roundedBox([1, 2, 0.5]);
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      expect(size.x).toBeCloseTo(2, 6);
      expect(size.y).toBeCloseTo(4, 6);
      expect(size.z).toBeCloseTo(1, 6);
      // Squarer than a sphere: a corner direction reaches most of the way out
      const position = geometry.attributes.position as THREE.BufferAttribute;
      let corner = 0;
      for (let i = 0; i < position.count; i++) {
        corner = Math.max(corner, Math.min(Math.abs(position.getX(i)) / 1, Math.abs(position.getY(i)) / 2, Math.abs(position.getZ(i)) / 0.5));
      }
      expect(corner).toBeGreaterThan(0.75);
      // Every copy of a point on the seam has the same normal, or the outline splits there
      const normal = geometry.attributes.normal as THREE.BufferAttribute;
      const byPoint = new Map<string, string>();
      for (let i = 0; i < position.count; i++) {
        const key = [position.getX(i), position.getY(i), position.getZ(i)].map(v => v.toFixed(5)).join();
        const n = [normal.getX(i), normal.getY(i), normal.getZ(i)].map(v => v.toFixed(4)).join();
        expect(byPoint.get(key) ?? n).toBe(n);
        byPoint.set(key, n);
      }
      geometry.dispose();
    });
  });
});
