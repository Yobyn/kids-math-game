import * as THREE from 'three';
import { Vec3 } from './head-surface';

/**
 * The toon look every 3D part shares — flat bands of light and a dark
 * outline — and the grid the hair and hats are built on.
 */

const OUTLINE = new THREE.Color('#2a1640');

let toonRamp: THREE.DataTexture | null = null;

/**
 * The four bands of light, darkest first, as the colour each multiplies a
 * surface by. The shadows lean to the stage's violet and the highlight is a
 * little warm: light and shade differ in colour as well as in brightness,
 * which is what makes a drawn character look lit rather than greyed
 * (they were four greys: 120, 185, 235, 255).
 */
export const BANDS: [number, number, number][] = [[112, 108, 150], [180, 178, 200], [236, 234, 232], [255, 252, 244]];
/** How many texels the ramp is drawn over, and how far either side of a band's edge it blends, as a share of a band. */
export const RAMP_WIDTH = 128;
export const BAND_BLEND = 0.1;

/** The colour of the light at `t` along the ramp, 0 (facing away) to 1 (facing the light). */
export function rampColour(t: number): [number, number, number] {
  const at = Math.min(Math.max(t, 0), 1) * BANDS.length;
  const band = Math.min(BANDS.length - 1, Math.floor(at));
  const into = at - band;
  // Flat across the band, blended into its neighbour over a narrow edge: a
  // soft step, where one texel a band gave an edge of stair-steps
  const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k) as [number, number, number];
  const smooth = (k: number) => k * k * (3 - 2 * k);
  if (into < BAND_BLEND && band > 0) {
    return mix(BANDS[band - 1], BANDS[band], smooth(0.5 + into / (2 * BAND_BLEND)));
  }
  if (into > 1 - BAND_BLEND && band < BANDS.length - 1) {
    return mix(BANDS[band], BANDS[band + 1], smooth((into - (1 - BAND_BLEND)) / (2 * BAND_BLEND)));
  }
  return BANDS[band];
}

/** Four bands of light — shadow, half-light, light, highlight — with soft edges between them. */
export function ramp(): THREE.DataTexture {
  if (!toonRamp) {
    const data = new Uint8Array(RAMP_WIDTH * 4);
    for (let i = 0; i < RAMP_WIDTH; i++) {
      const [r, g, b] = rampColour((i + 0.5) / RAMP_WIDTH);
      data.set([Math.round(r), Math.round(g), Math.round(b), 255], i * 4);
    }
    toonRamp = new THREE.DataTexture(data, RAMP_WIDTH, 1, THREE.RGBAFormat);
    toonRamp.minFilter = THREE.LinearFilter;
    toonRamp.magFilter = THREE.LinearFilter;
    toonRamp.generateMipmaps = false;
    toonRamp.needsUpdate = true;
  }
  return toonRamp;
}

/**
 * A rim of light round every part, brightest where its surface turns away
 * from the eye: the glow a figure has standing in front of a light. On the
 * dark stage it lifts each part off the background and off the part behind
 * it, where flat bands alone left a dark top on dark trousers as one shape.
 * RIM.strength of the part's own colour, lightened by RIM.white, falling off
 * with the RIM.power-th power of how square-on the surface is.
 */
export const RIM = { strength: 0.42, white: 0.55, power: 3 };

const LIT = 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;';

/** Adds the rim to a toon material's shader. One function for every material, so they all share one program. */
export function addRim(shader: { fragmentShader: string }): void {
  shader.fragmentShader = shader.fragmentShader.replace(LIT, `${LIT}
	float rimEdge = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), ${RIM.power.toFixed(1)});
	outgoingLight += mix(diffuseColor.rgb, vec3(1.0), ${RIM.white.toFixed(2)}) * rimEdge * ${RIM.strength.toFixed(2)};`);
}

export function toon(colour: string | THREE.Color, extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({ color: new THREE.Color(colour as any), gradientMap: ramp(), ...extra });
  material.onBeforeCompile = addRim;
  return material;
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
