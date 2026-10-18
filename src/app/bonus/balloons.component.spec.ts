import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BOARD_SHAPE, BalloonsComponent, END_RINGS, ESCAPE_LIFE, MISS_PULSE } from './balloons.component';
import { BURST_LIFE } from './pop-burst';
import { BOARD_MARGIN, END_PULSE, END_SPARKS, HIT_PULSE } from './bonus.component';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { SoundService } from '../services/sound.service';
import { BONUS_XP_CAP, bonusXp } from '../levels/level-curve';
import { Balloon, MISSES_ALLOWED, STAR_POINTS, balloonRadius, swayedX } from './balloons';
import { HowToPlayComponent } from './how-to-play.component';

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
      declarations: [BalloonsComponent, HowToPlayComponent]
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

  it('grows the board as tall as the one in Balspel when the phone has the room, so no screen is left empty below it', () => {
    const board = fixture.nativeElement.querySelector('.bonus-board') as HTMLElement;
    // A tall phone: far more room below the score than the board can take
    spyOn(board, 'getBoundingClientRect').and.returnValue({ top: window.innerHeight - BOARD_MARGIN - 3000 } as DOMRect);
    component.fit();
    const width = Math.max(240, Math.round(board.clientWidth));
    expect(BOARD_SHAPE).toBe(1.6);
    expect(component.game.height).toBe(Math.round(width * BOARD_SHAPE));
  });

  it('sends a child without a finished round back, rather than giving a free game', () => {
    localStorage.removeItem('bonus:guest');
    const again = TestBed.createComponent(BalloonsComponent);
    again.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
    again.componentInstance.ngOnDestroy();
  });

  it('pops a balloon tapped on the board: a point, the field swells and sparks there, a soft pop', () => {
    const blip = spyOn(TestBed.inject(SoundService), 'playPop');
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

  it('bursts a popped balloon into pieces that fly apart and fade', () => {
    (component as { calm: boolean }).calm = false;
    const balloon = playWith({});
    component.popAt(swayedX(balloon, component.game.elapsed, false), balloon.y);
    expect(component.bursts.length).toBe(1);
    expect(component.bursts[0]).toEqual(jasmine.objectContaining({ y: balloon.y, radius: balloon.radius, hue: balloon.hue }));
    component.advance(BURST_LIFE / 2);
    expect(component.bursts.length).toBe(1);
    component.advance(BURST_LIFE);
    expect(component.bursts).toEqual([]);
  });

  it('pops without pieces under reduced motion', () => {
    (component as { calm: boolean }).calm = true;
    const balloon = playWith({});
    component.popAt(balloon.x, balloon.y);
    expect(component.points).toBe(1);
    expect(component.bursts).toEqual([]);
  });

  it('ends with the biggest burst of the games: two rings of sparks, and every balloon still up pops', () => {
    (component as { calm: boolean }).calm = false;
    playWith({ y: 5 });
    const game = component.game;
    const still: Balloon[] = [
      { id: 60, x: 60, y: game.height * 0.6, radius: 24, hue: 0.2, phase: 0 },
      { id: 61, x: 200, y: game.height * 0.4, radius: 24, hue: 0.8, phase: 1 }
    ];
    component.game = { ...game, balloons: [...game.balloons, ...still], missed: MISSES_ALLOWED - 1 };
    for (let i = 0; i < 20 && !component.ended; i++) {
      component.advance(0.05);
    }
    expect(component.ended).toBeTrue();
    expect(component.game.balloons).toEqual([]);
    expect(component.bursts.length).toBe(still.length);
    expect((pulses.tap as jasmine.Spy).calls.count()).toBeGreaterThanOrEqual(END_SPARKS * END_RINGS + still.length);
    // the pieces go on flying after the end, then are gone
    component.advance(BURST_LIFE);
    expect(component.bursts).toEqual([]);
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

  it('shows how to play on the start card, as a picture as well as words', () => {
    const picture = fixture.nativeElement.querySelector('.bonus-card app-how-to-play');
    expect(picture.querySelector('.balloon')).not.toBeNull();
  });

  it('counts 3, 2, 1 after Start before the first balloon comes, and pops nothing during it', () => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    component.start();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bonus-countdown').textContent.trim()).toBe('3');
    component.advance(2.5);
    expect(component.countdown).toBe(1);
    expect(component.game.elapsed).toBe(0);
    component.game = { ...component.game, balloons: [{ id: 9, x: 100, y: 100, radius: 24, hue: 0.5, phase: 0 }] };
    component.popAt(100, 100);
    expect(component.points).toBe(0);
    component.advance(0.6);
    expect(component.countdown).toBe(0);
    component.popAt(swayedX(component.game.balloons[0], component.game.elapsed, component.calm), 100);
    expect(component.points).toBe(1);
  });

  it('floats a +1 up where a balloon was popped', () => {
    const balloon = playWith({});
    const x = swayedX(balloon, component.game.elapsed, component.calm);
    component.popAt(x, balloon.y);
    expect(component.floats.length).toBe(1);
    expect(component.floats[0]).toEqual(jasmine.objectContaining({ x, y: balloon.y, text: '+1' }));
  });

  it('pops a star balloon with a +3, gold pieces and a chime instead of the soft pop', () => {
    (component as { calm: boolean }).calm = false;
    const sounds = TestBed.inject(SoundService);
    const chime = spyOn(sounds, 'playStar');
    const blip = spyOn(sounds, 'playPop');
    const balloon = playWith({ star: true });
    const x = swayedX(balloon, component.game.elapsed, component.calm);
    component.popAt(x, balloon.y);
    expect(component.points).toBe(STAR_POINTS);
    expect(component.floats[0]).toEqual(jasmine.objectContaining({ x, y: balloon.y, text: '+' + STAR_POINTS }));
    expect(component.bursts[0].star).toBeTrue();
    expect(chime).toHaveBeenCalled();
    expect(blip).not.toHaveBeenCalled();
  });

  it('keeps no best before a game with points, and shows the first one without "new best"', () => {
    expect(fixture.nativeElement.querySelector('.bonus-best')).toBeNull();
    component.started = true;
    component.game = { ...component.game, points: 6, finishAt: 0, untilNext: 1e9 };
    component.advance(0.05);
    fixture.detectChanges();
    expect(component.best).toBe(6);
    expect(component.newBest).toBeFalse();
    const best = fixture.nativeElement.querySelector('[role="status"] .bonus-best');
    expect(best.textContent).toContain('Beste tot nu toe: 6');
    expect(best.querySelector('.bonus-new-best')).toBeNull();
  });

  it('says one point is a point, and more are points (2026-10-16: "1 bonuspunten")', () => {
    component.started = true;
    component.game = { ...component.game, points: 1, finishAt: 0, untilNext: 1e9 };
    component.advance(0.05);
    fixture.detectChanges();
    const won = () => fixture.nativeElement.querySelector('.bonus-won').textContent.replace(/\s+/g, ' ').trim();
    expect(won()).toBe('1 bonuspunt');
    component.points = 2;
    fixture.detectChanges();
    expect(won()).toBe('2 bonuspunten');
  });

  it('marks where a balloon got away and drops the heart it cost, so a miss is seen (2026-10-17)', () => {
    const balloon = playWith({ y: 5, hue: 0.3 });
    for (let i = 0; i < 20 && component.game.missed === 0; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    expect(component.escapes.length).toBe(1);
    expect(component.escapes[0].x).toBeCloseTo(swayedX(balloon, component.game.elapsed, component.calm), 0);
    expect(component.escapes[0].y).toBe(0.3);
    const hearts = fixture.nativeElement.querySelectorAll('.bonus-heart');
    expect(hearts[MISSES_ALLOWED - 1].classList).toContain('just-lost');
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart.just-lost').length).toBe(1);
    // the mark fades away; the heart stays faded
    component.advance(ESCAPE_LIFE);
    fixture.detectChanges();
    expect(component.escapes).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('.bonus-heart.lost').length).toBe(1);
  });

  it('drops only the heart just lost: the next miss drops the next one', () => {
    playWith({ y: 5 });
    component.game = { ...component.game, missed: 1 };
    for (let i = 0; i < 20 && component.game.missed === 1; i++) {
      component.advance(0.05);
    }
    fixture.detectChanges();
    const hearts = Array.from(fixture.nativeElement.querySelectorAll('.bonus-heart')) as HTMLElement[];
    expect(hearts.map(heart => heart.classList.contains('just-lost'))).toEqual([false, true, false]);
  });

  it('goes back to choosing what to play next', () => {
    component.done();
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });
});
