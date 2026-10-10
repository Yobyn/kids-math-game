/**
 * The bonus game's physics (Yobyn, 2026-10-09: "a side bouncing ball game for
 * bonus points once they have completed a round of questions", Pong style).
 * A ball bounces off the walls and the top; the child keeps it up with a
 * paddle slid side to side along the bottom. Every bounce off the paddle is a
 * point.
 *
 * The ball gets faster the longer it is kept up, until it is lightning fast
 * (Yobyn, 2026-10-10: "the user should fail on the speed not the time"). It
 * ends when the ball is missed. DURATION is only a backstop, never shown: by
 * then the ball is long past what anyone can follow, so the game always ends.
 *
 * Free of the DOM, in CSS pixels, so it can be tested straight: the screen
 * (bonus.component.ts) only draws what this says and feeds it the paddle.
 */

export interface Ball {
  x: number;
  y: number;
  /** Pixels per second. */
  vx: number;
  vy: number;
  radius: number;
}

export interface Paddle {
  /** The middle of the paddle. */
  x: number;
  width: number;
  /** Its top edge, which the ball bounces off. */
  y: number;
  height: number;
}

export type Ending = 'missed' | 'time';

export interface Pong {
  width: number;
  height: number;
  ball: Ball;
  paddle: Paddle;
  /** Bounces off the paddle: the bonus points. */
  hits: number;
  /** Seconds played. */
  elapsed: number;
  ended: Ending | null;
  /** Calmer under prefers-reduced-motion: a slower ball that speeds up less. */
  calm: boolean;
}

/** Something the screen answers: a paddle hit (sparks there) or the end. */
export interface PongEvent {
  kind: 'hit' | 'end';
  x: number;
  y: number;
}

/** The hidden backstop: five minutes, well after the ball has outrun everyone. */
export const DURATION = 300;
/** A ball a child's eye follows on a phone, and a paddle a thumb steers. */
export const BALL_RADIUS = 9;
export const PADDLE_HEIGHT = 14;
/** Room under the paddle, so a thumb on it does not cover it. */
export const PADDLE_LIFT = 36;
/** The paddle's share of the width: wide enough to catch, not so wide it never misses. */
export const PADDLE_SHARE = 0.3;
export const PADDLE_MIN = 72;
/** Off the paddle's very edge the ball leaves at this angle from straight up. */
export const MAX_BOUNCE = Math.PI / 3;
/** The start speed, in screen heights a second: slow enough to find the paddle. */
export const START_SPEED = 0.5;
/**
 * The speed doubles every this many seconds kept up: twice as fast after
 * 45 s, four times after a minute and a half, eight times after two and a
 * quarter minutes, which is past what a hand can follow.
 */
export const DOUBLING_SECONDS = 45;
/** Lightning: the most it ever gets, this many times the start (over three minutes in). */
export const TOP_SPEED = 24;
/** Under reduced motion: two thirds the start speed, and it doubles a third more slowly. */
export const CALM_SPEED = 2 / 3;
export const CALM_DOUBLING_SECONDS = 60;
/** The longest single physics step: the walls and the paddle stay exact at the top speed. */
export const MAX_STEP = 1 / 600;

export function startSpeed(height: number, calm: boolean): number {
  return height * START_SPEED * (calm ? CALM_SPEED : 1);
}

export function topSpeed(height: number, calm: boolean): number {
  return startSpeed(height, calm) * TOP_SPEED;
}

/** How fast the ball goes this many seconds in: it only ever gets faster. */
export function speedAt(height: number, calm: boolean, elapsed: number): number {
  const doubling = calm ? CALM_DOUBLING_SECONDS : DOUBLING_SECONDS;
  return Math.min(topSpeed(height, calm), startSpeed(height, calm) * Math.pow(2, Math.max(0, elapsed) / doubling));
}

/**
 * A new game: the paddle in the middle at the bottom, the ball above it
 * heading up and a little to one side, so the first bounce is off a wall
 * and the child has a moment to find the paddle.
 */
export function newPong(width: number, height: number, calm = false, random: () => number = Math.random): Pong {
  const paddleWidth = Math.max(PADDLE_MIN, width * PADDLE_SHARE);
  const speed = startSpeed(height, calm);
  // Between 20° and 40° from straight up, to the left or the right
  const angle = (Math.PI / 9 + random() * Math.PI / 9) * (random() < 0.5 ? -1 : 1);
  return {
    width,
    height,
    ball: { x: width / 2, y: height * 0.55, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed, radius: BALL_RADIUS },
    paddle: { x: width / 2, width: paddleWidth, y: height - PADDLE_LIFT - PADDLE_HEIGHT, height: PADDLE_HEIGHT },
    hits: 0,
    elapsed: 0,
    ended: null,
    calm
  };
}

/** Moves the paddle's middle to x, keeping all of it on the screen. */
export function movePaddle(game: Pong, x: number): Pong {
  const half = game.paddle.width / 2;
  const clamped = Math.min(game.width - half, Math.max(half, x));
  return { ...game, paddle: { ...game.paddle, x: clamped } };
}

/** The ball's speed, whatever its direction. */
export function speedOf(ball: Ball): number {
  return Math.hypot(ball.vx, ball.vy);
}

/**
 * Where the ball leaves the paddle: straight up off the middle, tilted
 * towards the side it struck, up to MAX_BOUNCE at the very edge. Steering by
 * where it lands is what makes it a game rather than a wait.
 */
export function bounceOffPaddle(ball: Ball, paddle: Paddle, speed: number): Ball {
  const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.width / 2)));
  const angle = offset * MAX_BOUNCE;
  return {
    ...ball,
    y: paddle.y - ball.radius,
    vx: Math.sin(angle) * speed,
    vy: -Math.cos(angle) * speed
  };
}

/**
 * Advances the game by `seconds`, in steps no longer than MAX_STEP, and says
 * what happened on the way. A game that has ended stays as it is.
 */
export function step(game: Pong, seconds: number): { game: Pong; events: PongEvent[] } {
  const events: PongEvent[] = [];
  let current = game;
  let left = Math.max(0, seconds);
  while (left > 0 && !current.ended) {
    const dt = Math.min(MAX_STEP, left);
    left -= dt;
    current = tick(current, dt, events);
  }
  return { game: current, events };
}

function tick(game: Pong, dt: number, events: PongEvent[]): Pong {
  const elapsed = game.elapsed + dt;
  // The same direction, at the speed this moment has reached
  const speed = speedAt(game.height, game.calm, elapsed);
  const scale = speed / (speedOf(game.ball) || speed);
  let { x, y } = game.ball;
  let vx = game.ball.vx * scale;
  let vy = game.ball.vy * scale;
  const r = game.ball.radius;
  const before = y;
  x += vx * dt;
  y += vy * dt;

  // The side walls and the top: a mirror, the speed kept
  if (x - r < 0) {
    x = r;
    vx = Math.abs(vx);
  } else if (x + r > game.width) {
    x = game.width - r;
    vx = -Math.abs(vx);
  }
  if (y - r < 0) {
    y = r;
    vy = Math.abs(vy);
  }

  let ball: Ball = { ...game.ball, x, y, vx, vy };
  let hits = game.hits;
  const paddle = game.paddle;
  // Coming down, and crossing the paddle's top in this step, over the paddle
  const crossed = vy > 0 && before + r <= paddle.y && y + r >= paddle.y;
  const over = x >= paddle.x - paddle.width / 2 - r && x <= paddle.x + paddle.width / 2 + r;
  if (crossed && over) {
    ball = bounceOffPaddle(ball, paddle, speed);
    hits += 1;
    events.push({ kind: 'hit', x: ball.x, y: paddle.y });
  }

  if (ball.y - r > game.height) {
    events.push({ kind: 'end', x: ball.x, y: game.height });
    return { ...game, ball, hits, elapsed, ended: 'missed' };
  }
  if (elapsed >= DURATION) {
    events.push({ kind: 'end', x: ball.x, y: ball.y });
    return { ...game, ball, hits, elapsed: DURATION, ended: 'time' };
  }
  return { ...game, ball, hits, elapsed };
}
