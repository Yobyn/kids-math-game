import {
  AIRTIME, BALL_RADIUS, BUMPS_ALLOWED, FINISH_EARLIEST, FINISH_LATEST, GROUND_TALL, Jumper, JUMP_RISE, MIDDLE_TO, Place, STAR_EVERY, STAR_HEIGHT,
  STAR_CHOICES, STAR_RADIUS, SUM_STAR_RADIUS,
  gapAfter, jump, makeObstacle, makeStar, newJumper, onGround, pickPlace, reachesStar, step, touches, worldSpeed
} from './jumper';
import { REVEAL_RIGHT, RIGHT_POINTS } from './game-sums';

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

/** Whether this game, played on with no more bounces and nothing new coming, runs into something within `seconds`. */
function crashesWithin(game: Jumper, seconds: number): boolean {
  return step({ ...game, untilNext: 1e9 }, seconds).game.bumps > game.bumps;
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
    expect(into.bumps).toBe(1);
  });

  it('lets a rolling ball pass under one hanging from the top, and the top of a bounce runs into it', () => {
    const under = play(facing('top', 60), 3, () => false);
    expect(under.ended).toBeNull();
    expect(under.points).toBe(1);
    // bounced so its highest point is right under the middle of the obstacle
    const width = makeObstacle(newJumper(W, H), 'top', 0).width;
    const ahead = worldSpeed(W, false) * AIRTIME / 2 - width / 2;
    const into = play(facing('top', ahead), 3, game => game.elapsed === 0);
    expect(into.bumps).toBe(1);
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

  it('still ends early before the flag, at the third bump', () => {
    const game = play({ ...facing('ground', 40), finishAt: 60, bumps: BUMPS_ALLOWED - 1 }, 3, () => false);
    expect(game.ended).toBe('crashed');
    expect(game.flag).toBeNull();
  });

  it('costs one of three hearts for an obstacle run into, and the ball goes on through it for no point', () => {
    expect(BUMPS_ALLOWED).toBe(3);
    expect(newJumper(W, H).bumps).toBe(0);
    let game = facing('ground', 60);
    const events: string[] = [];
    for (let t = 0; t < 3; t += 1 / 60) {
      const result = step(game, 1 / 60);
      game = result.game;
      result.events.forEach(event => events.push(event.kind));
    }
    expect(game.bumps).toBe(1);
    expect(game.ended).toBeNull();
    expect(game.points).toBe(0);
    expect(events.filter(kind => kind === 'bump').length).toBe(1);
    expect(events).not.toContain('pass');
    expect(events).not.toContain('end');
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

  it('hangs a star in every second gap, in its middle, between the middle of the air and the top (2026-10-15)', () => {
    const base = { ...newJumper(W, H, false, () => 0.5), untilNext: 0.001 };
    // the first obstacle: no star after it
    const first = step(base, 1 / 60, seeded(9)).game;
    expect(first.made).toBe(1);
    expect(first.stars).toEqual([]);
    // the second: a star in the gap after it
    const second = step({ ...base, made: 1 }, 1 / 60, seeded(9)).game;
    expect(second.made).toBe(STAR_EVERY);
    expect(second.stars.length).toBe(1);
    const star = second.stars[0];
    const coming = second.obstacles[second.obstacles.length - 1];
    expect(star.x - star.radius).toBeGreaterThan(coming.x + coming.width);
    expect(star.x + star.radius).toBeLessThan(coming.x + coming.width + second.untilNext);
    // at the ball's middle at the top of a bounce: well above the middle of the air
    expect(second.ground - star.y).toBeCloseTo(STAR_HEIGHT * second.ground + BALL_RADIUS, 6);
    expect((second.ground - star.y) / second.ground).toBeGreaterThan(MIDDLE_TO);
  });

  it('gives a point for a star a bounce reaches, and none for one the ball rolls under', () => {
    const game = newJumper(W, H);
    const star = makeStar(game, game.ball.x + worldSpeed(W, false) * AIRTIME / 2);
    // rolling along the ground, it passes under
    const rolled = step({ ...game, stars: [star], untilNext: 1e9 }, AIRTIME);
    expect(rolled.game.points).toBe(0);
    expect(rolled.events.some(event => event.kind === 'star')).toBeFalse();
    // a bounce now meets it on the way
    const bounced = step(jump({ ...game, stars: [star], untilNext: 1e9 }), AIRTIME);
    expect(bounced.game.points).toBe(1);
    expect(bounced.game.stars).toEqual([]);
    expect(bounced.events.filter(event => event.kind === 'star').length).toBe(1);
    // a bounce a little early or late still takes it: the ball stays near its top a while
    [-0.08, 0.08].forEach(early => {
      const near = makeStar(game, game.ball.x + worldSpeed(W, false) * (AIRTIME / 2 + early));
      expect(step(jump({ ...game, stars: [near], untilNext: 1e9 }), AIRTIME).game.points).toBe(1);
    });
  });

  it('counts a star the whole ball touches, not only the forgiving middle', () => {
    const game = newJumper(W, H);
    const star = { x: game.ball.x + game.ball.radius + 8, y: game.ball.y, radius: 11 };
    expect(reachesStar(game.ball, star)).toBeTrue();
    expect(reachesStar(game.ball, { ...star, x: star.x + 20 })).toBeFalse();
  });

  it('says when the ball lands on a board of any height, played frame by frame as a phone does', () => {
    // On a 361px board the last step before landing ended within half a
    // pixel of the ground, and the landing went unsaid
    for (let height = 280; height <= 480; height++) {
      let game = jump({ ...newJumper(W, height), untilNext: 1e9 });
      let lands = 0;
      for (let frame = 0; frame < 60; frame++) {
        const result = step(game, 1 / 60);
        lands += result.events.filter(event => event.kind === 'land').length;
        game = result.game;
      }
      expect(lands).toBe(1, `a ${height}px board`);
    }
  });

  it('says when the ball lands after a bounce, for a squash, and not while it rolls', () => {
    const rolling = step({ ...newJumper(W, H), untilNext: 1e9 }, 0.5);
    expect(rolling.events.some(event => event.kind === 'land')).toBeFalse();
    const bounced = step(jump({ ...newJumper(W, H), untilNext: 1e9 }), AIRTIME + 0.1);
    expect(bounced.events.filter(event => event.kind === 'land').length).toBe(1);
  });

  it('forgives a near miss: only a real touch ends it', () => {
    const game = newJumper(W, H);
    const block = makeObstacle(game, 'ground', game.ball.x + BALL_RADIUS - 2);
    expect(touches(game.ball, block)).toBeFalse();
    expect(touches(game.ball, { ...block, x: game.ball.x })).toBeTrue();
  });
});

describe('Springbal with sums: bounce up to the answer (Yobyn, 2026-11-10)', () => {
  const LEVEL = { grade: 1 };

  /** A game on 7 + 5 with one star carrying this number, where a bounce now reaches it, and nothing else coming. */
  function facingStar(value: number | undefined, streak = 0): Jumper {
    const game = newJumper(W, H, false, seeded(), LEVEL);
    const star = makeStar(game, game.ball.x + worldSpeed(W, false) * AIRTIME / 2, value);
    return { ...game, task: { sum: { text: '7 + 5', answer: 12 }, deal: [11, 12] }, stars: [star], streak, untilNext: 1e9 };
  }

  it('starts with a sum of the child\'s own year, its answer among the numbers to come, and none without a level', () => {
    const game = newJumper(W, H, false, seeded(), LEVEL);
    expect(game.task!.sum.text).toMatch(/^\d+ [+\u2212] \d+$/);
    expect(game.task!.deal.length).toBe(STAR_CHOICES);
    expect(game.task!.deal).toContain(game.task!.sum.answer);
    expect(newJumper(W, H).task).toBeNull();
  });

  it('hangs a star with a number in every gap, the answer among every two, bigger so it can be read', () => {
    let game: Jumper = { ...newJumper(W, H, false, seeded(), LEVEL), finishAt: 1e9 };
    const answer = game.task!.sum.answer;
    const values: number[] = [];
    const seen = new Set<number>();
    const random = seeded(4);
    for (let i = 0; i < 4000 && values.length < 4; i++) {
      game = step(game, 1 / 60, random).game;
      game = { ...game, bumps: 0 };
      game.stars.forEach(star => {
        const key = Math.round(star.x + game.elapsed * worldSpeed(W, false));
        if (!seen.has(key)) {
          seen.add(key);
          values.push(star.value!);
          expect(star.radius).toBe(SUM_STAR_RADIUS);
        }
      });
    }
    expect(values.length).toBe(4);
    expect(values.slice(0, 2)).toContain(answer);
    expect(values.slice(2, 4)).toContain(answer);
    // one for every obstacle that has come in, not every second one
    expect(game.made).toBeLessThanOrEqual(values.length + 1);
    expect(SUM_STAR_RADIUS).toBeGreaterThan(STAR_RADIUS);
  });

  it('scores the answer a bounce takes, says so, shows the sum answered and asks the next', () => {
    const { game: after, events } = step(jump(facingStar(12)), AIRTIME, seeded());
    const taken = events.find(event => event.kind === 'star')!;
    expect(taken).toEqual(jasmine.objectContaining({ right: true, points: RIGHT_POINTS }));
    expect(after.points).toBe(RIGHT_POINTS);
    expect(after.solved).toBe(1);
    expect(after.streak).toBe(1);
    expect(after.task!.sum.text).not.toBe('7 + 5');
    expect(after.stars).toEqual([]);
    const justAfter = step(jump(facingStar(12)), AIRTIME / 2 + 0.05, seeded()).game;
    expect(justAfter.reveal!.text).toBe('7 + 5 = 12');
    expect(justAfter.reveal!.right).toBeTrue();
    expect(justAfter.reveal!.left).toBeLessThanOrEqual(REVEAL_RIGHT);
    expect(step(justAfter, REVEAL_RIGHT, seeded()).game.reveal).toBeNull();
  });

  it('scores a row of answers one more each time, and starts again after a wrong number', () => {
    expect(step(jump(facingStar(12, 2)), AIRTIME, seeded()).game.points).toBe(RIGHT_POINTS + 2);
    const wrong = step(jump(facingStar(11, 2)), AIRTIME, seeded()).game;
    expect(wrong.streak).toBe(0);
  });

  it('lets a wrong number fizzle out when a bounce takes it: no point, no heart, the sum stays', () => {
    const { game: after, events } = step(jump(facingStar(11)), AIRTIME, seeded());
    expect(events.some(event => event.kind === 'wrong')).toBeTrue();
    expect(events.some(event => event.kind === 'star')).toBeFalse();
    expect(after.points).toBe(0);
    expect(after.bumps).toBe(0);
    expect(after.stars).toEqual([]);
    expect(after.task!.sum.text).toBe('7 + 5');
  });

  it('costs nothing to roll on under a star, the answer too: it comes again', () => {
    const { game: after, events } = step(facingStar(12), AIRTIME * 2, seeded());
    expect(events.filter(event => event.kind !== 'land')).toEqual([]);
    expect(after.points).toBe(0);
    expect(after.bumps).toBe(0);
    expect(after.task!.sum.text).toBe('7 + 5');
  });

  it('turns a star still on its way into a plain one when its sum is answered: a point for taking it', () => {
    const game = facingStar(12);
    const far = makeStar(game, game.width * 0.9, 11);
    const after = step(jump({ ...game, stars: [...game.stars, far] }), AIRTIME, seeded()).game;
    expect(after.stars.length).toBe(1);
    expect(after.stars[0].value).toBeUndefined();
    const plain = { ...after, stars: [{ ...after.stars[0], x: after.ball.x + worldSpeed(W, false) * AIRTIME / 2 }] };
    const taken = step(jump(plain), AIRTIME, seeded());
    expect(taken.events.find(event => event.kind === 'star')).toEqual(jasmine.objectContaining({ points: 1 }));
    expect(taken.game.points).toBe(after.points + 1);
  });

  it('can be played to the flag bouncing only for the answers and the blocks on the ground', () => {
    let game: Jumper = { ...newJumper(W, H, false, seeded(9), { grade: 4 }), finishAt: 30 };
    const random = seeded(2);
    const speed = worldSpeed(W, false);
    for (let i = 0; i < 60 * 60 && !game.ended; i++) {
      const lead = speed * AIRTIME / 2;
      const block = game.obstacles.find(o => o.place === 'ground' && !o.passed && Math.abs(o.x + o.width / 2 - game.ball.x - lead) < 3);
      const star = game.stars.find(s => (s.value === undefined || s.value === game.task!.sum.answer) && Math.abs(s.x - game.ball.x - lead) < 3);
      if (block || star) {
        game = jump(game);
      }
      game = step(game, 1 / 60, random).game;
    }
    expect(game.ended).toBe('finished');
    expect(game.bumps).toBe(0);
    expect(game.solved).toBeGreaterThan(2);
    expect(game.streak).toBe(game.solved);
  });
});
