import { AfterViewInit, Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../services/language.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { ProgressService } from '../services/progress.service';
import { ProgressSyncService } from '../services/progress-sync.service';
import { AvatarService } from '../services/avatar.service';
import { bonusXp } from '../levels/level-curve';
import { SoundService } from '../services/sound.service';
import { paddleColour } from './paddle-colour';
import { fieldColour } from '../particles/particle-field';
import { BONUS_WORDS } from './bonus-words';
import { Pong, PongEvent, movePaddle, newPong, step } from './pong';

/** How far a held arrow key moves the paddle, in screen widths a second. */
const KEY_SPEED = 1.1;
/** The share of the paddle's middle drawn in the child's own colour. */
export const CHILD_BAND = 0.36;
/** Room kept under the board, and the shortest board still worth playing on. */
export const BOARD_MARGIN = 16;
export const MIN_BOARD = 280;
/** The ball's glowing tail: this many of its last places. */
const TRAIL = 8;
/** How hard a paddle hit swells the field, and the end of the game. */
export const HIT_PULSE = 0.35;
export const END_PULSE = 1;
/** The end of the game throws sparks from this many places round the ball: a bigger burst than a hit's. */
export const END_SPARKS = 6;
/** How far from the ball those sparks start, in pixels. */
export const END_SPARK_RADIUS = 36;

/**
 * The bonus game (Yobyn, 2026-10-09): Pong style, a ball kept up with a
 * paddle slid along the bottom, every bounce a point. Its rules are in
 * pong.ts; this screen draws them and feeds them the paddle.
 *
 * It keeps the game's particles (Yobyn: "keep the particles effect of the
 * game"): the canvas is see-through, so the field behind every screen shows
 * through it, and a hit is answered by the field itself through the
 * FieldPulseService: the whole ring swells, and the same sparks as a tapped
 * button fly from where the ball struck. Ball and paddle are drawn in the
 * field's own colours. Under reduced motion the ball is slower and has no
 * tail, and the field does what it already does there (stays still).
 */
@Component({
  selector: 'app-bonus',
  templateUrl: './bonus.component.html',
  styleUrls: ['./bonus.component.css']
})
export class BonusComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('board') boardRef!: ElementRef<HTMLElement>;

  game: Pong = newPong(320, 480);
  started = false;
  ended = false;
  /** What the screen shows; copied from the game only when it changes. */
  hits = 0;
  /** The middle of the paddle in the child's own colour, when they have one (paddle-colour.ts). */
  childColour: string | null = null;
  /** The XP the game paid, once it has ended: one per bounce, capped (level-curve.ts). */
  xpWon = 0;

  readonly calm = prefersReducedMotion();
  private trail: Array<{ x: number; y: number }> = [];
  private frame = 0;
  private lastAt = 0;
  private keyDirection = 0;
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
    this.childColour = paddleColour(avatarService.get());
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

  /**
   * The board takes the screen's width and the height left below the score,
   * so the paddle is always on screen without scrolling; never taller than a
   * phone held upright, never too short to play.
   */
  fit() {
    const canvas = this.canvasRef?.nativeElement;
    const board = this.boardRef?.nativeElement;
    if (!canvas || !board) {
      return;
    }
    const width = Math.max(240, Math.round(board.clientWidth));
    const left = window.innerHeight - board.getBoundingClientRect().top - BOARD_MARGIN;
    const height = Math.round(Math.min(Math.max(left, MIN_BOARD), width * 1.6));
    this.ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * this.ratio);
    canvas.height = Math.round(height * this.ratio);
    canvas.style.height = `${height}px`;
    if (!this.started) {
      this.game = newPong(width, height, this.calm);
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

  /** One frame: the keys move the paddle, the game moves on, the field answers. */
  advance(seconds: number) {
    if (!this.started || this.ended) {
      return;
    }
    if (this.keyDirection) {
      this.game = movePaddle(this.game, this.game.paddle.x + this.keyDirection * KEY_SPEED * this.game.width * seconds);
    }
    const { game, events } = step(this.game, seconds);
    this.game = game;
    if (!this.calm) {
      this.trail = [...this.trail, { x: game.ball.x, y: game.ball.y }].slice(-TRAIL);
    }
    events.forEach(event => this.answer(event));
    if (game.hits !== this.hits || (game.ended && !this.ended)) {
      const ending = game.ended !== null && !this.ended;
      this.zone.run(() => {
        this.hits = game.hits;
        this.ended = game.ended !== null;
        if (ending) {
          this.pay();
        }
      });
    }
    this.draw();
  }

  /**
   * A hit swells the field, sparks where the ball struck and blips softly
   * (in the child's sound set, or not at all when sound is off). The end
   * swells the whole field and throws sparks from all round the ball.
   */
  answer(event: PongEvent) {
    const box = this.canvasRef?.nativeElement.getBoundingClientRect();
    const left = box ? box.left : 0;
    const top = box ? box.top : 0;
    if (event.kind === 'hit') {
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playTap();
      return;
    }
    this.pulseService.pulse(END_PULSE);
    for (let i = 0; i < END_SPARKS; i++) {
      const angle = (i / END_SPARKS) * Math.PI * 2;
      const x = Math.min(this.game.width, Math.max(0, event.x + Math.cos(angle) * END_SPARK_RADIUS));
      const y = Math.min(this.game.height, Math.max(0, event.y + Math.sin(angle) * END_SPARK_RADIUS));
      this.pulseService.tap(left + x, top + y);
    }
    if (this.game.hits > 0) {
      this.soundService.playSuccess();
    }
  }

  /** A finger (or the mouse) anywhere on the board puts the paddle under it. */
  steer(event: PointerEvent) {
    const box = this.canvasRef.nativeElement.getBoundingClientRect();
    this.game = movePaddle(this.game, event.clientX - box.left);
    if (!this.started) {
      this.draw();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      this.keyDirection = event.key === 'ArrowLeft' ? -1 : 1;
      event.preventDefault();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if ((event.key === 'ArrowLeft' && this.keyDirection < 0) || (event.key === 'ArrowRight' && this.keyDirection > 0)) {
      this.keyDirection = 0;
    }
  }

  /** The game's XP, paid once as it ends, and kept like a round's. */
  private pay() {
    this.xpWon = bonusXp(this.hits);
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
    const { width, height, ball, paddle } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);

    // The ball's tail, fading out behind it
    this.trail.forEach((point, i) => {
      const { r, g, b } = fieldColour(point.x / width);
      const alpha = ((i + 1) / (this.trail.length + 1)) * 0.35;
      context.beginPath();
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      context.arc(point.x, point.y, ball.radius * (0.5 + 0.5 * (i + 1) / this.trail.length), 0, Math.PI * 2);
      context.fill();
    });

    // The paddle: the ring's blue at its left end, its magenta at the right
    const left = paddle.x - paddle.width / 2;
    const gradient = context.createLinearGradient(left, 0, left + paddle.width, 0);
    gradient.addColorStop(0, rgb(fieldColour(0)));
    gradient.addColorStop(1, rgb(fieldColour(1)));
    context.save();
    context.shadowColor = rgb(fieldColour(0.5));
    context.shadowBlur = 16;
    context.fillStyle = gradient;
    roundRect(context, left, paddle.y, paddle.width, paddle.height, paddle.height / 2);
    context.fill();
    // The child's own colour in the middle, when their character has one
    if (this.childColour) {
      context.shadowBlur = 0;
      context.fillStyle = this.childColour;
      const band = paddle.width * CHILD_BAND;
      roundRect(context, paddle.x - band / 2, paddle.y + 2, band, paddle.height - 4, (paddle.height - 4) / 2);
      context.fill();
    }

    // The ball, glowing in the colour of the ring where it is
    const colour = fieldColour(ball.x / width);
    context.shadowColor = rgb(colour);
    context.shadowBlur = 18;
    context.beginPath();
    context.fillStyle = '#ffffff';
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = `rgba(${colour.r}, ${colour.g}, ${colour.b}, 0.55)`;
    context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function rgb({ r, g, b }: { r: number; g: number; b: number }): string {
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
