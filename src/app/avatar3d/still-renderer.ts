import * as THREE from 'three';
import { Avatar } from '../avatar/avatar-model';
import { buildAvatar, disposeAvatar } from './build-avatar';
import { Figure, figureFor } from './figure';

/**
 * The 3D character as a still picture, for every screen that is not the
 * dressing-up screen: the header, the end of a round, the progress screen,
 * the title screen. One offscreen renderer draws them all, one at a time, and
 * hands back an image; the page shows an <img>, so no screen but the
 * dressing-up screen ever runs a live 3D scene.
 *
 * Fetched only when a still is first wanted (see AvatarStillService), so
 * three.js is never in the first load.
 */

export type StillFraming = 'portrait' | 'full';

/** The still's own light: the stage's, so the character looks the same everywhere. */
function light(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  scene.add(new THREE.HemisphereLight('#f0ecff', '#3a2a5a', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 0.75);
  key.position.set(-3, 4, 0);
  key.target.position.set(0, 0, -10);
  camera.add(key, key.target);
  scene.add(camera);
}

/** A little turned, so it reads as 3D even as a small picture. */
export const STILL_TURN = 0.35;
/** Room round the character, as a share of what it needs. */
export const STILL_MARGIN = 1.08;

/**
 * What a still frames. A portrait is the head and whatever is on it, down to
 * the shoulders; a full still is the head to the hips, without the legs.
 */
export function framedBox(model: THREE.Object3D, framing: StillFraming, figure: Figure): THREE.Box3 {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3();
  if (framing === 'portrait') {
    ['head-group', 'hair', 'hat', 'glasses'].forEach(name => {
      const part = model.getObjectByName(name);
      if (part) {
        box.expandByObject(part);
      }
    });
    // Down to the top of the shoulders, so a portrait is not a floating head
    const head = model.getObjectByName('head-group')!;
    const headSize = new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3());
    box.min.y -= headSize.y * 0.45;
    box.min.x = Math.min(box.min.x, -headSize.x * 0.95);
    box.max.x = Math.max(box.max.x, headSize.x * 0.95);
    return box;
  }
  // Head to hips: the clothes and who is wearing them. The whole figure is
  // seven heads tall, which in a small round frame is a matchstick
  ['body', 'head-group', 'hair', 'hat', 'glasses'].forEach(name => {
    const part = model.getObjectByName(name);
    if (part) {
      box.expandByObject(part);
    }
  });
  box.min.y = Math.max(box.min.y, figure.belt);
  // Out to the shoulders: the hands hang wider, and would make the head small
  const reach = figure.shoulder[0] + figure.armRadii[0];
  box.min.x = Math.max(box.min.x, -reach);
  box.max.x = Math.min(box.max.x, reach);
  return box;
}

/**
 * How far back a camera of this field of view (degrees) and aspect must be to
 * see all of a box `width` wide and `height` tall, with the margin.
 */
export function stillDistance(width: number, height: number, depth: number, fov: number, aspect: number): number {
  const tan = Math.tan((fov * Math.PI) / 360);
  const byHeight = height / 2 / tan;
  const byWidth = width / 2 / (tan * aspect);
  return Math.max(byHeight, byWidth) * STILL_MARGIN + depth / 2;
}

export class StillRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  constructor(private renderer: THREE.WebGLRenderer) {
    renderer.setClearColor(0x000000, 0);
    light(this.scene, this.camera);
  }

  /** The character as a PNG data URL, `width` by `height` device pixels. */
  render(avatar: Avatar, framing: StillFraming, width: number, height: number): string {
    const model = buildAvatar(avatar);
    const stand = model.getObjectByName('pedestal');
    if (stand) {
      model.remove(stand);
    }
    this.scene.add(model);
    try {
      const box = framedBox(model, framing, figureFor(avatar.bodyType));
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const aspect = width / height;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      const distance = stillDistance(size.x, size.y, size.z, this.camera.fov, aspect);
      this.camera.position.set(centre.x + Math.sin(STILL_TURN) * distance, centre.y, centre.z + Math.cos(STILL_TURN) * distance);
      this.camera.lookAt(centre);
      this.camera.updateMatrixWorld(true);
      this.renderer.setSize(width, height, false);
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    } finally {
      this.scene.remove(model);
      disposeAvatar(model);
      if (stand) {
        disposeAvatar(stand);
      }
    }
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/** A renderer for stills, or null where the browser cannot draw in 3D. */
export function createStillRenderer(): StillRenderer | null {
  try {
    const canvas = document.createElement('canvas');
    if (!(canvas.getContext('webgl2') || canvas.getContext('webgl'))) {
      return null;
    }
    const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    return new StillRenderer(renderer);
  } catch {
    return null;
  }
}
