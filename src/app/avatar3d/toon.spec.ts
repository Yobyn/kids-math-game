import * as THREE from 'three';
import { defaultAvatar } from '../avatar/avatar-model';
import { SHADOW, SHADOW_DARKEST, SHADOW_REACH, buildAvatar, disposeAvatar } from './build-avatar';
import { BANDS, BAND_BLEND, RAMP_WIDTH, RIM, addRim, ramp, rampColour, toon } from './toon';

describe('the toon look: bands of light with soft edges, a rim, and a shadow underfoot (2026-11-16)', () => {
  const brightness = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  it('lights a surface in four bands, each brighter than the last, flat across its middle', () => {
    expect(BANDS.length).toBe(4);
    BANDS.forEach((band, i) => {
      if (i) {
        expect(brightness(band)).withContext(`band ${i}`).toBeGreaterThan(brightness(BANDS[i - 1]) + 15);
      }
      // the same colour right across the band, away from its edges
      [0.25, 0.5, 0.75].forEach(into => expect(rampColour((i + into) / 4)).withContext(`band ${i} at ${into}`).toEqual(band));
    });
    expect(rampColour(0)).toEqual(BANDS[0]);
    expect(rampColour(1)).toEqual(BANDS[3]);
  });

  it('shades towards the stage\'s violet and lights a little warm: not four greys', () => {
    const [shadow, , , highlight] = BANDS;
    // more blue than red or green in the shade
    expect(shadow[2]).toBeGreaterThan(shadow[0] + 25);
    expect(shadow[2]).toBeGreaterThan(shadow[1] + 25);
    // and more red than blue in the highlight
    expect(highlight[0]).toBeGreaterThan(highlight[2]);
    // a shadow is still a shadow of the surface's own colour: no channel under 40% of the light
    shadow.forEach(channel => expect(channel).toBeGreaterThan(255 * 0.4));
  });

  it('blends from one band into the next over a narrow edge, never a stair-step', () => {
    expect(BAND_BLEND).toBeGreaterThan(0.04);
    expect(BAND_BLEND).toBeLessThan(0.2);
    for (let i = 1; i < 4; i++) {
      // halfway between the two bands exactly on the edge
      rampColour(i / 4).forEach((channel, c) => expect(channel).withContext(`edge ${i}`).toBeCloseTo((BANDS[i - 1][c] + BANDS[i][c]) / 2, 6));
    }
    // brightness only ever rises along the ramp, by a little at each step
    let before = brightness(rampColour(0));
    for (let i = 1; i <= 400; i++) {
      const at = brightness(rampColour(i / 400));
      expect(at).withContext(`${i}`).toBeGreaterThanOrEqual(before - 1e-9);
      expect(at - before).withContext(`${i}`).toBeLessThan(12);
      before = at;
    }
  });

  it('draws the ramp wide enough to hold its soft edges, and reads it smoothly', () => {
    const texture = ramp();
    expect(texture.image.width).toBe(RAMP_WIDTH);
    expect(RAMP_WIDTH).toBeGreaterThanOrEqual(64);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.minFilter).toBe(THREE.LinearFilter);
    const data = texture.image.data as unknown as Uint8Array;
    // its first texel is the shadow, its last the highlight
    expect(Array.from(data.slice(0, 3))).toEqual(BANDS[0]);
    expect(Array.from(data.slice((RAMP_WIDTH - 1) * 4, (RAMP_WIDTH - 1) * 4 + 3))).toEqual(BANDS[3]);
  });

  it('gives every toon material the rim, added to the shader three.js itself ships', () => {
    const material = toon('#5c7799');
    expect(material.gradientMap).toBe(ramp());
    expect(material.onBeforeCompile).toBe(addRim);
    // one function for all of them: three.js keys its programs on it, so they share one
    expect(toon('#ffffff').onBeforeCompile).toBe(material.onBeforeCompile);
    // The rim is written into the toon shader after the line that sums the light. If a new
    // three.js words that line differently, the rim would vanish without a sound: this fails first
    const shader = { fragmentShader: THREE.ShaderLib.toon.fragmentShader };
    addRim(shader);
    expect(shader.fragmentShader).not.toBe(THREE.ShaderLib.toon.fragmentShader);
    expect(shader.fragmentShader).toContain('rimEdge');
    expect(shader.fragmentShader).toContain(`* ${RIM.strength.toFixed(2)};`);
    // after the light is summed, before the colour is written out
    const [summed, rim, written] = ['vec3 outgoingLight =', 'outgoingLight += mix(', 'gl_FragColor = vec4( outgoingLight'].map(text => shader.fragmentShader.indexOf(text));
    expect(summed).toBeGreaterThan(0);
    expect(rim).toBeGreaterThan(summed);
    expect(written).toBeGreaterThan(rim);
  });

  it('keeps the rim a rim: brightest at the edge, a part of the colour and not a wash of white', () => {
    expect(RIM.strength).toBeGreaterThan(0.25);
    expect(RIM.strength).toBeLessThan(0.6);
    expect(RIM.power).toBeGreaterThanOrEqual(2);
    expect(RIM.white).toBeLessThan(0.8);
    // square-on to the eye it adds next to nothing: under a twentieth of what it adds at the edge
    expect(Math.pow(1 - 0.75, RIM.power)).toBeLessThan(0.05);
  });

  it('lays a soft shadow on the stand under every character: dark in the middle, gone at the rim', () => {
    (['kid', 'creature', 'robot', 'animal', 'space', 'pizza'] as const).forEach(family => {
      const root = buildAvatar({ ...defaultAvatar(), family, stage: 2 });
      const stand = root.getObjectByName('pedestal')!;
      const shadows: THREE.Mesh[] = [];
      stand.traverse(node => { if (node.name === 'pedestal-shadow') { shadows.push(node as THREE.Mesh); } });
      expect(shadows.length).withContext(family).toBe(1);
      const [shadow] = shadows;
      const top = stand.getObjectByName('pedestal-top') as THREE.Mesh;
      const standRadius = (top.geometry as THREE.CylinderGeometry).parameters.radiusTop;
      // inside the stand, lying flat just on its top face, under the feet (which stand at 0)
      expect((shadow.geometry as THREE.CircleGeometry).parameters.radius).withContext(family).toBeCloseTo(standRadius * SHADOW_REACH, 9);
      expect(SHADOW_REACH).toBeLessThan(1);
      expect(shadow.position.y).toBeGreaterThan(top.position.y + 0.09 - 1e-9);
      expect(shadow.position.y).toBeLessThan(0);
      const material = shadow.material as THREE.ShaderMaterial;
      // see-through, never hiding what is drawn after it, in the shadow's colour
      expect(material.transparent).toBeTrue();
      expect(material.depthWrite).toBeFalse();
      expect('#' + material.uniforms.colour.value.getHexString()).toBe(SHADOW);
      expect(material.uniforms.darkest.value).toBe(SHADOW_DARKEST);
      // a gradient, not a disc with an edge: its strength falls off with the distance from the middle
      expect(material.fragmentShader).toContain('smoothstep');
      expect(SHADOW_DARKEST).toBeGreaterThan(0.3);
      expect(SHADOW_DARKEST).toBeLessThan(0.7);
      disposeAvatar(root);
    });
  });

  it('compiles and draws with the rim and the shadow, where the browser can draw in 3D at all', () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas });
    } catch {
      pending('no WebGL here');
      return;
    }
    const errors: string[] = [];
    const error = console.error;
    console.error = (...said: any[]) => errors.push(said.join(' '));
    const root = buildAvatar(defaultAvatar());
    try {
      const scene = new THREE.Scene();
      scene.add(root, new THREE.HemisphereLight('#ffffff', '#222222', 1));
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 4, 20);
      renderer.render(scene, camera);
    } finally {
      console.error = error;
      disposeAvatar(root);
      renderer.dispose();
      renderer.forceContextLoss();
    }
    expect(errors.filter(said => /shader|program|GLSL/i.test(said))).toEqual([]);
  });
});
