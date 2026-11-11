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
 * POP THE ANSWER (Yobyn, 2026-11-10: "bring maths into the games"). A sum
 * stands above the board and the balloons carry numbers, three to a sum, one
 * of them its answer. Popping the answer scores, more for each one in a row,
 * and the rest of its bunch pops with it; the next sum comes. A wrong number
 * tapped only fizzles out: no point, no heart, and the row starts again. A
 * wrong number may float away; the ANSWER floating away costs the heart, and
 * the board says what it was. A gold star balloon has no number: it is always
 * right to pop, and letting it go costs nothing. Without a level (no sums) every balloon is such a plain one,
 * popped for a point and missed for a heart, as the game first was.
 *
 * Free of the DOM, in CSS pixels, y downwards, so it can be tested straight.
 */
import { GameLevel, GameSum, choices, gameSum, written } from './game-sums';

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
  /** The number it carries, when the game plays with sums; a star balloon has none. */
  value?: number;
}

/** The sum being asked, and the numbers still to come up for it. */
export interface BalloonTask {
  sum: GameSum;
  deal: number[];
}

/** The sum just settled, written out with its answer for a moment: "7 + 5 = 12". */
export interface Reveal {
  text: string;
  /** Popped (true), or its answer floated away (false). */
  right: boolean;
  /** Seconds it still shows. */
  left: number;
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
  /** Who is playing, for the sums; without one the balloons carry no numbers. */
  level?: GameLevel | null;
  /** The sum above the board, when the game plays with sums. */
  task?: BalloonTask | null;
  /** Answers popped in a row, without a wrong number tapped or an answer away. */
  streak?: number;
  /** Sums answered. */
  solved?: number;
  reveal?: Reveal | null;
}

export interface BalloonEvent {
  /**
   * A balloon popped for points; a wrong number tapped, fizzling out; one of
   * a bunch going with its answer (no points); one getting away for a heart;
   * the end.
   */
  kind: 'pop' | 'wrong' | 'clear' | 'miss' | 'end';
  x: number;
  y: number;
  hue: number;
  /** A pop's points: 1, STAR_POINTS for a star balloon, or what a right answer scores. */
  points?: number;
  star?: boolean;
  /** A pop that was the sum's answer. */
  right?: boolean;
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
/**
 * With sums a balloon has to be read before it is tapped: it crosses the
 * board in five seconds, not three and a half, and they come further apart.
 */
export const SUM_RISE = 0.2;
/** A balloon with a number on it is bigger, so three figures can be read on it. */
export const SUM_RADIUS_SHARE = 0.09;
export const SUM_MIN_RADIUS = 28;
export const SUM_FIRST_GAP = 1.5;
export const SUM_LAST_GAP = 1;
/** The numbers that come up for a sum: its answer and two wrong ones, then dealt again. */
export const CHOICES = 3;
/** A right answer scores this, and one more for each right one in a row before it, up to the top. */
export const RIGHT_POINTS = 2;
export const RIGHT_TOP = 5;
/** How long the sum stands answered before the next one's balloons come: popped, or its answer away. */
export const REVEAL_RIGHT = 0.8;
export const REVEAL_MISSED = 1.8;

/** What popping the answer scores after this many right in a row. */
export function rightPoints(streak: number): number {
  return Math.min(RIGHT_TOP, RIGHT_POINTS + Math.max(0, streak));
}

export function balloonRadius(width: number, sums = false): number {
  return sums ? Math.max(SUM_MIN_RADIUS, Math.round(width * SUM_RADIUS_SHARE)) : Math.max(MIN_RADIUS, Math.round(width * RADIUS_SHARE));
}

/** How fast balloons rise, in pixels a second: the same from the first to the last. */
export function riseSpeed(height: number, calm: boolean, sums = false): number {
  return height * (sums ? SUM_RISE : RISE) * (calm ? CALM_SPEED : 1);
}

/** The time until the next balloon, this far into the game: shorter as it goes, to a floor. */
export function gapAt(elapsed: number, calm: boolean, sums = false): number {
  const share = Math.min(1, Math.max(0, elapsed / RAMP));
  const [first, last] = sums ? [SUM_FIRST_GAP, SUM_LAST_GAP] : [FIRST_GAP, LAST_GAP];
  const gap = first - (first - last) * share;
  return calm ? gap / CALM_SPEED : gap;
}

/** A new sum for the level, never the one just asked, with its numbers shuffled to come up. */
export function newTask(level: GameLevel, random: () => number, last?: GameSum): BalloonTask {
  const sum = gameSum(level, random, last);
  return { sum, deal: choices(sum, CHOICES, random) };
}

/** The sum written out with its answer: "7 + 5 = 12". */
export function answered(sum: GameSum): string {
  return `${sum.text} = ${written(sum.answer)}`;
}

/** Where a balloon is drawn, and can be tapped, across the board: its middle and its sway. */
export function swayedX(balloon: Balloon, elapsed: number, calm: boolean): number {
  return calm ? balloon.x : balloon.x + Math.sin(elapsed * SWAY_SPEED + balloon.phase) * SWAY;
}

/** A new game: nothing up yet, the first balloon a moment away, the finish at a time of its own. */
export function newBalloons(width: number, height: number, calm = false, random: () => number = Math.random,
                            level: GameLevel | null = null): Balloons {
  return {
    level,
    task: level ? newTask(level, random) : null,
    streak: 0,
    solved: 0,
    reveal: null,
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
  const radius = balloonRadius(game.width, !!game.task);
  const room = Math.max(0, game.width - 2 * (radius + SWAY));
  const last = game.balloons[game.balloons.length - 1];
  let x = radius + SWAY + random() * room;
  for (let tries = 0; last && tries < 4 && Math.abs(x - last.x) < APART * radius; tries++) {
    x = radius + SWAY + random() * room;
  }
  const balloon: Balloon = {
    id: game.made,
    x,
    y: game.height + radius,
    radius,
    hue: Math.min(1, Math.max(0, x / game.width)),
    phase: random() * Math.PI * 2,
    star: game.made % STAR_EVERY === STAR_EVERY - 1
  };
  // The next number of the sum's bunch; a star balloon carries none
  if (game.task && !balloon.star) {
    balloon.value = game.task.deal[0];
  }
  return balloon;
}

/** The task once a numbered balloon has come up: its number dealt, and the bunch dealt again when it runs out. */
function dealt(task: BalloonTask, random: () => number): BalloonTask {
  const deal = task.deal.slice(1);
  return { ...task, deal: deal.length ? deal : choices(task.sum, CHOICES, random) };
}

/** Whether a tap at (x, y) reaches this balloon: inside it, or just outside. */
export function reaches(balloon: Balloon, x: number, y: number, elapsed: number, calm: boolean): boolean {
  const reach = Math.max(MIN_REACH, balloon.radius * REACH);
  const dx = x - swayedX(balloon, elapsed, calm);
  const dy = y - balloon.y;
  return dx * dx + dy * dy <= reach * reach;
}

/** What a tap did: the game after it, what to answer with, and the balloons that went. */
export interface PopResult {
  game: Balloons;
  event: BalloonEvent | null;
  /** The balloon the tap reached. */
  popped?: Balloon;
  /** The rest of a sum's bunch, going with its answer. */
  cleared?: Balloon[];
}

/**
 * A tap at (x, y) reaches a balloon, the nearest when it reaches two. A
 * plain or a star balloon pops for a point, or STAR_POINTS. With sums, the
 * balloon carrying the answer pops for rightPoints, its bunch goes with it
 * and the next sum is set; one carrying a wrong number fizzles out for
 * nothing, and the row of right ones starts again. A tap on nothing, or
 * once the game is over, does nothing.
 */
export function pop(game: Balloons, x: number, y: number, random: () => number = Math.random): PopResult {
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
  const at = { x: swayedX(popped, game.elapsed, game.calm), y: popped.y, hue: popped.hue };
  const others = game.balloons.filter(balloon => balloon.id !== popped.id);
  const task = game.task;

  if (popped.value === undefined || !task) {
    const points = popped.star ? STAR_POINTS : 1;
    return {
      game: { ...game, balloons: others, points: game.points + points },
      event: { kind: 'pop', ...at, points, star: !!popped.star },
      popped
    };
  }
  if (popped.value !== task.sum.answer) {
    return { game: { ...game, balloons: others, streak: 0 }, event: { kind: 'wrong', ...at }, popped };
  }
  // The answer: its bunch goes with it, and the next sum's balloons come after a moment
  const points = rightPoints(game.streak || 0);
  const cleared = others.filter(balloon => balloon.value !== undefined);
  return {
    game: {
      ...game,
      balloons: others.filter(balloon => balloon.value === undefined),
      points: game.points + points,
      streak: (game.streak || 0) + 1,
      solved: (game.solved || 0) + 1,
      task: game.level ? newTask(game.level, random, task.sum) : task,
      reveal: { text: answered(task.sum), right: true, left: REVEAL_RIGHT },
      untilNext: REVEAL_RIGHT
    },
    event: { kind: 'pop', ...at, points, right: true },
    popped,
    cleared
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
  const sums = !!game.task;
  const rise = riseSpeed(game.height, game.calm, sums) * dt;
  let task = game.task || null;
  let streak = game.streak || 0;
  let reveal = game.reveal && game.reveal.left > dt ? { ...game.reveal, left: game.reveal.left - dt } : null;

  // Up they go. A plain or a star balloon wholly off the top is missed; with
  // sums only the answer is, and a wrong number just floats away
  let missed = game.missed;
  let answerAway = false;
  let balloons: Balloon[] = [];
  game.balloons.forEach(balloon => {
    const moved = { ...balloon, y: balloon.y - rise };
    if (moved.y + moved.radius >= 0) {
      balloons.push(moved);
      return;
    }
    const isAnswer = !!task && moved.value === task.sum.answer;
    // With sums a star balloon is only a treat: letting it go costs nothing
    const plain = moved.value === undefined && !(task && moved.star);
    if (plain || isAnswer) {
      missed += 1;
      events.push({ kind: 'miss', x: swayedX(moved, elapsed, game.calm), y: 0, hue: moved.hue });
      answerAway = answerAway || isAnswer;
    }
  });

  let untilNext = game.untilNext - dt;
  // The answer got away: the board says what it was, the rest of its bunch goes, and the next sum comes
  if (answerAway && task) {
    balloons.filter(balloon => balloon.value !== undefined).forEach(balloon =>
      events.push({ kind: 'clear', x: swayedX(balloon, elapsed, game.calm), y: balloon.y, hue: balloon.hue }));
    balloons = balloons.filter(balloon => balloon.value === undefined);
    reveal = { text: answered(task.sum), right: false, left: REVEAL_MISSED };
    streak = 0;
    task = game.level ? newTask(game.level, random, task.sum) : task;
    untilNext = REVEAL_MISSED;
  }

  // A new one at the bottom when it is time, until the finish
  let made = game.made;
  if (untilNext <= 0 && elapsed < game.finishAt) {
    const coming = makeBalloon({ ...game, balloons, made, task }, random);
    balloons.push(coming);
    made += 1;
    untilNext += gapAt(elapsed, game.calm, sums);
    if (task && coming.value !== undefined) {
      task = dealt(task, random);
    }
  }

  const next: Balloons = { ...game, balloons, untilNext, made, missed, elapsed, task, streak, reveal };
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
