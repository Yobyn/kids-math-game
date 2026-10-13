import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BalloonsComponent, MISS_PULSE } from './balloons.component';
import { BOARD_MARGIN, END_PULSE, END_SPARKS, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { Balloon, MISSES_ALLOWED, balloonRadius, swayedX } from './balloons';

describe('BalloonsComponent, the balloon game (Yobyn, 2026-10-13)', () => {
  let fixture: ComponentFixture<BalloonsComponent>;
  let component: BalloonsComponent;
  let pulses: FieldPulseService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('language', 'nl');
    // A finished round's bonus game, as the result screen leaves it
    new ProgressService().grantBonus('balloons');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [BalloonsComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(BalloonsComponent);
    component = fixture.componentInstance;
    pulses = TestBed.inject(FieldPulseService);
    spyOn(pulses, 'pulse').and.callThrough();
    spyOn(pulses, 'tap').and.callThrough();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.clear();
    // Start brings a board that runs past the screen up into view
    // (board-view.ts); the page goes back, so no later test measures a scrolled one
    window.scrollTo(0, 0);
  });

  /** Started by hand, with one balloon up where the test wants it and nothing else coming. */
  function playWith(at: Partial<Balloon>) {
    component.started = true;
    const game = component.game;
    const balloon: Balloon = { id: 50, x: game.width / 2, y: game.height / 2, radius: balloonRadius(game.width), hue: 0.5, phase: 0, ...at };
    component.game = { ...game, balloons: [balloon], untilNext: 1e9, made: 1 };
    return balloon;
  }

  it('says how to play and waits for Start, with nothing rising yet', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ballonnen');
    expect(text).toContain('Tik op de ballonnen');
    const before = component.game;
    component.advance(1);
    expect(component.game).toBe(before);
  });

  it('shows the points and three hearts, and no clock', () => {
    const bar = fixture.nativeElement.querySelector('.bonus-bar');
    expect(bar.querySelector('.bonus-points').textContent).toContain('0');
    expect(bar.querySelectorAll('.bonus-heart').length).toBe(MISSES_ALLOWED);
    expect(bar.querySelectorAll('.bonus-heart.lost').length).toBe(0);
    expect(bar.textContent).not.toMatch(/\d:\d\d/);
  });

  it('spends the game as it starts: leaving half way does not buy another go', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    expect(component.started).toBeTrue();
    expect(TestBed.inject(ProgressService).hasBonus()).toBeFalse();
  });

  it('brings the whole board on screen as it starts, on a phone too short for it', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    spyOn(board, 'getBoundingClientRect').and.returnValue({ top: 306, bottom: window.innerHeight + 18 } as DOMRect);
    const scroll = spyOn(window, 'scrollBy');
    component.start();
    expect(scroll).toHaveBeenCalledOnceWith(0, 18 + BOARD_MARGIN);
  });

  it('sends a child without a finished round back, rather than giving a free game', () => {
    localStorage.removeItem('bonus:guest');
    const again = TestBed.createComponent(BalloonsComponent);
    again.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
    again.componentInstance.ngOnDestroy();
  });

  it('pops a balloon tapped on the board: a point, the field swells and sparks there, a soft blip', () => {
    const blip = spyOn(TestBed.inject(SoundService), 'playTap');
    const balloon = playWith({});
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    const x = swayedX(balloon, component.game.elapsed, component.calm);
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + x, clientY: box.top + balloon.y }));
    fixture.detectChanges();
    expect(component.points).toBe(1);
    expect(component.game.balloons).toEqual([]);
    expect(fixture.nativeElement.querySelector('.bonus-points').textContent).toContain('1');
    expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
    expect(pulses.tap).toHaveBeenCalledWith(box.left + x, box.top + balloon.y);
    expect(blip).toHaveBeenCalled();
  });

  it('leaves the balloons be when a tap lands on nothing', () => {
    const balloon = playWith({ x: 40 });
    component.popAt(component.game.width - 10, balloon.y);
    expect(component.points).toBe(0);
    expect(component.game.balloons.length).toBe(1);
    expect(pulses.pulse).not.toHaveBeenCalled();
  });

  it('fades a heart when a balloon gets away, and the field barely stirs', () => {
    playWith({ y: 5 });
    for (let i = 0; i < 20 && component.game.missed === 0; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.heartsLeft).toBe(MISSES_ALLOWED - 1);
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart.lost').length).toBe(1);
    expect(pulses.pulse).toHaveBeenCalledWith(MISS_PULSE);
    expect(component.ended).toBeFalse();
  });

  it('ends when the third balloon gets away, with "well played", the points and the XP, a bigger burst, paid once', () => {
    const progress = TestBed.inject(ProgressService);
    const before = progress.getXp();
    playWith({ y: 5 });
    component.game = { ...component.game, missed: MISSES_ALLOWED - 1, points: 4 };
    for (let i = 0; i < 20 && !component.ended; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();

    expect(component.ended).toBeTrue();
    expect(component.finished).toBeFalse();
    const card = fixture.nativeElement.querySelector('[role="status"]').textContent;
    expect(card).toContain('Goed gespeeld');
    expect(card).toContain('4');
    expect(component.xpWon).toBe(bonusXp(4));
    expect(progress.getXp()).toBe(before + component.xpWon);
    expect(pulses.pulse).toHaveBeenCalledWith(END_PULSE);
    expect((pulses.tap as jasmine.Spy).calls.count()).toBeGreaterThanOrEqual(END_SPARKS);
    // and nothing more once it has ended
    component.advance(1);
    component.popAt(component.game.width / 2, component.game.height / 2);
    expect(progress.getXp()).toBe(before + component.xpWon);
  });

  it('says so when the last balloon has gone at the finish, and pays no more than the cap', () => {
    component.started = true;
    component.game = { ...component.game, points: 30, finishAt: 0, untilNext: 1e9 };
    component.advance(0.05);
    fixture.detectChanges();
    expect(component.finished).toBeTrue();
    const card = fixture.nativeElement.querySelector('[role="status"]').textContent;
    expect(card).toContain('🎈');
    expect(card).toContain('laatste ballon');
    expect(card).not.toContain('Goed gespeeld');
    expect(component.xpWon).toBe(BONUS_XP_CAP);
  });

  it('goes back to choosing what to play next', () => {
    component.done();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });
});
