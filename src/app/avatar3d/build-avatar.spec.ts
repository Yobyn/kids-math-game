import * as THREE from 'three';
import { TOP_COLOURS } from '../avatar/top-colours';
import {
  Avatar, FACE_SHAPES, HAIR_STYLES, HAIR_TEXTURES, NO_ITEM, WARDROBE, defaultAvatar, findItem
} from '../avatar/avatar-model';
import { HATS_OVER_HAIR } from '../avatar/avatar-parts';
import { ARM_RIG, EYE_SCALE, EYE_SIZE, EYE_WHITE, FOREARM_RIG, IRIS, NOSE_SIZE, POCKET_ARC, POCKET_AT, POCKET_HEIGHT, STRING_GAP, buildAvatar, disposeAvatar, topCut } from './build-avatar';
import { FIGURES, Figure, KNEE_FORWARD, chinY, figureFor, torsoRadius } from './figure';
import {
  EYE_DIRS, HAT_CAP, HAT_LIFT, Vec3, hairPoint, hatBrim, headPoint, normalise, radiusAlong
} from './head-surface';
import { LENS_OFFSET, crownSeat, lensCentres } from './wardrobe3d';

function avatar(overrides: Partial<Avatar> = {}): Avatar {
  return { ...defaultAvatar(), hat: NO_ITEM, glasses: NO_ITEM, top: NO_ITEM, ...overrides };
}

function find(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  root.traverse(o => { if (o.name === name) { found.push(o); } });
  return found;
}

/**
 * A mesh's vertices in head space: the space the head, its hair, a hat and
 * glasses are all built in, before the figure moves and narrows them.
 */
function headSpaceVertices(root: THREE.Object3D, mesh: THREE.Mesh): Vec3[] {
  root.updateMatrixWorld(true);
  const head = root.getObjectByName('head-group')!;
  const toHead = head.matrixWorld.clone().invert();
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const out: Vec3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toHead);
    out.push([v.x, v.y, v.z]);
  }
  return out;
}

/** A mesh's vertices in the world, where the body is. */
function worldVertices(root: THREE.Object3D, mesh: THREE.Mesh): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    out.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  }
  return out;
}

/** True when a point is inside the torso's own surface (an ellipse at each height). */
function insideTorso(figure: Figure, p: THREE.Vector3): boolean {
  const w = torsoRadius(figure, p.y);
  return w > 0 && (p.x / w) ** 2 + (p.z / (w * figure.torsoDepth)) ** 2 < 1;
}

/** The top of the torso, where the neck comes out. */
function collar(figure: Figure): number {
  return figure.torso[figure.torso.length - 1][1];
}

/**
 * How a limb's end at `to` is finished, going from `from`: how far the mesh
 * comes round past the end point, along the limb, and how wide it is there.
 * A rounded end comes past by about its own width; a flat one not at all.
 */
function endOf(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): { beyond: number; radius: number } {
  mesh.updateWorldMatrix(true, false);
  const along = to.clone().sub(from);
  const length = along.length();
  along.normalize();
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  let beyond = -Infinity;
  let radius = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).sub(from);
    const t = p.dot(along);
    beyond = Math.max(beyond, t - length);
    if (Math.abs(t - length) < 0.01) {
      radius = Math.max(radius, p.clone().addScaledVector(along, -t).length());
    }
  }
  return { beyond, radius };
}

function verticesOf(mesh: THREE.Mesh): THREE.Vector3[] {
  mesh.updateWorldMatrix(true, false);
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  return Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
}

/** The middle of each of a mesh's triangles, in the world: where a facet lies furthest inside the curve it stands for. */
function facetCentres(mesh: THREE.Mesh): THREE.Vector3[] {
  const vertices = verticesOf(mesh);
  const index = mesh.geometry.index!;
  const centres: THREE.Vector3[] = [];
  for (let i = 0; i < index.count; i += 3) {
    centres.push(vertices[index.getX(i)].clone().add(vertices[index.getX(i + 1)]).add(vertices[index.getX(i + 2)]).divideScalar(3));
  }
  return centres;
}

function worldOf(node: THREE.Object3D): THREE.Vector3 {
  node.updateWorldMatrix(true, false);
  return node.getWorldPosition(new THREE.Vector3());
}

const BODY_TYPES: Array<'boy' | 'girl'> = ['boy', 'girl'];

/**
 * The vertices that break `rule`. A geometry has thousands of vertices; one
 * expectation per vertex filled the test runner with millions of recorded
 * passes and could stall the browser, so each check asserts once on the misses.
 */
function misses(vertices: Vec3[], rule: (p: Vec3) => boolean): Vec3[] {
  return vertices.filter(p => !rule(p));
}

const COVERING = WARDROBE.filter(item => item.slot === 'hat' && HATS_OVER_HAIR.includes(item.id)).map(item => item.id);

describe('buildAvatar', () => {
  FACE_SHAPES.forEach(faceShape => it(`builds a ${faceShape} face with every hair style, in every texture, and nothing inside the head`, () => {
    HAIR_STYLES.forEach((hairStyle, i) => {
      const hairTexture = HAIR_TEXTURES[i % HAIR_TEXTURES.length];
      const root = buildAvatar(avatar({ faceShape, hairStyle, hairTexture }));
      const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
      expect(shell).toBeTruthy(`${faceShape}/${hairStyle} has no hair`);
      const vertices = headSpaceVertices(root, shell);
      // The only vertices under the skin are the row that tucks the edge in
      expect(misses(vertices, p => Math.hypot(...p) > radiusAlong(faceShape, p) * 0.96).length)
        .toBe(0, `${faceShape}/${hairStyle} cuts into the head`);
      const inside = misses(vertices, p => Math.hypot(...p) > radiusAlong(faceShape, p) * 1.001);
      expect(inside.length / vertices.length).toBeLessThan(0.1, `${faceShape}/${hairStyle}`);
      disposeAvatar(root);
    });
  }));

  it('gives the copies of the crown point one normal, so the outline does not split into spikes there', () => {
    const root = buildAvatar(avatar({ hairStyle: 'coils' }));
    const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
    const normal = shell.geometry.attributes.normal as THREE.BufferAttribute;
    const position = shell.geometry.attributes.position as THREE.BufferAttribute;
    const top = position.getY(0);
    let copies = 0;
    for (let i = 0; i < position.count && position.getY(i) === top && position.getX(i) === position.getX(0); i++) {
      copies++;
      expect(normal.getX(i)).toBeCloseTo(normal.getX(0), 9);
      expect(normal.getY(i)).toBeCloseTo(normal.getY(0), 9);
      expect(normal.getZ(i)).toBeCloseTo(normal.getZ(0), 9);
    }
    expect(copies).toBeGreaterThan(10);
    // Upwards, give or take the tilt of the curl it sits on
    expect(normal.getY(0)).toBeGreaterThan(0.7);
  });

  it('never lets hair cover an eye, on any face', () => {
    FACE_SHAPES.forEach(faceShape => HAIR_STYLES.forEach(hairStyle => {
      const root = buildAvatar(avatar({ faceShape, hairStyle }));
      const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
      const overEye = misses(headSpaceVertices(root, shell), p => {
        const d = normalise(p);
        return EYE_DIRS.every(eye => Math.acos(d[0] * eye[0] + d[1] * eye[1] + d[2] * eye[2]) > 0.2);
      });
      expect(overEye.length).toBe(0, `${faceShape}/${hairStyle} hair over an eye`);
      disposeAvatar(root);
    }));
  });

  // One spec per hat, so no single spec runs long enough to look like a hung browser
  COVERING.forEach(hat => it(`keeps the ${hat} clear of the hair under it, on every face and style`, () => {
    FACE_SHAPES.forEach(faceShape => HAIR_STYLES.forEach(hairStyle => {
      const root = buildAvatar(avatar({ faceShape, hairStyle, hat, hairTexture: 'coily' }));
      const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
      const poking = misses(headSpaceVertices(root, shell),
        p => Math.hypot(...p) <= radiusAlong(faceShape, p) * (1 + HAT_CAP) + 1e-6);
      expect(poking.length).toBe(0, `${hat}/${faceShape}/${hairStyle}: hair would poke through`);
      const [hatShell] = find(root, 'hat-shell') as THREE.Mesh[];
      if (hatShell) {
        // Every vertex but the tucked-in underside stands clear of the flattened hair
        const outer = headSpaceVertices(root, hatShell).filter(p => Math.hypot(...p) > radiusAlong(faceShape, p) * 1.01);
        expect(outer.length).toBeGreaterThan(0);
        expect(misses(outer, p => Math.hypot(...p) > radiusAlong(faceShape, p) * (1 + HAT_CAP)).length).toBe(0, `${hat}/${faceShape}`);
      }
      disposeAvatar(root);
    }));
  }));

  it('ends each hat on the brim line, above the brows', () => {
    FACE_SHAPES.forEach(faceShape => {
      const root = buildAvatar(avatar({ faceShape, hat: 'cap' }));
      const [hatShell] = find(root, 'hat-shell') as THREE.Mesh[];
      const below = misses(headSpaceVertices(root, hatShell), p => {
        const d = normalise(p);
        return d[1] >= hatBrim(d) - 0.03;
      });
      expect(below.length).toBe(0, `${faceShape}: hat below its brim`);
      disposeAvatar(root);
    });
  });

  it('hides a bun under a hat that covers the head, and keeps it under a crown', () => {
    COVERING.forEach(hat => {
      const root = buildAvatar(avatar({ hairStyle: 'bun', hat }));
      expect(find(root, 'hair-bun').length).toBe(0, hat);
    });
    expect(find(buildAvatar(avatar({ hairStyle: 'bun', hat: 'crown' })), 'hair-bun').length).toBe(1);
    expect(find(buildAvatar(avatar({ hairStyle: 'bun' })), 'hair-bun').length).toBe(1);
  });

  it('gives the styles that have them their extra parts', () => {
    expect(find(buildAvatar(avatar({ hairStyle: 'long' })), 'hair-long').length).toBe(1);
    expect(find(buildAvatar(avatar({ hairStyle: 'braids' })), 'hair-braid').length).toBe(10);
    expect(find(buildAvatar(avatar({ hairStyle: 'braids' })), 'hair-tie').length).toBe(2);
    expect(find(buildAvatar(avatar({ hairStyle: 'locs' })), 'hair-loc').length).toBe(13);
    expect(find(buildAvatar(avatar({ hairStyle: 'short' })), 'hair-long').length).toBe(0);
  });

  it('builds everything in the wardrobe on every face', () => {
    const items = WARDROBE.filter(item => item.id !== NO_ITEM);
    expect(items.length).toBeGreaterThan(10);
    items.forEach(item => FACE_SHAPES.forEach(faceShape => {
      const root = buildAvatar(avatar({ faceShape, [item.slot]: item.id } as Partial<Avatar>));
      if (item.slot === 'top') {
        const [torso] = find(root, 'torso') as THREE.Mesh[];
        expect((torso.material as THREE.MeshToonMaterial).color.getHexString()).toBe(item.colour.slice(1).toLowerCase(), item.id);
      } else {
        // A pair of shoes is two shoes, each marked with what it is
        const [worn] = item.slot === 'shoes' ? find(root, 'shoe').filter(shoe => shoe.userData.item === item.id) : find(root, item.slot);
        expect(worn).toBeTruthy(`${item.id} on ${faceShape}`);
        let meshes = 0;
        worn.traverse(o => { if ((o as THREE.Mesh).isMesh) { meshes++; } });
        expect(meshes).toBeGreaterThan(2, item.id);
      }
      disposeAvatar(root);
    }));
  });

  it('wears a top in the colour chosen for it, trims and all, and in its own for one not on offer', () => {
    const colourOf = (root: THREE.Object3D, name: string) =>
      ((find(root, name)[0] as THREE.Mesh).material as THREE.MeshToonMaterial).color.getHexString();
    const chosen = buildAvatar(avatar({ top: 'hoodie', topColour: TOP_COLOURS[5] } as Partial<Avatar>));
    expect(colourOf(chosen, 'torso')).toBe(TOP_COLOURS[5].slice(1));
    // The hood and cuffs are a shade of it, not of the hoodie's own blue
    const own = buildAvatar(avatar({ top: 'hoodie' } as Partial<Avatar>));
    expect(colourOf(chosen, 'hood')).not.toBe(colourOf(own, 'hood'));
    expect(colourOf(chosen, 'cuff')).not.toBe(colourOf(own, 'cuff'));
    const odd = buildAvatar(avatar({ top: 'hoodie', topColour: '#123456' } as Partial<Avatar>));
    expect(colourOf(odd, 'torso')).toBe(colourOf(own, 'torso'));
    [chosen, own, odd].forEach(disposeAvatar);
  });

  it('wears nothing that was not chosen', () => {
    const root = buildAvatar(avatar());
    expect(find(root, 'hat').length).toBe(0);
    expect(find(root, 'glasses').length).toBe(0);
    expect(find(root, 'hood').length).toBe(0);
    expect(find(root, 'decal').length).toBe(0);
  });

  it('draws each top its own way', () => {
    expect(find(buildAvatar(avatar({ top: 'star-tee' })), 'decal').length).toBe(1);
    expect(find(buildAvatar(avatar({ top: 'flower-tee' })), 'decal').length).toBe(1);
    expect(find(buildAvatar(avatar({ top: 'hoodie' })), 'hood').length).toBe(1);
  });

  it('prints a tee\u2019s star or flower on the chest: in its upper half, all of it under the neckline', () => {
    BODY_TYPES.forEach(bodyType => ['star-tee', 'flower-tee'].forEach(top => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top }));
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(find(root, 'decal')[0]);
      const middle = (box.min.y + box.max.y) / 2;
      // Up on the chest, not down on the tummy...
      expect(middle).withContext(`${bodyType} ${top}`).toBeGreaterThan((figure.hem + collar(figure)) / 2);
      // ...and clear of the neckline
      expect(box.max.y).withContext(`${bodyType} ${top}`).toBeLessThan(collar(figure) - 0.2);
    }));
  });

  it('finishes every crew-neck top as a ringer tee: a collar and sleeve ends in a trim that shows, in any colour', () => {
    const misses: string[] = [];
    const colourOf = (mesh: THREE.Object3D) => ((mesh as THREE.Mesh).material as THREE.MeshToonMaterial).color;
    WARDROBE.filter(item => item.slot === 'top' && item.id !== 'hoodie').forEach(top => [undefined, ...TOP_COLOURS].forEach(topColour => {
      const root = buildAvatar(avatar({ top: top.id, ...(topColour ? { topColour } : {}) } as Partial<Avatar>));
      const [body, trim] = [colourOf(find(root, 'torso')[0]), colourOf(find(root, 'neckline')[0])];
      if (Math.hypot(body.r - trim.r, body.g - trim.g, body.b - trim.b) < 0.35) {
        misses.push(`${top.id} ${topColour || 'own'}: the collar does not show`);
      }
      // The sleeve ends in the same trim: a hem on a short sleeve, a cuff on a long one
      const ends = topCut(top.id) === 'short' ? find(root, 'sleeve-hem') : find(root, 'cuff');
      if (ends.length !== 2 || ends.some(end => colourOf(end).getHex() !== trim.getHex())) {
        misses.push(`${top.id} ${topColour || 'own'}: sleeve ends not in the trim`);
      }
      disposeAvatar(root);
    }));
    expect(misses).toEqual([]);
  });

  it('rolls a crew collar over where the neck meets the body: thick enough to read, no gap to the neck', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const neckline = find(buildAvatar(avatar({ bodyType, top: 'striped' })), 'neckline')[0] as THREE.Mesh;
      const { radius, tube } = (neckline.geometry as THREE.TorusGeometry).parameters;
      // Twice the body's ink line at least, or it reads as a wire round the neck
      expect(tube).withContext(bodyType).toBeGreaterThan(0.1);
      // Its inside edge closer to the neck than the band is thick
      expect(radius - tube - figure.neckRadius).withContext(bodyType).toBeLessThan(tube);
    });
  });

  it('hems each short sleeve with a band clear of the sleeve, at its end', () => {
    BODY_TYPES.forEach(bodyType => ['star-tee', 'flower-tee'].forEach(top => {
      const root = buildAvatar(avatar({ bodyType, top }));
      root.updateMatrixWorld(true);
      find(root, ARM_RIG).forEach(rig => {
        const sleeve = rig.children.find(child => child.name === 'arm') as THREE.Mesh;
        const hem = rig.children.find(child => child.name === 'sleeve-hem') as THREE.Mesh;
        const widest = (mesh: THREE.Mesh) => Math.max(...(mesh.geometry as THREE.LatheGeometry).parameters.points.map(p => p.x));
        // Wider than the sleeve anywhere, by more than either surface's facets stray, so the two never cross
        expect(widest(hem) / widest(sleeve)).withContext(`${bodyType} ${top}`).toBeGreaterThan(1.02);
        // At the sleeve's end, where the bare arm comes out
        const bare = rig.children.find(child => child.name === 'bare-arm') as THREE.Mesh;
        const hemBox = new THREE.Box3().setFromObject(hem);
        const bareTop = new THREE.Box3().setFromObject(bare).max.y;
        expect(hemBox.min.y).withContext(`${bodyType} ${top}`).toBeLessThan(bareTop);
        expect(hemBox.max.y).withContext(`${bodyType} ${top}`).toBeGreaterThan(bareTop - 0.05);
      });
      disposeAvatar(root);
    }));
  });

  it('puts a patch pocket on the plain top\u2019s chest, lying on it: its front just outside the body, its back inside', () => {
    BODY_TYPES.forEach(bodyType => [undefined, '#f2f2f5'].forEach(topColour => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top: NO_ITEM, ...(topColour ? { topColour } : {}) } as Partial<Avatar>));
      root.updateMatrixWorld(true);
      const patch = find(root, 'chest-pocket-patch')[0] as THREE.Mesh;
      expect(patch).withContext(bodyType).toBeDefined();
      // How far a point is outside the oval of the torso at its height
      const outside = (p: THREE.Vector3) => Math.hypot(p.x, p.z / figure.torsoDepth) - torsoRadius(figure, p.y);
      const { width, height, depth } = (patch.geometry as THREE.BoxGeometry).parameters;
      [-1, 1].forEach(sx => [-1, 1].forEach(sy => {
        const front = patch.localToWorld(new THREE.Vector3(sx * width / 2, sy * height / 2, depth / 2));
        const back = patch.localToWorld(new THREE.Vector3(sx * width / 2, sy * height / 2, -depth / 2));
        // Seen, and not standing off the body by more than its own thickness twice over
        expect(outside(front)).withContext(`${bodyType} front corner`).toBeGreaterThan(0);
        expect(outside(front)).withContext(`${bodyType} front corner`).toBeLessThan(depth * 2);
        // No gap behind it
        expect(outside(back)).withContext(`${bodyType} back corner`).toBeLessThan(0);
      }));
      // On the chest: above the middle of the top, on the character's left
      const at = patch.getWorldPosition(new THREE.Vector3());
      expect(at.y).withContext(bodyType).toBeGreaterThan((figure.hem + collar(figure)) / 2);
      expect(at.x).withContext(bodyType).toBeGreaterThan(0);
      disposeAvatar(root);
    }));
    // Only the plain top: the others have their own print, stripes or pouch
    ['striped', 'star-tee', 'flower-tee', 'hoodie'].forEach(top => expect(find(buildAvatar(avatar({ top })), 'chest-pocket-patch').length).withContext(top).toBe(0));
  });

  it('gives the flower print a yellow middle, in front of the flower and inside it', () => {
    const root = buildAvatar(avatar({ top: 'flower-tee' }));
    root.updateMatrixWorld(true);
    const [flower] = find(root, 'decal');
    const [middle] = find(root, 'decal-middle');
    expect(((middle as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHexString()).toBe('ffd166');
    const box = new THREE.Box3().setFromObject(flower);
    const at = middle.getWorldPosition(new THREE.Vector3());
    expect(at.z).toBeGreaterThan(box.max.z);
    expect(box.containsPoint(at.clone().setZ(box.max.z))).toBeTrue();
    expect(find(buildAvatar(avatar({ top: 'star-tee' })), 'decal-middle').length).toBe(0);
  });

  it('colours the face from the choices', () => {
    const root = buildAvatar(avatar({ skin: '#8d5524', eyeColour: '#3f8f5a', hairColour: '#e0b35a' }));
    const colour = (name: string) => ((find(root, name)[0] as THREE.Mesh).material as THREE.MeshToonMaterial).color.getHexString();
    expect(colour('head')).toBe('8d5524');
    expect(colour('iris')).toBe('3f8f5a');
    expect(colour('hair-shell')).toBe('e0b35a');
  });

  describe('the stylised face (Yobyn, 2026-09-26: in between chibi and realistic)', () => {
    it('makes the eyes bigger than measured, but never too big for a round lens', () => {
      expect(EYE_SIZE).toBeGreaterThan(1.1);
      const eyes = find(buildAvatar(avatar()), 'eye');
      eyes.forEach(eye => expect([eye.scale.x, eye.scale.y]).toEqual([EYE_SIZE, EYE_SIZE]));
      // The widest eye's half-width, grown, still inside the round lens's rim
      const widest = Math.max(...Object.values(EYE_SCALE).map(([sx]) => sx));
      expect(EYE_WHITE * widest * EYE_SIZE).toBeLessThan(0.25);
    });

    it('gives a big iris, kept inside the white of every eye shape', () => {
      expect(IRIS).toBeGreaterThan(0.075 * 1.2);
      Object.keys(EYE_SCALE).forEach(eyeShape => {
        const root = buildAvatar(avatar({ eyeShape: eyeShape as any }));
        const [white] = find(root, 'eye-white') as THREE.Mesh[];
        const [iris] = find(root, 'iris') as THREE.Mesh[];
        const whiteHalfHeight = EYE_WHITE * white.scale.y;
        const irisHalfHeight = IRIS * iris.scale.y;
        expect(irisHalfHeight).toBeLessThan(whiteHalfHeight, eyeShape);
        expect(IRIS * iris.scale.x).toBeLessThan(EYE_WHITE * white.scale.x, eyeShape);
        disposeAvatar(root);
      });
    });

    it('opens the eyes tall and fills them with iris, as the dragon\u2019s are, and keeps the nose a small button', () => {
      // How tall each eye is for its width: every shape taller than it was
      const tallness: { [shape: string]: number } = { round: 0.6, almond: 0.45, wide: 0.5, narrow: 0.33 };
      Object.keys(tallness).forEach(shape => {
        const [sx, sy] = EYE_SCALE[shape];
        expect(sy / sx).withContext(shape).toBeGreaterThan(tallness[shape]);
      });
      // Most of a round eye is iris
      expect(IRIS / (EYE_WHITE * EYE_SCALE.round[0])).toBeGreaterThan(0.6);
      // The nose narrower than three quarters of an iris
      const root = buildAvatar(avatar());
      const [tip] = find(root, 'nose-tip') as THREE.Mesh[];
      expect((tip.geometry as THREE.SphereGeometry).parameters.radius * tip.scale.x).toBeLessThan(IRIS * 0.75);
      disposeAvatar(root);
    });

    it('has the dragon\u2019s friendly face: two shines in each eye, a button nose, rosy cheeks (Yobyn, 2026-09-28)', () => {
      const root = buildAvatar(avatar());
      find(root, 'eye').forEach(eye => {
        const shines = eye.children.filter(child => child.name === 'glint') as THREE.Mesh[];
        expect(shines.length).toBe(2);
        // A big one high on one side, a little one low on the other
        const [big, small] = shines.sort((a, b) =>
          (b.geometry as THREE.SphereGeometry).parameters.radius - (a.geometry as THREE.SphereGeometry).parameters.radius);
        expect((big.geometry as THREE.SphereGeometry).parameters.radius).toBeGreaterThan((small.geometry as THREE.SphereGeometry).parameters.radius * 2);
        expect(big.position.y).toBeGreaterThan(0);
        expect(small.position.y).toBeLessThan(0);
        expect(Math.sign(big.position.x)).toBe(-Math.sign(small.position.x));
      });
      // Just a round button: no bridge down the face, no nostrils
      expect(find(root, 'nose-tip').length).toBe(1);
      expect(find(root, 'nose').length + find(root, 'nostril').length).toBe(0);
      const cheeks = find(root, 'cheek') as THREE.Mesh[];
      expect(cheeks.length).toBe(2);
      cheeks.forEach(cheek => expect((cheek.material as THREE.MeshBasicMaterial).opacity).toBeGreaterThan(0.3));
      disposeAvatar(root);
    });

    it('bends softly: each arm rounded at the elbow and each leg at the knee, in one surface, never a ball fighting a tube', () => {
      BODY_TYPES.forEach(bodyType => ['hoodie', 'star-tee'].forEach(top => {
        const figure = figureFor(bodyType);
        const root = buildAvatar(avatar({ bodyType, top }));
        root.updateMatrixWorld(true);
        // No separate ball at a joint: one as wide as the tube it meets frays where their facets cross
        ['shoulder', 'elbow', 'knee'].forEach(name => expect(find(root, name).length).withContext(`${bodyType} ${top} ${name}`).toBe(0));
        find(root, ARM_RIG).forEach(rig => {
          const elbowRig = rig.getObjectByName(FOREARM_RIG)!;
          const [shoulder, elbow, wrist] = [worldOf(rig), worldOf(elbowRig), worldOf(elbowRig.getObjectByName('hand')!)];
          // The upper arm (the sleeve, or the bare arm under a short one) comes round past the elbow...
          const upper = rig.children.filter(child => child.name === (top === 'star-tee' ? 'bare-arm' : 'arm'))[0] as THREE.Mesh;
          const upperEnd = endOf(upper, shoulder, elbow);
          expect(upperEnd.beyond).withContext(`${bodyType} ${top} elbow`).toBeGreaterThan(upperEnd.radius * 0.95);
          // ...and the forearm starts rounded inside it: clear of it, so the two never cross, but not so
          // much slimmer that the bend shows a notch
          const forearm = elbowRig.children.filter(child => child.name === 'forearm')[0] as THREE.Mesh;
          const forearmStart = endOf(forearm, wrist, elbow);
          expect(forearmStart.beyond).withContext(`${bodyType} ${top} forearm`).toBeGreaterThan(forearmStart.radius * 0.95);
          expect(forearmStart.radius / upperEnd.radius).withContext(`${bodyType} ${top} forearm`).toBeLessThan(0.97);
          expect(forearmStart.radius / upperEnd.radius).withContext(`${bodyType} ${top} forearm`).toBeGreaterThan(0.85);
          // And the two never cross: every facet of the upper arm's round end (where it sags furthest in,
          // at its middle) stays further from the elbow than any point of the forearm's round start
          const upperFacets = facetCentres(upper).filter(c => c.clone().sub(shoulder).dot(elbow.clone().sub(shoulder).normalize()) > shoulder.distanceTo(elbow) + 0.02);
          const forearmDome = verticesOf(forearm).filter(v => v.clone().sub(elbow).dot(wrist.clone().sub(elbow)) < -0.02);
          const nearest = Math.min(...upperFacets.map(c => c.distanceTo(elbow)));
          const furthest = Math.max(...forearmDome.map(v => v.distanceTo(elbow)));
          expect(furthest).withContext(`${bodyType} ${top} elbow facets`).toBeLessThan(nearest);
        });
        // Each thigh comes round past the knee
        const thighs = (find(root, 'leg') as THREE.Mesh[]).filter(leg => {
          const box = new THREE.Box3().setFromObject(leg);
          return box.max.y > figure.hip[1];
        });
        expect(thighs.length).toBe(2);
        thighs.forEach(thigh => {
          const side = Math.sign(new THREE.Box3().setFromObject(thigh).getCenter(new THREE.Vector3()).x);
          const hip = new THREE.Vector3(side * figure.hip[0], figure.hip[1], 0);
          const knee = new THREE.Vector3(side * figure.knee[0], figure.knee[1], KNEE_FORWARD);
          const end = endOf(thigh, hip, knee);
          expect(end.beyond).withContext(`${bodyType} ${top} knee`).toBeGreaterThan(end.radius * 0.95);
        });
        disposeAvatar(root);
      }));
    });

    it('gives a smaller nose than measured', () => {
      expect(NOSE_SIZE).toBeLessThan(0.85);
      const [tip] = find(buildAvatar(avatar()), 'nose-tip') as THREE.Mesh[];
      expect((tip.geometry as THREE.SphereGeometry).parameters.radius).toBeCloseTo(0.11 * NOSE_SIZE, 9);
    });
  });

  it('gives each eye shape and mouth shape its own look', () => {
    const eyeScale = (eyeShape: any) => {
      const [white] = find(buildAvatar(avatar({ eyeShape })), 'eye-white');
      return `${white.scale.x.toFixed(2)},${white.scale.y.toFixed(2)}`;
    };
    expect(new Set(['round', 'almond', 'wide', 'narrow'].map(eyeScale)).size).toBe(4);
    const mouthParts = (mouthShape: any) => {
      const [mouth] = find(buildAvatar(avatar({ mouthShape })), 'mouth');
      const geometry = (mouth.children[0] as THREE.Mesh).geometry as any;
      return `${mouth.children.length}:${geometry.type}:${geometry.parameters.radius}`;
    };
    expect(new Set(['smile', 'grin', 'soft', 'open'].map(mouthParts)).size).toBe(4);
  });

  it('does not change the avatar it was given, so a saved character round-trips unchanged', () => {
    const chosen = avatar({ hairStyle: 'afro', hat: 'wizard', glasses: 'goggles', top: 'hoodie' });
    const before = JSON.stringify(chosen);
    disposeAvatar(buildAvatar(chosen));
    expect(JSON.stringify(chosen)).toBe(before);
  });

  it('stands each figure on its stand, feet on the floor', () => {
    BODY_TYPES.forEach(bodyType => {
      const root = buildAvatar(avatar({ bodyType }));
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(find(root, 'body')[0]);
      expect(box.min.y).toBeGreaterThan(-0.05, bodyType);
      expect(box.min.y).toBeLessThan(0.1, bodyType);
      const stand = new THREE.Box3().setFromObject(find(root, 'pedestal')[0]);
      expect(stand.max.y).toBeLessThanOrEqual(0.05);
      // Wide enough for both feet
      expect(stand.max.x).toBeGreaterThan(box.max.x * 0.4);
    });
  });

  it('builds each body type in its own figure, head on the collar', () => {
    BODY_TYPES.forEach(bodyType => FACE_SHAPES.forEach(faceShape => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, faceShape }));
      root.updateMatrixWorld(true);
      const head = new THREE.Box3().setFromObject(find(root, 'head')[0]);
      const headHeight = head.max.y - head.min.y;
      // About two and a half heads tall, round like the dragon (figure.ts, STYLE); an oval face is itself a longer head
      expect(head.max.y / headHeight).toBeGreaterThan(faceShape === 'oval' ? 2 : 2.2, `${bodyType}/${faceShape}`);
      expect(head.max.y / headHeight).toBeLessThan(2.8, `${bodyType}/${faceShape}`);
      // The head sits on the body, as the dragon's does: no neck showing under
      // the chin, which may rest a little into the collar but never sinks in
      const collar = figure.torso[figure.torso.length - 1][1];
      expect(head.min.y - collar).toBeGreaterThan(-0.15, `${bodyType}/${faceShape}`);
      expect(head.min.y - collar).toBeLessThan(0.25, `${bodyType}/${faceShape}`);
      // Shoulders wider than the head, big as a stylised head is
      const body = new THREE.Box3().setFromObject(find(root, 'body')[0]);
      expect(body.max.x - body.min.x).toBeGreaterThan((head.max.x - head.min.x) * 1.5);
      disposeAvatar(root);
    }));
  });

  it('narrows the head the way a real one is narrow: taller than wide, less deep than wide', () => {
    BODY_TYPES.forEach(bodyType => {
      const [x, y, z] = figureFor(bodyType).headScale;
      expect(x).toBeLessThan(y);
      expect(z).toBeGreaterThan(x * 0.9);
      // Everything on the head shares its place and its shape, or it would not fit
      const root = buildAvatar(avatar({ bodyType, hat: 'cap', glasses: 'shades' }));
      const head = root.getObjectByName('head-group')!;
      ['head-group', 'hair', 'hat', 'glasses'].forEach(name => {
        const group = root.getObjectByName(name)!;
        expect(group.scale.toArray()).toEqual([x, y, z], name);
        expect(group.position.toArray()).toEqual(head.position.toArray(), name);
      });
    });
  });

  it('gives the girl narrower shoulders, a narrower waist and wider hips for them', () => {
    const widest = (f: Figure, from: number, to: number) =>
      Math.max(...f.torso.filter(([, y]) => y >= from && y <= to).map(([r]) => r));
    const narrowest = (f: Figure, from: number, to: number) =>
      Math.min(...f.torso.filter(([, y]) => y >= from && y <= to).map(([r]) => r));
    const { boy, girl } = FIGURES;
    expect(girl.shoulder[0]).toBeLessThan(boy.shoulder[0]);
    const hipsToWaist = (f: Figure) => widest(f, f.crotch, f.belt) / narrowest(f, f.belt, f.hem + 1);
    expect(hipsToWaist(girl)).toBeGreaterThan(hipsToWaist(boy));
    expect(chinY(girl)).toBeLessThan(chinY(boy));
  });

  it('rounds the torso over the shoulders instead of ending in a ledge, on both figures', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const top = figure.torso[figure.torso.length - 1][1];
      let widest = 0;
      let widestAt = 0;
      for (let y = figure.hem; y <= top; y += 0.01) {
        if (torsoRadius(figure, y) > widest) {
          widest = torsoRadius(figure, y);
          widestAt = y;
        }
      }
      const ledges: number[] = [];
      for (let y = widestAt; y < top; y += 0.02) {
        if (torsoRadius(figure, y + 0.02) > torsoRadius(figure, y) + 1e-9) {
          ledges.push(y);
        }
      }
      expect(ledges).toEqual([], bodyType);
      expect(widestAt).toBeLessThan(figure.shoulder[1]);
    });
  });

  it('hangs the arms from the shoulders with the hands clear of the body', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType }));
      root.updateMatrixWorld(true);
      const hands = find(root, 'hand');
      expect(hands.length).toBe(2);
      hands.forEach(hand => {
        const box = new THREE.Box3().setFromObject(hand);
        const inner = Math.min(Math.abs(box.min.x), Math.abs(box.max.x));
        const beside = Math.max(...[box.min.y, (box.min.y + box.max.y) / 2, box.max.y].map(y => torsoRadius(figure, y)));
        expect(inner).toBeGreaterThan(beside, bodyType);
        // Down by the hips, not up at the chest or down at the knees
        expect(box.max.y).toBeLessThan(figure.belt);
        expect(box.min.y).toBeGreaterThan(figure.knee[1]);
      });
    });
  });

  it('never lets long hair or braids hang inside the body', () => {
    BODY_TYPES.forEach(bodyType => ['long', 'braids'].forEach(hairStyle => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, hairStyle: hairStyle as any }));
      const parts = [...find(root, 'hair-long'), ...find(root, 'hair-braid'), ...find(root, 'hair-tie')] as THREE.Mesh[];
      expect(parts.length).toBeGreaterThan(0);
      parts.forEach(mesh => {
        const inside = worldVertices(root, mesh).filter(p => insideTorso(figure, p));
        expect(inside.length).toBe(0, `${bodyType}/${hairStyle}`);
      });
      disposeAvatar(root);
    }));
  });

  it('lets long hair fall past the shoulders', () => {
    const figure = figureFor('boy');
    const root = buildAvatar(avatar({ hairStyle: 'long' }));
    const [curtain] = find(root, 'hair-long') as THREE.Mesh[];
    const lowest = Math.min(...worldVertices(root, curtain).map(p => p.y));
    expect(lowest).toBeLessThan(figure.shoulder[1]);
  });

  it('cuts each top its own way: long sleeves and cuffs, short sleeves and bare arms, or a hoodie', () => {
    expect(topCut('none')).toBe('long');
    expect(topCut('striped')).toBe('long');
    expect(topCut('star-tee')).toBe('short');
    expect(topCut('flower-tee')).toBe('short');
    expect(topCut('hoodie')).toBe('hoodie');
    const long = buildAvatar(avatar());
    expect(find(long, 'cuff').length).toBe(2);
    expect(find(long, 'bare-arm').length).toBe(0);
    expect(find(long, 'neckline').length).toBe(1);
    const tee = buildAvatar(avatar({ top: 'star-tee' }));
    expect(find(tee, 'cuff').length).toBe(0);
    expect(find(tee, 'bare-arm').length).toBe(2);
    const skin = (find(tee, 'forearm')[0] as THREE.Mesh).material as THREE.MeshToonMaterial;
    expect(skin.color.getHexString()).toBe(avatar().skin.slice(1).toLowerCase());
  });

  it('builds the hoodie the way the reference wears it', () => {
    const root = buildAvatar(avatar({ top: 'hoodie' }));
    expect(find(root, 'hood').length).toBe(1);
    expect(find(root, 'hood-end').length).toBe(2);
    expect(find(root, 'hood-back').length).toBe(1);
    expect(find(root, 'hoodie-string').length).toBe(2);
    expect(find(root, 'hoodie-string-tip').length).toBe(2);
    expect(find(root, 'hoodie-pocket').length).toBe(1);
    // The red of the shirt underneath at the collar and the wrists
    expect(find(root, 'undershirt-collar').length).toBe(1);
    expect(find(root, 'undershirt-cuff').length).toBe(2);
    expect(find(root, 'neckline').length).toBe(0);
  });

  it('keeps the hood\u2019s roll snug round the neck, not a bar out to the shoulders', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top: 'hoodie' }));
      root.updateMatrixWorld(true);
      const roll = new THREE.Box3().setFromObject(find(root, 'hood')[0]);
      expect(Math.max(roll.max.x, -roll.min.x)).withContext(bodyType).toBeLessThan(figure.shoulder[0] * 0.8);
      disposeAvatar(root);
    });
  });

  it('lays the hoodie\u2019s strings just in front of the chest, and curves its pocket round the tummy, on both figures', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top: 'hoodie' }));
      root.updateMatrixWorld(true);
      const depth = figure.torsoDepth;
      // How far in front of the torso's surface a point is
      const before = (p: THREE.Vector3) => p.z - Math.sqrt(Math.max(torsoRadius(figure, p.y) ** 2 - p.x ** 2, 0)) * depth;
      (find(root, 'hoodie-string') as THREE.Mesh[]).forEach(string => {
        const half = (string.geometry as THREE.CylinderGeometry).parameters.height / 2;
        // Hanging straight down, its own radius and outline clear of the chest all the way, and close to it where it is fullest
        // (down to the end of its metal tip, which hangs below it)
        const reach = 2 * half + 0.16;
        const gaps = Array.from({ length: 25 }, (_, i) => before(string.position.clone().add(new THREE.Vector3(0, half - (reach * i) / 24, 0))));
        expect(string.quaternion.equals(new THREE.Quaternion())).toBeTrue();
        expect(Math.min(...gaps)).withContext(bodyType).toBeGreaterThan(0.035 + 0.012);
        expect(Math.min(...gaps)).withContext(bodyType).toBeCloseTo(STRING_GAP, 2);
      });
      const pocket = find(root, 'hoodie-pocket')[0] as THREE.Mesh;
      const collar = figure.torso[figure.torso.length - 1][1] - 0.12;
      expect(pocket.position.y).toBeCloseTo(figure.hem + (collar - figure.hem) * POCKET_AT, 9);
      const { radiusTop, height, thetaLength, openEnded } = (pocket.geometry as THREE.CylinderGeometry).parameters;
      expect(openEnded).toBeTrue();
      expect(thetaLength).toBe(POCKET_ARC);
      expect(height).toBe(POCKET_HEIGHT);
      // Just outside the tummy it lies on, the same shape round
      expect(radiusTop).toBeCloseTo(torsoRadius(figure, pocket.position.y) * 1.02, 9);
      expect(pocket.scale.z).toBe(depth);
      disposeAvatar(root);
    });
  });

  it('dresses every figure in soft round trousers, a belt and sneakers: no boxy pockets on the legs', () => {
    BODY_TYPES.forEach(bodyType => {
      const root = buildAvatar(avatar({ bodyType }));
      expect(find(root, 'leg').length).toBe(4);
      expect(find(root, 'cargo-pocket').length + find(root, 'cargo-flap').length).toBe(0);
      expect(find(root, 'belt').length).toBe(1);
      expect(find(root, 'shoe').length).toBe(2);
      find(root, 'shoe').forEach(shoe => expect(shoe.position.y).toBe(0));
    });
  });

  it('rounds each shoulder as the sleeve\u2019s own top, under the collar, in every top (Yobyn, 2026-10-05)', () => {
    const misses: string[] = [];
    BODY_TYPES.forEach(bodyType => WARDROBE.filter(item => item.slot === 'top').forEach(top => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top: top.id }));
      root.updateMatrixWorld(true);
      find(root, ARM_RIG).forEach(rig => {
        const shoulder = worldOf(rig);
        const elbow = worldOf(rig.getObjectByName(FOREARM_RIG)!);
        const sleeve = rig.children.filter(child => child.name === 'arm')[0] as THREE.Mesh;
        // Round over the top, as far as the sleeve is wide: not a flat end, not a ball on it
        const dome = endOf(sleeve, elbow, shoulder);
        if (dome.beyond < dome.radius * 0.95) {
          misses.push(`${bodyType} ${top.id}: sleeve comes ${dome.beyond.toFixed(2)} over the shoulder, ${dome.radius.toFixed(2)} wide`);
        }
        const box = new THREE.Box3().setFromObject(sleeve);
        if (box.max.y >= collar(figure)) {
          misses.push(`${bodyType} ${top.id}: shoulder up to ${box.max.y.toFixed(2)}, the collar at ${collar(figure).toFixed(2)}`);
        }
      });
    }));
    expect(misses).toEqual([]);
  });

  it('lays each stripe on the torso, at the torso\'s own width', () => {
    BODY_TYPES.forEach(bodyType => {
      const figure = figureFor(bodyType);
      const root = buildAvatar(avatar({ bodyType, top: 'striped' }));
      const stripes = find(root, 'stripe');
      expect(stripes.length).toBe(5);
      stripes.forEach(stripe => {
        const geometry = (stripe as THREE.Mesh).geometry as THREE.CylinderGeometry;
        const y = stripe.position.y;
        expect(geometry.parameters.radiusTop).toBeCloseTo(torsoRadius(figure, y + 0.1) * 1.012, 9);
        expect(geometry.parameters.radiusBottom).toBeCloseTo(torsoRadius(figure, y - 0.1) * 1.012, 9);
        expect(y).toBeGreaterThan(figure.hem);
        expect(y).toBeLessThan(collar(figure));
      });
      // Over the whole chest, hem to collar: no plain band left at the top
      const span = collar(figure) - figure.hem;
      const ys = stripes.map(stripe => stripe.position.y);
      expect(Math.min(...ys) - figure.hem).withContext(bodyType).toBeLessThan(span / 4);
      expect(collar(figure) - Math.max(...ys)).withContext(bodyType).toBeLessThan(span / 4);
    });
  });

  it('gives only the girl lashes, and her brows a lighter line', () => {
    const boy = buildAvatar(avatar({ bodyType: 'boy' }));
    const girl = buildAvatar(avatar({ bodyType: 'girl' }));
    expect(find(boy, 'eye-lash').length).toBe(0);
    expect(find(girl, 'eye-lash').length).toBe(2);
    const thickness = (root: THREE.Object3D) =>
      (((find(root, 'brow')[0] as THREE.Mesh).geometry) as THREE.BoxGeometry).parameters.height;
    expect(thickness(girl)).toBeLessThan(thickness(boy));
  });

  it('frees every geometry and material when disposed', () => {
    const root = buildAvatar(avatar({ hat: 'crown', glasses: 'shades' }));
    const geometries = new Set<THREE.BufferGeometry>();
    root.traverse(o => { if ((o as THREE.Mesh).geometry) { geometries.add((o as THREE.Mesh).geometry); } });
    const spies = Array.from(geometries).map(g => spyOn(g, 'dispose').and.callThrough());
    disposeAvatar(root);
    spies.forEach(spy => expect(spy).toHaveBeenCalled());
  });
});

describe('glasses', () => {
  it('sit in front of the eyes on every face', () => {
    FACE_SHAPES.forEach(faceShape => {
      const centres = lensCentres(avatar({ faceShape }));
      centres.forEach((c, i) => {
        const eye = headPoint(faceShape, EYE_DIRS[i]);
        expect(c[0]).toBeCloseTo(eye[0], 9);
        expect(c[1]).toBeCloseTo(eye[1], 9);
        // Clear of the eyeball, which stands about 0.08 proud of the face
        expect(c[2] - eye[2]).toBeCloseTo(LENS_OFFSET, 9);
        expect(LENS_OFFSET).toBeGreaterThan(0.1);
      });
    });
  });

  it('have frames that are outside the head all the way round, on every face', () => {
    FACE_SHAPES.forEach(faceShape => ['round-glasses', 'goggles'].forEach(glasses => {
      const root = buildAvatar(avatar({ faceShape, glasses }));
      const frames = find(root, 'glasses-frame') as THREE.Mesh[];
      expect(frames.length).toBeGreaterThanOrEqual(2);
      frames.forEach(frame => expect(misses(headSpaceVertices(root, frame),
        p => Math.hypot(...p) > radiusAlong(faceShape, p)).length).toBe(0, `${glasses} on ${faceShape}`));
    }));
  });

  it('run their arms back over whatever is on the side of the head', () => {
    FACE_SHAPES.forEach(faceShape => ['short', 'afro', 'long'].forEach(hairStyle => {
      const root = buildAvatar(avatar({ faceShape, hairStyle: hairStyle as any, glasses: 'round-glasses' }));
      const arms = find(root, 'glasses-arm') as THREE.Mesh[];
      expect(arms.length).toBe(2);
      arms.forEach(arm => {
        const vertices = headSpaceVertices(root, arm);
        expect(misses(vertices, p => Math.hypot(...p) > radiusAlong(faceShape, p)).length)
          .toBe(0, `${faceShape}/${hairStyle} arm in the head`);
        expect(vertices.some(p => p[2] < 0)).toBe(true);
      });
    }));
  });

  it('are held on by a strap all the way round for goggles', () => {
    const root = buildAvatar(avatar({ glasses: 'goggles' }));
    expect(find(root, 'glasses-arm').length).toBe(0);
    const [strap] = find(root, 'glasses-strap') as THREE.Mesh[];
    const behind = headSpaceVertices(root, strap).filter(p => p[2] < -0.8);
    expect(behind.length).toBeGreaterThan(0);
  });
});

describe('crown', () => {
  it('sits in the hair: above the skull, but sunk into the top of the hair, on every face and style', () => {
    const radius = 0.56;
    FACE_SHAPES.forEach(faceShape => HAIR_STYLES.forEach(hairStyle => {
      const a = avatar({ faceShape, hairStyle });
      const seat = crownSeat(a, radius);
      // The hair at the front, where the crown's rim meets it
      let hairY = 0;
      let skullY = 0;
      for (let theta = 0; theta < Math.PI / 2; theta += 0.01) {
        const dir: Vec3 = [0, Math.cos(theta), Math.sin(theta)];
        const hair = hairPoint(faceShape, hairStyle, 'smooth', dir) || headPoint(faceShape, dir);
        if (!hairY && Math.hypot(hair[0], hair[2]) >= radius) {
          hairY = hair[1];
        }
        const skull = headPoint(faceShape, dir);
        if (!skullY && Math.hypot(skull[0], skull[2]) >= radius) {
          skullY = skull[1];
        }
      }
      expect(seat).toBeLessThan(hairY, `${faceShape}/${hairStyle}: crown floats`);
      expect(seat).toBeGreaterThan(skullY - 0.1, `${faceShape}/${hairStyle}: crown in the skull`);
    }));
  });

  it('rides higher on an afro than on a buzz cut', () => {
    expect(crownSeat(avatar({ hairStyle: 'afro' }), 0.56)).toBeGreaterThan(crownSeat(avatar({ hairStyle: 'buzz' }), 0.56) + 0.3);
  });

  it('has five points', () => {
    expect(find(buildAvatar(avatar({ hat: 'crown' })), 'hat-crown-tip').length).toBe(5);
  });
});

describe('wizard hat', () => {
  it('never cuts into the head on any face', () => {
    FACE_SHAPES.forEach(faceShape => {
      const root = buildAvatar(avatar({ faceShape, hat: 'wizard' }));
      const [cone] = find(root, 'hat-cone') as THREE.Mesh[];
      expect(misses(headSpaceVertices(root, cone), p => Math.hypot(...p) >= radiusAlong(faceShape, p) * HAT_LIFT).length)
        .toBe(0, faceShape);
    });
  });
});

describe('hats and items are built for the choice, not a default', () => {
  it('uses the colour each item is listed with', () => {
    ['cap', 'beanie', 'wizard'].forEach(id => {
      const root = buildAvatar(avatar({ hat: id }));
      const shell = (find(root, 'hat-shell')[0] || find(root, 'hat-cone')[0]) as THREE.Mesh;
      expect((shell.material as THREE.MeshToonMaterial).color.getHexString()).toBe(findItem('hat', id)!.colour.slice(1).toLowerCase());
    });
  });
});
