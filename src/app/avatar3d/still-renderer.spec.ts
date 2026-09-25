import * as THREE from 'three';
import { defaultAvatar } from '../avatar/avatar-model';
import { buildAvatar, disposeAvatar } from './build-avatar';
import { FIGURES, crownY } from './figure';
import { STILL_MARGIN, createStillRenderer, framedBox, stillDistance } from './still-renderer';

describe('still renderer', () => {
  describe('framing', () => {
    const boy = { ...defaultAvatar(), bodyType: 'boy' as const, hat: 'none', glasses: 'none' };
    let model: THREE.Group;

    beforeEach(() => (model = buildAvatar(boy)));
    afterEach(() => disposeAvatar(model));

    it('frames a portrait round the head, down to the shoulders but not the chest', () => {
      const box = framedBox(model, 'portrait', FIGURES.boy);
      const head = new THREE.Box3().setFromObject(model.getObjectByName('head-group')!);
      expect(box.containsBox(head)).toBeTrue();
      expect(box.min.y).toBeLessThan(head.min.y);
      expect(box.min.y).toBeGreaterThan(FIGURES.boy.shoulder[1] - 1);
    });

    it('frames a full still from the belt to the top of the hair, out to the shoulders', () => {
      const box = framedBox(model, 'full', FIGURES.boy);
      expect(box.min.y).toBeCloseTo(FIGURES.boy.belt, 5);
      expect(box.max.y).toBeGreaterThanOrEqual(crownY(FIGURES.boy));
      const reach = FIGURES.boy.shoulder[0] + FIGURES.boy.armRadii[0];
      expect(box.max.x).toBeLessThanOrEqual(reach + 1e-6);
      expect(box.max.x).toBeGreaterThan(FIGURES.boy.shoulder[0]);
      expect(box.min.x).toBeGreaterThanOrEqual(-reach - 1e-6);
    });

    it('leaves room above a tall hat', () => {
      const hatted = buildAvatar({ ...boy, hat: 'wizard' as any });
      try {
        const hat = new THREE.Box3().setFromObject(hatted.getObjectByName('hat')!);
        expect(framedBox(hatted, 'portrait', FIGURES.boy).max.y).toBeGreaterThanOrEqual(hat.max.y - 1e-6);
      } finally {
        disposeAvatar(hatted);
      }
    });
  });

  describe('distance', () => {
    it('backs off far enough to see the whole box, with the margin', () => {
      const fov = 30;
      const tan = Math.tan((fov * Math.PI) / 360);
      const d = stillDistance(2, 4, 0, fov, 1);
      expect(d).toBeCloseTo((4 / 2 / tan) * STILL_MARGIN, 6);
    });

    it('lets the wider side decide in a tall frame', () => {
      const fov = 30;
      const tan = Math.tan((fov * Math.PI) / 360);
      expect(stillDistance(4, 4, 0, fov, 0.5)).toBeCloseTo((4 / 2 / (tan * 0.5)) * STILL_MARGIN, 6);
    });

    it('stands clear of the front of a deep box', () => {
      expect(stillDistance(2, 2, 6, 30, 1) - stillDistance(2, 2, 0, 30, 1)).toBeCloseTo(3, 6);
    });
  });

  describe('drawing', () => {
    it('draws the character as a picture, with a see-through background', () => {
      const renderer = createStillRenderer();
      if (!renderer) {
        pending('no WebGL in this browser');
        return;
      }
      try {
        const url = renderer.render(defaultAvatar(), 'portrait', 48, 48);
        expect(url.startsWith('data:image/png;base64,')).toBeTrue();
        const again = renderer.render({ ...defaultAvatar(), hat: 'cap' as any }, 'full', 48, 64);
        expect(again.startsWith('data:image/png;base64,')).toBeTrue();
        expect(again).not.toBe(url);
      } finally {
        renderer.dispose();
      }
    });

    it('fills the middle of the picture with the character and leaves the corners clear', async () => {
      const renderer = createStillRenderer();
      if (!renderer) {
        pending('no WebGL in this browser');
        return;
      }
      let url: string;
      try {
        url = renderer.render(defaultAvatar(), 'portrait', 40, 40);
      } finally {
        renderer.dispose();
      }
      const image = new Image();
      await new Promise(resolve => {
        image.onload = resolve;
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 40;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const alpha = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[3];
      expect([alpha(0, 0), alpha(39, 0)]).toEqual([0, 0]);
      expect(alpha(20, 20)).toBe(255);
      let drawn = 0;
      const pixels = context.getImageData(0, 0, 40, 40).data;
      for (let i = 3; i < pixels.length; i += 4) {
        drawn += pixels[i] > 0 ? 1 : 0;
      }
      // The head fills much of the frame, but not all of it
      expect(drawn / 1600).toBeGreaterThan(0.35);
      expect(drawn / 1600).toBeLessThan(0.95);
    });

    it('answers null where the browser cannot draw in 3D', () => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      spyOn(HTMLCanvasElement.prototype, 'getContext').and.callFake(function (this: HTMLCanvasElement, type: string, ...rest: any[]) {
        return /webgl/.test(type) ? null : (getContext as any).call(this, type, ...rest);
      } as any);
      expect(createStillRenderer()).toBeNull();
    });
  });
});
