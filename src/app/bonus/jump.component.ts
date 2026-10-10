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
import { BOARD_MARGIN, END_PULSE, END_SPARKS, END_SPARK_RADIUS, HIT_PULSE, MIN_BOARD } from './bonus.component';
import { prefersReducedMotion, rgb, roundRect } from './drawing';
import { Jumper, JumperEvent, jump, newJumper, step } from './jumper';

/** The board is about square: wide enough to see what is coming, short enough to fit under the score. */
export const BOARD_SHAPE = 1.1;
/** The ball's glowing tail: this many of its last heights. */
const TRAIL = 6;

/**
 * The second bonus game (Yobyn, 2026-10-10): a ball rolling along the
 * ground, bounced over what is on the ground and kept low under what is in
 * the air. Its rules are in jumper.ts; this screen draws them and passes on
 * the taps. A tap anywhere on the board bounces, as do Space and the up arrow.
 * It ends at the finish flag, which comes at a random moment, or on a crash.
 *
 * It looks and answers like the paddle game (bonus.component.ts): the canvas
 * is see-through so the particle field shows, every obstacle passed swells
 * the field and sparks at the ball, and the end is a bigger burst.
 */
@Component({
  selector: 'app-jump',
  templateUrl: './jump.component.html',
  styleUrls: ['./bonus.component.css']
})
export class JumpComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('board') boardRef!: ElementRef<HTMLElement>;

  game: Jumper = newJumper(320, 320);
  started = false;
  ended = false;
  /** What the screen shows; copied from the game only when it changes. */
  points = 0;
  /** A stripe round the ball in the child's own colour, when they have one (paddle-colour.ts). */
  childColour: string | null = null;
  /** The XP the game paid, once it has ended (level-curve.ts). */
  xpWon = 0;
  /** Ended at the finish flag rather than on an obstacle. */
  finished = false;

  readonly calm = prefersReducedMotion();
  private trail: number[] = [];
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

  /** The board takes the screen's width and the height left below the score, about square. */
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
      this.game = newJumper(width, height, this.calm);
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

  /** One frame: the world moves on, the field answers. */
  advance(seconds: number) {
    if (!this.started || this.ended) {
      return;
    }
    const { game, events } = step(this.game, seconds);
    this.game = game;
    if (!this.calm) {
      this.trail = [...this.trail, game.ball.y].slice(-TRAIL);
    }
    events.forEach(event => this.answer(event));
    if (game.points !== this.points || (game.ended && !this.ended)) {
      const ending = game.ended !== null && !this.ended;
      this.zone.run(() => {
        this.points = game.points;
        this.ended = game.ended !== null;
        this.finished = game.ended === 'finished';
        if (ending) {
          this.pay();
        }
      });
    }
    this.draw();
  }

  /** A tap anywhere on the board bounces the ball. */
  tap(event?: Event) {
    if (!this.started || this.ended) {
      return;
    }
    event?.preventDefault();
    this.game = jump(this.game);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    // Only while playing: before, Space is the Start button's own
    if (this.started && !this.ended && (event.key === ' ' || event.key === 'ArrowUp')) {
      this.tap(event);
    }
  }

  /**
   * An obstacle passed swells the field, sparks at the ball and blips
   * softly; the end swells the whole field and throws sparks all round it.
   */
  answer(event: JumperEvent) {
    const box = this.canvasRef?.nativeElement.getBoundingClientRect();
    const left = box ? box.left : 0;
    const top = box ? box.top : 0;
    if (event.kind === 'pass') {
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
    const { width, height, ground, ball, obstacles } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);
    context.save();

    // The ground: the ring's blue at the left, its magenta at the right
    const line = context.createLinearGradient(0, 0, width, 0);
    line.addColorStop(0, rgb(fieldColour(0)));
    line.addColorStop(1, rgb(fieldColour(1)));
    context.shadowColor = rgb(fieldColour(0.5));
    context.shadowBlur = 12;
    context.fillStyle = line;
    context.fillRect(0, ground, width, 3);

    // The obstacles, glowing in the colour of the ring where they are
    obstacles.forEach(obstacle => {
      const colour = fieldColour(Math.min(1, Math.max(0, (obstacle.x + obstacle.width / 2) / width)));
      context.shadowColor = rgb(colour);
      context.shadowBlur = 14;
      context.fillStyle = `rgba(${colour.r}, ${colour.g}, ${colour.b}, 0.85)`;
      roundRect(context, obstacle.x, obstacle.y, obstacle.width, obstacle.height, 8);
      context.fill();
    });

    // The finish flag: a pole from the ground with a flag in the ring's colours
    if (this.game.flag !== null) {
      const x = this.game.flag;
      const top = ground * 0.45;
      context.shadowColor = rgb(fieldColour(1));
      context.shadowBlur = 14;
      context.fillStyle = '#ffffff';
      context.fillRect(x - 2, top, 4, ground - top);
      const cloth = context.createLinearGradient(x, 0, x + 44, 0);
      cloth.addColorStop(0, rgb(fieldColour(0)));
      cloth.addColorStop(1, rgb(fieldColour(1)));
      context.fillStyle = cloth;
      context.beginPath();
      context.moveTo(x + 2, top);
      context.lineTo(x + 44, top + 15);
      context.lineTo(x + 2, top + 30);
      context.closePath();
      context.fill();
    }

    // The ball's tail: where it was, a little behind it
    this.trail.forEach((y, i) => {
      const { r, g, b } = fieldColour(ball.x / width);
      const alpha = ((i + 1) / (this.trail.length + 1)) * 0.3;
      context.beginPath();
      context.shadowBlur = 0;
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
      context.arc(ball.x - (this.trail.length - i) * 4, y, ball.radius * (0.5 + 0.5 * (i + 1) / this.trail.length), 0, Math.PI * 2);
      context.fill();
    });

    // The ball, glowing, with a stripe that shows it rolling
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
    context.shadowBlur = 0;
    context.strokeStyle = this.childColour || '#ffffff';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(ball.x - Math.cos(ball.turn) * ball.radius * 0.8, ball.y - Math.sin(ball.turn) * ball.radius * 0.8);
    context.lineTo(ball.x + Math.cos(ball.turn) * ball.radius * 0.8, ball.y + Math.sin(ball.turn) * ball.radius * 0.8);
    context.stroke();
    context.restore();
  }
}
