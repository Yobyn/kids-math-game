import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { TapSparksComponent } from './tap-sparks.component';
import { FieldPulseService, TapPoint } from '../services/field-pulse.service';
import { BURST_LIFE, MAX_BURSTS } from './tap-burst';

function pointerDown(target: Element, x = 20, y = 30) {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y }));
}

describe('TapSparksComponent', () => {
  let fixture: ComponentFixture<TapSparksComponent>;
  let component: TapSparksComponent;
  let stage: HTMLElement;
  let heard: TapPoint[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [TapSparksComponent] }).compileComponents();
    fixture = TestBed.createComponent(TapSparksComponent);
    component = fixture.componentInstance;
    heard = [];
    TestBed.inject(FieldPulseService).taps$.subscribe(point => heard.push(point));

    stage = document.createElement('div');
    stage.innerHTML = `
      <button id="plain">Go</button>
      <button id="nested"><span id="inner">7</span></button>
      <button id="off" disabled>Locked</button>
      <div id="refused" role="button" aria-disabled="true">No</div>
      <div id="card" role="button" tabindex="0">Grade 3</div>
      <div id="tab" role="tab">Hair</div>
      <a id="link" href="#x">Link</a>
      <p id="text">Just words</p>`;
    document.body.appendChild(stage);
  });

  afterEach(() => {
    fixture.destroy();
    stage.remove();
  });

  it('answers a tap on a button, where the finger is', () => {
    fixture.detectChanges();
    pointerDown(stage.querySelector('#plain')!, 40, 60);

    expect(heard).toEqual([{ x: 40, y: 60 }]);
    expect(component.pool.alive).toBe(1);
    expect(component.pool.bursts.some(b => b.live && b.x === 40 && b.y === 60)).toBe(true);
  });

  it('answers a tap on anything inside a button, on a card, a tab and a link', () => {
    fixture.detectChanges();
    ['#inner', '#card', '#tab', '#link'].forEach(id => pointerDown(stage.querySelector(id)!));

    expect(heard.length).toBe(4);
  });

  it('does not answer a touch of plain text or the background', () => {
    fixture.detectChanges();
    pointerDown(stage.querySelector('#text')!);
    pointerDown(document.body);

    expect(heard).toEqual([]);
    expect(component.pool.alive).toBe(0);
  });

  it('does not answer a control that refuses the tap: a locked item says nothing', () => {
    fixture.detectChanges();
    component.report(stage.querySelector('#off'), 5, 5);
    component.report(stage.querySelector('#refused'), 5, 5);

    expect(heard).toEqual([]);
  });

  it('gives a keyboard press the same answer, from the middle of the control', () => {
    fixture.detectChanges();
    const card = stage.querySelector('#card')!;
    const box = card.getBoundingClientRect();
    card.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));

    expect(heard.length).toBe(1);
    expect(heard[0].x).toBeCloseTo(box.left + box.width / 2, 5);
    expect(heard[0].y).toBeCloseTo(box.top + box.height / 2, 5);
  });

  it('does not answer a finger twice: the click after a pointerdown is ignored', () => {
    fixture.detectChanges();
    const button = stage.querySelector('#plain')!;
    pointerDown(button);
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(heard.length).toBe(1);
  });

  it('listens outside Angular, so a tap never costs a change-detection pass', () => {
    const zones: boolean[] = [];
    const real = document.addEventListener.bind(document);
    spyOn(document, 'addEventListener').and.callFake(((type: string, listener: any, options?: any) => {
      zones.push(NgZone.isInAngularZone());
      real(type, listener, options);
    }) as any);

    fixture.detectChanges();

    expect(zones.length).toBe(2);
    expect(zones.every(inside => !inside)).toBe(true);
  });

  it('runs its frames outside Angular, even when the tap comes from inside it', () => {
    fixture.detectChanges();
    const zones: boolean[] = [];
    spyOn(window, 'requestAnimationFrame').and.callFake(() => {
      zones.push(NgZone.isInAngularZone());
      return 0;
    });

    TestBed.inject(NgZone).run(() => TestBed.inject(FieldPulseService).tap(10, 10));

    expect(zones).toEqual([false]);
  });

  it('costs nothing at rest: no frame is asked for until something is tapped', () => {
    const frames = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();

    expect(frames).not.toHaveBeenCalled();
    expect(component.running).toBe(false);
  });

  it('stops its loop once the last burst is spent', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();
    component.start(10, 10);
    expect(component.running).toBe(true);

    let now = performance.now();
    for (let i = 0; i < 10 && component.running; i++) {
      now += 100;
      component.tick(now);
    }

    expect(component.running).toBe(false);
    expect(component.pool.alive).toBe(0);
  });

  it('starts one loop however many taps land while it runs', () => {
    const frames = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();
    for (let i = 0; i < 20; i++) {
      component.start(i, i);
    }

    expect(frames).toHaveBeenCalledTimes(1);
  });

  it('keeps a fixed number of bursts however fast a child mashes the keys', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();
    const slots = component.pool.bursts;
    for (let i = 0; i < 300; i++) {
      pointerDown(stage.querySelector('#plain')!, i, i);
    }

    expect(component.pool.bursts).toBe(slots);
    expect(component.pool.alive).toBe(MAX_BURSTS);
  });

  it('is spent within its life', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();
    component.start(10, 10);
    component.pool.step(BURST_LIFE);

    expect(component.pool.alive).toBe(0);
  });

  it('under reduced motion does not listen at all — no burst, not a smaller one', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    const frames = spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    const still = TestBed.createComponent(TapSparksComponent);
    still.detectChanges();

    pointerDown(stage.querySelector('#plain')!);
    TestBed.inject(FieldPulseService).tap(10, 10);

    expect(still.componentInstance.listening).toBe(false);
    expect(still.componentInstance.pool.alive).toBe(0);
    expect(frames).not.toHaveBeenCalled();
    still.destroy();
  });

  it('stops listening once destroyed', () => {
    fixture.detectChanges();
    fixture.destroy();
    pointerDown(stage.querySelector('#plain')!);

    expect(heard).toEqual([]);
    expect(component.pool.alive).toBe(0);
  });

  it('never swallows a tap meant for the game, though it sits on top of it', () => {
    fixture.detectChanges();
    const host = getComputedStyle(fixture.nativeElement);
    expect(host.pointerEvents).toBe('none');
    expect(Number(host.zIndex)).toBeGreaterThan(1000);
  });

  it('hides the canvas from screen readers', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('canvas').getAttribute('aria-hidden')).toBe('true');
  });

  it('draws in device pixels, capped at twice, when a burst starts', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    fixture.detectChanges();
    component.start(10, 10);
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    expect(canvas.width).toBe(Math.floor(window.innerWidth * ratio));
    expect(canvas.height).toBe(Math.floor(window.innerHeight * ratio));
  });
});
