import * as THREE from 'three';
import { lighten } from '../avatar/avatar-model';
import { shade } from '../avatar/avatar-parts';
import { Figure, chinY } from './figure';
import { part, toon, weldNormals } from './toon';

/**
 * What a character can wear on its back: a backpack and a cape.
 *
 * Neither is fitted by hand to each hair style, top and figure. Both are
 * built round what is already there: everything on the character but its
 * arms is sampled into a map of how far back it reaches at each height and
 * across (`BackMap`), and the backpack sits against the furthest point of
 * its own footprint, the cape hangs clear of the furthest point above each of
 * its rows, and the straps follow the shoulder's own outline. So long hair
 * lies under a backpack or a cape, a hood is covered, braids are cleared, and
 * whatever is added to the character later is cleared too, without a change
 * here.
 *
 * The arms are left out of the map and cleared another way: an arm turns at
 * the shoulder about the z axis (out to the side, and up for a wave), which
 * never takes it further back than it hangs. The cape stays behind that,
 * `armBack`; the straps stay inside the shoulder, where no arm goes.
 */

export const BACK = 'back';
/** Room between a back item and whatever it is clear of, in units (a head height is 2). Outlines included. */
export const BACK_GAP = 0.12;
/** The size of a cell in the map, in units. */
const CELL = 0.15;

/**
 * How far back (−z) the character reaches, in cells across (x) and down (y).
 * Filled from the triangles of every mesh, not just their corners: a big
 * flat triangle on a torso reaches back as far in its middle as at its edges.
 */
export class BackMap {
  private readonly cols: number;
  private readonly rows: number;
  private readonly depth: Float64Array;

  constructor(meshes: THREE.Mesh[], private readonly x0: number, x1: number, private readonly y0: number, y1: number) {
    this.cols = Math.ceil((x1 - x0) / CELL) + 1;
    this.rows = Math.ceil((y1 - y0) / CELL) + 1;
    this.depth = new Float64Array(this.cols * this.rows).fill(-Infinity);
    const bounds = new THREE.Box3(new THREE.Vector3(x0, y0, -Infinity), new THREE.Vector3(x1, y1, Infinity));
    meshes.filter(mesh => worldBox(mesh).intersectsBox(bounds)).forEach(mesh => eachSurfacePoint(mesh, CELL / 2, (x, y, z) => {
      const c = Math.round((x - this.x0) / CELL);
      const r = Math.round((y - this.y0) / CELL);
      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
        const i = r * this.cols + c;
        this.depth[i] = Math.max(this.depth[i], -z);
      }
    }, bounds));
  }

  /**
   * The furthest back anything reaches within `halfWidth` either side of `x`
   * and between heights `low` and `high`, or −Infinity where there is
   * nothing. One cell either way more, for what falls between cells.
   */
  furthest(x: number, halfWidth: number, low: number, high: number): number {
    const c0 = Math.max(0, Math.floor((x - halfWidth - this.x0) / CELL) - 1);
    const c1 = Math.min(this.cols - 1, Math.ceil((x + halfWidth - this.x0) / CELL) + 1);
    const r0 = Math.max(0, Math.floor((low - this.y0) / CELL) - 1);
    const r1 = Math.min(this.rows - 1, Math.ceil((high - this.y0) / CELL) + 1);
    let most = -Infinity;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        most = Math.max(most, this.depth[r * this.cols + c]);
      }
    }
    return most;
  }
}

/** A mesh's bounds, in world space. */
function worldBox(mesh: THREE.Mesh): THREE.Box3 {
  if (!mesh.geometry.boundingBox) {
    mesh.geometry.computeBoundingBox();
  }
  return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
}

/**
 * Every point of a mesh's surface, in world space, no further apart than
 * `step`; only of the triangles that reach into `within`, if given.
 */
export function eachSurfacePoint(mesh: THREE.Mesh, step: number, visit: (x: number, y: number, z: number) => void, within?: THREE.Box3) {
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const index = mesh.geometry.index;
  const count = index ? index.count : position.count;
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const [ab, ac, p] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let t = 0; t + 2 < count; t += 3) {
    [a, b, c].forEach((v, k) => v.fromBufferAttribute(position, index ? index.getX(t + k) : t + k).applyMatrix4(mesh.matrixWorld));
    if (within && (Math.max(a.x, b.x, c.x) < within.min.x || Math.min(a.x, b.x, c.x) > within.max.x ||
      Math.max(a.y, b.y, c.y) < within.min.y || Math.min(a.y, b.y, c.y) > within.max.y)) {
      continue;
    }
    const n = Math.max(1, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / step));
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    for (let i = 0; i <= n; i++) {
      for (let j = 0; i + j <= n; j++) {
        p.copy(a).addScaledVector(ab, i / n).addScaledVector(ac, j / n);
        visit(p.x, p.y, p.z);
      }
    }
  }
}

/**
 * A rounded box: a sphere pushed out towards its corners (a superellipsoid),
 * `half` its half-sizes. `round` is 1 for a sphere and nearer 0 for a box.
 */
export function roundedBox(half: [number, number, number], round = 0.35): THREE.BufferGeometry {
  const [columns, rows] = [32, 24];
  const geometry = new THREE.SphereGeometry(1, columns, rows);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const push = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), round);
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(i, push(position.getX(i)) * half[0], push(position.getY(i)) * half[1], push(position.getZ(i)) * half[2]);
  }
  geometry.computeVertexNormals();
  weldNormals(geometry, columns, rows + 1, true);
  return geometry;
}

/** What a back item is built round: the rest of the character, and how far back an arm can reach. */
export interface Around {
  map: BackMap;
  /** How far back (−z) any part of either arm reaches, at rest or waving. */
  armBack: number;
  /** Everything but the arms, for the straps to follow over the shoulder. */
  meshes: THREE.Mesh[];
}

/**
 * The backpack: a rounded bag on the back with a pocket and a handle, and
 * two straps over the shoulders. The bag sits against the furthest point of
 * the back behind it — the shoulder blades, a hood, or long hair lying
 * under it.
 */
function backpack(colour: string, figure: Figure, around: Around): THREE.Group {
  const group = new THREE.Group();
  const cloth = toon(colour);
  const dark = toon(shade(colour, 0.22));
  const collar = figure.torso[figure.torso.length - 1][1];
  const chest = Math.max(...figure.torso.map(([r]) => r));
  const half: [number, number, number] = [chest * 0.64, (collar - figure.belt) * 0.42, chest * 0.3];
  const centreY = figure.belt + (collar - figure.belt) * 0.48;
  // Clear of everything behind it, up to the top of its handle
  const front = around.map.furthest(0, half[0], centreY - half[1], centreY + half[1] + half[0] * 0.4);
  const centreZ = -(front + BACK_GAP + half[2]);

  const bag = part('backpack-bag', roundedBox(half), cloth, 0.04);
  bag.position.set(0, centreY, centreZ);
  group.add(bag);
  // A pocket on the outside, lower down, and the zip across its top
  const pocketHalf: [number, number, number] = [half[0] * 0.7, half[1] * 0.42, half[2] * 0.4];
  const pocket = part('backpack-pocket', roundedBox(pocketHalf), toon(lighten(colour, 0.25)), 0.03);
  pocket.position.set(0, centreY - half[1] * 0.38, centreZ - half[2] * 0.92);
  group.add(pocket);
  const zip = part('backpack-zip', new THREE.BoxGeometry(pocketHalf[0] * 1.5, 0.05, 0.05), dark, 0);
  zip.position.set(0, pocket.position.y + pocketHalf[1] * 0.7, pocket.position.z - pocketHalf[2] * 0.95);
  group.add(zip);
  // A loop on top to hang it up by
  const handle = part('backpack-handle', new THREE.TorusGeometry(half[0] * 0.28, 0.06, 8, 20, Math.PI), dark, 0.015);
  handle.position.set(0, centreY + half[1] * 0.92, centreZ);
  group.add(handle);

  // The straps, over the top of each shoulder, inside where an arm turns
  const inside = figure.shoulder[0] - figure.armRadii[0] * 1.1;
  const strapX = figure.neckRadius * 1.15 + (inside - figure.neckRadius * 1.15) * 0.5;
  const strapHalf = Math.min(0.16, (inside - strapX) * 0.6);
  [-1, 1].forEach(side => {
    const path = strapPath(around.meshes, side * strapX, strapHalf, figure, centreY + half[1] * 0.7, centreZ + half[2] * 0.6, centreY - half[1] * 0.1);
    const strap = part('backpack-strap', band(path, side * strapX, strapHalf, 0.07), dark, 0.02);
    group.add(strap);
    const end = path[path.length - 1];
    const buckle = part('backpack-buckle', roundedBox([strapHalf * 1.1, 0.1, 0.06]), toon('#c9ccd1'), 0.012);
    buckle.position.set(side * strapX, end.x, end.y + 0.05);
    group.add(buckle);
  });
  return group;
}

/**
 * A strap's path over the shoulder at `x`, as (y, z) points: from the bag's
 * top behind, up over the shoulder and down the chest to `endY`. It follows
 * the outline of whatever is in that slice of the character below the chin
 * — the top, a hood, hair lying on the shoulders — with the gap to spare.
 */
export function strapPath(meshes: THREE.Mesh[], x: number, halfWidth: number, figure: Figure, startY: number, startZ: number, endY: number): THREE.Vector2[] {
  const centre = new THREE.Vector2(figure.shoulder[1] - (figure.shoulder[1] - figure.belt) * 0.45, 0);
  const bins = 60;
  const reach = new Array(bins).fill(0);
  const top = chinY(figure);
  const binOf = (angle: number) => Math.floor(((angle + Math.PI) / (Math.PI * 2)) * bins) % bins;
  const slice = new THREE.Box3(new THREE.Vector3(x - halfWidth - BACK_GAP, -Infinity, -Infinity), new THREE.Vector3(x + halfWidth + BACK_GAP, top, Infinity));
  meshes.filter(mesh => worldBox(mesh).intersectsBox(slice)).forEach(mesh => eachSurfacePoint(mesh, 0.06, (px, py, pz) => {
    if (Math.abs(px - x) <= halfWidth + BACK_GAP && py <= top) {
      // An angle from straight up, forwards (+z) positive
      const dy = py - centre.x;
      const dz = pz - centre.y;
      const b = binOf(Math.atan2(dz, dy));
      reach[b] = Math.max(reach[b], Math.hypot(dy, dz));
    }
  }, slice));
  const out = reach.map(r => r + BACK_GAP);
  const outline: THREE.Vector2[] = [];
  // From behind (−z) over the top to the front, stopping at endY
  for (let b = 0; b < bins; b++) {
    const angle = -Math.PI + ((b + 0.5) / bins) * Math.PI * 2;
    const point = new THREE.Vector2(centre.x + Math.cos(angle) * out[b], centre.y + Math.sin(angle) * out[b]);
    if (angle < 0 && point.x < startY) {
      continue;
    }
    if (angle > 0 && point.x < endY) {
      break;
    }
    outline.push(point);
  }
  return [new THREE.Vector2(startY, startZ), ...taut(outline)];
}

/**
 * A strap pulled tight over an outline of (y, z) points, running from the
 * back over the top to the front: it crosses a dip (between a hood's roll and
 * the chest, say) in a straight line rather than following it down. The
 * outline's outer hull, in order.
 */
export function taut(outline: THREE.Vector2[]): THREE.Vector2[] {
  const hull: THREE.Vector2[] = [];
  outline.forEach(point => {
    // Seen with z across and y up, the way over the top turns clockwise; a
    // point where it turns the other way is a dip, and the strap misses it
    while (hull.length >= 2) {
      const [a, b] = [hull[hull.length - 2], hull[hull.length - 1]];
      const turn = (b.y - a.y) * (point.x - b.x) - (b.x - a.x) * (point.y - b.y);
      if (turn <= 0) {
        break;
      }
      hull.pop();
    }
    hull.push(point);
  });
  return hull;
}

/**
 * A flat band along a path of (y, z) points at `x`: `halfWidth` either side,
 * `thickness` deep, outwards from the path. Closed at both ends.
 */
function band(path: THREE.Vector2[], x: number, halfWidth: number, thickness: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  path.forEach((p, k) => {
    const prev = path[Math.max(0, k - 1)];
    const next = path[Math.min(path.length - 1, k + 1)];
    // Outwards: the path's direction turned a quarter, away from the body
    // (going up the back, that is −z; over the top, +y)
    const along = next.clone().sub(prev).normalize();
    const out = new THREE.Vector2(along.y, -along.x);
    [[-1, 0], [1, 0], [1, 1], [-1, 1]].forEach(([s, o]) =>
      positions.push(x + s * halfWidth, p.x + out.x * thickness * o, p.y + out.y * thickness * o));
  });
  for (let k = 0; k + 1 < path.length; k++) {
    for (let s = 0; s < 4; s++) {
      const a = k * 4 + s;
      const b = k * 4 + ((s + 1) % 4);
      // Wound so every face points out of the band
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const last = (path.length - 1) * 4;
  indices.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The cape: hanging from the collar down to the calves behind the character,
 * wider as it falls, with a few soft folds and a lining. Each row hangs clear
 * of the furthest point of anything above it — it falls from the shoulder
 * blades, a hood or long hair, and never tucks back in at the waist — and
 * further back than an arm ever reaches, so it goes behind the arms.
 */
function cape(colour: string, figure: Figure, around: Around): THREE.Group {
  const group = new THREE.Group();
  const top = figure.torso[figure.torso.length - 1][1] - 0.1;
  const bottom = figure.knee[1] - (figure.knee[1] - figure.ankle[1]) * 0.35;
  const narrow = figure.torso[figure.torso.length - 1][0] * 1.1;
  const wide = figure.shoulder[0] + figure.armRadii[0] * 1.3;
  const [columns, rows] = [28, 26];
  const outer: number[] = [];
  const inner: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const y = top - (top - bottom) * t;
    const halfWidth = narrow + (wide - narrow) * Math.sqrt(t);
    for (let c = 0; c <= columns; c++) {
      const u = (c / columns) * 2 - 1;
      const x = u * halfWidth;
      const behind = Math.max(around.map.furthest(x, (halfWidth / columns) * 2, y, top), around.armBack);
      // Falling outwards a little towards the hem, in soft folds
      const folds = 0.08 * t * (1 - Math.cos(u * Math.PI * 5)) / 2;
      const depth = behind + BACK_GAP + 0.04 + 0.3 * t * t + folds;
      outer.push(x, y, -depth);
      inner.push(x, y, -(depth - 0.035));
    }
  }
  const sheet = (positions: number[], facingOut: boolean) => {
    const indices: number[] = [];
    const at = (r: number, c: number) => r * (columns + 1) + c;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const [a, b, cc, d] = [at(r, c), at(r + 1, c), at(r, c + 1), at(r + 1, c + 1)];
        // Wound so the face points away from the body (−z) outside, towards it inside
        indices.push(...(facingOut ? [a, cc, b, cc, d, b] : [a, b, cc, cc, b, d]));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  group.add(part('cape', sheet(outer, true), toon(colour), 0.03));
  group.add(part('cape-lining', sheet(inner, false), toon(shade(colour, 0.35)), 0));
  // A rolled collar along the top edge, and a gold clasp at each corner: on
  // the outside, so neither reaches into the room left in front
  const edge = new THREE.CatmullRomCurve3(Array.from({ length: columns + 1 }, (_, c) =>
    new THREE.Vector3(outer[c * 3], outer[c * 3 + 1], outer[c * 3 + 2] - 0.03)));
  group.add(part('cape-collar', new THREE.TubeGeometry(edge, 40, 0.07, 8, false), toon(shade(colour, 0.12)), 0.02));
  [0, columns].forEach(c => {
    const clasp = part('cape-clasp', new THREE.SphereGeometry(0.12, 14, 10), toon('#e3b53c'), 0.015);
    clasp.position.set(outer[c * 3], outer[c * 3 + 1], outer[c * 3 + 2] - 0.08);
    group.add(clasp);
  });
  return group;
}

const BUILDERS: { [id: string]: (colour: string, figure: Figure, around: Around) => THREE.Group } = { backpack, cape };

/** The back item with this id, built round the rest of the character; null for none, or one that does not exist. */
export function buildBackItem(id: string, colour: string, figure: Figure, around: Around): THREE.Group | null {
  const build = BUILDERS[id];
  if (!build) {
    return null;
  }
  const group = build(colour, figure, around);
  group.name = BACK;
  group.userData.item = id;
  return group;
}

/** The ids with a 3D back item, for tests to hold the wardrobe to. */
export const BACK_IDS = Object.keys(BUILDERS);
