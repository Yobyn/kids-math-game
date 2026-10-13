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
import { prefersReducedMotion, rgb } from './drawing';
import { showWholeBoard } from './board-view';
import { BalloonEvent, Balloons, MISSES_ALLOWED, newBalloons, pop, step, swayedX } from './balloons';

/** The board is a little taller than wide: room for the balloons to rise. */
export const BOARD_SHAPE = 1.25;
/** How hard a balloon getting away nudges the field: a small sigh, not a burst. */
export const MISS_PULSE = 0.12;

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

  readonly calm = prefersReducedMotion();
  private frame = 0;
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
    if (!this.ended) {
      this.frame = requestAnimationFrame(next => this.loop(next));
    }
  }

  /** One frame: the balloons rise, the field answers. */
  advance(seconds: number) {
    if (!this.started || this.ended) {
      return;
    }
    const { game, events } = step(this.game, seconds);
    this.game = game;
    events.forEach(event => this.answer(event));
    this.show();
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
    const { game, event } = pop(this.game, x, y);
    this.game = game;
    if (event) {
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
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playTap();
      return;
    }
    if (event.kind === 'miss') {
      this.pulseService.pulse(MISS_PULSE);
      return;
    }
    this.pulseService.pulse(END_PULSE);
    for (let i = 0; i < END_SPARKS; i++) {
      const angle = (i / END_SPARKS) * Math.PI * 2;
      this.pulseService.tap(left + event.x + Math.cos(angle) * END_SPARK_RADIUS, top + event.y + Math.sin(angle) * END_SPARK_RADIUS);
    }
    if (this.game.points > 0) {
      this.soundService.playSuccess();
    }
  }

  /** The game's XP, paid once as it ends, and kept like a round's. */
  private pay() {
    this.xpWon = bonusXp(this.points);
    this.progressService.addXp(this.xpWon);
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
    const { width, height, balloons, elapsed, calm } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);
    context.save();
    balloons.forEach(balloon => {
      const x = swayedX(balloon, elapsed, calm);
      const { y, radius } = balloon;
      const colour = fieldColour(balloon.hue);
      // The string, hanging from the knot
      context.shadowBlur = 0;
      context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x, y + radius * 1.15);
      context.quadraticCurveTo(x - radius * 0.3, y + radius * 1.7, x, y + radius * 2.3);
      context.stroke();
      // The balloon, a little taller than wide, glowing in the field's colour where it is
      context.shadowColor = rgb(colour);
      context.shadowBlur = 16;
      context.fillStyle = `rgba(${colour.r}, ${colour.g}, ${colour.b}, 0.9)`;
      context.beginPath();
      context.ellipse(x, y, radius, radius * 1.15, 0, 0, Math.PI * 2);
      context.fill();
      // The knot
      context.beginPath();
      context.moveTo(x - radius * 0.18, y + radius * 1.25);
      context.lineTo(x + radius * 0.18, y + radius * 1.25);
      context.lineTo(x, y + radius * 1.1);
      context.closePath();
      context.fill();
    });
    context.restore();
  }
}
