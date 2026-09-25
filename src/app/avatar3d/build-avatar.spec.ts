import * as THREE from 'three';
import {
  Avatar, FACE_SHAPES, HAIR_STYLES, HAIR_TEXTURES, NO_ITEM, WARDROBE, defaultAvatar, findItem
} from '../avatar/avatar-model';
import { HATS_OVER_HAIR } from '../avatar/avatar-parts';
import { HEAD_Y, buildAvatar, disposeAvatar } from './build-avatar';
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

/** A mesh's vertices in head space: relative to the centre of the head. */
function headSpaceVertices(root: THREE.Object3D, mesh: THREE.Mesh): Vec3[] {
  root.updateMatrixWorld(true);
  const position = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const out: Vec3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    out.push([v.x, v.y - HEAD_Y, v.z]);
  }
  return out;
}

const COVERING = WARDROBE.filter(item => item.slot === 'hat' && HATS_OVER_HAIR.includes(item.id)).map(item => item.id);

describe('buildAvatar', () => {
  it('builds every face with every hair style, in every texture, and nothing inside the head', () => {
    FACE_SHAPES.forEach(faceShape => HAIR_STYLES.forEach((hairStyle, i) => {
      const hairTexture = HAIR_TEXTURES[i % HAIR_TEXTURES.length];
      const root = buildAvatar(avatar({ faceShape, hairStyle, hairTexture }));
      const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
      expect(shell).toBeTruthy(`${faceShape}/${hairStyle} has no hair`);
      const vertices = headSpaceVertices(root, shell);
      let outside = 0;
      for (const p of vertices) {
        const r = Math.hypot(...p);
        const head = radiusAlong(faceShape, p);
        // The only vertices under the skin are the row that tucks the edge in
        expect(r).toBeGreaterThan(head * 0.96, `${faceShape}/${hairStyle} cuts into the head`);
        if (r > head * 1.001) {
          outside++;
        }
      }
      expect(outside / vertices.length).toBeGreaterThan(0.9, `${faceShape}/${hairStyle}`);
      disposeAvatar(root);
    }));
  });

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
      for (const p of headSpaceVertices(root, shell)) {
        const d = normalise(p);
        for (const eye of EYE_DIRS) {
          const angle = Math.acos(d[0] * eye[0] + d[1] * eye[1] + d[2] * eye[2]);
          expect(angle).toBeGreaterThan(0.2, `${faceShape}/${hairStyle} hair over an eye`);
        }
      }
      disposeAvatar(root);
    }));
  });

  it('keeps every covering hat clear of the hair under it, on every face and style', () => {
    COVERING.forEach(hat => FACE_SHAPES.forEach(faceShape => HAIR_STYLES.forEach(hairStyle => {
      const root = buildAvatar(avatar({ faceShape, hairStyle, hat, hairTexture: 'coily' }));
      const [shell] = find(root, 'hair-shell') as THREE.Mesh[];
      for (const p of headSpaceVertices(root, shell)) {
        expect(Math.hypot(...p)).toBeLessThanOrEqual(radiusAlong(faceShape, p) * (1 + HAT_CAP) + 1e-6,
          `${hat}/${faceShape}/${hairStyle}: hair would poke through`);
      }
      const [hatShell] = find(root, 'hat-shell') as THREE.Mesh[];
      if (hatShell) {
        let above = 0;
        for (const p of headSpaceVertices(root, hatShell)) {
          // Every vertex but the tucked-in underside stands clear of the flattened hair
          if (Math.hypot(...p) > radiusAlong(faceShape, p) * 1.01) {
            above++;
            expect(Math.hypot(...p)).toBeGreaterThan(radiusAlong(faceShape, p) * (1 + HAT_CAP), `${hat}/${faceShape}`);
          }
        }
        expect(above).toBeGreaterThan(0);
      }
      disposeAvatar(root);
    })));
  });

  it('ends each hat on the brim line, above the brows', () => {
    FACE_SHAPES.forEach(faceShape => {
      const root = buildAvatar(avatar({ faceShape, hat: 'cap' }));
      const [hatShell] = find(root, 'hat-shell') as THREE.Mesh[];
      for (const p of headSpaceVertices(root, hatShell)) {
        const d = normalise(p);
        expect(d[1]).toBeGreaterThanOrEqual(hatBrim(d) - 0.03, `${faceShape}: hat below its brim`);
      }
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
    expect(find(buildAvatar(avatar({ hairStyle: 'braids' })), 'hair-braid').length).toBe(14);
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
    expect(find(buildAvatar(avatar({ top: 'striped' })), 'stripe').length).toBe(4);
    expect(find(buildAvatar(avatar({ top: 'star-tee' })), 'decal').length).toBe(1);
    expect(find(buildAvatar(avatar({ top: 'flower-tee' })), 'decal').length).toBe(1);
    const hoodie = buildAvatar(avatar({ top: 'hoodie' }));
    expect(find(hoodie, 'hood').length).toBe(1);
    expect(find(hoodie, 'hoodie-string').length).toBe(2);
    expect(find(hoodie, 'hoodie-pocket').length).toBe(1);
  });

  it('colours the face from the choices', () => {
    const root = buildAvatar(avatar({ skin: '#8d5524', eyeColour: '#3f8f5a', hairColour: '#e0b35a' }));
    const colour = (name: string) => ((find(root, name)[0] as THREE.Mesh).material as THREE.MeshToonMaterial).color.getHexString();
    expect(colour('head')).toBe('8d5524');
    expect(colour('iris')).toBe('3f8f5a');
    expect(colour('hair-shell')).toBe('e0b35a');
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

  it('stands the character on its stand', () => {
    const root = buildAvatar(avatar());
    const box = new THREE.Box3().setFromObject(find(root, 'body')[0]);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.min.y).toBeLessThan(0.1);
    const stand = new THREE.Box3().setFromObject(find(root, 'pedestal')[0]);
    expect(stand.max.y).toBeLessThanOrEqual(0.05);
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
      frames.forEach(frame => headSpaceVertices(root, frame).forEach(p => {
        expect(Math.hypot(...p)).toBeGreaterThan(radiusAlong(faceShape, p), `${glasses} on ${faceShape}`);
      }));
    }));
  });

  it('run their arms back over whatever is on the side of the head', () => {
    FACE_SHAPES.forEach(faceShape => ['short', 'afro', 'long'].forEach(hairStyle => {
      const root = buildAvatar(avatar({ faceShape, hairStyle: hairStyle as any, glasses: 'round-glasses' }));
      const arms = find(root, 'glasses-arm') as THREE.Mesh[];
      expect(arms.length).toBe(2);
      arms.forEach(arm => {
        const vertices = headSpaceVertices(root, arm);
        let reachesBack = false;
        for (const p of vertices) {
          expect(Math.hypot(...p)).toBeGreaterThan(radiusAlong(faceShape, p), `${faceShape}/${hairStyle} arm in the head`);
          if (p[2] < 0) {
            reachesBack = true;
          }
        }
        expect(reachesBack).toBe(true);
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
      for (const p of headSpaceVertices(root, cone)) {
        expect(Math.hypot(...p)).toBeGreaterThanOrEqual(radiusAlong(faceShape, p) * HAT_LIFT, faceShape);
      }
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
