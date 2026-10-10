/**
 * The second bonus game's rules (Yobyn, 2026-10-10): "a ball that rolls
 * horizontally over the screen and the user needs to bounce the ball to
 * avoid obstacles, obstacles placed randomly on the ground, in the middle of
 * the air and at the top ... and the game should also speed up over time".
 *
 * The ball rolls along the ground at a fixed place near the left; the world
 * comes at it from the right. A tap bounces it, always to the same height.
 * Three kinds of obstacle:
 *   - on the ground: bounce over it;
 *   - in the middle of the air: roll under it, a bounce runs into it;
 *   - hanging from the top: a bounce's highest point runs into it.
 * So the game is choosing WHEN to bounce. Every obstacle passed is a point.
 *
 * The world keeps one steady speed, and the game ends at a finish flag
 * (Yobyn, 2026-10-10: "let's rather not increase the speed but have an end
 * flag, after random time between 20 secs and 2 min"): a run is a race to
 * the flag, and a crash on the way ends it early.
 *
 * Free of the DOM, in CSS pixels, y downwards, so it can be tested straight.
 */

export type Place = 'ground' | 'middle' | 'top';

export interface Obstacle {
  place: Place;
  /** Its left edge and top edge. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Counted once the ball is past it. */
  passed: boolean;
}

export interface Roller {
  /** Its middle; x never changes. */
  x: number;
  y: number;
  /** Pixels per second, upwards negative. */
  vy: number;
  radius: number;
  /** How far it has rolled, in radians: only for drawing it turning. */
  turn: number;
}

export type JumperEnding = 'crashed' | 'finished';

export interface Jumper {
  width: number;
  height: number;
  /** The ground line's y. */
  ground: number;
  ball: Roller;
  obstacles: Obstacle[];
  /** Pixels still to travel before the next obstacle comes in at the right. */
  untilNext: number;
  /** How many obstacles have come in so far. */
  made: number;
  /** Obstacles passed: the points. */
  points: number;
  elapsed: number;
  /** When the finish flag comes in, in seconds: picked at random as the game starts. */
  finishAt: number;
  /** The finish flag's x, once it is on the board; the game is won when it reaches the ball. */
  flag: number | null;
  ended: JumperEnding | null;
  /** Calmer under prefers-reduced-motion: slower, and it speeds up more slowly. */
  calm: boolean;
}

export interface JumperEvent {
  kind: 'pass' | 'end';
  x: number;
  y: number;
}

/** The finish flag comes in somewhere between these, in seconds. */
export const FINISH_EARLIEST = 20;
export const FINISH_LATEST = 120;
export const BALL_RADIUS = 12;
/** Where the ball rolls, as a share of the width from the left. */
export const BALL_AT = 0.22;
/** Room under the ground line. */
export const GROUND_LIFT = 20;
/** The speed in board widths a second, all the way: an obstacle takes under two seconds to arrive. */
export const SPEED = 0.5;
/** Under reduced motion: two thirds of it. */
export const CALM_SPEED = 2 / 3;
/** A bounce is always this long, whatever the speed... */
export const AIRTIME = 0.8;
/** ...and lifts the ball's bottom this share of the room above the ground. */
export const JUMP_RISE = 0.72;
/**
 * The obstacles, as shares of the room above the ground (0 the ground, 1
 * the top) and of the width. A bounce clears a ground one (it is low and
 * narrow); a ball on the ground passes under a middle one; a bounce's top
 * reaches into a top one.
 */
export const GROUND_TALL = 0.2;
export const GROUND_WIDE = 0.07;
export const GROUND_MIN_WIDE = 20;
export const MIDDLE_FROM = 0.38;
export const MIDDLE_TO = 0.56;
export const TOP_FROM = 0.68;
export const HANGING_WIDE = 0.22;
/** How likely each kind is: ground ones most, since they are the ones to bounce for. */
export const GROUND_SHARE = 0.5;
export const MIDDLE_SHARE = 0.25;
/** The space after an obstacle: a whole bounce, plus this share of the width or up to the larger. */
export const GAP_MIN = 0.35;
export const GAP_MAX = 0.9;
/** The ball's hit circle is this share of what is drawn: a near miss is a miss. */
export const FORGIVE = 0.75;
/** The longest single physics step. */
export const MAX_STEP = 1 / 240;

/** The height above the ground the ball's bottom can reach the top in. */
function room(game: { ground: number }): number {
  return game.ground;
}

/** The world's speed, in pixels a second: the same from the start to the flag. */
export function worldSpeed(width: number, calm: boolean): number {
  return width * SPEED * (calm ? CALM_SPEED : 1);
}

/** Gravity and the bounce's upward speed that make a bounce JUMP_RISE high and AIRTIME long. */
export function bounce(game: { ground: number }): { gravity: number; lift: number } {
  const rise = JUMP_RISE * room(game);
  return { gravity: 8 * rise / (AIRTIME * AIRTIME), lift: 4 * rise / AIRTIME };
}

/** Where the ball rests: on the ground. */
function restingY(game: { ground: number }): number {
  return game.ground - BALL_RADIUS;
}

export function onGround(game: Jumper): boolean {
  return game.ball.y >= restingY(game) - 0.5 && game.ball.vy >= 0;
}

/** A new game: the ball on the ground, the first obstacle a moment away, the flag at a time of its own. */
export function newJumper(width: number, height: number, calm = false, random: () => number = Math.random): Jumper {
  const ground = height - GROUND_LIFT;
  return {
    width,
    height,
    ground,
    ball: { x: width * BALL_AT, y: ground - BALL_RADIUS, vy: 0, radius: BALL_RADIUS, turn: 0 },
    obstacles: [],
    untilNext: width * 0.5,
    made: 0,
    points: 0,
    elapsed: 0,
    finishAt: FINISH_EARLIEST + random() * (FINISH_LATEST - FINISH_EARLIEST),
    flag: null,
    ended: null,
    calm
  };
}

/** A bounce, when the ball is on the ground and the game is on; otherwise nothing. */
export function jump(game: Jumper): Jumper {
  if (game.ended || !onGround(game)) {
    return game;
  }
  return { ...game, ball: { ...game.ball, vy: -bounce(game).lift } };
}

/** One obstacle of this kind, coming in at x. */
export function makeObstacle(game: Jumper, place: Place, x: number): Obstacle {
  const top = room(game);
  if (place === 'ground') {
    const height = GROUND_TALL * top;
    const width = Math.max(GROUND_MIN_WIDE, GROUND_WIDE * game.width);
    return { place, x, y: game.ground - height, width, height, passed: false };
  }
  const width = HANGING_WIDE * game.width;
  if (place === 'middle') {
    const y = game.ground - MIDDLE_TO * top;
    return { place, x, y, width, height: (MIDDLE_TO - MIDDLE_FROM) * top, passed: false };
  }
  return { place, x, y: 0, width, height: game.ground - TOP_FROM * top, passed: false };
}

/** Which kind comes next. The first is always on the ground: it shows what a bounce is for. */
export function pickPlace(made: number, random: () => number): Place {
  if (made === 0) {
    return 'ground';
  }
  const roll = random();
  return roll < GROUND_SHARE ? 'ground' : roll < GROUND_SHARE + MIDDLE_SHARE ? 'middle' : 'top';
}

/**
 * The space after an obstacle before the next comes in: always a whole
 * bounce, so there is always a way through, plus some more, at random.
 */
export function gapAfter(width: number, speed: number, random: () => number): number {
  return speed * AIRTIME * 1.1 + width * (GAP_MIN + random() * (GAP_MAX - GAP_MIN));
}

/** Whether the ball (its forgiving hit circle) touches an obstacle. */
export function touches(ball: Roller, obstacle: Obstacle): boolean {
  const r = ball.radius * FORGIVE;
  const nearestX = Math.max(obstacle.x, Math.min(ball.x, obstacle.x + obstacle.width));
  const nearestY = Math.max(obstacle.y, Math.min(ball.y, obstacle.y + obstacle.height));
  return (ball.x - nearestX) ** 2 + (ball.y - nearestY) ** 2 < r * r;
}

/**
 * Advances the game by `seconds`, in steps no longer than MAX_STEP, and says
 * what happened on the way. A game that has ended stays as it is.
 */
export function step(game: Jumper, seconds: number, random: () => number = Math.random): { game: Jumper; events: JumperEvent[] } {
  const events: JumperEvent[] = [];
  let current = game;
  let left = Math.max(0, seconds);
  while (left > 0 && !current.ended) {
    const dt = Math.min(MAX_STEP, left);
    left -= dt;
    current = tick(current, dt, random, events);
  }
  return { game: current, events };
}

function tick(game: Jumper, dt: number, random: () => number, events: JumperEvent[]): Jumper {
  const elapsed = game.elapsed + dt;
  const speed = worldSpeed(game.width, game.calm);
  const dx = speed * dt;

  // The ball: up and back down, rolling as the world goes by
  const { gravity } = bounce(game);
  let vy = game.ball.vy + gravity * dt;
  let y = game.ball.y + vy * dt;
  if (y >= restingY(game)) {
    y = restingY(game);
    vy = 0;
  }
  const ball: Roller = { ...game.ball, y, vy, turn: game.ball.turn + dx / game.ball.radius };

  // The world comes to the left; one that has gone off the board is gone
  let obstacles = game.obstacles
    .map(obstacle => ({ ...obstacle, x: obstacle.x - dx }))
    .filter(obstacle => obstacle.x + obstacle.width > 0);

  // A new one coming in at the right, when the space after the last has gone by;
  // once it is time, the flag comes in that space instead, and nothing after it
  let untilNext = game.untilNext - dx;
  let made = game.made;
  let flag = game.flag === null ? null : game.flag - dx;
  if (untilNext <= 0 && flag === null && elapsed >= game.finishAt) {
    flag = game.width + untilNext;
    untilNext = Infinity;
  } else if (untilNext <= 0) {
    const coming = makeObstacle(game, pickPlace(made, random), game.width + untilNext);
    obstacles = [...obstacles, coming];
    made += 1;
    untilNext += coming.width + gapAfter(game.width, speed, random);
  }

  let points = game.points;
  obstacles = obstacles.map(obstacle => {
    if (!obstacle.passed && obstacle.x + obstacle.width < ball.x - ball.radius) {
      points += 1;
      events.push({ kind: 'pass', x: ball.x, y: ball.y });
      return { ...obstacle, passed: true };
    }
    return obstacle;
  });

  const next: Jumper = { ...game, ball, obstacles, untilNext, made, points, elapsed, flag };
  if (obstacles.some(obstacle => touches(ball, obstacle))) {
    events.push({ kind: 'end', x: ball.x, y: ball.y });
    return { ...next, ended: 'crashed' };
  }
  if (flag !== null && flag <= ball.x) {
    events.push({ kind: 'end', x: ball.x, y: ball.y });
    return { ...next, flag: ball.x, ended: 'finished' };
  }
  return next;
}
