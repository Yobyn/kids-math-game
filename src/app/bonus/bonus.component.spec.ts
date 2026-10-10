import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BOARD_MARGIN, BonusComponent, CHILD_BAND, END_PULSE, END_SPARKS, END_SPARK_RADIUS, HIT_PULSE, MIN_BOARD } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { BALL_RADIUS } from './pong';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP } from '../levels/level-curve';

describe('BonusComponent, the bonus game after a round', () => {
  let fixture: ComponentFixture<BonusComponent>;
  let component: BonusComponent;
  let pulses: FieldPulseService;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('language', 'nl');
    // A finished round's bonus game, as the result screen leaves it
    new ProgressService().grantBonus();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [BonusComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(BonusComponent);
    component = fixture.componentInstance;
    pulses = TestBed.inject(FieldPulseService);
    spyOn(pulses, 'pulse').and.callThrough();
    spyOn(pulses, 'tap').and.callThrough();
    spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.clear();
  });

  /** Started by hand, with the ball put where the test wants it and no animation running. */
  function playWithBall(x: number, y: number, vx: number, vy: number) {
    component.started = true;
    component.game = { ...component.game, ball: { ...component.game.ball, x, y, vx, vy } };
  }

  it('says how to play and waits for Start, with no ball moving yet', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Balspel');
    expect(text).toContain('plankje');
    expect(fixture.nativeElement.querySelector('.bonus-button').textContent).toContain('Start');
    const before = component.game.ball.y;
    component.advance(0.1);
    expect(component.game.ball.y).toBe(before);
  });

  it('answers a paddle hit with the particle field: it swells, and sparks fly from where the ball struck', () => {
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);

    expect(component.hits).toBe(1);
    expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
    const box = fixture.nativeElement.querySelector('canvas').getBoundingClientRect();
    const [x, y] = (pulses.tap as jasmine.Spy).calls.mostRecent().args;
    expect(x).toBeCloseTo(box.left + paddle.x, 0);
    expect(y).toBeCloseTo(box.top + paddle.y, 0);
  });

  it('shows the points big as they come', () => {
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bonus-points').textContent.trim()).toBe('1');
  });

  it('ends on a miss with "well played" and the points, and a bigger swell of the field', () => {
    component.started = true;
    component.game = { ...component.game, hits: 4 };
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();

    expect(component.ended).toBeTrue();
    expect(pulses.pulse).toHaveBeenCalledWith(END_PULSE);
    const card = fixture.nativeElement.querySelector('[role="status"]');
    expect(card.textContent).toContain('Goed gespeeld!');
    expect(card.querySelector('.bonus-won-number').textContent.trim()).toBe('4');
    expect(END_PULSE).toBeGreaterThan(HIT_PULSE);
  });

  it('puts the paddle under the finger anywhere on the board', () => {
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + 60, clientY: box.top + 50, bubbles: true }));
    expect(component.game.paddle.x).toBe(Math.max(60, component.game.paddle.width / 2));
  });

  it('moves the paddle with the arrow keys on a computer', () => {
    component.started = true;
    const from = component.game.paddle.x;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    component.advance(0.1);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    const moved = component.game.paddle.x;
    component.advance(0.1);

    expect(moved).toBeGreaterThan(from);
    expect(component.game.paddle.x).toBe(moved);
  });

  it('draws the ball and paddle on a see-through board, so the particle field shows through', () => {
    component.draw();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const ratio = canvas.width / component.game.width;
    const pixel = (x: number, y: number) => context.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
    // a corner far from ball and paddle: nothing drawn, fully clear
    expect(pixel(3, 3)[3]).toBe(0);
    // the ball and the paddle are there
    expect(pixel(component.game.ball.x, component.game.ball.y)[3]).toBeGreaterThan(200);
    const paddle = component.game.paddle;
    expect(pixel(paddle.x, paddle.y + paddle.height / 2)[3]).toBeGreaterThan(200);
  });

  it('fits the board in the height left below the score, so the paddle never needs scrolling to', () => {
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    const room = window.innerHeight - board.getBoundingClientRect().top - BOARD_MARGIN;
    expect(component.game.height).toBe(Math.round(Math.min(Math.max(room, MIN_BOARD), component.game.width * 1.6)));
    if (room >= MIN_BOARD) {
      expect(board.getBoundingClientRect().top + component.game.height).toBeLessThanOrEqual(window.innerHeight);
    }
  });

  it('spends the round\'s game as it starts, so leaving half way does not buy another', () => {
    const progress = TestBed.inject(ProgressService);
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    expect(progress.hasBonus()).toBeTrue();
    component.start();
    expect(component.started).toBeTrue();
    expect(progress.hasBonus()).toBeFalse();
  });

  it('pays one XP per bounce as it ends, capped, and only once', () => {
    const progress = TestBed.inject(ProgressService);
    const before = progress.getXp();
    component.started = true;
    component.game = { ...component.game, hits: 9 };
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    component.advance(0.05);
    fixture.detectChanges();

    expect(progress.getXp()).toBe(before + BONUS_XP_CAP);
    expect(component.xpWon).toBe(BONUS_XP_CAP);
    expect(fixture.nativeElement.querySelector('.bonus-xp').textContent).toContain(`+${BONUS_XP_CAP}`);
  });

  it('pays what a short game earned, not the cap', () => {
    const progress = TestBed.inject(ProgressService);
    const before = progress.getXp();
    component.started = true;
    component.game = { ...component.game, hits: 2 };
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    expect(progress.getXp()).toBe(before + 2);
  });

  it('blips softly on a paddle hit, through the child\'s own sound set', () => {
    const sounds = TestBed.inject(SoundService);
    spyOn(sounds, 'playTap');
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    expect(sounds.playTap).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when the child has turned sound off', () => {
    const sounds = TestBed.inject(SoundService);
    sounds.choose('off');
    const loader = spyOn(sounds, 'loader').and.callThrough();
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    expect(component.hits).toBe(1);
    expect(loader).not.toHaveBeenCalled();
  });

  it('ends with the whole field swelling and sparks from all round the ball, a bigger burst than a hit\'s', () => {
    const sounds = TestBed.inject(SoundService);
    spyOn(sounds, 'playSuccess');
    component.started = true;
    component.game = { ...component.game, hits: 3 };
    playWithBall(component.game.width / 2, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    (pulses.tap as jasmine.Spy).calls.reset();
    component.advance(0.05);

    expect(pulses.pulse).toHaveBeenCalledWith(END_PULSE);
    expect(END_PULSE).toBe(1);
    const taps = (pulses.tap as jasmine.Spy).calls.allArgs();
    expect(taps.length).toBe(END_SPARKS);
    expect(END_SPARKS).toBeGreaterThan(1);
    // spread all round, not in one spot
    const xs = taps.map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(END_SPARK_RADIUS);
    expect(sounds.playSuccess).toHaveBeenCalled();
  });

  it('draws the middle of the paddle in the child\'s own colour', () => {
    component.childColour = '#00c853';
    component.draw();
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const ratio = canvas.width / component.game.width;
    const paddle = component.game.paddle;
    const [r, g, b] = canvas.getContext('2d')!.getImageData(
      Math.round(paddle.x * ratio), Math.round((paddle.y + paddle.height / 2) * ratio), 1, 1).data;
    expect(g).toBeGreaterThan(150);
    expect(r).toBeLessThan(60);
    expect(b).toBeLessThan(140);
    // and only the middle: the ends keep the field's colours
    const [, endG] = canvas.getContext('2d')!.getImageData(
      Math.round((paddle.x - paddle.width * (CHILD_BAND / 2 + 0.25)) * ratio), Math.round((paddle.y + paddle.height / 2) * ratio), 1, 1).data;
    expect(endG).toBeLessThan(150);
  });

  it('goes on when the game is done', () => {
    component.done();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
  });
});

describe('BonusComponent without a finished round', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [BonusComponent]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('sends a child who opened it without a round back to choose one, and never starts', () => {
    const fixture = TestBed.createComponent(BonusComponent);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);

    fixture.componentInstance.start();
    expect(fixture.componentInstance.started).toBeFalse();
    fixture.componentInstance.ngOnDestroy();
  });
});

