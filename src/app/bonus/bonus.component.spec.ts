import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BOARD_MARGIN, BonusComponent, CHILD_BAND, END_PULSE, END_SPARKS, END_SPARK_RADIUS, HIT_PULSE, MIN_BOARD } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { BALL_RADIUS, PADDLE_TOP_SPEED } from './pong';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { HowToPlayComponent } from './how-to-play.component';
import { bonusBest, recordBonusBest } from './bonus-best';

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
      declarations: [BonusComponent, HowToPlayComponent]
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
    // Start brings a board that runs past the screen up into view
    // (board-view.ts); the page goes back, so no later test measures a scrolled one
    window.scrollTo(0, 0);
  });

  /** Started by hand, with the ball put where the test wants it and no animation running. */
  /**
   * A ball put where a test wants it, two minutes into a game: the ball goes
   * at the speed the moment has reached (pong.ts), quick by then, in the
   * direction given.
   */
  function playWithBall(x: number, y: number, vx: number, vy: number) {
    component.started = true;
    component.game = { ...component.game, elapsed: 120, ball: { ...component.game.ball, x, y, vx, vy } };
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

  it('shows how to play on the start card, as a picture as well as words', () => {
    const picture = fixture.nativeElement.querySelector('.bonus-card app-how-to-play');
    expect(picture).not.toBeNull();
    expect(picture.querySelector('.paddle')).not.toBeNull();
  });

  it('counts 3, 2, 1 after Start with the ball waiting on the paddle, going where the paddle goes', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bonus-countdown').textContent.trim()).toBe('3');
    component.advance(1);
    expect(component.countdown).toBe(2);
    const paddle = component.game.paddle;
    expect(component.game.ball).toEqual(jasmine.objectContaining({ x: paddle.x, vx: 0, vy: 0 }));
    expect(component.game.ball.y + component.game.ball.radius).toBeLessThanOrEqual(paddle.y);
    // the paddle can already be steered, and the ball rides along
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + paddle.x + 60, clientY: box.top + 50 }));
    component.advance(0.5);
    expect(component.game.paddle.x).toBeCloseTo(paddle.x + 60, 0);
    expect(component.game.ball.x).toBe(component.game.paddle.x);
    component.advance(1);
    expect(component.countdown).toBe(1);
    component.advance(0.6);
    fixture.detectChanges();
    expect(component.countdown).toBe(0);
    expect(fixture.nativeElement.querySelector('.bonus-countdown')).toBeNull();
  });

  it('serves the ball up from the paddle as the count ends, so the child sees it go', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    component.advance(3.1);
    const served = component.game.ball;
    expect(served.vy).toBeLessThan(0);
    expect(served.vx).not.toBe(0);
    expect(served.x).toBe(component.game.paddle.x);
    component.advance(0.1);
    expect(component.game.ball.y).toBeLessThan(served.y);
  });

  it('glides the paddle to the finger once the game is on, never jumping across the board', () => {
    component.started = true;
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    const from = component.game.paddle.x;
    const far = component.game.width - component.game.paddle.width / 2;
    component.game = { ...component.game, ball: { ...component.game.ball, y: 60, vy: -100 } };
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: box.left + far, clientY: box.top + 50 }));
    expect(component.game.paddle.x).toBe(from);
    let x = from;
    for (let i = 0; i < 20; i++) {
      component.advance(1 / 60);
      expect(component.game.paddle.x - x).toBeLessThanOrEqual(PADDLE_TOP_SPEED * component.game.width / 60 + 0.01);
      x = component.game.paddle.x;
    }
    expect(component.game.paddle.x).toBeCloseTo(far, 0);
  });

  it('glows where the ball strikes a wall, and the glow fades', () => {
    (component as { calm: boolean }).calm = false;
    playWithBall(BALL_RADIUS + 2, component.game.height / 3, -300, -100);
    component.advance(0.02);
    expect(component.flashes.length).toBe(1);
    expect(component.flashes[0].x).toBe(0);
    expect(pulses.pulse).not.toHaveBeenCalled();
    for (let i = 0; i < 10; i++) {
      component.game = { ...component.game, ball: { ...component.game.ball, x: component.game.width / 2, y: component.game.height / 3, vx: 0, vy: 50 } };
      component.advance(0.05);
    }
    expect(component.flashes).toEqual([]);
  });

  it('floats a +1 up from the paddle on every hit, and lets it fade', () => {
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    expect(component.floats.length).toBe(1);
    expect(component.floats[0].text).toBe('+1');
    expect(component.floats[0].y).toBeLessThan(paddle.y);
    component.advance(0.05);
    for (let i = 0; i < 20; i++) {
      component.game = { ...component.game, ball: { ...component.game.ball, y: component.game.height / 3, vy: -50 } };
      component.advance(0.05);
    }
    expect(component.floats).toEqual([]);
  });

  it('shows this game\'s best on the end card, and says so when it is beaten', () => {
    recordBonusBest('bonusBest:guest', 'pong', 3);
    component.started = true;
    component.game = { ...component.game, hits: 4 };
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();
    const best = fixture.nativeElement.querySelector('[role="status"] .bonus-best');
    expect(component.best).toBe(4);
    expect(component.newBest).toBeTrue();
    expect(best.textContent).toContain('Nieuw record!');
    expect(best.textContent).toContain('Beste tot nu toe: 4');
    expect(bonusBest('bonusBest:guest', 'pong')).toBe(4);
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

  it('spends the round\'s game as it starts, so leaving half way does not buy another', () => {
    const progress = TestBed.inject(ProgressService);
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    expect(progress.hasBonus()).toBeTrue();
    component.start();
    expect(component.started).toBeTrue();
    expect(progress.hasBonus()).toBeFalse();
  });

  it('pays for the bounces as it ends, capped, and only once', () => {
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
    expect(progress.getXp()).toBe(before + bonusXp(2));
    expect(bonusXp(2)).toBeLessThan(BONUS_XP_CAP);
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
      declarations: [BonusComponent, HowToPlayComponent]
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

