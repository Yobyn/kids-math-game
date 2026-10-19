import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { ProgressSyncService } from '../services/progress-sync.service';
import { AvatarService } from '../services/avatar.service';
import { bonusXp } from '../levels/level-curve';
import { SoundService } from '../services/sound.service';
import { fieldColour } from '../particles/particle-field';
import { BONUS_WORDS } from './bonus-words';
import { BOARD_MARGIN, END_PULSE, END_SPARKS, END_SPARK_RADIUS, HIT_PULSE, MIN_BOARD } from './bonus.component';
import { drawClouds, drawFloats, prefersReducedMotion, rgb, starPath } from './drawing';
import { cloudsAt } from './backdrops';
import { COUNTDOWN, Flash, FloatUp, ageFlashes, ageFloats, countdownShown, newFloat } from './game-feel';
import { BONUS_BEST_KEY, recordBonusBest } from './bonus-best';
import { showWholeBoard } from './board-view';
import { Balloon, BalloonEvent, Balloons, MISSES_ALLOWED, SWAY_SPEED, newBalloons, pop, step, swayedX } from './balloons';
import { Burst, ageBursts, newBurst, piecesOf } from './pop-burst';

/**
 * The board may be as tall as Balspel's, 1.6 times its width, when the phone
 * has the room: more sky for the balloons to rise through. At 1.25 it left
 * 150px (360x740) to 218px (390x844) of empty screen below it (2026-10-19).
 * A balloon still takes the same time to cross it (balloons.ts RISE).
 */
export const BOARD_SHAPE = 1.6;
/** A star balloon's gold: Springbal's stars' (jump.component.ts). */
export const STAR_GOLD = { r: 255, g: 216, b: 107 };
/** How hard a balloon getting away nudges the field: a small sigh, not a burst. */
export const MISS_PULSE = 0.12;
/**
 * Where a balloon got away stays marked at the top of the board for this
 * long (2026-10-17: playing it, a balloon leaving cost a heart with nothing
 * on the board to say so, and the heart above it faded quietly).
 */
export const ESCAPE_LIFE = 0.9;
/** The end is the biggest burst of the three games: two rings of sparks, and every balloon still up pops. */
export const END_RINGS = 2;

/**
 * The third bonus game (Yobyn, 2026-10-13): balloons float up and a tap
 * pops them. Its rules are in balloons.ts; this screen draws them and
 * passes on the taps. Three balloons getting away ends it, and so does its
 * finish, which comes at a random moment: no clock is shown, only the points
 * and three hearts for the balloons that may still get away.
 *
 * It looks and answers like the other two (bonus.component.ts,
 * jump.component.ts): the canvas is see-through so the particle field shows,
 * every pop swells the field and sparks where the balloon was, and the end
 * is a bigger burst.
 */
@Component({
  selector: 'app-balloons',
  templateUrl: './balloons.component.html',
  styleUrls: ['./bonus.component.css']
})
export class BalloonsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('board') boardRef!: ElementRef<HTMLElement>;

  game: Balloons = newBalloons(320, 400);
  started = false;
  ended = false;
  /** What the screen shows; copied from the game only when it changes. */
  points = 0;
  /** Hearts for the balloons that may still get away. */
  hearts: boolean[] = Array(MISSES_ALLOWED).fill(true);
  /** The XP the game paid, once it has ended (level-curve.ts). */
  xpWon = 0;
  get heartsLeft(): number {
    return this.hearts.filter(Boolean).length;
  }
  /** Ended at its finish rather than on the third balloon away. */
  finished = false;
  /** The 3-2-1 after Start, as shown; 0 once the game is going (game-feel.ts). */
  countdown = 0;
  /** This game's best for this child, and whether the game just played beat it. */
  best = 0;
  newBest = false;
  /** "+1"s floating up where points were scored. */
  floats: FloatUp[] = [];
  /** Where balloons got away at the top, fading (ESCAPE_LIFE); the x is where it left, y the hue. */
  escapes: Flash[] = [];

  readonly calm = prefersReducedMotion();
  /** Balloons bursting into pieces, drawn until the pieces fade (pop-burst.ts); none under reduced motion. */
  bursts: Burst[] = [];
  private frame = 0;
  private countdownLeft = 0;
  private lastAt = 0;
  private context: CanvasRenderingContext2D | null = null;
  private ratio = 1;

  constructor(
    public languageService: LanguageService,
    private pulseService: FieldPulseService,
    private router: Router,
    private zone: NgZone,
    private progressService: ProgressService,
    private progressSync: ProgressSyncService,
    private avatarService: AvatarService,
    private soundService: SoundService
  ) {
    languageService.extend(BONUS_WORDS);
  }

  /** Only a finished round opens the game: without one there is nothing to play for. */
  ngOnInit() {
    if (!this.progressService.hasBonus()) {
      this.router.navigate(['/grade']);
    }
  }

  ngAfterViewInit() {
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.fit();
    this.draw();
    // On a phone held sideways the board runs past the screen, and Start
    // with it, as the game opens: bring it all up now, not only at Start
    showWholeBoard(this.boardRef.nativeElement, BOARD_MARGIN);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
  }

  /** The board takes the screen's width and the height left below the score. */
  fit() {
    const canvas = this.canvasRef?.nativeElement;
    const board = this.boardRef?.nativeElement;
    if (!canvas || !board) {
      return;
    }
    const width = Math.max(240, Math.round(board.clientWidth));
    const left = window.innerHeight - board.getBoundingClientRect().top - BOARD_MARGIN;
    const height = Math.round(Math.min(Math.max(left, MIN_BOARD), width * BOARD_SHAPE));
    this.ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * this.ratio);
    canvas.height = Math.round(height * this.ratio);
    canvas.style.height = `${height}px`;
    if (!this.started) {
      this.game = newBalloons(width, height, this.calm);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (!this.started) {
      this.fit();
      this.draw();
    }
  }

  start() {
    if (this.started) {
      return;
    }
    // Spent as it starts: leaving half way does not buy another go
    if (!this.progressService.useBonus()) {
      this.router.navigate(['/grade']);
      return;
    }
    this.fit();
    this.started = true;
    this.countdownLeft = COUNTDOWN;
    this.countdown = COUNTDOWN;
    // On a short phone the board runs past the screen: bring it all up
    if (this.boardRef) {
      showWholeBoard(this.boardRef.nativeElement, BOARD_MARGIN);
    }
    this.zone.runOutsideAngular(() => {
      this.lastAt = performance.now();
      this.frame = requestAnimationFrame(at => this.loop(at));
    });
  }

  private loop(at: number) {
    // A phone that went to sleep comes back where it was, not a second later
    const seconds = Math.min(0.05, Math.max(0, (at - this.lastAt) / 1000));
    this.lastAt = at;
    this.advance(seconds);
    if (!this.ended || this.bursts.length) {
      this.frame = requestAnimationFrame(next => this.loop(next));
    }
  }

  /** One frame: the balloons rise, the field answers. */
  advance(seconds: number) {
    if (!this.started) {
      return;
    }
    // The 3-2-1: nothing moves until it is over
    if (this.countdownLeft > 0) {
      this.countdownLeft = Math.max(0, this.countdownLeft - seconds);
      const shown = countdownShown(this.countdownLeft);
      if (shown !== this.countdown) {
        this.zone.run(() => this.countdown = shown);
      }
      this.draw();
      return;
    }
    this.floats = ageFloats(this.floats, seconds);
    this.bursts = ageBursts(this.bursts, seconds);
    this.escapes = ageFlashes(this.escapes, seconds, ESCAPE_LIFE);
    if (!this.ended) {
      const { game, events } = step(this.game, seconds);
      this.game = game;
      events.forEach(event => this.answer(event));
      this.show();
    }
    this.draw();
  }

  /** A tap on the board pops the balloon under the finger, if there is one. */
  tap(event: PointerEvent) {
    if (!this.started || this.ended) {
      return;
    }
    event.preventDefault();
    const box = this.canvasRef.nativeElement.getBoundingClientRect();
    this.popAt(event.clientX - box.left, event.clientY - box.top);
  }

  /** Pops the balloon a tap at (x, y) on the board reaches. */
  popAt(x: number, y: number) {
    if (this.countdownLeft > 0) {
      return;
    }
    const before = this.game;
    const { game, event } = pop(before, x, y);
    this.game = game;
    if (event) {
      const popped = before.balloons.find(balloon => !game.balloons.includes(balloon));
      if (popped) {
        this.burst(popped, event.x);
      }
      this.answer(event);
      this.show();
      this.draw();
    }
  }

  /** Copies what changed into what the screen shows, and pays as the game ends. */
  private show() {
    const game = this.game;
    const left = MISSES_ALLOWED - game.missed;
    if (game.points === this.points && left === this.heartsLeft && (game.ended !== null) === this.ended) {
      return;
    }
    const ending = game.ended !== null && !this.ended;
    this.zone.run(() => {
      this.points = game.points;
      this.hearts = Array.from({ length: MISSES_ALLOWED }, (_, i) => i < left);
      this.ended = game.ended !== null;
      this.finished = game.ended === 'finished';
      if (ending) {
        this.floats = [];
        this.escapes = [];
        this.pay();
      }
    });
  }

  /**
   * A pop swells the field, sparks where the balloon was and blips softly;
   * one getting away barely stirs it; the end swells the whole field and
   * throws sparks all round the middle of the board.
   */
  answer(event: BalloonEvent) {
    const box = this.canvasRef?.nativeElement.getBoundingClientRect();
    const left = box ? box.left : 0;
    const top = box ? box.top : 0;
    if (event.kind === 'pop') {
      this.floats = [...this.floats, newFloat(event.x, event.y, `+${event.points ?? 1}`)];
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      if (event.star) {
        // A star balloon chimes like Springbal's stars, a step higher
        this.soundService.playStar(2);
      } else {
        this.soundService.playPop();
      }
      return;
    }
    if (event.kind === 'miss') {
      // Marked where it left, so the heart it cost is not a surprise
      this.escapes = [...this.escapes, { x: event.x, y: event.hue, age: 0 }];
      this.pulseService.pulse(MISS_PULSE);
      return;
    }
    this.pulseService.pulse(END_PULSE);
    for (let ring = 1; ring <= END_RINGS; ring++) {
      for (let i = 0; i < END_SPARKS; i++) {
        const angle = ((i + ring / 2) / END_SPARKS) * Math.PI * 2;
        const reach = END_SPARK_RADIUS * ring;
        this.pulseService.tap(left + event.x + Math.cos(angle) * reach, top + event.y + Math.sin(angle) * reach);
      }
    }
    // Every balloon still up pops with it, each with its sparks
    this.game.balloons.forEach(balloon => {
      const x = swayedX(balloon, this.game.elapsed, this.calm);
      this.pulseService.tap(left + x, top + balloon.y);
      this.burst(balloon, x);
    });
    this.game = { ...this.game, balloons: [] };
    if (this.game.points > 0) {
      this.soundService.playSuccess();
    }
  }

  /** A popped balloon flies apart into pieces, unless the child's device asks for calm. */
  private burst(balloon: Balloon, x: number) {
    if (!this.calm) {
      this.bursts = [...this.bursts, { ...newBurst(x, balloon.y, balloon.radius, balloon.hue, balloon.phase), star: !!balloon.star }];
    }
  }

  /** The game's XP, paid once as it ends, and kept like a round's. */
  private pay() {
    this.xpWon = bonusXp(this.points);
    this.progressService.addXp(this.xpWon);
    const record = recordBonusBest(this.progressService.ownerKey(BONUS_BEST_KEY), 'balloons', this.points);
    this.best = record.best;
    this.newBest = record.beaten;
    this.avatarService.refresh();
    this.progressSync.push().subscribe();
  }

  /** Back to choosing what to play next. */
  done() {
    this.router.navigate(['/grade']);
  }

  draw() {
    const context = this.context;
    if (!context) {
      return;
    }
    const { width, height, balloons, elapsed } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);
    // Soft clouds drifting slowly behind the balloons; still under reduced motion
    drawClouds(context, cloudsAt(width, height, elapsed, this.calm), '#ffffff');
    context.save();
    balloons.forEach(balloon => this.drawBalloon(context, balloon, elapsed));
    this.bursts.forEach(burst => this.drawBurst(context, burst));
    this.escapes.forEach(escape => this.drawEscape(context, escape));
    context.restore();
    drawFloats(context, this.floats, this.calm, rgb(fieldColour(0.5)));
  }

  /**
   * A balloon: its string swaying behind it, the knot, the skin lit from the
   * top left, and a shine. A star balloon is gold, with a white star on it.
   */
  private drawBalloon(context: CanvasRenderingContext2D, balloon: Balloon, elapsed: number) {
    const calm = this.calm;
    const x = swayedX(balloon, elapsed, calm);
    const { y, radius } = balloon;
    const colour = balloon.star ? STAR_GOLD : fieldColour(balloon.hue);
    const tall = radius * 1.15;

    // The string trails the sway: it bends the other way
    const swing = calm ? 0.25 : -Math.sin(elapsed * SWAY_SPEED + balloon.phase) * 0.6;
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(x, y + tall + radius * 0.12);
    context.bezierCurveTo(
      x + radius * swing, y + tall + radius * 0.6,
      x - radius * swing, y + tall + radius * 1.0,
      x + radius * swing * 0.5, y + tall + radius * 1.5);
    context.stroke();

    // The skin: light where the light falls, the field's colour, deeper at the edge
    const skin = context.createRadialGradient(x - radius * 0.35, y - tall * 0.4, radius * 0.1, x, y, tall);
    skin.addColorStop(0, `rgb(${mix(colour.r)}, ${mix(colour.g)}, ${mix(colour.b)})`);
    skin.addColorStop(0.55, rgb(colour));
    skin.addColorStop(1, `rgb(${Math.round(colour.r * 0.6)}, ${Math.round(colour.g * 0.6)}, ${Math.round(colour.b * 0.6)})`);
    context.shadowColor = rgb(colour);
    context.shadowBlur = 14;
    context.fillStyle = skin;
    context.beginPath();
    context.ellipse(x, y, radius, tall, 0, 0, Math.PI * 2);
    context.fill();

    // The knot, tied at the bottom
    context.shadowBlur = 0;
    context.fillStyle = `rgb(${Math.round(colour.r * 0.7)}, ${Math.round(colour.g * 0.7)}, ${Math.round(colour.b * 0.7)})`;
    context.beginPath();
    context.moveTo(x, y + tall - radius * 0.05);
    context.lineTo(x - radius * 0.16, y + tall + radius * 0.14);
    context.lineTo(x + radius * 0.16, y + tall + radius * 0.14);
    context.closePath();
    context.fill();

    // The shine
    context.fillStyle = 'rgba(255, 255, 255, 0.55)';
    context.beginPath();
    context.ellipse(x - radius * 0.38, y - tall * 0.42, radius * 0.16, radius * 0.3, -0.5, 0, Math.PI * 2);
    context.fill();

    if (balloon.star) {
      context.fillStyle = 'rgba(255, 255, 255, 0.92)';
      starPath(context, x, y + tall * 0.05, radius * 0.5);
      context.fill();
    }
  }

  /**
   * Where a balloon got away: a glow at the top edge in its colour and an
   * arrow pointing up out of the board, fading. It holds still under
   * reduced motion; otherwise the arrow drifts up as it fades.
   */
  private drawEscape(context: CanvasRenderingContext2D, escape: Flash) {
    const t = Math.min(1, escape.age / ESCAPE_LIFE);
    const { r, g, b } = fieldColour(escape.y);
    const alpha = 1 - t;
    const glow = context.createRadialGradient(escape.x, 0, 0, escape.x, 0, 46);
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(0.7 * alpha).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    context.fillStyle = glow;
    context.fillRect(escape.x - 46, 0, 92, 46);
    const lift = this.calm ? 0 : 10 * t;
    context.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(escape.x - 9, 22 - lift);
    context.lineTo(escape.x, 12 - lift);
    context.lineTo(escape.x + 9, 22 - lift);
    context.stroke();
  }

  /** The pieces of a popped balloon, flying apart and fading. */
  private drawBurst(context: CanvasRenderingContext2D, burst: Burst) {
    const { r, g, b } = burst.star ? STAR_GOLD : fieldColour(burst.hue);
    piecesOf(burst).forEach(piece => {
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${piece.alpha.toFixed(3)})`;
      context.beginPath();
      // A curled scrap of skin
      context.moveTo(-piece.size, 0);
      context.quadraticCurveTo(0, -piece.size * 0.9, piece.size, 0);
      context.quadraticCurveTo(0, -piece.size * 0.3, -piece.size, 0);
      context.fill();
      context.restore();
    });
  }
}

/** A colour channel lifted most of the way to white: the lit side of the skin. */
function mix(channel: number): number {
  return Math.round(channel + (255 - channel) * 0.55);
}
