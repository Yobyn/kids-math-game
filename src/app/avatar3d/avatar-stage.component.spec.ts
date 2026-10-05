import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import * as THREE from 'three';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BODY_TYPES, NO_ITEM, defaultAvatar } from '../avatar/avatar-model';
import { buildAvatar, disposeAvatar } from './build-avatar';
import { CREATURE, CREATURE_GLOW, CREATURE_HEAD } from './creatures';
import { EVOLVE_SECONDS, EVOLVE_SWAP, evolution } from './motion';
import { AvatarStageComponent, BASE_CENTRE, BASE_DISTANCE, HEAD_DISTANCE_MIN, easeInOut, framing, headFraming, lightDistance } from './avatar-stage.component';

describe('framing', () => {
  it('keeps the usual distance for a character of ordinary height', () => {
    // The stylised character with short hair and a cap, stand to cap: about 13
    expect(framing(-0.2, 13, 30, 1.1)).toEqual({ distance: BASE_DISTANCE, centre: BASE_CENTRE });
  });

  it('shows an ordinary character whole at the usual distance, with as much room above as below', () => {
    BODY_TYPES.forEach(bodyType => {
      const model = buildAvatar({ ...defaultAvatar(), bodyType, hat: 'cap', top: 'hoodie' });
      const box = new THREE.Box3().setFromObject(model);
      disposeAvatar(model);
      // From where the stage first puts the camera
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      camera.position.set(0, BASE_CENTRE + 3, BASE_DISTANCE);
      camera.lookAt(0, BASE_CENTRE, 0);
      camera.updateMatrixWorld(true);
      const top = new THREE.Vector3(0, box.max.y, 0).project(camera).y;
      const bottom = new THREE.Vector3(0, box.min.y, box.max.z).project(camera).y;
      expect(top).toBeLessThan(0.95, bodyType);
      expect(bottom).toBeGreaterThan(-0.95, bodyType);
      // Near enough: the girl is a little shorter, so has a little more room above
      expect(Math.abs((1 - top) - (bottom + 1))).toBeLessThan(0.2, bodyType);
    });
  });

  it('backs off, and looks higher, for a tall hat or a big afro', () => {
    const tall = framing(-0.2, 18, 30, 1.1);
    expect(tall.distance).toBeGreaterThan(BASE_DISTANCE);
    expect(tall.centre).toBeCloseTo(8.9, 9);
    // Everything from the stand to the tip fits in the view
    const half = Math.tan((30 * Math.PI) / 360) * tall.distance;
    expect(half * 2).toBeGreaterThan(18.2);
  });

  it('backs off further on a narrow screen, where the width is the limit', () => {
    expect(framing(-0.2, 18, 30, 0.6).distance).toBeGreaterThan(framing(-0.2, 18, 30, 1).distance);
  });

  it('never comes closer than usual', () => {
    for (let top = 0; top < 20; top += 0.5) {
      expect(framing(-0.2, top, 30, 1).distance).toBeGreaterThanOrEqual(BASE_DISTANCE);
    }
  });
});

describe('lightDistance', () => {
  const across = (distance: number, aspect: number) => distance * Math.tan((30 * Math.PI) / 360) * aspect;
  const upDown = (distance: number) => distance * Math.tan((30 * Math.PI) / 360);

  it('steps back far enough for all of a glow to be on the screen, across and up and down', () => {
    // Reaching further up than down, and further down than up
    [{ reach: 8, top: 18, bottom: -3 }, { reach: 8, top: 14, bottom: -7 }].forEach(light => {
      [0.6, 0.86, 1, 1.7].forEach(aspect => {
        const distance = lightDistance(light, 6, 30, aspect);
        expect(across(distance, aspect)).toBeGreaterThanOrEqual(light.reach - 1e-9);
        expect(6 + upDown(distance)).withContext(`aspect ${aspect}`).toBeGreaterThanOrEqual(light.top - 1e-9);
        expect(6 - upDown(distance)).withContext(`aspect ${aspect}`).toBeLessThanOrEqual(light.bottom + 1e-9);
      });
      // The narrower the screen, the further back
      expect(lightDistance(light, 6, 30, 0.3)).toBeGreaterThan(lightDistance(light, 6, 30, 1));
    });
  });

  it('asks for no more room than the glow needs: one of its edges is right at the edge of the screen', () => {
    const light = { reach: 8, top: 9, bottom: 3 };
    const distance = lightDistance(light, 6, 30, 0.86);
    expect(across(distance, 0.86)).toBeCloseTo(light.reach, 9);
  });
});

describe('headFraming', () => {
  it('frames the head and what is on it, centred, with room round it', () => {
    const { distance, centre } = headFraming(12, 16, 30, 1);
    expect(centre).toBe(14);
    const half = Math.tan((30 * Math.PI) / 360) * distance;
    expect(half * 2).toBeGreaterThan(4);
    expect(half * 2).toBeLessThan(6.5);
  });

  it('comes no closer than a comfortable distance for a small head', () => {
    expect(headFraming(13, 13.2, 30, 1).distance).toBe(HEAD_DISTANCE_MIN);
  });

  it('backs off on a narrow screen', () => {
    expect(headFraming(12, 18, 30, 0.5).distance).toBeGreaterThan(headFraming(12, 18, 30, 1).distance);
  });
});

describe('easeInOut', () => {
  it('starts and ends where it should and is slow at both ends', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 9);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(0.9)).toBeGreaterThan(0.9);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      expect(easeInOut(t)).toBeGreaterThanOrEqual(last);
      last = easeInOut(t);
    }
  });
});

describe('AvatarStageComponent', () => {
  let fixture: ComponentFixture<AvatarStageComponent>;
  let component: AvatarStageComponent;

  async function create(webgl: boolean, before?: () => void) {
    const canUse = AvatarStageComponent.canUseWebGL;
    (jasmine.isSpy(canUse) ? (canUse as jasmine.Spy) : spyOn(AvatarStageComponent, 'canUseWebGL')).and.returnValue(webgl);
    await TestBed.configureTestingModule({
      declarations: [AvatarStageComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(AvatarStageComponent);
    component = fixture.componentInstance;
    component.avatar = { ...defaultAvatar(), hat: 'cap', glasses: NO_ITEM, top: NO_ITEM };
    component.label = 'Your character';
    component.turnLeftLabel = 'Turn left';
    component.turnRightLabel = 'Turn right';
    before?.();
    fixture.detectChanges();
  }

  afterEach(() => fixture?.destroy());

  it('shows the 2D character where there is no WebGL, and no turn buttons', async () => {
    await create(false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('canvas')).toBeNull();
    expect(el.querySelector('app-avatar')).not.toBeNull();
    expect(el.querySelector('.turn-button')).toBeNull();
    // Head to toe, as big as the stage, in the choices being made
    const flat = fixture.debugElement.query(By.css('app-avatar'));
    expect(flat.attributes.framing).toBe('full');
    expect(flat.properties.size).toBe(180);
    expect(flat.properties.avatar).toBe(component.avatar);
  });

  it('finds out whether this browser can draw in 3D', () => {
    const canvas = document.createElement('canvas');
    const real = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    expect(AvatarStageComponent.canUseWebGL()).toBe(real);
  });

  it('says it cannot draw in 3D when asking throws', () => {
    spyOn(document, 'createElement').and.throwError('no canvas');
    expect(AvatarStageComponent.canUseWebGL()).toBe(false);
  });

  describe('with WebGL', () => {
    beforeEach(async () => {
      await create(true);
    });

    it('draws the character on a labelled canvas', () => {
      const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(canvas.getAttribute('role')).toBe('img');
      expect(canvas.getAttribute('aria-label')).toBe('Your character');
      expect(component.model).toBeTruthy();
      let hat = false;
      component.model!.traverse(o => { hat = hat || o.name === 'hat'; });
      expect(hat).toBe(true);
    });

    it('gives the turn buttons names a screen reader can read', () => {
      const buttons = fixture.nativeElement.querySelectorAll('.turn-button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].getAttribute('aria-label')).toBe('Turn left');
      expect(buttons[1].getAttribute('aria-label')).toBe('Turn right');
      expect(buttons[0].getAttribute('type')).toBe('button');
    });

    it('turns an eighth of the way round each press, adding presses made mid-turn', () => {
      const spin = (component as any).animateTurn = jasmine.createSpy('animateTurn');
      component.turnTo(0);
      component.turnBy(component.TURN_STEP);
      expect(spin).toHaveBeenCalledWith(jasmine.any(Number), Math.PI / 4, 450);
      (component as any).spin = { from: 0, to: Math.PI / 4, start: 0, ms: 450 };
      component.turnBy(component.TURN_STEP);
      expect(spin.calls.mostRecent().args[1]).toBeCloseTo(Math.PI / 2, 9);
      (component as any).spin = undefined;
      component.turnBy(-component.TURN_STEP);
      expect(spin.calls.mostRecent().args[1]).toBeCloseTo(-Math.PI / 4, 6);
    });

    it('turns the camera round the character, keeping its height and distance', () => {
      const camera = (component as any).camera;
      const target = (component as any).controls.target;
      const height = camera.position.y;
      const across = Math.hypot(camera.position.x - target.x, camera.position.z - target.z);
      component.turnTo(Math.PI / 2);
      expect(camera.position.y).toBeCloseTo(height, 6);
      expect(Math.hypot(camera.position.x - target.x, camera.position.z - target.z)).toBeCloseTo(across, 6);
      expect(camera.position.x - target.x).toBeCloseTo(across, 6);
      component.turnTo(Math.PI);
      expect(camera.position.z - target.z).toBeCloseTo(-across, 6);
    });

    it('builds a new character when a choice changes, and frees the old one', () => {
      const old = component.model!;
      component.avatar = { ...component.avatar, hat: 'wizard' };
      component.ngOnChanges();
      expect(component.model).not.toBe(old);
      let wizard = false;
      component.model!.traverse(o => { wizard = wizard || o.name === 'hat-cone'; });
      expect(wizard).toBe(true);
    });

    it('backs the camera off for a wizard hat and comes back for a cap', () => {
      const target = (component as any).controls.target;
      const distance = () => (component as any).camera.position.distanceTo(target);
      expect(distance()).toBeCloseTo(BASE_DISTANCE, 1);
      component.avatar = { ...component.avatar, hat: 'wizard', hairStyle: 'afro' };
      component.ngOnChanges();
      expect(distance()).toBeGreaterThan(BASE_DISTANCE + 0.3);
      component.avatar = { ...component.avatar, hat: 'cap', hairStyle: 'short' };
      component.ngOnChanges();
      expect(distance()).toBeCloseTo(BASE_DISTANCE, 1);
    });

    it('turns at once, with no animation, under reduced motion', () => {
      spyOn(window, 'matchMedia').and.callFake((query: string) =>
        ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
      component.turnTo(0);
      component.turnBy(component.TURN_STEP);
      expect((component as any).spin).toBeUndefined();
      expect((component as any).angle).toBeCloseTo(Math.PI / 4, 9);
    });

    it('eases a turn over time rather than jumping', () => {
      spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
      component.turnTo(0);
      component.turnBy(component.TURN_STEP);
      expect((component as any).spin).toBeDefined();
      expect((component as any).spin.to).toBeCloseTo(Math.PI / 4, 9);
      expect((component as any).angle).toBeCloseTo(0, 6);
    });

    it('gives its WebGL context back and stops drawing when the screen closes', () => {
      const renderer = (component as any).renderer;
      const lose = spyOn(renderer, 'forceContextLoss').and.callThrough();
      const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();
      fixture.destroy();
      expect(lose).toHaveBeenCalled();
      expect((component as any).renderer).toBeUndefined();
      (component as any).requestRender();
      component.turnBy(component.TURN_STEP);
      expect(raf).not.toHaveBeenCalled();
    });

    it('looks at the whole figure, or closes in on the head, as it is told', () => {
      const target = () => (component as any).controls.target.y;
      const distance = () => (component as any).camera.position.distanceTo((component as any).controls.target);
      component.focus = 'body';
      (component as any).frameModel();
      const bodyTarget = target();
      const bodyDistance = distance();
      component.focus = 'head';
      (component as any).frameModel();
      const head = new THREE.Box3().setFromObject(component.model!.getObjectByName('head-group')!);
      expect(target()).toBeGreaterThan(head.min.y);
      expect(target()).toBeLessThan(head.max.y + 1.5);
      expect(distance()).toBeLessThan(bodyDistance / 2);
      expect(bodyTarget).toBeLessThan(target());
    });

    it('glides between the two when only the focus changes, and does not rebuild the character', () => {
      spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
      const model = component.model;
      component.focus = 'head';
      component.ngOnChanges({ focus: new SimpleChange('body', 'head', false) });
      expect(component.model).toBe(model);
      expect((component as any).glide).toBeDefined();
      expect((component as any).glide.toDistance).toBeLessThan((component as any).glide.fromDistance);
    });

    it('moves at once under reduced motion', () => {
      spyOn(window, 'matchMedia').and.callFake((query: string) =>
        ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
      component.focus = 'head';
      component.ngOnChanges({ focus: new SimpleChange('body', 'head', false) });
      expect((component as any).glide).toBeUndefined();
      const { distance } = component.view();
      expect((component as any).camera.position.distanceTo((component as any).controls.target)).toBeCloseTo(distance, 6);
    });

    it('closes in on a creature\u2019s own head when asked for a close-up', () => {
      component.avatar = { ...component.avatar, family: 'creature', stage: 2 };
      component.ngOnChanges({ avatar: new SimpleChange(null, component.avatar, false) });
      component.focus = 'head';
      const { target, distance } = component.view();
      expect(Number.isFinite(distance)).toBeTrue();
      expect(Number.isFinite(target.y)).toBeTrue();
      expect(distance).toBeGreaterThan(0);
      // On the head where it really is, the dragon's own size included, straight after it is built
      component.model!.updateMatrixWorld(true);
      const head = new THREE.Box3().setFromObject(component.model!.getObjectByName(CREATURE_HEAD)!);
      expect(target.y).toBeCloseTo((head.min.y + head.max.y) / 2, 6);
    });

    it('fits all of the full dragon\u2019s glow on the stage, and keeps it full size on a phone', () => {
      component.avatar = { ...component.avatar, family: 'creature', stage: 3, stagePinned: true };
      component.ngOnChanges({ avatar: new SimpleChange(null, component.avatar, false) });
      component.focus = 'body';
      const camera = (component as any).camera as THREE.PerspectiveCamera;
      const tan = Math.tan((camera.fov * Math.PI) / 360);
      component.model!.updateMatrixWorld(true);
      const glow = component.model!.getObjectByName(CREATURE_GLOW)!;
      const at = glow.getWorldPosition(new THREE.Vector3());
      const size = glow.getWorldScale(new THREE.Vector3());
      // A phone's stage (a 390 or a 360 wide screen), and a very narrow one
      [340 / 360, 310 / 360, 270 / 360].forEach(aspect => {
        camera.aspect = aspect;
        const { target, distance } = component.view();
        expect(distance * tan * aspect).withContext(`aspect ${aspect}`).toBeGreaterThanOrEqual(Math.hypot(at.x, at.z) + size.x / 2 - 1e-9);
        expect(target.y + distance * tan).withContext(`aspect ${aspect}`).toBeGreaterThanOrEqual(at.y + size.y / 2 - 1e-9);
        expect(target.y - distance * tan).withContext(`aspect ${aspect}`).toBeLessThanOrEqual(at.y - size.y / 2 + 1e-9);
        // On a phone the dragon is as big as any character: the glow fits without stepping back
        if (aspect > 300 / 360) {
          expect(distance).withContext(`aspect ${aspect}`).toBe(BASE_DISTANCE);
        }
      });
    });

    it('rebuilds the character when the character changes', () => {
      const model = component.model;
      component.avatar = { ...component.avatar, bodyType: 'girl' };
      component.ngOnChanges({ avatar: new SimpleChange(null, component.avatar, false) });
      expect(component.model).not.toBe(model);
    });

    it('gives the character one full turn when the screen opens', () => {
      expect((component as any).introduced).toBe(true);
    });
  });


  describe('alive', () => {
    const notReduced = () => spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
    const reduced = () => spyOn(window, 'matchMedia').and.callFake((query: string) =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    const change = (avatar: any) => {
      component.avatar = avatar;
      component.ngOnChanges({ avatar: new SimpleChange(null, avatar, false) });
    };

    beforeEach(async () => {
      AvatarStageComponent.alive = true;
      await create(true);
    });
    afterEach(() => (AvatarStageComponent.alive = false));

    it('breathes and blinks by itself, frame after frame', () => {
      notReduced();
      const pose = spyOn(component.rig!, 'pose').and.callThrough();
      expect((component as any).animate(performance.now())).toBeTrue();
      expect(pose).toHaveBeenCalled();
      const raf = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
      (component as any).frame = 0;
      (component as any).requestRender();
      const draw = raf.calls.mostRecent().args[0] as FrameRequestCallback;
      raf.calls.reset();
      draw(performance.now());
      // Asked for the next frame, though nothing is turning
      expect(raf).toHaveBeenCalled();
    });

    it('stands still under reduced motion: no pose, no endless drawing', () => {
      reduced();
      const pose = spyOn(component.rig!, 'pose');
      expect((component as any).animate(performance.now())).toBeFalse();
      expect(pose).not.toHaveBeenCalled();
      change({ ...component.avatar, hat: 'crown' });
      expect(component.waving).toBeFalse();
    });

    it('stands still when switched off', () => {
      notReduced();
      AvatarStageComponent.alive = false;
      expect((component as any).animate(performance.now())).toBeFalse();
    });

    it('waves when something new is put on, and not for a new face', () => {
      notReduced();
      change({ ...component.avatar, eyeShape: 'wide' });
      expect(component.waving).toBeFalse();
      change({ ...component.avatar, glasses: 'shades' });
      expect(component.waving).toBeTrue();
    });

    it('does not wave when the screen first opens', () => {
      expect(component.waving).toBeFalse();
    });

    it('puts the arm back down when the wave is over', () => {
      notReduced();
      change({ ...component.avatar, top: 'striped' });
      const start = (component as any).waveStart as number;
      (component as any).animate(start + 800);
      let raised = 0;
      component.model!.traverse(node => (raised = node.name === 'arm-rig' ? Math.max(raised, Math.abs(node.rotation.z)) : raised));
      expect(raised).toBeGreaterThan(1);
      (component as any).animate(start + 5000);
      expect(component.waving).toBeFalse();
      let after = 0;
      component.model!.traverse(node => (after = node.name === 'arm-rig' ? Math.max(after, Math.abs(node.rotation.z)) : after));
      expect(after).toBeLessThan(0.1);
    });

    it('draws breathing at no more than about 30 frames a second, but a wave at full speed', () => {
      notReduced();
      // Counted, not drawn: 120 real frames in software WebGL take longer than
      // the test browser may go without answering Karma
      const draw = spyOn(component as any, 'renderNow').and.stub();
      const raf = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
      const tick = (now: number) => {
        (component as any).frame = 0;
        (component as any).requestRender();
        (raf.calls.mostRecent().args[0] as FrameRequestCallback)(now);
      };
      (component as any).spin = undefined;
      (component as any).glide = undefined;
      const t0 = performance.now() + 10000;
      for (let i = 0; i < 60; i++) {
        tick(t0 + i * 1000 / 60);
      }
      const idle = draw.calls.count();
      expect(idle).toBeGreaterThan(20);
      expect(idle).toBeLessThan(40);
      draw.calls.reset();
      (component as any).waveStart = t0 + 1000;
      for (let i = 0; i < 60; i++) {
        tick(t0 + 1000 + i * 1000 / 60);
      }
      expect(draw.calls.count()).toBe(60);
    });

    describe('an evolution', () => {
      const flashIn = () => component['scene'].getObjectByName('evolution-flash') as THREE.Sprite | undefined;
      const creature = () => component.model!.getObjectByName(CREATURE)!;
      const egg = () => component.model!.getObjectByName('creature-egg');
      /** The stage opened on a dragon grown to stage 2 since it was last seen, at stage 1. */
      async function grownSince(from: number, to = 2) {
        fixture.destroy();
        TestBed.resetTestingModule();
        await create(true, () => {
          component.avatar = { ...defaultAvatar(), family: 'creature', stage: to };
          component.evolveFrom = from;
        });
      }

      it('shows the stage it grew from first, in a light that has not come up yet', async () => {
        notReduced();
        await grownSince(1);
        expect(component.evolving).toBeTrue();
        expect(egg()).toBeTruthy();
        expect(flashIn()!.material.opacity).toBe(0);
        expect(flashIn()!.material.blending).toBe(THREE.AdditiveBlending);
        // The evolution turns it round, once grown: not the usual turn on arrival as well
        expect((component as any).spin).toBeUndefined();
      });

      it('shivers in a gathering light, grows under the flash, and turns round once to show itself', async () => {
        notReduced();
        await grownSince(1);
        const size = creature().scale.x;
        component.evolveAt(0.55);
        expect(egg()).toBeTruthy();
        expect(creature().scale.x).toBeCloseTo(size * evolution(0.55).scale, 9);
        expect(flashIn()!.material.opacity).toBeCloseTo(evolution(0.55).flash, 9);
        // Round the character, and as big as it
        const box = new THREE.Box3().setFromObject(creature());
        expect(flashIn()!.position.distanceTo(box.getCenter(new THREE.Vector3()))).toBeLessThan(0.5);
        expect(flashIn()!.scale.x).toBeGreaterThan(box.getSize(new THREE.Vector3()).y);

        const old = component.model;
        component.evolveAt(EVOLVE_SWAP + 0.05);
        expect(component.model).not.toBe(old);
        expect(egg()).toBeUndefined();
        expect(component.model!.getObjectByName('pet-wing')).toBeTruthy();
        expect(creature().scale.x).toBeCloseTo(STAGE_TWO_SCALE() * evolution(EVOLVE_SWAP + 0.05).scale, 9);
        expect(creature().scale.x).toBeLessThan(STAGE_TWO_SCALE());
        const spin = (component as any).spin;
        expect(spin.to - spin.from).toBeCloseTo(Math.PI * 2, 9);
        expect(spin.ms).toBe((EVOLVE_SECONDS - EVOLVE_SWAP) * 1000);
        // Grown only once: later moments do not build it again
        const grown = component.model;
        component.evolveAt(2);
        expect(component.model).toBe(grown);
        expect(creature().scale.x).toBe(STAGE_TWO_SCALE());
      });

      it('looks again at what it grew into, for a close-up on the head too', async () => {
        notReduced();
        await grownSince(1);
        component.focus = 'head';
        component.evolveAt(0.5);
        component['frameModel']();
        const egg = component.view();
        component.evolveAt(EVOLVE_SWAP + 0.05);
        const camera = component['camera'] as THREE.PerspectiveCamera;
        const target = component['controls']!.target as THREE.Vector3;
        // The grown head, as it stands once it has settled
        component.evolveAt(EVOLVE_SECONDS);
        const grown = component.view();
        expect(Math.abs(grown.target.y - egg.target.y)).toBeGreaterThan(0.5);
        expect(target.y).toBeCloseTo(grown.target.y, 6);
        expect(camera.position.distanceTo(target)).toBeCloseTo(grown.distance, 6);
      });

      it('grows a kid hero into its new gear the same way, the stand and pet staying as they are', async () => {
        notReduced();
        fixture.destroy();
        TestBed.resetTestingModule();
        const kid = { ...defaultAvatar(), family: 'kid' as const, stage: 3, pet: 'puppy' };
        await create(true, () => {
          component.avatar = kid;
          component.evolveFrom = 1;
        });
        // The beginner first, in their own clothes
        expect(component.model!.getObjectByName('wristband')).toBeUndefined();
        const at = EVOLVE_SWAP + 0.05;
        component.evolveAt(at);
        const model = component.model!;
        expect(model.getObjectByName('wristband')).toBeTruthy();
        expect(model.getObjectByName('back')!.userData.legend).toBeTrue();
        const size = evolution(at).scale;
        const asBuilt = buildAvatar(kid);
        const byName = (root: THREE.Object3D, name: string) => root.children.find(child => child.name === name)!;
        ['pedestal', 'pet'].forEach(name => {
          expect(byName(model, name).scale.equals(byName(asBuilt, name).scale)).withContext(name).toBeTrue();
          expect(byName(model, name).position.equals(byName(asBuilt, name).position)).withContext(name).toBeTrue();
        });
        // Everything else together, from the stand up: the head stays on the body
        ['body', 'head-group', 'hair', 'back'].forEach(name => {
          const grown = byName(model, name);
          const built = byName(asBuilt, name);
          expect(grown.scale.x).withContext(name).toBeCloseTo(built.scale.x * size, 9);
          expect(grown.position.y).withContext(name).toBeCloseTo(built.position.y * size, 9);
        });
        component.evolveAt(EVOLVE_SECONDS);
        ['body', 'head-group'].forEach(name => {
          expect(byName(model, name).scale.equals(byName(asBuilt, name).scale)).withContext(name).toBeTrue();
          expect(byName(model, name).position.equals(byName(asBuilt, name).position)).withContext(name).toBeTrue();
        });
        disposeAvatar(asBuilt);
      });

      it('is over after about three seconds: the light gone, the dragon as built', async () => {
        notReduced();
        await grownSince(1);
        const flash = flashIn()!;
        const freed = spyOn(flash.material, 'dispose').and.callThrough();
        component.evolveAt(EVOLVE_SECONDS);
        expect(component.evolving).toBeFalse();
        expect(flashIn()).toBeUndefined();
        expect(freed).toHaveBeenCalled();
        expect(creature().scale.x).toBe(STAGE_TWO_SCALE());
        expect(egg()).toBeUndefined();
      });

      it('plays by itself, frame by frame, at full speed', async () => {
        notReduced();
        await grownSince(1);
        const at = spyOn(component, 'evolveAt').and.callThrough();
        const start = (component as any).evolveStart as number;
        (component as any).animate(start + 1500);
        expect(at).toHaveBeenCalledWith(1.5);
        const draw = spyOn(component as any, 'renderNow').and.stub();
        const raf = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
        (component as any).spin = undefined;
        (component as any).drawnAt = start + 1500;
        (component as any).frame = 0;
        (component as any).requestRender();
        (raf.calls.mostRecent().args[0] as FrameRequestCallback)(start + 1510);
        expect(draw).toHaveBeenCalled();
      });

      it('plays once: a change afterwards shows the character as it is now', async () => {
        notReduced();
        await grownSince(1);
        component.evolveAt(EVOLVE_SECONDS);
        change({ ...component.avatar, stage: 2 });
        expect(component.evolving).toBeFalse();
        expect(egg()).toBeUndefined();
        expect(flashIn()).toBeUndefined();
      });

      it('shows the new stage straight away under reduced motion, and never plays it later', async () => {
        reduced();
        await grownSince(1);
        expect(component.evolving).toBeFalse();
        expect(egg()).toBeUndefined();
        expect(flashIn()).toBeUndefined();
        change({ ...component.avatar });
        expect(component.evolving).toBeFalse();
      });

      it('has nothing to play without a stage below the one it is at', async () => {
        notReduced();
        await grownSince(2);
        expect(component.evolving).toBeFalse();
        expect(flashIn()).toBeUndefined();
        await grownSince(null as any);
        expect(component.evolving).toBeFalse();
      });

      it('puts the light away if the screen closes mid-way', async () => {
        notReduced();
        await grownSince(1);
        const freed = spyOn(flashIn()!.material, 'dispose').and.callThrough();
        fixture.destroy();
        expect(freed).toHaveBeenCalled();
      });

      /** How big a stage-2 dragon is built. */
      function STAGE_TWO_SCALE(): number {
        const root = buildAvatar({ ...defaultAvatar(), family: 'creature', stage: 2 });
        const scale = root.getObjectByName(CREATURE)!.scale.x;
        disposeAvatar(root);
        return scale;
      }
    });

    it('stops drawing when the screen closes, alive or not', () => {
      const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();
      fixture.destroy();
      (component as any).requestRender();
      expect(raf).not.toHaveBeenCalled();
    });
  });
});
