/**
 * The third bonus game (Yobyn, 2026-10-13: "focus on adding one game"):
 * balloons float up from the bottom of the board, and a tap on one pops it
 * for a point. One that floats off the top is missed; three missed ends the
 * game. Otherwise it ends at a finish of its own, picked at random between
 * 20 seconds and 2 minutes like Springbal's flag, with no clock shown: after
 * it no more balloons come, and the game ends when the last one has gone.
 *
 * Balloons always rise at the same speed (Yobyn did not want Springbal to
 * speed up); they come a little more often as the game goes, never more
 * often than a child can tap.
 *
 * Free of the DOM, in CSS pixels, y downwards, so it can be tested straight.
 */

export interface Balloon {
  id: number;
  /** Its middle, before the sway. */
  x: number;
  y: number;
  radius: number;
  /** Where in the field's colours it is drawn, 0 to 1. */
  hue: number;
  /** Where in its sway it started, so no two sway together. */
  phase: number;
  /** A gold balloon with a star on it, worth STAR_POINTS. */
  star?: boolean;
}

export type BalloonsEnding = 'missed' | 'finished';

export interface Balloons {
  width: number;
  height: number;
  balloons: Balloon[];
  /** Seconds until the next balloon comes up. */
  untilNext: number;
  made: number;
  /** Balloons popped: the points. */
  points: number;
  /** Balloons that floated off the top. */
  missed: number;
  elapsed: number;
  /** When balloons stop coming, in seconds: picked at random as the game starts. */
  finishAt: number;
  ended: BalloonsEnding | null;
  /** Calmer under prefers-reduced-motion: slower, fewer, and no sway. */
  calm: boolean;
}

export interface BalloonEvent {
  kind: 'pop' | 'miss' | 'end';
  x: number;
  y: number;
  hue: number;
  /** A pop's points: 1, or STAR_POINTS for a star balloon. */
  points?: number;
  star?: boolean;
}

/** Balloons stop coming somewhere between these, in seconds. */
export const FINISH_EARLIEST = 20;
export const FINISH_LATEST = 120;
/** Three gone off the top and the game is over. */
export const MISSES_ALLOWED = 3;
/** A balloon crosses the board in about three and a half seconds, all game long. */
export const RISE = 0.28;
/** Under reduced motion: two thirds of it, and a third fewer balloons. */
export const CALM_SPEED = 2 / 3;
/** A balloon's size, as a share of the board's width, and never smaller than this. */
export const RADIUS_SHARE = 0.075;
export const MIN_RADIUS = 22;
/** A tap counts a little outside the balloon: a child's finger is not a pin. */
export const REACH = 1.3;
/** A tap always reaches at least this far from a balloon's middle. */
export const MIN_REACH = 30;
/** The time between two balloons: this at the start... */
export const FIRST_GAP = 1.4;
/** ...down to this after RAMP seconds, and never less. */
export const LAST_GAP = 0.6;
export const RAMP = 60;
/** The first balloon comes up this soon after Start. */
export const FIRST_WAIT = 0.4;
/** How far a balloon sways from side to side, in pixels, and how fast. */
export const SWAY = 6;
export const SWAY_SPEED = 1.6;
/** A new balloon comes up at least this many radii from the last one, when there is room. */
export const APART = 2.2;
/**
 * Every this many balloons one is gold with a star, worth more (2026-10-18:
 * played on a phone, every balloon looked alike and was worth the same, so
 * a long game had nothing to look out for). It rises like the rest, and
 * getting away costs a heart like any other.
 */
export const STAR_EVERY = 8;
export const STAR_POINTS = 3;
/** The longest single step. */
export const MAX_STEP = 1 / 60;

export function balloonRadius(width: number): number {
  return Math.max(MIN_RADIUS, Math.round(width * RADIUS_SHARE));
}

/** How fast balloons rise, in pixels a second: the same from the first to the last. */
export function riseSpeed(height: number, calm: boolean): number {
  return height * RISE * (calm ? CALM_SPEED : 1);
}

/** The time until the next balloon, this far into the game: shorter as it goes, to a floor. */
export function gapAt(elapsed: number, calm: boolean): number {
  const share = Math.min(1, Math.max(0, elapsed / RAMP));
  const gap = FIRST_GAP - (FIRST_GAP - LAST_GAP) * share;
  return calm ? gap / CALM_SPEED : gap;
}

/** Where a balloon is drawn, and can be tapped, across the board: its middle and its sway. */
export function swayedX(balloon: Balloon, elapsed: number, calm: boolean): number {
  return calm ? balloon.x : balloon.x + Math.sin(elapsed * SWAY_SPEED + balloon.phase) * SWAY;
}

/** A new game: nothing up yet, the first balloon a moment away, the finish at a time of its own. */
export function newBalloons(width: number, height: number, calm = false, random: () => number = Math.random): Balloons {
  return {
    width,
    height,
    balloons: [],
    untilNext: FIRST_WAIT,
    made: 0,
    points: 0,
    missed: 0,
    elapsed: 0,
    finishAt: FINISH_EARLIEST + random() * (FINISH_LATEST - FINISH_EARLIEST),
    ended: null,
    calm
  };
}

/** A new balloon just below the board, somewhere along it, not on top of the last one. */
export function makeBalloon(game: Balloons, random: () => number): Balloon {
  const radius = balloonRadius(game.width);
  const room = Math.max(0, game.width - 2 * (radius + SWAY));
  const last = game.balloons[game.balloons.length - 1];
  let x = radius + SWAY + random() * room;
  for (let tries = 0; last && tries < 4 && Math.abs(x - last.x) < APART * radius; tries++) {
    x = radius + SWAY + random() * room;
  }
  return {
    id: game.made,
    x,
    y: game.height + radius,
    radius,
    hue: Math.min(1, Math.max(0, x / game.width)),
    phase: random() * Math.PI * 2,
    star: game.made % STAR_EVERY === STAR_EVERY - 1
  };
}

/** Whether a tap at (x, y) reaches this balloon: inside it, or just outside. */
export function reaches(balloon: Balloon, x: number, y: number, elapsed: number, calm: boolean): boolean {
  const reach = Math.max(MIN_REACH, balloon.radius * REACH);
  const dx = x - swayedX(balloon, elapsed, calm);
  const dy = y - balloon.y;
  return dx * dx + dy * dy <= reach * reach;
}

/**
 * A tap at (x, y): pops the balloon it reaches, the nearest when it reaches
 * two, for a point, or STAR_POINTS for a star balloon. A tap on nothing,
 * or once the game is over, does nothing.
 */
export function pop(game: Balloons, x: number, y: number): { game: Balloons; event: BalloonEvent | null } {
  if (game.ended) {
    return { game, event: null };
  }
  let nearest: Balloon | null = null;
  let nearestDistance = Infinity;
  game.balloons.forEach(balloon => {
    if (!reaches(balloon, x, y, game.elapsed, game.calm)) {
      return;
    }
    const distance = Math.hypot(x - swayedX(balloon, game.elapsed, game.calm), y - balloon.y);
    if (distance < nearestDistance) {
      nearest = balloon;
      nearestDistance = distance;
    }
  });
  if (!nearest) {
    return { game, event: null };
  }
  const popped: Balloon = nearest;
  const points = popped.star ? STAR_POINTS : 1;
  return {
    game: { ...game, balloons: game.balloons.filter(balloon => balloon.id !== popped.id), points: game.points + points },
    event: { kind: 'pop', x: swayedX(popped, game.elapsed, game.calm), y: popped.y, hue: popped.hue, points, star: !!popped.star }
  };
}

/**
 * Advances the game by `seconds`, in steps no longer than MAX_STEP, and says
 * what happened on the way. A game that has ended stays as it is.
 */
export function step(game: Balloons, seconds: number, random: () => number = Math.random): { game: Balloons; events: BalloonEvent[] } {
  const events: BalloonEvent[] = [];
  let current = game;
  let left = Math.max(0, seconds);
  while (left > 0 && !current.ended) {
    const dt = Math.min(MAX_STEP, left);
    left -= dt;
    current = tick(current, dt, random, events);
  }
  return { game: current, events };
}

function tick(game: Balloons, dt: number, random: () => number, events: BalloonEvent[]): Balloons {
  const elapsed = game.elapsed + dt;
  const rise = riseSpeed(game.height, game.calm) * dt;

  // Up they go; one wholly off the top is missed
  let missed = game.missed;
  const balloons: Balloon[] = [];
  game.balloons.forEach(balloon => {
    const moved = { ...balloon, y: balloon.y - rise };
    if (moved.y + moved.radius < 0) {
      missed += 1;
      events.push({ kind: 'miss', x: swayedX(moved, elapsed, game.calm), y: 0, hue: moved.hue });
    } else {
      balloons.push(moved);
    }
  });

  // A new one at the bottom when it is time, until the finish
  let untilNext = game.untilNext - dt;
  let made = game.made;
  if (untilNext <= 0 && elapsed < game.finishAt) {
    const coming = makeBalloon({ ...game, balloons, made }, random);
    balloons.push(coming);
    made += 1;
    untilNext += gapAt(elapsed, game.calm);
  }

  const next: Balloons = { ...game, balloons, untilNext, made, missed, elapsed };
  if (missed >= MISSES_ALLOWED) {
    events.push({ kind: 'end', x: game.width / 2, y: game.height / 2, hue: 0.5 });
    return { ...next, ended: 'missed' };
  }
  if (elapsed >= game.finishAt && balloons.length === 0) {
    events.push({ kind: 'end', x: game.width / 2, y: game.height / 2, hue: 0.5 });
    return { ...next, ended: 'finished' };
  }
  return next;
}
