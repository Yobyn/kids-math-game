import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { JumpComponent } from './jump.component';
import { SQUASH_TIME } from './game-feel';
import { BOARD_MARGIN, END_PULSE, END_SPARKS, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { AIRTIME, jump, makeObstacle, makeStar, onGround, worldSpeed } from './jumper';
import { HowToPlayComponent } from './how-to-play.component';
import { recordBonusBest } from './bonus-best';

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
      declarations: [JumpComponent, HowToPlayComponent]
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
    // Start brings a board that runs past the screen up into view
    // (board-view.ts); the page goes back, so no later test measures a scrolled one
    window.scrollTo(0, 0);
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

  it('brings the whole board on screen as it starts, on a phone too short for it (320 × 568)', () => {
    // The header and the score left 246px of a 568px screen and the board
    // is never under MIN_BOARD: its bottom ran 18px past the screen
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    spyOn(board, 'getBoundingClientRect').and.returnValue({ top: 306, bottom: window.innerHeight + 18 } as DOMRect);
    const scroll = spyOn(window, 'scrollBy');
    component.start();
    expect(scroll).toHaveBeenCalledOnceWith(0, 18 + BOARD_MARGIN);
  });

  it('leaves the page where it is when the board is on screen already', () => {
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    spyOn(board, 'getBoundingClientRect').and.returnValue({ top: 306, bottom: window.innerHeight - 40 } as DOMRect);
    const scroll = spyOn(window, 'scrollBy');
    component.start();
    expect(scroll).not.toHaveBeenCalled();
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

  it('shows how to play on the start card, as a picture as well as words', () => {
    const picture = fixture.nativeElement.querySelector('.bonus-card app-how-to-play');
    expect(picture.querySelector('.block')).not.toBeNull();
  });

  it('counts 3, 2, 1 after Start, and a tap during it does not bounce', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bonus-countdown').textContent.trim()).toBe('3');
    const before = component.game;
    component.advance(1.2);
    component.tap();
    expect(component.countdown).toBe(2);
    expect(component.game).toBe(before);
    component.advance(2);
    expect(component.countdown).toBe(0);
    component.advance(0.05);
    expect(component.game.elapsed).toBeGreaterThan(0);
    component.tap();
    expect(component.game.ball.vy).toBeLessThan(0);
  });

  it('floats a +1 up over the ball for each obstacle passed', () => {
    playFacing('middle', 0);
    for (let i = 0; i < 60 && component.points === 0; i++) {
      component.advance(0.05);
    }
    expect(component.floats.length).toBe(1);
    expect(component.floats[0].y).toBeLessThan(component.game.ball.y);
  });

  it('shows this game\'s best on the end card, without "new best" when the game did not beat it', () => {
    recordBonusBest('bonusBest:guest', 'jump', 20);
    playFacing('ground', 30);
    component.game = { ...component.game, points: 9 };
    for (let i = 0; i < 40 && !component.ended; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    const best = fixture.nativeElement.querySelector('[role="status"] .bonus-best');
    expect(component.newBest).toBeFalse();
    expect(best.textContent).toContain('Beste tot nu toe: 20');
    expect(best.textContent).not.toContain('Nieuw record');
    expect(component.floats).toEqual([]);
  });

  it('takes a star a bounce reaches: a point, a +1 where it hung, sparks and a chime', () => {
    const chime = spyOn(TestBed.inject(SoundService), 'playStar');
    component.started = true;
    const game = component.game;
    const star = makeStar(game, game.ball.x + worldSpeed(game.width, false) * AIRTIME / 2);
    component.game = jump({ ...game, stars: [star], untilNext: 1e9 });
    for (let i = 0; i < 20 && component.points === 0; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.points).toBe(1);
    expect(fixture.nativeElement.querySelector('.bonus-points').textContent).toContain('1');
    expect(component.floats.length).toBe(1);
    expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
    expect(pulses.tap).toHaveBeenCalled();
    expect(chime).toHaveBeenCalledWith(1);
  });

  it('squashes the ball for a moment as it lands, but not under reduced motion', () => {
    (component as { calm: boolean }).calm = false;
    component.started = true;
    component.game = jump({ ...component.game, untilNext: 1e9 });
    for (let i = 0; i < 40 && component.squash === 0; i++) {
      component.advance(0.025);
    }
    expect(component.squash).toBeGreaterThan(0);
    expect(component.squash).toBeLessThanOrEqual(SQUASH_TIME);
    component.advance(SQUASH_TIME);
    expect(component.squash).toBe(0);

    (component as { calm: boolean }).calm = true;
    component.game = jump(component.game);
    for (let i = 0; i < 40; i++) {
      component.advance(0.025);
    }
    expect(component.squash).toBe(0);
  });

  it('goes back to choosing what to play next', () => {
    component.done();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('shows no clock: only the points, the flag comes when it comes', () => {
    expect(fixture.nativeElement.querySelector('.bonus-bar').children.length).toBe(1);
  });
});
