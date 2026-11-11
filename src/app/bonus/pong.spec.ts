import {
  BALL_RADIUS, DOUBLING_SECONDS, DURATION, MAX_BOUNCE, MISSES_ALLOWED, PADDLE_TOP_SPEED, Pong, aimPaddle, followPaddle, movePaddle, newPong,
  TILES, TILE_HEIGHT, bounceOffPaddle, ceilingOf, dealTiles, pointsOf,
  restOnPaddle, serve, speedAt, speedOf, startSpeed, step, topSpeed
} from './pong';
import { REVEAL_RIGHT, RIGHT_POINTS } from './game-sums';

const W = 360;
const H = 520;

/** A game with the ball put where a test wants it. */
function withBall(x: number, y: number, vx: number, vy: number, calm = false): Pong {
  const game = newPong(W, H, calm, () => 0.5);
  return { ...game, ball: { ...game.ball, x, y, vx, vy } };
}

describe('the bonus game\'s ball and paddle (bonus/pong.ts)', () => {
  it('starts with the paddle in the middle at the bottom and the ball going up, a little to one side', () => {
    const game = newPong(W, H, false, () => 0.9);
    expect(game.paddle.x).toBe(W / 2);
    expect(game.paddle.y + game.paddle.height).toBeLessThan(H);
    expect(game.ball.vy).toBeLessThan(0);
    expect(game.ball.vx).not.toBe(0);
    expect(speedOf(game.ball)).toBeCloseTo(startSpeed(H, false), 6);
    expect(game.hits).toBe(0);
    expect(game.ended).toBeNull();
  });

  it('bounces off the side walls and the top like a mirror', () => {
    const left = step(withBall(BALL_RADIUS + 1, 200, -200, -50), 0.05).game.ball;
    expect(left.vx).toBeGreaterThan(0);
    expect(left.vx / left.vy).toBeCloseTo(-4, 6);
    const right = step(withBall(W - BALL_RADIUS - 1, 200, 200, 50), 0.05).game.ball;
    expect(right.vx).toBeLessThan(0);
    expect(right.vx / right.vy).toBeCloseTo(-4, 6);
    const top = step(withBall(100, BALL_RADIUS + 1, 30, -200), 0.05).game.ball;
    expect(top.vy).toBeGreaterThan(0);
    expect(top.vx / top.vy).toBeCloseTo(0.15, 6);
    [left, right, top].forEach(ball => {
      expect(ball.x).toBeGreaterThanOrEqual(ball.radius);
      expect(ball.x).toBeLessThanOrEqual(W - ball.radius);
      expect(ball.y).toBeGreaterThanOrEqual(ball.radius);
    });
  });

  it('sends the ball straight up off the middle of the paddle, and scores a point', () => {
    const game = withBall(W / 2, 0, 0, 300);
    const above = { ...game, ball: { ...game.ball, y: game.paddle.y - BALL_RADIUS - 2 } };
    const { game: after, events } = step(above, 0.05);

    expect(after.hits).toBe(1);
    expect(after.ball.vy).toBeLessThan(0);
    expect(Math.abs(after.ball.vx)).toBeLessThan(1e-9);
    expect(events.filter(event => event.kind === 'hit').length).toBe(1);
    expect(events[0].y).toBe(after.paddle.y);
  });

  it('tilts the ball towards the side of the paddle it struck, up to its steepest at the edge', () => {
    const game = withBall(0, 0, 0, 300);
    const at = (offset: number) => {
      const x = game.paddle.x + offset * game.paddle.width / 2;
      const ball = step({ ...game, ball: { ...game.ball, x, y: game.paddle.y - BALL_RADIUS - 2 } }, 0.02).game.ball;
      return Math.atan2(ball.vx, -ball.vy);
    };
    expect(at(1)).toBeCloseTo(MAX_BOUNCE, 2);
    expect(at(-1)).toBeCloseTo(-MAX_BOUNCE, 2);
    expect(at(0.5)).toBeCloseTo(MAX_BOUNCE / 2, 2);
    expect(at(0.5)).toBeGreaterThan(0);
  });

  it('gets faster the longer the ball is kept up, doubling, until it is lightning (Yobyn, 2026-10-10)', () => {
    const start = startSpeed(H, false);
    expect(speedAt(H, false, 0)).toBeCloseTo(start, 6);
    expect(speedAt(H, false, DOUBLING_SECONDS)).toBeCloseTo(start * 2, 6);
    expect(speedAt(H, false, DOUBLING_SECONDS * 2)).toBeCloseTo(start * 4, 6);
    for (let t = 1; t <= DURATION; t++) {
      expect(speedAt(H, false, t)).toBeGreaterThanOrEqual(speedAt(H, false, t - 1));
    }
    expect(speedAt(H, false, DURATION)).toBe(topSpeed(H, false));
    // and the ball in play goes at it, whatever its direction
    const later = step({ ...withBall(W / 2, H / 3, 120, -160), elapsed: 100 }, 0.01).game;
    expect(speedOf(later.ball)).toBeCloseTo(speedAt(H, false, later.elapsed), 6);
  });

  it('is past what anyone can follow long before the hidden five minutes, so the speed ends it, not the time', () => {
    expect(DURATION).toBe(300);
    const lightning = (calm: boolean) => {
      let t = 0;
      while (speedAt(H, calm, t) < topSpeed(H, calm)) {
        t++;
      }
      return t;
    };
    expect(lightning(false)).toBeLessThan(DURATION * 0.75);
    expect(lightning(true)).toBeLessThan(DURATION);
    // Lightning: the whole board, top to bottom, ten times a second
    expect(topSpeed(H, false) / H).toBeGreaterThanOrEqual(10);
  });

  it('is calmer under reduced motion: a slower ball that tops out lower', () => {
    expect(startSpeed(H, true)).toBeLessThan(startSpeed(H, false));
    expect(topSpeed(H, true)).toBeLessThan(topSpeed(H, false));
    expect(speedOf(newPong(W, H, true).ball)).toBeCloseTo(startSpeed(H, true), 6);
  });

  it('costs one of three hearts when the ball gets past the paddle, and the ball waits on the paddle to be served again', () => {
    expect(MISSES_ALLOWED).toBe(3);
    expect(newPong(W, H).misses).toBe(0);
    const game = { ...withBall(20, H - 30, 0, 400), hits: 3, elapsed: 40 };
    const far = movePaddle(game, W);
    const { game: after, events } = step(far, 0.5);

    expect(after.ended).toBeNull();
    expect(after.misses).toBe(1);
    expect(after.hits).toBe(3);
    expect(events.map(event => event.kind)).toEqual(['miss']);
    // on the paddle, still, for the screen's 3-2-1
    expect(after.ball).toEqual(restOnPaddle(after).ball);
    expect(after.ball.vx).toBe(0);
    expect(after.ball.vy).toBe(0);
    // and served again at the speed it had reached, not the start's
    expect(speedOf(serve(after).ball)).toBeCloseTo(speedAt(H, false, after.elapsed), 6);
    expect(speedAt(H, false, 40)).toBeGreaterThan(startSpeed(H, false));
  });

  it('ends at the third ball missed, with the points it had', () => {
    const game = { ...withBall(20, H - 30, 0, 400), hits: 3, misses: MISSES_ALLOWED - 1 };
    const far = movePaddle(game, W);
    const { game: after, events } = step(far, 0.5);

    expect(after.ended).toBe('missed');
    expect(after.hits).toBe(3);
    expect(events.map(event => event.kind)).toEqual(['end']);
    // and nothing moves once it has ended
    expect(step(after, 1).game).toEqual(after);
  });

  it('still ends at the hidden five minutes, for a ball nobody ever missed', () => {
    const game = { ...withBall(W / 2, H / 3, 100, -100), elapsed: DURATION - 0.01, hits: 80 };
    const { game: after, events } = step(game, 0.05);
    expect(after.ended).toBe('time');
    expect(after.elapsed).toBe(DURATION);
    expect(after.hits).toBe(80);
    expect(events.map(event => event.kind)).toEqual(['end']);
  });

  it('keeps the first half minute gentle, as it was', () => {
    let game = newPong(W, H, false, () => 0.5);
    for (let t = 0; t < 30; t += 0.05) {
      // the paddle always under the ball: it is never missed
      game = step(movePaddle(game, game.ball.x), 0.05).game;
    }
    expect(game.ended).toBeNull();
    expect(game.hits).toBeGreaterThan(3);
    expect(speedOf(game.ball)).toBeLessThan(startSpeed(H, false) * 1.65);
  });

  it('keeps all of the paddle on the screen however far the finger goes', () => {
    const game = newPong(W, H);
    expect(movePaddle(game, -500).paddle.x).toBe(game.paddle.width / 2);
    expect(movePaddle(game, 5000).paddle.x).toBe(W - game.paddle.width / 2);
    expect(movePaddle(game, 100).paddle.x).toBe(Math.max(100, game.paddle.width / 2));
  });

  it('never lets a lightning ball slip through the paddle in one long frame', () => {
    const game = { ...withBall(W / 2, H - 120, 0, 1), elapsed: 250 };
    expect(speedAt(H, false, 250)).toBe(topSpeed(H, false));
    // a whole third of a second at once: a phone that stuttered
    const { game: after } = step(game, 1 / 3);
    // a third of a second at this speed is several trips up and down: every one caught
    expect(after.hits).toBeGreaterThanOrEqual(1);
    expect(after.ended).toBeNull();
  });

  it('glides the paddle to where the finger is, smoothly, never jumping (2026-10-14)', () => {
    const game = aimPaddle(newPong(W, H), W);
    const target = W - game.paddle.width / 2;
    expect(game.paddleTarget).toBe(target);
    expect(game.paddle.x).toBe(W / 2);
    let current = game;
    let frames = 0;
    while (current.paddle.x !== target && frames < 120) {
      const next = followPaddle(current, 1 / 60);
      // no frame moves it more than a thumb could
      expect(next.paddle.x - current.paddle.x).toBeLessThanOrEqual(PADDLE_TOP_SPEED * W / 60 + 1e-9);
      expect(next.paddle.x).toBeGreaterThanOrEqual(current.paddle.x);
      current = next;
      frames++;
    }
    // there in a moment: well under a third of a second across half the board
    expect(frames).toBeLessThan(20);
    expect(current.paddleTarget).toBeNull();
  });

  it('glides the paddle as the game runs, and lets the arrow keys put it straight there', () => {
    const aimed = aimPaddle(withBall(W / 2, 100, 0, -50), 40);
    const later = step(aimed, 0.3).game;
    expect(later.paddle.x).toBe(aimed.paddle.width / 2);
    const keyed = movePaddle(aimed, 200);
    expect(keyed.paddle.x).toBe(200);
    expect(keyed.paddleTarget).toBeNull();
    expect(step(keyed, 0.2).game.paddle.x).toBe(200);
  });

  it('rests the ball on the middle of the paddle before the serve, and serves it up from there', () => {
    const rested = restOnPaddle(movePaddle(newPong(W, H), 120));
    expect(rested.ball.x).toBe(120);
    expect(rested.ball.y + rested.ball.radius).toBeLessThanOrEqual(rested.paddle.y);
    expect(rested.ball.vx).toBe(0);
    expect(rested.ball.vy).toBe(0);
    [() => 0, () => 0.99].forEach(random => {
      const served = serve(rested, random);
      expect(served.ball.x).toBe(120);
      expect(served.ball.vy).toBeLessThan(0);
      const fromUp = Math.abs(Math.atan2(served.ball.vx, -served.ball.vy));
      expect(fromUp).toBeGreaterThanOrEqual(Math.PI / 9 - 1e-9);
      expect(fromUp).toBeLessThanOrEqual(2 * Math.PI / 9 + 1e-9);
      expect(speedOf(served.ball)).toBeCloseTo(startSpeed(H, false), 6);
    });
  });

  it('says where the ball struck a wall or the top, for a glow there', () => {
    const left = step(withBall(BALL_RADIUS + 1, H / 3, -300, -60), 0.02);
    expect(left.events).toEqual([jasmine.objectContaining({ kind: 'wall', x: 0 })]);
    const right = step(withBall(W - BALL_RADIUS - 1, H / 3, 300, -60), 0.02);
    expect(right.events).toEqual([jasmine.objectContaining({ kind: 'wall', x: W })]);
    const top = step(withBall(W / 2, BALL_RADIUS + 1, 0, -300), 0.02);
    expect(top.events).toEqual([jasmine.objectContaining({ kind: 'wall', y: 0 })]);
    expect(step(withBall(W / 2, H / 3, 0, -60), 0.02).events).toEqual([]);
  });

  it('gives a paddle a thumb can hit on the smallest phone', () => {
    const narrow = newPong(320, 480);
    expect(narrow.paddle.width).toBeGreaterThanOrEqual(72);
    expect(narrow.paddle.width).toBeLessThan(320 / 2);
  });
});

describe('Balspel with sums: aim for the answer (Yobyn, 2026-11-10)', () => {
  const LEVEL = { grade: 1 };
  const seeded = (seed = 7) => {
    let state = seed;
    return () => (state = (state * 16807) % 2147483647) / 2147483647;
  };

  /** A game on 7 + 5 with the tiles 11, 12 and 13 along the top, and the ball going straight up under the i-th. */
  function under(i: number, streak = 0): Pong {
    const game = newPong(W, H, false, seeded(), LEVEL);
    const each = W / TILES;
    return {
      ...game,
      task: { sum: { text: '7 + 5', answer: 12 } },
      tiles: [11, 12, 13].map((value, at) => ({ value, x: at * each, width: each })),
      streak,
      ball: { ...game.ball, x: each * (i + 0.5), y: TILE_HEIGHT + BALL_RADIUS + 5, vx: 0, vy: -200 }
    };
  }

  it('starts with a sum of the child\'s own year and three tiles along the top, its answer on one of them', () => {
    const game = newPong(W, H, false, seeded(), LEVEL);
    expect(game.task!.sum.text).toMatch(/^\d+ [+\u2212] \d+$/);
    expect(game.tiles!.length).toBe(TILES);
    expect(game.tiles!.filter(tile => tile.value === game.task!.sum.answer).length).toBe(1);
    // side by side, sharing the whole width
    expect(game.tiles!.map(tile => Math.round(tile.x))).toEqual([0, 120, 240]);
    expect(game.tiles!.every(tile => tile.width === W / TILES)).toBeTrue();
    // and none without a level: the top is the board's edge
    const plain = newPong(W, H);
    expect(plain.tiles).toEqual([]);
    expect(ceilingOf(plain)).toBe(0);
    expect(ceilingOf(game)).toBe(TILE_HEIGHT);
  });

  it('bounces the ball off the tiles\' lower edge like a mirror, as it did off the top', () => {
    const { game: after } = step({ ...under(0), ball: { ...under(0).ball, vx: 30 } }, 0.1, seeded());
    expect(after.ball.vy).toBeGreaterThan(0);
    expect(after.ball.vx).toBeGreaterThan(0);
    expect(after.ball.y).toBeGreaterThanOrEqual(TILE_HEIGHT + BALL_RADIUS);
  });

  it('scores the answer\'s tile on top of the bounces, says so, and rests the tiles while the sum stands answered', () => {
    const { game: after, events } = step(under(1), 0.1, seeded());
    expect(events.find(event => event.kind === 'right')).toEqual(jasmine.objectContaining({ points: RIGHT_POINTS, x: W / 2 }));
    expect(after.bonus).toBe(RIGHT_POINTS);
    expect(after.hits).toBe(0);
    expect(pointsOf(after)).toBe(RIGHT_POINTS);
    expect(pointsOf({ ...after, hits: 4 })).toBe(4 + RIGHT_POINTS);
    expect(after.solved).toBe(1);
    expect(after.streak).toBe(1);
    expect(after.reveal!.text).toBe('7 + 5 = 12');
    expect(after.tiles).toEqual([]);
    expect(after.task!.sum.text).not.toBe('7 + 5');
  });

  it('brings three new tiles for the next sum once the answered one has stood long enough', () => {
    const struck = step(under(1), 0.1, seeded()).game;
    const resting = step({ ...struck, ball: { ...struck.ball, y: 300, vx: 0, vy: 1 } }, REVEAL_RIGHT / 2, seeded()).game;
    expect(resting.tiles).toEqual([]);
    const next = step(resting, REVEAL_RIGHT, seeded()).game;
    expect(next.reveal).toBeNull();
    expect(next.tiles!.length).toBe(TILES);
    expect(next.tiles!.filter(tile => tile.value === next.task!.sum.answer).length).toBe(1);
  });

  it('is a plain wall while the tiles rest: nothing scored, nothing dimmed', () => {
    const struck = step(under(1), 0.1, seeded()).game;
    const again = { ...struck, ball: { ...struck.ball, y: TILE_HEIGHT + BALL_RADIUS + 5, vx: 0, vy: -200 } };
    const { game: after, events } = step(again, 0.1, seeded());
    expect(events.map(event => event.kind)).toEqual(['wall']);
    expect(after.bonus).toBe(RIGHT_POINTS);
    expect(after.ball.vy).toBeGreaterThan(0);
  });

  it('dims a wrong number\'s tile when it is struck: no point lost, no heart, the sum stays, the row starts again', () => {
    const { game: after, events } = step({ ...under(0, 2), hits: 3 }, 0.1, seeded());
    expect(events.map(event => event.kind)).toEqual(['wrong']);
    expect(after.tiles!.map(tile => !!tile.tried)).toEqual([true, false, false]);
    expect(pointsOf(after)).toBe(3);
    expect(after.misses).toBe(0);
    expect(after.streak).toBe(0);
    expect(after.task!.sum.text).toBe('7 + 5');
    // struck again it is a plain wall
    const again = { ...after, ball: { ...after.ball, y: TILE_HEIGHT + BALL_RADIUS + 5, vx: 0, vy: -200 } };
    expect(step(again, 0.1, seeded()).events.map(event => event.kind)).toEqual(['wall']);
  });

  it('scores a row of answers one more each time', () => {
    expect(step(under(1, 2), 0.1, seeded()).game.bonus).toBe(RIGHT_POINTS + 2);
  });

  it('deals the answer onto every tile in turn, never always the same one', () => {
    const random = seeded(3);
    const places = new Set<number>();
    for (let i = 0; i < 60; i++) {
      places.add(dealTiles(W, { text: '6 × 7', answer: 42 }, random).findIndex(tile => tile.value === 42));
    }
    expect(places.size).toBe(TILES);
  });

  it('can be steered: off the paddle\'s left the ball reaches the left tile, off its right the right one', () => {
    const game = under(1);
    const fromPaddle = (offset: number) => {
      const ball = bounceOffPaddle({ ...game.ball, x: game.paddle.x + offset * game.paddle.width / 2 }, game.paddle, startSpeed(H, false));
      let current: Pong = { ...game, ball, tiles: game.tiles!.map(tile => ({ ...tile, value: 99 })) };
      for (let i = 0; i < 600; i++) {
        const { game: next, events } = step(current, 1 / 60, seeded());
        current = next;
        const struck = events.find(event => event.kind === 'wrong');
        if (struck) {
          return Math.floor(struck.x / (W / TILES));
        }
      }
      return -1;
    };
    expect(fromPaddle(-0.5)).toBe(0);
    expect(fromPaddle(0)).toBe(1);
    expect(fromPaddle(0.5)).toBe(2);
  });
});
