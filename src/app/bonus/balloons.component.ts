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
import { drawFloats, prefersReducedMotion, rgb } from './drawing';
import { COUNTDOWN, FloatUp, ageFloats, countdownShown, newFloat } from './game-feel';
import { BONUS_BEST_KEY, recordBonusBest } from './bonus-best';
import { showWholeBoard } from './board-view';
import { Balloon, BalloonEvent, Balloons, MISSES_ALLOWED, SWAY_SPEED, newBalloons, pop, step, swayedX } from './balloons';
import { Burst, ageBursts, newBurst, piecesOf } from './pop-burst';

/** The board is a little taller than wide: room for the balloons to rise. */
export const BOARD_SHAPE = 1.25;
/** How hard a balloon getting away nudges the field: a small sigh, not a burst. */
export const MISS_PULSE = 0.12;
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
      this.floats = [...this.floats, newFloat(event.x, event.y)];
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playPop();
      return;
    }
    if (event.kind === 'miss') {
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
      this.bursts = [...this.bursts, newBurst(x, balloon.y, balloon.radius, balloon.hue, balloon.phase)];
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
    context.save();
    balloons.forEach(balloon => this.drawBalloon(context, balloon, elapsed));
    this.bursts.forEach(burst => this.drawBurst(context, burst));
    context.restore();
    drawFloats(context, this.floats, this.calm, rgb(fieldColour(0.5)));
  }

  /** A balloon: its string swaying behind it, the knot, the skin lit from the top left, and a shine. */
  private drawBalloon(context: CanvasRenderingContext2D, balloon: Balloon, elapsed: number) {
    const calm = this.calm;
    const x = swayedX(balloon, elapsed, calm);
    const { y, radius } = balloon;
    const colour = fieldColour(balloon.hue);
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
  }

  /** The pieces of a popped balloon, flying apart and fading. */
  private drawBurst(context: CanvasRenderingContext2D, burst: Burst) {
    const { r, g, b } = fieldColour(burst.hue);
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
