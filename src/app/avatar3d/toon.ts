import * as THREE from 'three';
import { Vec3 } from './head-surface';

/**
 * The toon look every 3D part shares — flat bands of light and a dark
 * outline — and the grid the hair and hats are built on.
 */

const OUTLINE = new THREE.Color('#2a1640');

let toonRamp: THREE.DataTexture | null = null;

/** Three bands of light: shadow, mid, lit. */
export function ramp(): THREE.DataTexture {
  if (!toonRamp) {
    // Four soft steps: shadow, half-light, light and a small highlight
    const data = new Uint8Array([120, 120, 120, 255, 185, 185, 185, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
    toonRamp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    toonRamp.minFilter = THREE.NearestFilter;
    toonRamp.magFilter = THREE.NearestFilter;
    toonRamp.generateMipmaps = false;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}

export function toon(colour: string | THREE.Color, extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color: new THREE.Color(colour as any), gradientMap: ramp(), ...extra });
}

/** A dark shell drawn behind a mesh, pushed out along its normals. */
function outlineMaterial(width: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { colour: { value: OUTLINE }, width: { value: width } },
    vertexShader: `
      uniform float width;
      void main() {
        vec3 p = position + normal * width;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 colour;
      void main() { gl_FragColor = vec4(colour, 1.0); }`,
    side: THREE.BackSide
  });
}

/** A mesh with its outline, named so a test can find it. */
export function part(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, outline = 0.025): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  if (outline > 0) {
    const shell = new THREE.Mesh(geometry, outlineMaterial(outline));
    shell.name = name + ':outline';
    mesh.add(shell);
  }
  return mesh;
}

export function at(mesh: THREE.Object3D, p: Vec3, k = 1): THREE.Object3D {
  mesh.position.set(p[0] * k, p[1] * k, p[2] * k);
  return mesh;
}

/** A sphere deformed onto a surface function. */
export function surfaceGeometry(point: (dir: Vec3) => Vec3 | null, inside: (dir: Vec3) => Vec3, detail = 64): THREE.BufferGeometry {
  const rows = Math.round(detail * 0.75);
  const geometry = new THREE.SphereGeometry(1, detail, rows);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const dir: Vec3 = [position.getX(i), position.getY(i), position.getZ(i)];
    const p = point(dir) || inside(dir);
    position.setXYZ(i, p[0], p[1], p[2]);
  }
  geometry.computeVertexNormals();
  weldNormals(geometry, detail, rows + 1, true);
  return geometry;
}

export function scale(p: Vec3, k: number): Vec3 {
  return [p[0] * k, p[1] * k, p[2] * k];
}

export function lineDir(theta: number, phi: number): Vec3 {
  return [Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi)];
}

/**
 * A cap-shaped grid: rows from the crown (straight up) down to `edge(phi)` —
 * a height on the unit sphere — at every angle round the head, each vertex
 * placed by `point`. With `tuck`, one more row turns the edge under.
 * Hair, hats and cuffs are all built on it, so each ends exactly on its line.
 */
export function crownGrid(
  edge: (phi: number) => number,
  point: (dir: Vec3, onEdge: boolean) => Vec3,
  tuck: ((edgeDir: Vec3) => Vec3) | null,
  columns = 96,
  rows = 40
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const last = tuck ? rows + 1 : rows;
  for (let r = 0; r <= last; r++) {
    for (let c = 0; c <= columns; c++) {
      const phi = (c / columns) * Math.PI * 2;
      const lineTheta = Math.acos(Math.max(-0.99, Math.min(0.99, edge(phi))));
      if (r > rows && tuck) {
        positions.push(...tuck(lineDir(lineTheta, phi)));
        continue;
      }
      const p = point(lineDir((r / rows) * lineTheta, phi), r === rows);
      positions.push(p[0], p[1], p[2]);
    }
  }
  for (let r = 0; r < last; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c;
      const b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldNormals(geometry, columns, last + 1);
  return geometry;
}

/**
 * A grid's crown row is one point repeated and its first and last columns
 * are the same seam; three.js gives each copy its own normal, and the
 * outline, pushed out along those normals, splits into spikes there. Every
 * copy gets the average.
 */
export function weldNormals(geometry: THREE.BufferGeometry, columns: number, rowCount: number, bottomPole = false) {
  const normal = geometry.attributes.normal as THREE.BufferAttribute;
  const average = (indices: number[]) => {
    const sum = new THREE.Vector3();
    indices.forEach(i => sum.add(new THREE.Vector3(normal.getX(i), normal.getY(i), normal.getZ(i))));
    sum.normalize();
    indices.forEach(i => normal.setXYZ(i, sum.x, sum.y, sum.z));
  };
  average(Array.from({ length: columns + 1 }, (_, c) => c));
  for (let r = 1; r < rowCount; r++) {
    average([r * (columns + 1), r * (columns + 1) + columns]);
  }
  if (bottomPole) {
    average(Array.from({ length: columns + 1 }, (_, c) => (rowCount - 1) * (columns + 1) + c));
  }
  normal.needsUpdate = true;
}


export function starShape(outer: number, inner: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) { s.moveTo(x, y); } else { s.lineTo(x, y); }
  }
  s.closePath();
  return s;
}
