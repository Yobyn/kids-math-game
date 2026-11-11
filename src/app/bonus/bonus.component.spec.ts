import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BOARD_MARGIN, BonusComponent, CHILD_BAND, END_PULSE, END_SPARKS, END_SPARK_RADIUS, HIT_PULSE, LOST_BALL_PULSE, MIN_BOARD } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { BALL_RADIUS, MISSES_ALLOWED, PADDLE_TOP_SPEED, TILES, TILE_HEIGHT, speedAt, speedOf } from './pong';
import { RIGHT_POINTS, rightPoints } from './game-sums';
import { COUNTDOWN, END_BUZZ, MISS_BUZZ, POINT_BUZZ, SQUASH_TIME } from './game-feel';
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
   * direction given. The tiles along the top are all tried already, so the
   * top is a plain wall whatever numbers were dealt: a quick ball that
   * reaches it scores nothing by luck (the tiles have their own tests below).
   */
  function playWithBall(x: number, y: number, vx: number, vy: number, misses = 0) {
    component.started = true;
    const tiles = (component.game.tiles || []).map(tile => ({ ...tile, tried: true }));
    component.game = { ...component.game, elapsed: 120, misses, tiles, ball: { ...component.game.ball, x, y, vx, vy } };
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

  it('gives the 3-2-1 again when the child comes back mid-game: the ball waits on the paddle, then is served', () => {
    const hidden = spyOnProperty(document, 'hidden').and.returnValue(true);
    // before Start there is nothing to pause
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.countdown).toBe(0);

    playWithBall(40, 60, 300, -300);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.and.returnValue(false);
    expect(component.countdown).toBe(COUNTDOWN);
    component.advance(1);
    const paddle = component.game.paddle;
    expect(component.game.ball.y).toBeLessThan(paddle.y);
    expect(component.game.ball.y).toBeGreaterThan(paddle.y - 4 * component.game.ball.radius);
    expect(component.game.ended).toBeNull();
    component.advance(COUNTDOWN);
    expect(component.countdown).toBe(0);
    expect(component.game.ball.vy).toBeLessThan(0);
  });

  it('ticks the phone for each bounce and pulses it twice as a game with points ends, not for a wall', () => {
    const buzz = spyOn(TestBed.inject(SoundService), 'vibrate');
    component.answer({ kind: 'wall', x: 0, y: 50 });
    expect(buzz).not.toHaveBeenCalled();
    component.answer({ kind: 'hit', x: 50, y: 200 });
    expect(buzz).toHaveBeenCalledOnceWith(POINT_BUZZ);
    component.game = { ...component.game, hits: 3 };
    component.answer({ kind: 'end', x: 50, y: 200 });
    expect(buzz).toHaveBeenCalledWith(END_BUZZ);
    // a game with nothing to show ends without the pulse
    buzz.calls.reset();
    component.game = { ...component.game, hits: 0 };
    component.answer({ kind: 'end', x: 50, y: 200 });
    expect(buzz).not.toHaveBeenCalled();
  });

  it('loses one of three hearts for a missed ball: it waits on the paddle through another 3-2-1, then is served again', () => {
    const buzz = spyOn(TestBed.inject(SoundService), 'vibrate');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart').length).toBe(MISSES_ALLOWED);
    playWithBall(10, component.game.height - 5, 0, 400);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();

    expect(component.ended).toBeFalse();
    expect(component.heartsLeft).toBe(MISSES_ALLOWED - 1);
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart.lost').length).toBe(1);
    expect(component.countdown).toBe(COUNTDOWN);
    expect(pulses.pulse).toHaveBeenCalledWith(LOST_BALL_PULSE);
    expect(buzz).toHaveBeenCalledWith(MISS_BUZZ);
    component.advance(1);
    const paddle = component.game.paddle;
    expect(component.game.ball.x).toBeCloseTo(paddle.x, 0);
    expect(component.game.ball.vy).toBe(0);
    component.advance(COUNTDOWN);
    expect(component.countdown).toBe(0);
    expect(component.game.ball.vy).toBeLessThan(0);
    // the speed it had reached as it was missed, not the start's
    expect(speedOf(component.game.ball)).toBeCloseTo(speedAt(component.game.height, component.calm, component.game.elapsed), 3);
  });

  it('beats the last heart left, so a child knows it is the last, and none while more are left', () => {
    const last = () => Array.from(fixture.nativeElement.querySelectorAll('.bonus-heart.last')) as HTMLElement[];
    component.hearts = [true, true, false];
    fixture.detectChanges();
    expect(last().length).toBe(0);
    component.hearts = [true, false, false];
    fixture.detectChanges();
    expect(last().length).toBe(1);
    expect(last()[0]).toBe(fixture.nativeElement.querySelector('.bonus-heart'));
    expect(getComputedStyle(last()[0]).animationName).toBe('bonus-heart-beat');
  });

  it('ends on a miss with "well played" and the points, and a bigger swell of the field', () => {
    component.started = true;
    component.game = { ...component.game, hits: 4 };
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
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

  it('steers from a thumb anywhere off the board once the game is on, so it need not hide the paddle', () => {
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    const far = component.game.width - component.game.paddle.width / 2;
    // Below the board on a phone held upright: the page, not the canvas
    const below = document.createElement('div');
    document.body.appendChild(below);
    const press = (type: string, x: number) =>
      below.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', clientX: box.left + x, clientY: box.bottom + 40 }));
    try {
      press('pointerdown', far);
      expect(component.game.paddleTarget).toBeFalsy();

      component.started = true;
      press('pointerdown', far);
      expect(component.game.paddleTarget).toBeCloseTo(far, 0);
      press('pointermove', component.game.width / 2);
      expect(component.game.paddleTarget).toBeCloseTo(component.game.width / 2, 0);
    } finally {
      below.remove();
    }
  });

  it('leaves a press on a button or the header, and a mouse just passing over the page, alone', () => {
    component.started = true;
    const header = document.createElement('header');
    const sound = document.createElement('button');
    header.appendChild(sound);
    const page = document.createElement('div');
    document.body.append(header, page);
    try {
      sound.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 5 }));
      header.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: 5 }));
      page.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', buttons: 0, clientX: 5 }));
      expect(component.game.paddleTarget).toBeFalsy();
      // held down, the mouse steers like a finger
      page.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', buttons: 1, clientX: 5 }));
      expect(component.game.paddleTarget).toEqual(jasmine.any(Number));
    } finally {
      header.remove();
      page.remove();
    }
  });

  it('keeps the page from scrolling under a sliding thumb while the game is on, and lets it go after', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    expect(document.documentElement.style.touchAction).toBe('none');
    // at the end of the game
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    (component as unknown as { countdownLeft: number }).countdownLeft = 0;
    component.advance(0.05);
    expect(component.ended).toBeTrue();
    expect(document.documentElement.style.touchAction).toBe('');
    // and when the screen is left half way
    component.started = false;
    component.ended = false;
    component.start();
    component.ngOnDestroy();
    expect(document.documentElement.style.touchAction).toBe('');
  });

  it('squashes the ball for a moment off the paddle, like the other games\' balls, but not under reduced motion', () => {
    (component as { calm: boolean }).calm = false;
    const paddle = component.game.paddle;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    expect(component.hits).toBe(1);
    expect(component.squash).toBeGreaterThan(0);
    component.game = { ...component.game, ball: { ...component.game.ball, y: component.game.height / 3, vy: -50 } };
    component.advance(SQUASH_TIME);
    expect(component.squash).toBe(0);

    (component as { calm: boolean }).calm = true;
    playWithBall(paddle.x, paddle.y - BALL_RADIUS - 2, 0, 300);
    component.advance(0.03);
    expect(component.squash).toBe(0);
  });

  it('says one point is a point, and more are points (2026-10-16: "1 bonuspunten")', () => {
    component.started = true;
    component.game = { ...component.game, hits: 1 };
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();
    const won = () => fixture.nativeElement.querySelector('.bonus-won').textContent.replace(/\s+/g, ' ').trim();
    expect(won()).toBe('1 bonuspunt');
    component.hits = 3;
    fixture.detectChanges();
    expect(won()).toBe('3 bonuspunten');
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
    recordBonusBest('bonusBestSums:guest', 'pong', 3);
    component.started = true;
    component.game = { ...component.game, hits: 4 };
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
    component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
    component.advance(0.05);
    fixture.detectChanges();
    const best = fixture.nativeElement.querySelector('[role="status"] .bonus-best');
    expect(component.best).toBe(4);
    expect(component.newBest).toBeTrue();
    expect(best.textContent).toContain('Nieuw record!');
    expect(best.textContent).toContain('Beste tot nu toe: 4');
    expect(bonusBest('bonusBestSums:guest', 'pong')).toBe(4);
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
    // the side, far from ball, paddle and the tiles along the top: nothing drawn, fully clear
    expect(pixel(3, component.game.height / 2)[3]).toBe(0);
    // the ball and the paddle are there
    expect(pixel(component.game.ball.x, component.game.ball.y)[3]).toBeGreaterThan(200);
    const paddle = component.game.paddle;
    expect(pixel(paddle.x, paddle.y + paddle.height / 2)[3]).toBeGreaterThan(200);
  });

  it('keeps its upright board no wider than a phone, unlike sideways Springbal', () => {
    const page = fixture.nativeElement.querySelector('.bonus') as HTMLElement;
    expect(page.classList).not.toContain('bonus-wide');
    expect(getComputedStyle(page).maxWidth).toBe('480px');
  });

  it('fits the board in the height left below the score, so the paddle never needs scrolling to', () => {
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    // Measured from where the page stands as it is fitted: when the board is
    // too tall for the runner's window, opening the game scrolled it up
    window.scrollTo(0, 0);
    component.fit();
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

  it('brings the whole board, and Start with it, on screen as the game opens on a phone held sideways', () => {
    // 740 x 360 on its side: the board's bottom, and the start card's Start
    // button, were below the screen until Start was found and tapped
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    spyOn(board, 'getBoundingClientRect').and.returnValue({ top: 162, bottom: window.innerHeight + 82 } as DOMRect);
    const scroll = spyOn(window, 'scrollBy');
    component.ngAfterViewInit();
    expect(scroll).toHaveBeenCalledOnceWith(0, 82 + BOARD_MARGIN);
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
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
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
    playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
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
    playWithBall(component.game.width / 2, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
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

  describe('played with sums: aim for the answer (Yobyn, 2026-11-10)', () => {
    /** Started by hand on 7 + 5 with 11, 12 and 13 on the tiles, the ball going straight up under the tile given. */
    function underTile(index: number, streak = 0) {
      component.started = true;
      const game = component.game;
      const wide = game.width / TILES;
      const tiles = [11, 12, 13].map((value, i) => ({ value, x: i * wide, width: wide }));
      component.game = {
        ...game, elapsed: 120, task: { sum: { text: '7 + 5', answer: 12 } }, reveal: null, tiles, streak,
        ball: { ...game.ball, x: (index + 0.5) * wide, y: TILE_HEIGHT + BALL_RADIUS + 2, vx: 0, vy: -300 }
      };
      component.advance(0);
      fixture.detectChanges();
    }
    const sum = () => fixture.nativeElement.querySelector('.bonus-sum') as HTMLElement | null;

    it('plays the sums of the year and climb of the round that earned the game', () => {
      new ProgressService().record({ correctAnswers: 9, total: 10, percentage: 90, score: 18, grade: 4, difficulty: 'easy' });
      const other = TestBed.createComponent(BonusComponent);
      other.detectChanges();
      expect(other.componentInstance.level).toEqual({ grade: 4, warmUp: true, divide: ':' });
      expect(other.componentInstance.game.level).toEqual(other.componentInstance.level);
      other.componentInstance.ngOnDestroy();
      expect(component.level.grade).toBe(1);
      expect(component.game.task!.sum.text).toMatch(/^\d+ [+\u2212] \d+$/);
      expect(component.game.tiles!.map(tile => tile.value)).toContain(component.game.task!.sum.answer);
    });

    it('says on the start card to aim at the answer, with tiles and a sum in its picture', () => {
      expect(fixture.nativeElement.querySelector('.bonus-card').textContent).toContain('Mik op het antwoord van de som');
      const picture = fixture.nativeElement.querySelector('app-how-to-play');
      expect(picture.querySelectorAll('.tile').length).toBe(3);
      expect(picture.querySelector('.sum').textContent).toBe('2 + 3');
    });

    it('shows the sum in the title\'s place from Start, through the 3-2-1 too, and the board stays where it was', () => {
      const title = fixture.nativeElement.querySelector('.bonus-head h1') as HTMLElement;
      expect(sum()).toBeNull();
      expect(title.classList).not.toContain('away');
      // Measured from the top of the game's own page: Start may scroll the board into view (board-view.ts)
      const boardTop = () => fixture.nativeElement.querySelector('.bonus-board').getBoundingClientRect().top
        - fixture.nativeElement.querySelector('.bonus').getBoundingClientRect().top;
      const before = boardTop();
      component.start();
      fixture.detectChanges();
      expect(component.countdown).toBeGreaterThan(0);
      expect(sum()!.textContent!.trim()).toBe(`${component.game.task!.sum.text} = ?`);
      expect(sum()!.closest('.bonus-head')).toBeTruthy();
      expect(getComputedStyle(title).visibility).toBe('hidden');
      expect(boardTop()).toBe(before);
    });

    it('scores the answer\'s tile on top of the bounces: its points float from it, a chime, and the sum stands answered in green', () => {
      const sounds = TestBed.inject(SoundService);
      spyOn(sounds, 'playStar');
      spyOn(sounds, 'vibrate');
      underTile(1);
      component.game = { ...component.game, hits: 3 };
      component.advance(0.03);
      fixture.detectChanges();

      expect(component.hits).toBe(3 + RIGHT_POINTS);
      expect(component.solved).toBe(1);
      expect(component.floats.map(float => float.text)).toEqual([`+${RIGHT_POINTS}`]);
      expect(sounds.playStar).toHaveBeenCalledWith(1);
      expect(sounds.vibrate).toHaveBeenCalledWith(POINT_BUZZ);
      expect(pulses.pulse).toHaveBeenCalledWith(HIT_PULSE);
      expect(sum()!.textContent!.trim()).toBe('7 + 5 = 12');
      expect(sum()!.classList).toContain('right');
      // the ball turned back at the tiles
      expect(component.game.ball.vy).toBeGreaterThan(0);
    });

    it('pays more for answers in a row, with a higher chime', () => {
      const sounds = TestBed.inject(SoundService);
      spyOn(sounds, 'playStar');
      underTile(1, 2);
      component.advance(0.03);
      expect(component.hits).toBe(rightPoints(2));
      expect(sounds.playStar).toHaveBeenCalledWith(3);
    });

    it('only dims a wrong number\'s tile: no point, no buzz, the sum still asked', () => {
      const sounds = TestBed.inject(SoundService);
      spyOn(sounds, 'playStar');
      spyOn(sounds, 'vibrate');
      underTile(0, 2);
      component.advance(0.03);
      fixture.detectChanges();

      expect(component.hits).toBe(0);
      expect(component.game.tiles![0].tried).toBeTrue();
      expect(component.game.streak).toBe(0);
      expect(sounds.playStar).not.toHaveBeenCalled();
      expect(sounds.vibrate).not.toHaveBeenCalled();
      expect(component.heartsLeft).toBe(MISSES_ALLOWED);
      expect(sum()!.textContent!.trim()).toBe('7 + 5 = ?');
      expect(sum()!.classList).not.toContain('right');
    });

    it('writes each tile\'s number on the board, a number below nought with a true minus', () => {
      underTile(1);
      component.game = { ...component.game, tiles: component.game.tiles!.map((tile, i) => i === 0 ? { ...tile, value: -4 } : tile) };
      const context = (fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement).getContext('2d')!;
      const write = spyOn(context, 'fillText').and.callThrough();
      component.draw();
      expect(write.calls.allArgs().map(args => args[0])).toEqual(['\u22124', '12', '13']);
    });

    it('says on the end card how many sums were answered, and pays the bounces and the answers together', () => {
      underTile(1);
      component.advance(0.03);
      component.game = { ...component.game, hits: 4 };
      playWithBall(10, component.game.height - 5, 0, 400, MISSES_ALLOWED - 1);
      component.game = { ...component.game, paddle: { ...component.game.paddle, x: component.game.width - component.game.paddle.width / 2 } };
      component.advance(0.05);
      fixture.detectChanges();

      expect(component.ended).toBeTrue();
      expect(component.hits).toBe(4 + RIGHT_POINTS);
      expect(fixture.nativeElement.querySelector('.bonus-solved').textContent).toContain('1 som goed');
      expect(sum()).toBeNull();
      expect(component.xpWon).toBe(bonusXp(4 + RIGHT_POINTS));
      expect(bonusBest('bonusBestSums:guest', 'pong')).toBe(4 + RIGHT_POINTS);
      expect(bonusBest('bonusBest:guest', 'pong')).toBe(0);
    });
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

