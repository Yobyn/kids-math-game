import {
  Balloon, Balloons, FINISH_EARLIEST, FINISH_LATEST, FIRST_GAP, LAST_GAP, MISSES_ALLOWED, MIN_REACH, RAMP,
  CHOICES, REVEAL_MISSED, REVEAL_RIGHT, RIGHT_POINTS, RIGHT_TOP, RISE, SUM_RISE,
  STAR_EVERY, STAR_POINTS, balloonRadius, gapAt, makeBalloon, newBalloons, pop, reaches, rightPoints, riseSpeed, step, swayedX
} from './balloons';

const W = 360;
const H = 400;

/** Always the same "random", so a game can be played twice the same way. */
function seeded(seed = 7): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** A game with just this one balloon up, and nothing else coming for a long while. */
function withBalloon(at: Partial<Balloon>, game: Balloons = newBalloons(W, H)): Balloons {
  const balloon: Balloon = { id: 99, x: W / 2, y: H / 2, radius: balloonRadius(W), hue: 0.5, phase: 0, ...at };
  return { ...game, balloons: [balloon], untilNext: 1e9, made: 1 };
}

describe('Ballonnen, the balloon game (Yobyn, 2026-10-13)', () => {
  it('starts with no balloons, the first a moment away, and its finish at a random time between 20 s and 2 min', () => {
    const early = newBalloons(W, H, false, () => 0);
    const late = newBalloons(W, H, false, () => 0.999999);
    expect(early.balloons).toEqual([]);
    expect(early.untilNext).toBeLessThan(1);
    expect(early.finishAt).toBe(FINISH_EARLIEST);
    expect(late.finishAt).toBeCloseTo(FINISH_LATEST, 2);
  });

  it('brings a balloon up from below the board, at a place along it, and then more', () => {
    const { game } = step(newBalloons(W, H), 1, seeded());
    expect(game.balloons.length).toBe(1);
    const balloon = game.balloons[0];
    expect(balloon.x - balloon.radius).toBeGreaterThanOrEqual(0);
    expect(balloon.x + balloon.radius).toBeLessThanOrEqual(W);
    const later = step(game, 3, seeded()).game;
    expect(later.made).toBeGreaterThan(2);
  });

  it('lets each balloon rise at the same speed, all game long', () => {
    const start = withBalloon({ y: H });
    const late = withBalloon({ y: H }, { ...newBalloons(W, H), elapsed: 100, finishAt: 1000 });
    const early = step(start, 0.5).game.balloons[0].y;
    const after = step(late, 0.5).game.balloons[0].y;
    expect(H - early).toBeCloseTo(riseSpeed(H, false) * 0.5, 5);
    expect(H - after).toBeCloseTo(H - early, 5);
  });

  it('sends balloons more often as the game goes, but never more often than a child can tap', () => {
    expect(gapAt(0, false)).toBe(FIRST_GAP);
    expect(gapAt(RAMP / 2, false)).toBeLessThan(FIRST_GAP);
    expect(gapAt(RAMP, false)).toBe(LAST_GAP);
    expect(gapAt(10 * RAMP, false)).toBe(LAST_GAP);
    // at most about two a second, each up for over three seconds
    expect(LAST_GAP).toBeGreaterThanOrEqual(0.5);
    expect(H / riseSpeed(H, false)).toBeGreaterThan(3);
  });

  it('is calmer under reduced motion: slower, fewer, and no sway', () => {
    expect(riseSpeed(H, true)).toBeLessThan(riseSpeed(H, false));
    expect(gapAt(0, true)).toBeGreaterThan(gapAt(0, false));
    const balloon: Balloon = { id: 0, x: 100, y: 100, radius: 24, hue: 0, phase: 1 };
    expect(swayedX(balloon, 3, true)).toBe(100);
    expect(swayedX(balloon, 3, false)).not.toBe(100);
  });

  it('pops the balloon a tap lands on, for a point', () => {
    const game = withBalloon({ x: 180, y: 200 });
    const x = swayedX(game.balloons[0], game.elapsed, false);
    const { game: after, event } = pop(game, x, 200);
    expect(after.points).toBe(1);
    expect(after.balloons).toEqual([]);
    expect(event).toEqual(jasmine.objectContaining({ kind: 'pop', y: 200 }));
  });

  it('makes every eighth balloon a gold star balloon, so a long game has something to look out for', () => {
    const game = newBalloons(W, H);
    const stars = Array.from({ length: 3 * STAR_EVERY }, (_, made) => makeBalloon({ ...game, made }, seeded(made)))
      .map((balloon, made) => (balloon.star ? made : -1))
      .filter(made => made >= 0);
    expect(STAR_EVERY).toBe(8);
    expect(stars).toEqual([7, 15, 23]);
    // and one comes up as the game goes, not only when asked for: played by
    // a child who pops each balloon half way up, so none gets away
    let played = newBalloons(W, H, false, () => 0.5);
    const seen = new Map<number, boolean>();
    for (let i = 0; i < 2000 && played.made < STAR_EVERY && !played.ended; i++) {
      played = step(played, 0.05, seeded(i)).game;
      played.balloons.forEach(balloon => seen.set(balloon.id, !!balloon.star));
      const high = played.balloons.find(balloon => balloon.y < H / 2);
      if (high) {
        played = pop(played, swayedX(high, played.elapsed, false), high.y).game;
      }
    }
    expect(played.made).toBe(STAR_EVERY);
    expect(seen.get(STAR_EVERY - 1)).toBeTrue();
    expect(seen.get(STAR_EVERY - 2)).toBeFalse();
  });

  it('pops a star balloon for three points, and says it was one', () => {
    const game = withBalloon({ x: 180, y: 200, star: true });
    const x = swayedX(game.balloons[0], game.elapsed, false);
    const { game: after, event } = pop(game, x, 200);
    expect(STAR_POINTS).toBe(3);
    expect(after.points).toBe(STAR_POINTS);
    expect(event).toEqual(jasmine.objectContaining({ kind: 'pop', points: STAR_POINTS, star: true }));
    // an ordinary one is still one point
    const plain = withBalloon({ x: 180, y: 200 });
    expect(pop(plain, x, 200).event).toEqual(jasmine.objectContaining({ points: 1, star: false }));
  });

  it('lets a star balloon rise at the same steady speed, and costs a heart when it gets away like any other', () => {
    const plain = step(withBalloon({ y: H }), 0.5).game.balloons[0].y;
    const star = step(withBalloon({ y: H, star: true }), 0.5).game.balloons[0].y;
    expect(star).toBeCloseTo(plain, 9);
    const gone = step(withBalloon({ y: 10, star: true }), 1).game;
    expect(gone.missed).toBe(1);
  });

  it('counts a tap just outside a balloon, as a finger is not a pin, but not one far off', () => {
    const game = withBalloon({ x: 180, y: 200, phase: 0 });
    const balloon = game.balloons[0];
    const middle = swayedX(balloon, 0, false);
    expect(reaches(balloon, middle + balloon.radius + 5, 200, 0, false)).toBeTrue();
    expect(reaches(balloon, middle, 200 + Math.max(MIN_REACH, balloon.radius * 1.3) + 1, 0, false)).toBeFalse();
    const { game: after, event } = pop(game, middle + 120, 200);
    expect(after).toBe(game);
    expect(event).toBeNull();
  });

  it('pops only the nearest of two balloons a tap reaches', () => {
    const one: Balloon = { id: 1, x: 150, y: 200, radius: 27, hue: 0.2, phase: 0 };
    const two: Balloon = { id: 2, x: 190, y: 200, radius: 27, hue: 0.8, phase: 0 };
    const game: Balloons = { ...newBalloons(W, H), balloons: [one, two], untilNext: 1e9 };
    const { game: after } = pop(game, 185, 200);
    expect(after.balloons.map(b => b.id)).toEqual([1]);
    expect(after.points).toBe(1);
  });

  it('misses a balloon that floats off the top, and says so', () => {
    const game = withBalloon({ y: 10 });
    const { game: after, events } = step(game, 1);
    expect(after.missed).toBe(1);
    expect(after.balloons).toEqual([]);
    expect(events.some(event => event.kind === 'miss')).toBeTrue();
    expect(after.ended).toBeNull();
  });

  it('ends when the third balloon gets away', () => {
    const game = { ...withBalloon({ y: 10 }), missed: MISSES_ALLOWED - 1 };
    const { game: after, events } = step(game, 1);
    expect(after.ended).toBe('missed');
    expect(events[events.length - 1].kind).toBe('end');
    // and nothing more happens after that
    expect(step(after, 5).game).toBe(after);
    expect(pop(after, after.width / 2, after.height / 2).game).toBe(after);
  });

  it('stops sending balloons at its finish, and ends when the last one has gone', () => {
    const game: Balloons = { ...withBalloon({ y: H / 2 }), finishAt: 0.5, untilNext: 0.1, points: 4 };
    const soon = step(game, 0.6, seeded()).game;
    expect(soon.ended).toBeNull();
    const made = soon.made;
    // the balloons still up float away or are popped; no more come
    let current = soon;
    while (current.balloons.length) {
      const balloon = current.balloons[0];
      current = pop(current, swayedX(balloon, current.elapsed, false), balloon.y).game;
    }
    current = step(current, 0.1, seeded()).game;
    expect(current.made).toBe(made);
    expect(current.ended).toBe('finished');
  });

  it('can be played to the finish by tapping each balloon as it comes', () => {
    let game = { ...newBalloons(W, H, false, seeded()), finishAt: 30 };
    const random = seeded(3);
    for (let t = 0; t < 60 && !game.ended; t += 1 / 30) {
      game = step(game, 1 / 30, random).game;
      const ready = game.balloons.find(balloon => balloon.y < H * 0.7);
      if (ready) {
        game = pop(game, swayedX(ready, game.elapsed, false), ready.y).game;
      }
    }
    expect(game.ended).toBe('finished');
    expect(game.missed).toBe(0);
    // a point a balloon, and the star balloons' extra
    const stars = Math.floor(game.made / STAR_EVERY);
    expect(stars).toBeGreaterThan(0);
    expect(game.points).toBe(game.made + stars * (STAR_POINTS - 1));
  });

  it('brings a new balloon up away from the last one when there is room', () => {
    const last: Balloon = { id: 0, x: 100, y: 300, radius: balloonRadius(W), hue: 0, phase: 0 };
    const game: Balloons = { ...newBalloons(W, H), balloons: [last], made: 1 };
    // the first two picks land on top of the last; the third is clear
    const picks = [0.25, 0.26, 0.9, 0.5];
    const coming = makeBalloon(game, () => picks.shift() ?? 0.5);
    expect(Math.abs(coming.x - last.x)).toBeGreaterThanOrEqual(2 * last.radius);
  });
});

describe('Ballonnen with sums: pop the answer (Yobyn, 2026-11-10)', () => {
  const LEVEL = { grade: 1 };

  /** A game on the sum 7 + 5, with these numbers up side by side and nothing else coming for a long while. */
  function asking(values: (number | undefined)[], game: Balloons = newBalloons(W, H, false, seeded(), LEVEL)): Balloons {
    const radius = balloonRadius(W);
    const balloons: Balloon[] = values.map((value, i) => ({
      id: 50 + i, x: 60 + i * 80, y: H / 2, radius, hue: 0.5, phase: 0,
      ...(value === undefined ? { star: true } : { value })
    }));
    return { ...game, task: { sum: { text: '7 + 5', answer: 12 }, deal: [11, 12, 13] }, balloons, untilNext: 1e9, made: 9 };
  }
  const tapOn = (game: Balloons, i: number, random = seeded()) => pop(game, 60 + i * 80, H / 2, random);

  it('starts with a sum of the child\'s own year above the board, and none without a level', () => {
    const game = newBalloons(W, H, false, seeded(), LEVEL);
    expect(game.task!.sum.text).toMatch(/^\d+ [+\u2212] \d+$/);
    expect(game.task!.deal.length).toBe(CHOICES);
    expect(game.task!.deal).toContain(game.task!.sum.answer);
    expect(newBalloons(W, H).task).toBeNull();
  });

  it('sends the sum\'s numbers up on the balloons, its answer among every three, and deals them again', () => {
    let game: Balloons = { ...newBalloons(W, H, false, seeded(), LEVEL), finishAt: 1e9 };
    const answer = game.task!.sum.answer;
    const values: number[] = [];
    const seen = new Set<number>();
    const random = seeded(3);
    for (let i = 0; i < 600 && values.length < 6; i++) {
      game = step(game, 0.1, random).game;
      game.balloons.forEach(balloon => {
        if (!seen.has(balloon.id) && balloon.value !== undefined) {
          seen.add(balloon.id);
          values.push(balloon.value);
        }
      });
      // let none get away: lift nothing off the top
      game = { ...game, balloons: game.balloons.map(balloon => ({ ...balloon, y: Math.max(balloon.y, 100) })) };
    }
    expect(values.length).toBe(6);
    expect(values.slice(0, 3)).toContain(answer);
    expect(values.slice(3, 6)).toContain(answer);
    expect(new Set(values.slice(0, 3)).size).toBe(3);
  });

  it('gives a star balloon no number: it is always right to pop', () => {
    const game = { ...newBalloons(W, H, false, seeded(), LEVEL), made: STAR_EVERY - 1 };
    const star = makeBalloon(game, seeded());
    expect(star.star).toBeTrue();
    expect(star.value).toBeUndefined();
    const { game: after, event } = tapOn(asking([undefined]), 0);
    expect(after.points).toBe(STAR_POINTS);
    expect(event!.kind).toBe('pop');
    expect(after.task!.sum.text).toBe('7 + 5');
  });

  it('pops the answer for points, takes the rest of its bunch with it, and sets the next sum', () => {
    const { game: after, event, popped, cleared } = tapOn(asking([11, 12, 13, undefined]), 1);
    expect(event).toEqual(jasmine.objectContaining({ kind: 'pop', right: true, points: RIGHT_POINTS }));
    expect(after.points).toBe(RIGHT_POINTS);
    expect(popped!.value).toBe(12);
    expect(cleared!.map(balloon => balloon.value)).toEqual([11, 13]);
    // only the star balloon is left up
    expect(after.balloons.map(balloon => balloon.star)).toEqual([true]);
    expect(after.task!.sum.text).not.toBe('7 + 5');
    expect(after.solved).toBe(1);
    expect(after.streak).toBe(1);
  });

  it('shows the sum answered for a moment before the next one\'s balloons come', () => {
    const { game: after } = tapOn(asking([12]), 0);
    expect(after.reveal).toEqual({ text: '7 + 5 = 12', right: true, left: REVEAL_RIGHT });
    expect(after.untilNext).toBe(REVEAL_RIGHT);
    const later = step({ ...after, finishAt: 1e9 }, REVEAL_RIGHT + 0.2, seeded()).game;
    expect(later.reveal).toBeNull();
    expect(later.balloons.length).toBe(1);
    expect(later.balloons[0].value).toBeDefined();
  });

  it('scores a row of right answers one more each time, to a top, and starts again after a wrong one', () => {
    expect([0, 1, 2, 3, 4, 9].map(rightPoints)).toEqual([2, 3, 4, 5, 5, 5]);
    expect(rightPoints(0)).toBe(RIGHT_POINTS);
    expect(rightPoints(50)).toBe(RIGHT_TOP);
    const second = tapOn(asking([12], { ...newBalloons(W, H, false, seeded(), LEVEL), streak: 2, points: 5 }), 0);
    expect(second.event!.points).toBe(4);
    expect(second.game.points).toBe(9);
    const wrong = tapOn(asking([11, 12], { ...newBalloons(W, H, false, seeded(), LEVEL), streak: 2 }), 0);
    expect(wrong.game.streak).toBe(0);
    expect(tapOn(wrong.game, 1).event!.points).toBe(RIGHT_POINTS);
  });

  it('lets a wrong number fizzle out when it is tapped: no point, no heart, the sum stays', () => {
    const { game: after, event, popped } = tapOn(asking([11, 12, 13]), 0);
    expect(event!.kind).toBe('wrong');
    expect(popped!.value).toBe(11);
    expect(after.points).toBe(0);
    expect(after.missed).toBe(0);
    expect(after.balloons.map(balloon => balloon.value)).toEqual([12, 13]);
    expect(after.task!.sum.text).toBe('7 + 5');
  });

  it('lets a wrong number float away for nothing', () => {
    const game = { ...asking([11]), balloons: [{ ...asking([11]).balloons[0], y: 5 }] };
    const { game: after, events } = step(game, 1, seeded());
    expect(after.balloons).toEqual([]);
    expect(after.missed).toBe(0);
    expect(events).toEqual([]);
    expect(after.task!.sum.text).toBe('7 + 5');
  });

  it('takes a heart when the answer floats away, says what it was, clears its bunch and asks the next sum', () => {
    const up = asking([12, 11, undefined]);
    const game = { ...up, streak: 3, balloons: up.balloons.map((balloon, i) => i === 0 ? { ...balloon, y: 5 } : balloon) };
    const { game: after, events } = step(game, 0.5, seeded());
    expect(after.missed).toBe(1);
    expect(events.map(event => event.kind)).toEqual(['miss', 'clear']);
    expect(after.reveal!.text).toBe('7 + 5 = 12');
    expect(after.reveal!.right).toBeFalse();
    expect(after.reveal!.left).toBeGreaterThan(REVEAL_MISSED - 0.6);
    expect(after.task!.sum.text).not.toBe('7 + 5');
    expect(after.streak).toBe(0);
    // the star balloon stays up; the wrong number of the old sum is gone
    expect(after.balloons.map(balloon => balloon.star)).toEqual([true]);
  });

  it('ends on the third answer away', () => {
    const up = asking([12]);
    const game = { ...up, missed: MISSES_ALLOWED - 1, balloons: [{ ...up.balloons[0], y: 5 }] };
    expect(step(game, 0.5, seeded()).game.ended).toBe('missed');
  });

  it('lets a star balloon float away for nothing: with sums it is only a treat', () => {
    const up = asking([undefined]);
    const game = { ...up, missed: MISSES_ALLOWED - 1, balloons: [{ ...up.balloons[0], y: 5 }] };
    const { game: after, events } = step(game, 0.5, seeded());
    expect(after.missed).toBe(MISSES_ALLOWED - 1);
    expect(after.ended).toBeNull();
    expect(events).toEqual([]);
  });

  it('rises more slowly with sums, so a number can be read before it is tapped', () => {
    expect(SUM_RISE).toBeLessThan(RISE);
    expect(riseSpeed(H, false, true)).toBe(H * SUM_RISE);
    expect(riseSpeed(H, false)).toBe(H * RISE);
    expect(gapAt(0, false, true)).toBeGreaterThan(gapAt(0, false));
    expect(gapAt(1e6, false, true)).toBeGreaterThanOrEqual(1);
    const up = asking([11]);
    const after = step(up, 1, seeded()).game;
    expect(up.balloons[0].y - after.balloons[0].y).toBeCloseTo(H * SUM_RISE, 0);
  });

  it('can be played to the finish by popping each answer as it comes, never losing a heart', () => {
    let game: Balloons = { ...newBalloons(W, H, false, seeded(21), { grade: 4 }), finishAt: 25 };
    const random = seeded(5);
    for (let i = 0; i < 4000 && !game.ended; i++) {
      game = step(game, 0.05, random).game;
      const right = game.balloons.find(balloon => balloon.star || balloon.value === game.task!.sum.answer);
      if (right && right.y < H * 0.7) {
        game = pop(game, swayedX(right, game.elapsed, false), right.y, random).game;
      }
    }
    expect(game.ended).toBe('finished');
    expect(game.missed).toBe(0);
    expect(game.solved).toBeGreaterThan(4);
    expect(game.points).toBeGreaterThan(game.solved! * RIGHT_POINTS);
  });
});
