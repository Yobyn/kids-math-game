import {
  BALL_RADIUS, DOUBLING_SECONDS, DURATION, MAX_BOUNCE, Pong, movePaddle, newPong, speedAt, speedOf, startSpeed, step, topSpeed
} from './pong';

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

  it('ends when the ball gets past the paddle, with the points it had', () => {
    const game = { ...withBall(20, H - 30, 0, 400), hits: 3 };
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

  it('gives a paddle a thumb can hit on the smallest phone', () => {
    const narrow = newPong(320, 480);
    expect(narrow.paddle.width).toBeGreaterThanOrEqual(72);
    expect(narrow.paddle.width).toBeLessThan(320 / 2);
  });
});
