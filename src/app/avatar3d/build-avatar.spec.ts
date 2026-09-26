import * as THREE from 'three';
import {
  Avatar, FACE_SHAPES, HAIR_STYLES, HAIR_TEXTURES, NO_ITEM, WARDROBE, defaultAvatar, findItem
} from '../avatar/avatar-model';
import { HATS_OVER_HAIR } from '../avatar/avatar-parts';
import { EYE_SCALE, EYE_SIZE, EYE_WHITE, IRIS, NOSE_SIZE, buildAvatar, disposeAvatar, topCut } from './build-avatar';
import { FIGURES, Figure, chinY, figureFor, torsoRadius } from './figure';
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

  it('builds every hat, pair of glasses and top in the wardrobe on every face', () => {
    const items = WARDROBE.filter(item => item.id !== NO_ITEM);
    expect(items.length).toBeGreaterThan(10);
    items.forEach(item => FACE_SHAPES.forEach(faceShape => {
      const root = buildAvatar(avatar({ faceShape, [item.slot]: item.id } as Partial<Avatar>));
      if (item.slot === 'top') {
        const [torso] = find(root, 'torso') as THREE.Mesh[];
        expect((torso.material as THREE.MeshToonMaterial).color.getHexString()).toBe(item.colour.slice(1).toLowerCase(), item.id);
      } else {
        const [worn] = find(root, item.slot);
        expect(worn).toBeTruthy(`${item.id} on ${faceShape}`);
        let meshes = 0;
        worn.traverse(o => { if ((o as THREE.Mesh).isMesh) { meshes++; } });
        expect(meshes).toBeGreaterThan(2, item.id);
      }
      disposeAvatar(root);
    }));
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
      // About three and a third heads tall, stylised (figure.ts, STYLE); an oval face is itself a longer head
      expect(head.max.y / headHeight).toBeGreaterThan(faceShape === 'oval' ? 2.9 : 3.1, `${bodyType}/${faceShape}`);
      expect(head.max.y / headHeight).toBeLessThan(3.8, `${bodyType}/${faceShape}`);
      // The chin rests just above the collar: no gap under it, not sunk into the body
      const collar = figure.torso[figure.torso.length - 1][1];
      expect(head.min.y - collar).toBeGreaterThan(0, `${bodyType}/${faceShape}`);
      expect(head.min.y - collar).toBeLessThan(0.8, `${bodyType}/${faceShape}`);
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
      expect(find(root, 'shoulder').length).toBe(2);
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

  it('dresses every figure in cargo trousers with pockets, a belt and sneakers', () => {
    BODY_TYPES.forEach(bodyType => {
      const root = buildAvatar(avatar({ bodyType }));
      expect(find(root, 'leg').length).toBe(4);
      expect(find(root, 'cargo-pocket').length).toBe(2);
      expect(find(root, 'belt').length).toBe(1);
      expect(find(root, 'shoe').length).toBe(2);
      find(root, 'shoe').forEach(shoe => expect(shoe.position.y).toBe(0));
    });
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
        expect(y).toBeLessThan(figure.shoulder[1]);
      });
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
