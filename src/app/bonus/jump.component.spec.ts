import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { JumpComponent } from './jump.component';
import { END_PULSE, END_SPARKS, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { makeObstacle, onGround } from './jumper';

describe('JumpComponent, the rolling ball bonus game (Yobyn, 2026-10-10)', () => {
  let fixture: ComponentFixture<JumpComponent>;
  let component: JumpComponent;
  let pulses: FieldPulseService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('language', 'nl');
    // A finished round's bonus game, as the result screen leaves it
    new ProgressService().grantBonus('jump');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [JumpComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(JumpComponent);
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
  });

  /** Started by hand, with one obstacle put where the test wants it and no animation running. */
  function playFacing(place: 'ground' | 'middle' | 'top', ahead: number) {
    component.started = true;
    const game = component.game;
    component.game = { ...game, obstacles: [makeObstacle(game, place, game.ball.x + ahead)], untilNext: 1e9, made: 1 };
  }

  it('says how to play and waits for Start, with nothing moving yet', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Springbal');
    expect(text).toContain('Tik');
    const before = component.game;
    component.advance(0.1);
    expect(component.game).toBe(before);
    // and a tap before Start does not bounce
    component.tap();
    expect(onGround(component.game)).toBeTrue();
  });

  it('spends the game as it starts: leaving half way does not buy another go', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    expect(component.started).toBeTrue();
    expect(TestBed.inject(ProgressService).hasBonus()).toBeFalse();
  });

  it('sends a child without a finished round back, rather than giving a free game', () => {
    localStorage.removeItem('bonus:guest');
    const again = TestBed.createComponent(JumpComponent);
    again.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
    again.componentInstance.ngOnDestroy();
  });

  it('bounces on a tap on the board, and on Space or the up arrow', () => {
    component.started = true;
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    canvas.dispatchEvent(new Event('pointerdown'));
    expect(component.game.ball.vy).toBeLessThan(0);
    component.game = { ...component.game, ball: { ...component.game.ball, vy: 0 } };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(component.game.ball.vy).toBeLessThan(0);
    component.game = { ...component.game, ball: { ...component.game.ball, vy: 0 } };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.game.ball.vy).toBeLessThan(0);
  });

  it('scores each obstacle passed, and the field swells and sparks at the ball with a soft blip', () => {
    const blip = spyOn(TestBed.inject(SoundService), 'playTap');
    playFacing('middle', 0);
    for (let i = 0; i < 60 && component.points === 0; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.points).toBe(1);
    expect(fixture.nativeElement.querySelector('.bonus-points').textContent).toContain('1');
    expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
    expect(pulses.tap).toHaveBeenCalled();
    expect(blip).toHaveBeenCalled();
  });

  it('ends on a crash with "well played", the points and the XP, a bigger burst, paid once', () => {
    const progress = TestBed.inject(ProgressService);
    const before = progress.getXp();
    playFacing('ground', 30);
    component.game = { ...component.game, points: 9 };
    for (let i = 0; i < 40 && !component.ended; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();

    expect(component.ended).toBeTrue();
    expect(component.finished).toBeFalse();
    const card = fixture.nativeElement.querySelector('[role="status"]').textContent;
    expect(card).toContain('Goed gespeeld');
    expect(card).toContain('9');
    expect(component.xpWon).toBe(Math.min(BONUS_XP_CAP, bonusXp(9)));
    expect(progress.getXp()).toBe(before + component.xpWon);
    expect(pulses.pulse).toHaveBeenCalledWith(END_PULSE);
    expect((pulses.tap as jasmine.Spy).calls.count()).toBeGreaterThanOrEqual(END_SPARKS);
    // and nothing more once it has ended
    component.advance(1);
    component.tap();
    expect(progress.getXp()).toBe(before + component.xpWon);
  });

  it('says so when the ball reaches the finish flag (Yobyn, 2026-10-10)', () => {
    component.started = true;
    component.game = { ...component.game, points: 12, finishAt: 0, untilNext: 0.01 };
    for (let i = 0; i < 80 && !component.ended; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.finished).toBeTrue();
    const card = fixture.nativeElement.querySelector('[role="status"]').textContent;
    expect(card).toContain('🏁');
    expect(card).toContain('vlag gehaald');
    expect(card).not.toContain('Goed gespeeld');
    expect(component.xpWon).toBe(BONUS_XP_CAP);
  });

  it('goes back to choosing what to play next', () => {
    component.done();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('shows no clock: only the points, the flag comes when it comes', () => {
    expect(fixture.nativeElement.querySelector('.bonus-bar').children.length).toBe(1);
  });
});
