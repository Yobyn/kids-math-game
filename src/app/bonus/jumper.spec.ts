import {
  AIRTIME, BALL_RADIUS, FINISH_EARLIEST, FINISH_LATEST, GROUND_TALL, Jumper, JUMP_RISE, Place,
  gapAfter, jump, makeObstacle, newJumper, onGround, pickPlace, step, touches, worldSpeed
} from './jumper';

const W = 360;
const H = 360;

/** Always the same "random", so a game can be played twice the same way. */
function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** A game with just this obstacle, its left edge this far ahead of the ball, and nothing else coming. */
function facing(place: Place, ahead: number): Jumper {
  const game = newJumper(W, H);
  const obstacle = makeObstacle(game, place, game.ball.x + ahead);
  return { ...game, obstacles: [obstacle], untilNext: 1e9, made: 1 };
}

/** Plays on, frame by frame, bouncing as the given rule says. */
function play(game: Jumper, seconds: number, bounceNow: (game: Jumper) => boolean, random = seeded()): Jumper {
  let current = game;
  for (let t = 0; t < seconds && !current.ended; t += 1 / 60) {
    if (bounceNow(current)) {
      current = jump(current);
    }
    current = step(current, 1 / 60, random).game;
  }
  return current;
}

/** Whether this game, played on with no more bounces and nothing new coming, crashes within `seconds`. */
function crashesWithin(game: Jumper, seconds: number): boolean {
  return step({ ...game, untilNext: 1e9 }, seconds).game.ended === 'crashed';
}

/**
 * A player who never makes a mistake: bounces at the last moment that
 * staying on the ground would crash, and never when a bounce would.
 */
function perfect(game: Jumper): boolean {
  if (!onGround(game)) {
    return false;
  }
  const look = AIRTIME + 0.3;
  if (!crashesWithin(game, look)) {
    return false;
  }
  const later = step({ ...game, untilNext: 1e9 }, 1 / 60).game;
  const canWait = !later.ended && !crashesWithin(jump(later), look);
  return !canWait && !crashesWithin(jump(game), look);
}

describe('the second bonus game: a rolling ball bounced over obstacles (bonus/jumper.ts)', () => {
  it('starts with the ball resting on the ground near the left, and nothing in the way yet', () => {
    const game = newJumper(W, H);
    expect(game.ball.x).toBeLessThan(W / 3);
    expect(game.ball.y + BALL_RADIUS).toBe(game.ground);
    expect(onGround(game)).toBeTrue();
    expect(game.obstacles).toEqual([]);
    expect(game.points).toBe(0);
    expect(game.ended).toBeNull();
  });

  it('bounces only from the ground, always as high and as long', () => {
    const up = jump(newJumper(W, H));
    expect(up.ball.vy).toBeLessThan(0);
    // a second tap in the air does nothing
    const air = step(up, 0.1).game;
    expect(jump(air)).toBe(air);
    // up to JUMP_RISE of the room, and back down after AIRTIME
    let highest = up.ball.y;
    let game = up;
    let landedAt = 0;
    for (let t = 0; t < 2; t += 1 / 240) {
      game = step({ ...game, untilNext: 1e9 }, 1 / 240).game;
      highest = Math.min(highest, game.ball.y);
      if (!landedAt && t > 0.1 && onGround(game)) {
        landedAt = t;
      }
    }
    expect(game.ground - BALL_RADIUS - highest).toBeCloseTo(JUMP_RISE * game.ground, -1);
    expect(landedAt).toBeCloseTo(AIRTIME, 1);
  });

  it('crashes into a ground obstacle unless the ball bounces over it', () => {
    expect(crashesWithin(facing('ground', 60), 2)).toBeTrue();
    const over = play(facing('ground', 60), 3, game => onGround(game) && game.obstacles.length > 0 && game.obstacles[0].x - game.ball.x < 30);
    expect(over.ended).toBeNull();
    expect(over.points).toBe(1);
  });

  it('lets a rolling ball pass under an obstacle in the middle of the air, and a bounce runs into it', () => {
    const under = play(facing('middle', 60), 3, () => false);
    expect(under.ended).toBeNull();
    expect(under.points).toBe(1);
    const into = play(facing('middle', 60), 3, game => onGround(game) && game.obstacles.length > 0 && game.obstacles[0].x - game.ball.x < 20);
    expect(into.ended).toBe('crashed');
  });

  it('lets a rolling ball pass under one hanging from the top, and the top of a bounce runs into it', () => {
    const under = play(facing('top', 60), 3, () => false);
    expect(under.ended).toBeNull();
    expect(under.points).toBe(1);
    // bounced so its highest point is right under the middle of the obstacle
    const width = makeObstacle(newJumper(W, H), 'top', 0).width;
    const ahead = worldSpeed(W, false) * AIRTIME / 2 - width / 2;
    const into = play(facing('top', ahead), 3, game => game.elapsed === 0);
    expect(into.ended).toBe('crashed');
  });

  it('puts obstacles on the ground, in the middle of the air and at the top, at random, the first on the ground', () => {
    const random = seeded(3);
    const places = Array.from({ length: 300 }, (_, i) => pickPlace(i, random));
    expect(places[0]).toBe('ground');
    ['ground', 'middle', 'top'].forEach(place => {
      const share = places.filter(p => p === place).length / places.length;
      expect(share).toBeGreaterThan(0.15);
    });
    expect(places.filter(p => p === 'ground').length).toBeGreaterThan(places.filter(p => p === 'middle').length);
    // and they really are where they say
    const game = newJumper(W, H);
    const low = makeObstacle(game, 'ground', 100);
    expect(low.y + low.height).toBe(game.ground);
    expect(low.height).toBeCloseTo(GROUND_TALL * game.ground, 6);
    const middle = makeObstacle(game, 'middle', 100);
    expect(middle.y).toBeGreaterThan(game.ground * 0.3);
    expect(middle.y + middle.height).toBeLessThan(game.ground - 4 * BALL_RADIUS);
    expect(makeObstacle(game, 'top', 100).y).toBe(0);
  });

  it('keeps one steady speed from the start to the flag (Yobyn, 2026-10-10: "rather not increase the speed")', () => {
    let game = { ...newJumper(W, H, false, () => 1), untilNext: 1e9 };
    const at = (g: Jumper) => step(g, 0.1).game.ball.turn - g.ball.turn;
    const early = at(game);
    game = step(game, 100).game;
    expect(at(game)).toBeCloseTo(early, 6);
    expect(worldSpeed(W, true)).toBeLessThan(worldSpeed(W, false));
  });

  it('puts the finish flag at a random moment between 20 seconds and 2 minutes (Yobyn, 2026-10-10)', () => {
    const random = seeded(9);
    const times = Array.from({ length: 200 }, () => newJumper(W, H, false, random).finishAt);
    times.forEach(t => {
      expect(t).toBeGreaterThanOrEqual(FINISH_EARLIEST);
      expect(t).toBeLessThanOrEqual(FINISH_LATEST);
    });
    expect(Math.min(...times)).toBeLessThan(35);
    expect(Math.max(...times)).toBeGreaterThan(105);
    expect(newJumper(W, H, false, () => 0).finishAt).toBe(20);
    expect(newJumper(W, H, false, () => 1).finishAt).toBe(120);
  });

  it('brings the flag in at its time, in a space of its own, and ends the game won as it reaches the ball', () => {
    // Its time has come as the next space opens: the flag takes it, not an obstacle
    const start = { ...newJumper(W, H, false, () => 0.5), finishAt: 0, untilNext: 0.01 };
    const game = step(start, 0.05).game;
    expect(game.flag).not.toBeNull();
    expect(game.obstacles).toEqual([]);
    // and not before its time
    expect(step({ ...start, finishAt: 30 }, 0.05).game.flag).toBeNull();
    // nothing comes after the flag
    const made = game.made;
    const { game: after, events } = step(game, 5);
    expect(after.made).toBe(made);
    expect(after.ended).toBe('finished');
    expect(events.filter(event => event.kind === 'end').length).toBe(1);
    expect(step(after, 1).game).toEqual(after);
  });

  it('still ends early on a crash before the flag', () => {
    const game = play({ ...facing('ground', 40), finishAt: 60 }, 3, () => false);
    expect(game.ended).toBe('crashed');
    expect(game.flag).toBeNull();
  });

  it('always leaves a whole bounce between obstacles, so there is always a way through', () => {
    const random = seeded(11);
    for (let i = 0; i < 50; i++) {
      const speed = worldSpeed(W, false);
      expect(gapAfter(W, speed, random)).toBeGreaterThan(speed * AIRTIME);
    }
  });

  it('can always be played to the flag, even the latest one', () => {
    const game = play(newJumper(W, H, false, () => 1), FINISH_LATEST + 10, perfect, seeded(5));
    expect(game.ended).toBe('finished');
    expect(game.points).toBeGreaterThan(30);
  });

  it('counts each obstacle once, as the ball gets past it', () => {
    const { game, events } = step(facing('middle', 10), 3);
    expect(game.points).toBe(1);
    expect(events.filter(event => event.kind === 'pass').length).toBe(1);
  });

  it('forgives a near miss: only a real touch ends it', () => {
    const game = newJumper(W, H);
    const block = makeObstacle(game, 'ground', game.ball.x + BALL_RADIUS - 2);
    expect(touches(game.ball, block)).toBeFalse();
    expect(touches(game.ball, { ...block, x: game.ball.x })).toBeTrue();
  });
});
