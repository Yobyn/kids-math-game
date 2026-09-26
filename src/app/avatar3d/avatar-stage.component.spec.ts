import { NO_ERRORS_SCHEMA, SimpleChange } from '@angular/core';
import * as THREE from 'three';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NO_ITEM, defaultAvatar } from '../avatar/avatar-model';
import { AvatarStageComponent, BASE_CENTRE, BASE_DISTANCE, HEAD_DISTANCE_MIN, easeInOut, framing, headFraming } from './avatar-stage.component';

describe('framing', () => {
  it('keeps the usual distance for a character of ordinary height', () => {
    // The stylised character with short hair and a cap, stand to cap: about 13
    expect(framing(-0.2, 13, 30, 1.1)).toEqual({ distance: BASE_DISTANCE, centre: BASE_CENTRE });
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

  async function create(webgl: boolean) {
    spyOn(AvatarStageComponent, 'canUseWebGL').and.returnValue(webgl);
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

    it('stops drawing when the screen closes, alive or not', () => {
      const raf = spyOn(window, 'requestAnimationFrame').and.callThrough();
      fixture.destroy();
      (component as any).requestRender();
      expect(raf).not.toHaveBeenCalled();
    });
  });
});
