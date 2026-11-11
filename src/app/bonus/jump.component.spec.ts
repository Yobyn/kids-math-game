import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BUMP_PULSE, FIZZ_LIFE, JumpComponent } from './jump.component';
import { REVEAL_RIGHT, RIGHT_POINTS } from './game-sums';
import { COUNTDOWN, END_BUZZ, MISS_BUZZ, POINT_BUZZ, SQUASH_TIME } from './game-feel';
import { BOARD_MARGIN, END_PULSE, END_SPARKS, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { AIRTIME, BUMPS_ALLOWED, jump, makeObstacle, makeStar, onGround, worldSpeed } from './jumper';
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

  it('may be wider than the other games where the screen has room, as it runs sideways', () => {
    const page = fixture.nativeElement.querySelector('.bonus') as HTMLElement;
    expect(page.classList).toContain('bonus-wide');
    expect(getComputedStyle(page).maxWidth).toBe('760px');
    // and the board, and so the game, takes that width when it is there
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    expect(component.game.width).toBe(Math.max(240, Math.round(board.clientWidth)));
  });

  it('bounces on a tap on the board, and on Space or the up arrow', () => {
    component.started = true;
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(component.game.ball.vy).toBeLessThan(0);
    component.game = { ...component.game, ball: { ...component.game.ball, vy: 0 } };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(component.game.ball.vy).toBeLessThan(0);
    component.game = { ...component.game, ball: { ...component.game.ball, vy: 0 } };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.game.ball.vy).toBeLessThan(0);
  });

  it('bounces on a tap anywhere on the screen, so a thumb below the board plays too', () => {
    // Below the board on a phone held upright: the page, not the canvas
    const below = document.createElement('div');
    document.body.appendChild(below);
    try {
      below.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(component.game.ball.vy).toBe(0);

      component.started = true;
      below.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(component.game.ball.vy).toBeLessThan(0);
    } finally {
      below.remove();
    }
  });

  it('leaves a tap on a button or the header to that control', () => {
    component.started = true;
    const header = document.createElement('header');
    const sound = document.createElement('button');
    header.appendChild(sound);
    const link = document.createElement('a');
    document.body.append(header, link);
    try {
      sound.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      header.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      expect(component.game.ball.vy).toBe(0);
    } finally {
      header.remove();
      link.remove();
    }
  });

  it('gives the 3-2-1 again when the child comes back mid-game, with nothing moving until it is over', () => {
    const hidden = spyOnProperty(document, 'hidden').and.returnValue(true);
    playFacing('ground', 200);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.and.returnValue(false);
    expect(component.countdown).toBe(COUNTDOWN);
    const x = component.game.obstacles[0].x;
    component.advance(1);
    expect(component.game.obstacles[0].x).toBe(x);
    // a tap in the count does not bounce
    component.tap();
    expect(component.game.ball.vy).toBe(0);
    component.advance(COUNTDOWN);
    component.advance(0.1);
    expect(component.game.obstacles[0].x).toBeLessThan(x);
  });

  it('ticks the phone for each block passed and star taken, and pulses it twice as a game with points ends', () => {
    const buzz = spyOn(TestBed.inject(SoundService), 'vibrate');
    component.answer({ kind: 'land', x: 50, y: 200 });
    expect(buzz).not.toHaveBeenCalled();
    component.answer({ kind: 'pass', x: 50, y: 200 });
    component.answer({ kind: 'star', x: 50, y: 100 });
    expect(buzz.calls.allArgs()).toEqual([[POINT_BUZZ], [POINT_BUZZ]]);
    component.game = { ...component.game, points: 2 };
    component.answer({ kind: 'end', x: 50, y: 200 });
    expect(buzz).toHaveBeenCalledWith(END_BUZZ);
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

  it('loses one of three hearts for a block run into, and rolls on through it, as in Ballonnen', () => {
    const buzz = spyOn(TestBed.inject(SoundService), 'vibrate');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart').length).toBe(BUMPS_ALLOWED);
    playFacing('ground', 30);
    for (let i = 0; i < 40 && component.game.bumps === 0; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.heartsLeft).toBe(BUMPS_ALLOWED - 1);
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart.lost').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.bonus-heart.just-lost')).not.toBeNull();
    expect(component.ended).toBeFalse();
    expect(component.game.obstacles[0].hit).toBeTrue();
    expect(pulses.pulse).toHaveBeenCalledWith(BUMP_PULSE);
    expect(buzz).toHaveBeenCalledWith(MISS_BUZZ);
    // it rolls on through, for no point, and the game goes on
    component.advance(1);
    expect(component.ended).toBeFalse();
    expect(component.points).toBe(0);
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

  it('ends on the third bump with "well played", the points and the XP, a bigger burst, paid once', () => {
    const progress = TestBed.inject(ProgressService);
    const before = progress.getXp();
    // the last of the three hearts
    playFacing('ground', 30);
    component.game = { ...component.game, points: 9, bumps: BUMPS_ALLOWED - 1 };
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
    recordBonusBest('bonusBestSums:guest', 'jump', 20);
    // the last of the three hearts
    playFacing('ground', 30);
    component.game = { ...component.game, points: 9, bumps: BUMPS_ALLOWED - 1 };
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

  it('says one point is a point, and more are points (2026-10-16: "1 bonuspunten")', () => {
    // the last of the three hearts
    playFacing('ground', 30);
    component.game = { ...component.game, points: 1, bumps: BUMPS_ALLOWED - 1 };
    for (let i = 0; i < 40 && !component.ended; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    const won = () => fixture.nativeElement.querySelector('.bonus-won').textContent.replace(/\s+/g, ' ').trim();
    expect(won()).toBe('1 bonuspunt');
    component.points = 0;
    fixture.detectChanges();
    expect(won()).toBe('0 bonuspunten');
  });

  it('goes back to choosing what to play next', () => {
    component.done();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('shows no clock: only the points and the hearts, the flag comes when it comes', () => {
    const bar = Array.from(fixture.nativeElement.querySelector('.bonus-bar').children) as HTMLElement[];
    expect(bar.map(part => part.className)).toEqual(['bonus-points', 'bonus-hearts']);
  });

  describe('played with sums: bounce up to the answer (Yobyn, 2026-11-10)', () => {
    /** Started by hand on 7 + 5, a star with this number where a bounce now reaches it, and nothing else coming. */
    function facingStar(value: number, streak = 0) {
      component.started = true;
      const game = component.game;
      const star = makeStar(game, game.ball.x + worldSpeed(game.width, component.calm) * AIRTIME / 2, value);
      component.game = { ...game, task: { sum: { text: '7 + 5', answer: 12 }, deal: [11, 12] }, reveal: null, stars: [star], streak, untilNext: 1e9 };
      component.advance(0);
      fixture.detectChanges();
    }
    const bounceThrough = () => {
      component.game = jump(component.game);
      for (let t = 0; t < AIRTIME; t += 1 / 60) {
        component.advance(1 / 60);
      }
      fixture.detectChanges();
    };
    const sum = () => fixture.nativeElement.querySelector('.bonus-sum') as HTMLElement | null;

    it('plays the sums of the year and climb of the round that earned the game', () => {
      new ProgressService().record({ correctAnswers: 9, total: 10, percentage: 90, score: 18, grade: 4, difficulty: 'easy' });
      const other = TestBed.createComponent(JumpComponent);
      other.detectChanges();
      expect(other.componentInstance.level).toEqual({ grade: 4, warmUp: true, divide: ':' });
      expect(other.componentInstance.game.level).toEqual(other.componentInstance.level);
      other.componentInstance.ngOnDestroy();
      expect(component.level.grade).toBe(1);
      expect(component.game.task!.sum.text).toMatch(/^\d+ [+\u2212] \d+$/);
    });

    it('shows the sum in the title\'s place once the game is going, above the board where it covers no star, and not on the start card', () => {
      const title = fixture.nativeElement.querySelector('.bonus-head h1') as HTMLElement;
      expect(sum()).toBeNull();
      expect(title.classList).not.toContain('away');
      const before = fixture.nativeElement.querySelector('.bonus-board').getBoundingClientRect().top;
      facingStar(12);
      expect(sum()!.textContent!.trim()).toBe('7 + 5 = ?');
      expect(sum()!.closest('.bonus-head')).toBeTruthy();
      expect(sum()!.closest('.bonus-board')).toBeNull();
      expect(title.classList).toContain('away');
      expect(getComputedStyle(title).visibility).toBe('hidden');
      // the board stays where it was: the sum takes the title's room, no more
      expect(fixture.nativeElement.querySelector('.bonus-board').getBoundingClientRect().top).toBe(before);
    });

    it('scores the answer a bounce takes, with its points floating up and a chime, and shows the sum answered', () => {
      const chime = spyOn(TestBed.inject(SoundService), 'playStar');
      facingStar(12);
      component.game = jump(component.game);
      for (let t = 0; t < AIRTIME / 2 + 0.05; t += 1 / 60) {
        component.advance(1 / 60);
      }
      fixture.detectChanges();
      expect(component.points).toBe(RIGHT_POINTS);
      expect(chime).toHaveBeenCalledWith(1);
      expect(component.floats.some(float => float.text === `+${RIGHT_POINTS}`)).toBeTrue();
      expect(sum()!.textContent!.trim()).toBe('7 + 5 = 12');
      expect(sum()!.classList).toContain('right');
      component.advance(REVEAL_RIGHT + 0.1);
      fixture.detectChanges();
      expect(sum()!.textContent!.trim()).toMatch(/ = \?$/);
      expect(sum()!.classList).not.toContain('right');
    });

    it('chimes a step higher for each answer in a row, to a top', () => {
      const chime = spyOn(TestBed.inject(SoundService), 'playStar');
      facingStar(12, 2);
      bounceThrough();
      expect(chime).toHaveBeenCalledWith(3);
      expect(component.points).toBe(RIGHT_POINTS + 2);
    });

    it('lets a wrong number fizzle out with a soft tick: no point, no heart, no buzz, the sum stays', () => {
      const sounds = TestBed.inject(SoundService);
      const tick = spyOn(sounds, 'playTap');
      const buzz = spyOn(sounds, 'vibrate');
      facingStar(11);
      component.game = jump(component.game);
      for (let t = 0; t < AIRTIME / 2 + 0.05; t += 1 / 60) {
        component.advance(1 / 60);
      }
      fixture.detectChanges();
      expect(component.points).toBe(0);
      expect(component.heartsLeft).toBe(BUMPS_ALLOWED);
      expect(tick).toHaveBeenCalled();
      expect(buzz).not.toHaveBeenCalled();
      expect(component.fizzes.length).toBe(1);
      expect(sum()!.textContent!.trim()).toBe('7 + 5 = ?');
      // the fizz fades and is gone
      component.advance(FIZZ_LIFE + 0.05);
      expect(component.fizzes).toEqual([]);
    });

    it('writes the number on each star it draws, dark on a pale disc, and none on a plain star', () => {
      facingStar(12);
      const context = (component as any).context as CanvasRenderingContext2D;
      const written = spyOn(context, 'fillText').and.callThrough();
      component.game = { ...component.game, stars: [...component.game.stars, makeStar(component.game, 200, -7), makeStar(component.game, 260)] };
      component.draw();
      expect(written.calls.allArgs().map(args => args[0])).toEqual(['12', '\u22127']);
    });

    it('says how many sums were answered on the end card', () => {
      facingStar(12);
      bounceThrough();
      component.game = { ...component.game, bumps: BUMPS_ALLOWED - 1, obstacles: [makeObstacle(component.game, 'ground', component.game.ball.x - 5)] };
      component.advance(0.05);
      fixture.detectChanges();
      expect(component.ended).toBeTrue();
      expect(fixture.nativeElement.querySelector('.bonus-solved').textContent).toContain('1 som goed');
      expect(sum()).toBeNull();
    });

    it('shows the sum and a star with its answer in the picture on the start card, and says so in words', () => {
      const how = fixture.nativeElement.querySelector('app-how-to-play');
      expect(how.querySelector('.sum').textContent).toBe('2 + 3');
      expect(how.querySelector('.number.on-star').textContent).toBe('5');
      expect(fixture.nativeElement.textContent).toContain('naar de ster met het antwoord van de som');
    });
  });
});
