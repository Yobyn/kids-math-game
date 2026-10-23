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
import { drawFloats, drawHills, drawShine, prefersReducedMotion, rgb, roundRect, starPath } from './drawing';
import { COUNTDOWN, END_BUZZ, FloatUp, MISS_BUZZ, POINT_BUZZ, RECORD_PULSE, RECORD_SHOW_MS, SQUASH_TIME, ageFloats, countdownShown, newFloat, passesBest, soundCount, squashScale } from './game-feel';
import { BONUS_BEST_KEY, bonusBest, recordBonusBest } from './bonus-best';
import { showWholeBoard } from './board-view';
import { BUMPS_ALLOWED, Jumper, JumperEvent, Obstacle, Star, jump, newJumper, step, worldSpeed } from './jumper';

/** The board is about square: wide enough to see what is coming, short enough to fit under the score. */
export const BOARD_SHAPE = 1.1;
/** How hard running into an obstacle stirs the field: a small sigh, not a burst. */
export const BUMP_PULSE = 0.12;
/** An obstacle already run into is drawn this faint. */
export const HIT_FADE = 0.3;
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
  /** The three hearts: one goes for each obstacle run into (jumper.ts BUMPS_ALLOWED). */
  hearts: boolean[] = Array(BUMPS_ALLOWED).fill(true);

  get heartsLeft(): number {
    return this.hearts.filter(Boolean).length;
  }
  /** A stripe round the ball in the child's own colour, when they have one (paddle-colour.ts). */
  childColour: string | null = null;
  /** The XP the game paid, once it has ended (level-curve.ts). */
  xpWon = 0;
  /** Ended at the finish flag rather than on an obstacle. */
  finished = false;
  /** The 3-2-1 after Start, as shown; 0 once the game is going (game-feel.ts). */
  countdown = 0;
  /** "New best!" on the board, the moment the game passes this child's best. */
  recordShown = false;
  /** This game's best for this child, and whether the game just played beat it. */
  best = 0;
  newBest = false;
  /** "+1"s floating up where points were scored. */
  floats: FloatUp[] = [];
  /** Seconds of squash left from the last landing (none under reduced motion). */
  squash = 0;

  readonly calm = prefersReducedMotion();
  private trail: number[] = [];
  private countdownLeft = 0;
  /** This child's best before this game, to see the moment it is passed. */
  private bestBefore = 0;
  private recordTimer = 0;
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
    // On a phone held sideways the board runs past the screen, and Start
    // with it, as the game opens: bring it all up now, not only at Start
    showWholeBoard(this.boardRef.nativeElement, BOARD_MARGIN);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.recordTimer);
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
    this.bestBefore = bonusBest(this.progressService.ownerKey(BONUS_BEST_KEY), 'jump');
    this.fit();
    this.started = true;
    this.countdownLeft = COUNTDOWN;
    this.countdown = COUNTDOWN;
    soundCount(this.soundService, COUNTDOWN);
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

  /**
   * Leaving mid-game (another app, a notification, the screen locking) and
   * coming back gives the 3-2-1 again before anything moves (2026-10-21:
   * the game went on the moment the screen was back, before the child had
   * looked).
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && this.started && !this.ended) {
      this.countdownLeft = COUNTDOWN;
      this.countdown = COUNTDOWN;
      this.draw();
    }
  }

  /** One frame: the world moves on, the field answers. */
  advance(seconds: number) {
    if (!this.started || this.ended) {
      return;
    }
    // The 3-2-1: nothing moves until it is over
    if (this.countdownLeft > 0) {
      this.countdownLeft = Math.max(0, this.countdownLeft - seconds);
      const shown = countdownShown(this.countdownLeft);
      if (shown !== this.countdown) {
        this.zone.run(() => this.countdown = shown);
        soundCount(this.soundService, shown);
      }
      this.draw();
      return;
    }
    this.floats = ageFloats(this.floats, seconds);
    this.squash = Math.max(0, this.squash - seconds);
    const { game, events } = step(this.game, seconds);
    this.game = game;
    if (!this.calm) {
      this.trail = [...this.trail, game.ball.y].slice(-TRAIL);
    }
    events.forEach(event => this.answer(event));
    const left = BUMPS_ALLOWED - game.bumps;
    if (game.points !== this.points || left !== this.heartsLeft || (game.ended && !this.ended)) {
      const ending = game.ended !== null && !this.ended;
      this.zone.run(() => {
        if (passesBest(this.bestBefore, this.points, game.points) && !game.ended) {
          this.celebrateBest();
        }
        this.points = game.points;
        this.hearts = Array.from({ length: BUMPS_ALLOWED }, (_, i) => i < left);
        this.ended = game.ended !== null;
        this.finished = game.ended === 'finished';
        if (ending) {
          this.floats = [];
          this.pay();
        }
      });
    }
    this.draw();
  }

  /**
   * A tap anywhere on the screen bounces the ball, not only on the board
   * (2026-10-18: on a phone held upright the board ends 200-270px above the
   * bottom of the screen, where a thumb rests, and a tap there did nothing).
   * A tap on a button, a link or the header is that control's own.
   */
  @HostListener('window:pointerdown', ['$event'])
  onPointerDown(event: PointerEvent) {
    const target = event.target as Element | null;
    if (target?.closest?.('button, a, input, select, textarea, header, [role="dialog"]')) {
      return;
    }
    this.tap(event);
  }

  /** Bounces the ball, while the game is on. */
  tap(event?: Event) {
    if (!this.started || this.ended || this.countdownLeft > 0) {
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
    if (event.kind === 'land') {
      if (!this.calm) {
        this.squash = SQUASH_TIME;
      }
      return;
    }
    if (event.kind === 'bump') {
      // Run into: a heart goes, the field barely stirs and the phone nudges,
      // and the ball rolls on through (the obstacle is drawn faded)
      this.pulseService.pulse(BUMP_PULSE);
      this.soundService.vibrate(MISS_BUZZ);
      return;
    }
    if (event.kind === 'star') {
      // A star taken: a point, a chime a step up from a pass, sparks where it hung
      this.floats = [...this.floats, newFloat(event.x, event.y - 18)];
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playStar(1);
      this.soundService.vibrate(POINT_BUZZ);
      return;
    }
    if (event.kind === 'pass') {
      this.floats = [...this.floats, newFloat(event.x, event.y - this.game.ball.radius * 2.5)];
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playTap();
      this.soundService.vibrate(POINT_BUZZ);
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
      this.soundService.vibrate(END_BUZZ);
    }
  }

  /**
   * The moment the game passes this child's best: "New best!" on the board
   * for a moment, a chime, a swell of the field and a right answer's double
   * buzz. It praises the game, as the end card does, never the child.
   */
  private celebrateBest() {
    this.recordShown = true;
    this.pulseService.pulse(RECORD_PULSE);
    this.soundService.playStar(3);
    this.soundService.vibrate(END_BUZZ);
    clearTimeout(this.recordTimer);
    this.recordTimer = window.setTimeout(() => this.zone.run(() => this.recordShown = false), RECORD_SHOW_MS);
  }

  /** The game's XP, paid once as it ends, and kept like a round's. */
  private pay() {
    this.xpWon = bonusXp(this.points);
    this.progressService.addXp(this.xpWon);
    const record = recordBonusBest(this.progressService.ownerKey(BONUS_BEST_KEY), 'jump', this.points);
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
    const { width, height, ground, ball, obstacles } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);
    // Far-off hills, sliding by slower than the world; still under reduced motion
    const travelled = this.calm ? 0 : this.game.elapsed * worldSpeed(width, false);
    drawHills(context, width, ground, travelled, rgb(fieldColour(0.35)));
    context.save();

    // The ground: the ring's blue at the left, its magenta at the right
    const line = context.createLinearGradient(0, 0, width, 0);
    line.addColorStop(0, rgb(fieldColour(0)));
    line.addColorStop(1, rgb(fieldColour(1)));
    context.shadowColor = rgb(fieldColour(0.5));
    context.shadowBlur = 12;
    context.fillStyle = line;
    context.fillRect(0, ground, width, 3);

    // The obstacles, each its own shape, glowing in the colour of the ring where they are
    obstacles.forEach(obstacle => {
      // One already run into is faded: it is no longer in the way
      context.save();
      context.globalAlpha = obstacle.hit ? HIT_FADE : 1;
      this.drawObstacle(context, obstacle);
      context.restore();
    });

    // The stars to bounce up to
    this.game.stars.forEach(star => this.drawStar(context, star));

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

    // The ball, glowing, with a stripe that shows it rolling; squashed for a moment as it lands
    const colour = fieldColour(ball.x / width);
    const squashed = squashScale(this.squash);
    context.save();
    context.translate(ball.x, ball.y + ball.radius);
    context.scale(squashed.x, squashed.y);
    context.translate(-ball.x, -ball.y - ball.radius);
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
    drawShine(context, ball.x, ball.y, ball.radius);
    context.restore();
    context.restore();
    drawFloats(context, this.floats, this.calm, rgb(fieldColour(0.5)));
  }

  /**
   * What is on the ground is a block, what floats in the middle of the air
   * a cloud, what hangs from the top a lamp: shapes a child knows what to do
   * with. Each fills the box it can be struck in, so what is seen is what
   * is hit (the lamp's cord is out of a bounce's reach).
   */
  private drawObstacle(context: CanvasRenderingContext2D, obstacle: Obstacle) {
    const { x, y, width: w, height: h } = obstacle;
    const colour = fieldColour(Math.min(1, Math.max(0, (x + w / 2) / this.game.width)));
    const fill = `rgba(${colour.r}, ${colour.g}, ${colour.b}, 0.85)`;
    context.shadowColor = rgb(colour);
    context.shadowBlur = 14;
    context.fillStyle = fill;
    if (obstacle.place === 'ground') {
      // A block: a lighter lid and the lines of its bricks
      roundRect(context, x, y, w, h, 5);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255, 255, 255, 0.28)';
      roundRect(context, x + 2, y + 2, w - 4, Math.min(8, h / 4), 3);
      context.fill();
      context.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x + 3, y + h * 0.55);
      context.lineTo(x + w - 3, y + h * 0.55);
      context.moveTo(x + w / 2, y + h * 0.55);
      context.lineTo(x + w / 2, y + h - 2);
      context.stroke();
      return;
    }
    if (obstacle.place === 'middle') {
      // A cloud: puffs along the top of a flat-bottomed body, all inside its box
      const bottom = y + h;
      context.beginPath();
      roundRect(context, x, y + h * 0.45, w, h * 0.55, h * 0.27);
      context.fill();
      [[0.25, 0.32], [0.5, 0.48], [0.75, 0.34]].forEach(([at, size]) => {
        const r = Math.min(h * size, w * 0.22);
        context.beginPath();
        context.arc(x + w * at, Math.max(y + r, bottom - h * 0.45 - r * 0.3), r, 0, Math.PI * 2);
        context.fill();
      });
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255, 255, 255, 0.22)';
      context.beginPath();
      context.arc(x + w * 0.45, y + h * 0.4, Math.min(h, w) * 0.16, 0, Math.PI * 2);
      context.fill();
      return;
    }
    // A hanging lamp: a cord from the top, the shade at the bottom of its box, a glowing bulb under it
    const shade = Math.min(h, Math.max(26, h * 0.4));
    context.shadowBlur = 0;
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + w / 2, y);
    context.lineTo(x + w / 2, y + h - shade);
    context.stroke();
    context.shadowBlur = 14;
    context.fillStyle = fill;
    context.beginPath();
    context.moveTo(x + w * 0.3, y + h - shade);
    context.lineTo(x + w * 0.7, y + h - shade);
    context.lineTo(x + w, y + h);
    context.lineTo(x, y + h);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(255, 236, 160, 0.9)';
    context.shadowColor = 'rgba(255, 236, 160, 0.9)';
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(x + w / 2, y + h, Math.min(8, w / 6), 0, Math.PI);
    context.fill();
  }

  /** A five-pointed star, warm and glowing, turning slowly (still under reduced motion). */
  private drawStar(context: CanvasRenderingContext2D, star: Star) {
    const turn = this.calm ? 0 : this.game.elapsed * 1.5;
    context.save();
    context.shadowColor = 'rgba(255, 220, 120, 0.95)';
    context.shadowBlur = 14;
    context.fillStyle = '#ffd86b';
    starPath(context, star.x, star.y, star.radius, turn);
    context.fill();
    context.restore();
  }
}
