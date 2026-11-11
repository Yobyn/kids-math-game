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
import { drawCourt, drawFloats, drawShine, prefersReducedMotion, rgb, roundRect } from './drawing';
import { COUNTDOWN, END_BUZZ, FLASH_LIFE, Flash, FloatUp, MISS_BUZZ, POINT_BUZZ, RECORD_PULSE, RECORD_SHOW_MS, SQUASH_TIME, ageFlashes, ageFloats, countdownShown, newFloat, passesBest, soundCount, squashScale } from './game-feel';
import { SUMS_BEST_KEY, bonusBest, recordBonusBest } from './bonus-best';
import { showWholeBoard } from './board-view';
import { MISSES_ALLOWED, Pong, PongEvent, TILES, TILE_HEIGHT, Tile, aimPaddle, followPaddle, movePaddle, newPong, pointsOf, restOnPaddle, serve, step } from './pong';
import { GameLevel, shownSum, written } from './game-sums';
import { levelFor } from './game-level';

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
/** How hard a missed ball stirs the field when hearts are left: a small sigh, not a burst. */
export const LOST_BALL_PULSE = 0.12;
/** The end of the game throws sparks from this many places round the ball: a bigger burst than a hit's. */
export const END_SPARKS = 6;
/** How far from the ball those sparks start, in pixels. */
export const END_SPARK_RADIUS = 36;

/**
 * The bonus game (Yobyn, 2026-10-09): Pong style, a ball kept up with a
 * paddle slid along the bottom, every bounce a point. Its rules are in
 * pong.ts; this screen draws them and feeds them the paddle. Since
 * 2026-11-10 it is played with sums: a sum stands above the board, three
 * tiles with numbers lie along its top, and steering the ball into the
 * answer scores on top of the bounces.
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
  styleUrls: ['./bonus.component.css', './game-sum.css']
})
export class BonusComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('board') boardRef!: ElementRef<HTMLElement>;

  game: Pong = newPong(320, 480);
  started = false;
  ended = false;
  /** What the screen shows: the points, a bounce each and what the answers struck added; copied from the game only when it changes. */
  hits = 0;
  /** The sum above the board: "7 + 5 = ?", or answered for a moment, "7 + 5 = 12". */
  sumShown = '';
  /** The same as a list of one, so the template draws a fresh one, popping in, for each new sum. */
  sumsShown: string[] = [];
  sumState: '' | 'right' | 'missed' = '';
  /**
   * True while the sum stands in the title's place: from Start, through the
   * 3-2-1 too, so there is time to read it and pick a tile before the serve.
   */
  get sumOnTitle(): boolean {
    return this.started && !this.ended && this.sumsShown.length > 0;
  }
  /** Sums answered, for the end card. */
  solved = 0;
  /** Whose sums: the year and climb of the round that earned the game. */
  level: GameLevel = { grade: 1 };
  /** The three hearts: one goes for each ball missed (pong.ts MISSES_ALLOWED). */
  hearts: boolean[] = Array(MISSES_ALLOWED).fill(true);

  get heartsLeft(): number {
    return this.hearts.filter(Boolean).length;
  }
  /** The middle of the paddle in the child's own colour, when they have one (paddle-colour.ts). */
  childColour: string | null = null;
  /** The XP the game paid, once it has ended: one per bounce, capped (level-curve.ts). */
  xpWon = 0;
  /** The 3-2-1 after Start, as shown; 0 once the game is going (game-feel.ts). */
  countdown = 0;
  /** "New best!" on the board, the moment the game passes this child's best. */
  recordShown = false;
  /** This game's best for this child, and whether the game just played beat it. */
  best = 0;
  newBest = false;
  /** "+1"s floating up where points were scored. */
  floats: FloatUp[] = [];
  /** Glows where the ball struck a wall or the top, fading (game-feel.ts). */
  flashes: Flash[] = [];
  /** Seconds of squash left from the last paddle hit (none under reduced motion). */
  squash = 0;

  readonly calm = prefersReducedMotion();
  private trail: Array<{ x: number; y: number }> = [];
  private frame = 0;
  private lastAt = 0;
  private keyDirection = 0;
  private countdownLeft = 0;
  /** This child's best before this game, to see the moment it is passed. */
  private bestBefore = 0;
  private recordTimer = 0;
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
    this.level = levelFor(this.progressService.getHistory(), this.languageService.getLanguage());
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
    this.holdPage(false);
  }

  /**
   * While the game is on, a finger sliding off the board steers rather than
   * scrolls or zooms the page (onPagePointer): the whole board is on screen
   * by then, so there is nothing to scroll to.
   */
  private holdPage(hold: boolean) {
    document.documentElement.style.touchAction = hold ? 'none' : '';
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
      this.game = newPong(width, height, this.calm, Math.random, this.level);
      this.showSum();
    }
  }

  /** The sum as it stands above the board: asked, or answered for a moment. */
  private showSum() {
    const { text, state } = shownSum(this.game);
    if (text !== this.sumShown) {
      this.sumShown = text;
      this.sumsShown = text ? [text] : [];
    }
    this.sumState = state;
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
    this.bestBefore = bonusBest(this.progressService.ownerKey(SUMS_BEST_KEY), 'pong');
    this.fit();
    this.started = true;
    this.holdPage(true);
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
   * looked). Balspel's ball, near lightning fast by then, waits on the
   * paddle and is served again at the speed it had reached.
   */
  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (document.hidden && this.started && !this.ended) {
      this.countdownLeft = COUNTDOWN;
      this.countdown = COUNTDOWN;
      // No streak from where the ball was to the paddle it waits on
      this.trail = [];
      this.draw();
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
    // The 3-2-1: the ball waits on the paddle, going where the paddle goes,
    // and is served from it as the count ends
    if (this.countdownLeft > 0) {
      this.countdownLeft = Math.max(0, this.countdownLeft - seconds);
      this.game = restOnPaddle(followPaddle(this.game, seconds));
      const shown = countdownShown(this.countdownLeft);
      if (shown !== this.countdown) {
        this.zone.run(() => this.countdown = shown);
        soundCount(this.soundService, shown);
      }
      if (this.countdownLeft === 0) {
        this.game = serve(this.game);
      }
      this.draw();
      return;
    }
    this.floats = ageFloats(this.floats, seconds);
    this.flashes = ageFlashes(this.flashes, seconds);
    this.squash = Math.max(0, this.squash - seconds);
    const { game, events } = step(this.game, seconds);
    this.game = game;
    if (!this.calm) {
      this.trail = [...this.trail, { x: game.ball.x, y: game.ball.y }].slice(-TRAIL);
    }
    events.forEach(event => this.answer(event));
    const left = MISSES_ALLOWED - game.misses;
    const points = pointsOf(game);
    if (points !== this.hits || left !== this.heartsLeft || (game.ended && !this.ended) || shownSum(game).text !== this.sumShown) {
      const ending = game.ended !== null && !this.ended;
      this.zone.run(() => {
        if (passesBest(this.bestBefore, this.hits, points) && !game.ended) {
          this.celebrateBest();
        }
        this.hits = points;
        this.solved = game.solved || 0;
        this.showSum();
        this.hearts = Array.from({ length: MISSES_ALLOWED }, (_, i) => i < left);
        this.ended = game.ended !== null;
        if (ending) {
          this.floats = [];
          this.flashes = [];
          this.holdPage(false);
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
    if (event.kind === 'wall') {
      // Only a glow on the board: the field and the sound are for points
      if (!this.calm) {
        this.flashes = [...this.flashes, { x: event.x, y: event.y, age: 0 }];
      }
      return;
    }
    if (event.kind === 'miss') {
      // A heart gone, not the game: the ball waits on the paddle through
      // another 3-2-1 and is served again at the speed it had reached
      this.countdownLeft = COUNTDOWN;
      this.zone.run(() => this.countdown = COUNTDOWN);
      soundCount(this.soundService, COUNTDOWN);
      this.trail = [];
      this.pulseService.pulse(LOST_BALL_PULSE);
      this.soundService.vibrate(MISS_BUZZ);
      return;
    }
    if (event.kind === 'right') {
      // The answer's tile struck: its points float down from it, the field
      // swells and sparks there, and a chime a step higher for each one in a row
      this.floats = [...this.floats, newFloat(event.x, event.y + 36, `+${event.points ?? 0}`)];
      if (!this.calm) {
        this.flashes = [...this.flashes, { x: event.x, y: event.y, age: 0 }];
      }
      this.pulseService.pulse(HIT_PULSE);
      this.pulseService.tap(left + event.x, top + event.y);
      this.soundService.playStar(Math.min(4, this.game.streak || 1));
      this.soundService.vibrate(POINT_BUZZ);
      return;
    }
    if (event.kind === 'wrong') {
      // A wrong number's tile only dims: a soft tick, nothing lost, nothing said
      if (!this.calm) {
        this.flashes = [...this.flashes, { x: event.x, y: event.y, age: 0 }];
      }
      this.soundService.playTap();
      return;
    }
    if (event.kind === 'hit') {
      if (!this.calm) {
        this.squash = SQUASH_TIME;
      }
      this.floats = [...this.floats, newFloat(event.x, event.y - 24)];
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
    if (pointsOf(this.game) > 0) {
      this.soundService.playSuccess();
      this.soundService.vibrate(END_BUZZ);
    }
  }

  /**
   * A finger (or the mouse) anywhere on the board sends the paddle under it:
   * once the game is on, it glides there over a few frames rather than
   * jumping (pong.ts followPaddle); before, it is simply put there.
   */
  steer(event: PointerEvent) {
    const box = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - box.left;
    if (this.started) {
      this.game = aimPaddle(this.game, x);
      return;
    }
    this.game = movePaddle(this.game, x);
    this.draw();
  }

  /**
   * Once the game is on, a finger anywhere off the board steers too
   * (2026-10-20: on a phone held upright the board ends above the bottom of
   * the screen, and a thumb down there, under the paddle where it does not
   * hide it, did nothing). The board's own presses are steer()'s; a press on
   * a button, a link or the header is that control's own; a mouse steers off
   * the board only while its button is held.
   */
  @HostListener('window:pointerdown', ['$event'])
  @HostListener('window:pointermove', ['$event'])
  onPagePointer(event: PointerEvent) {
    if (!this.started || this.ended) {
      return;
    }
    const target = event.target as Element | null;
    if (target === this.canvasRef?.nativeElement || target?.closest?.('button, a, input, select, textarea, header, [role="dialog"]')) {
      return;
    }
    if (event.pointerType === 'mouse' && !event.buttons) {
      return;
    }
    this.steer(event);
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
    this.xpWon = bonusXp(this.hits);
    this.progressService.addXp(this.xpWon);
    const record = recordBonusBest(this.progressService.ownerKey(SUMS_BEST_KEY), 'pong', this.hits);
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
    const { width, height, ball, paddle } = this.game;
    context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    // Cleared, never filled: the field behind shows through
    context.clearRect(0, 0, width, height);
    // The court, marked out faintly under the play
    drawCourt(context, width, height, rgb(fieldColour(0.5)));
    this.drawTiles(context);

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

    // The ball, glowing in the colour of the ring where it is, squashed for a moment off the paddle
    const colour = fieldColour(ball.x / width);
    const squashed = squashScale(this.squash);
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
    drawShine(context, ball.x, ball.y, ball.radius);
    context.restore();
    this.drawFlashes(context);
    drawFloats(context, this.floats, this.calm, rgb(fieldColour(0.5)));
  }

  /**
   * The tiles along the top, each in the field's colour where it lies, its
   * number white with a dark edge. One struck and wrong is dimmed. While the
   * tiles rest (a sum just answered) only their faint places show, so the
   * line the ball turns back at is still seen.
   */
  private drawTiles(context: CanvasRenderingContext2D) {
    const game = this.game;
    if (!game.level) {
      return;
    }
    const dealt = game.tiles || [];
    const tiles: Array<Tile | null> = dealt.length ? dealt : Array(TILES).fill(null);
    const each = game.width / TILES;
    context.save();
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    tiles.forEach((tile, i) => {
      const x = (tile ? tile.x : i * each) + 3;
      const wide = (tile ? tile.width : each) - 6;
      const { r, g, b } = fieldColour(Math.min(1, Math.max(0, (x + wide / 2) / game.width)));
      roundRect(context, x, 4, wide, TILE_HEIGHT - 8, 10);
      if (!tile) {
        context.shadowBlur = 0;
        context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
        context.lineWidth = 1.5;
        context.stroke();
        return;
      }
      context.shadowColor = rgb({ r, g, b });
      context.shadowBlur = tile.tried ? 0 : 12;
      context.fillStyle = `rgba(${r}, ${g}, ${b}, ${tile.tried ? 0.22 : 0.9})`;
      context.fill();
      context.shadowBlur = 0;
      const text = written(tile.value);
      context.font = 'bold 20px sans-serif';
      if (!tile.tried) {
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(20, 12, 50, 0.55)';
        context.strokeText(text, x + wide / 2, TILE_HEIGHT / 2 + 1);
      }
      context.fillStyle = `rgba(255, 255, 255, ${tile.tried ? 0.4 : 1})`;
      context.fillText(text, x + wide / 2, TILE_HEIGHT / 2 + 1);
    });
    context.restore();
  }

  /** A soft glow where the ball struck a wall or the top, in the field's colour there, fading out. */
  private drawFlashes(context: CanvasRenderingContext2D) {
    this.flashes.forEach(flash => {
      const { r, g, b } = fieldColour(Math.min(1, Math.max(0, flash.x / this.game.width)));
      const alpha = 0.85 * (1 - flash.age / FLASH_LIFE);
      const glow = context.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 40);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      context.fillStyle = glow;
      context.fillRect(flash.x - 40, flash.y - 40, 80, 80);
    });
  }
}
