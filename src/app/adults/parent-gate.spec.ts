import {
  GATE_MAX,
  GATE_MIN,
  gateAnswer,
  isGatePassed,
  newChallenge
} from './parent-gate';
import { spellNumber } from './number-words';

/** A random() that walks a fixed list, so a draw can be reasoned about. */
function feed(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('the challenge the gate sets', () => {
  it('is always four digits, in range', () => {
    for (let attempt = 0; attempt < 2000; attempt++) {
      const { value } = newChallenge();
      expect(value).toBeGreaterThanOrEqual(GATE_MIN);
      expect(value).toBeLessThanOrEqual(GATE_MAX);
    }
  });

  it('never contains a zero, so the words are never trivially short', () => {
    // "four thousand" is read at a glance; "four thousand two hundred and six"
    // is the thing a young child cannot do
    for (let attempt = 0; attempt < 2000; attempt++) {
      expect(String(newChallenge().value)).not.toContain('0');
    }
  });

  it('survives a random() that returns its extremes', () => {
    expect(newChallenge(feed([0])).value).toBe(1111);
    expect(newChallenge(feed([0.999999])).value).toBe(9999);
    // A generator handing back exactly 1 must not produce a ten
    expect(String(newChallenge(feed([1])).value)).not.toContain('0');
  });

  it('does not always set the same one', () => {
    const seen = new Set<number>();
    for (let attempt = 0; attempt < 200; attempt++) {
      seen.add(newChallenge().value);
    }
    expect(seen.size).toBeGreaterThan(50);
  });

  it('can always be written out in every language', () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const { value } = newChallenge();
      expect(spellNumber(value, 'en').length).toBeGreaterThan(0);
      expect(spellNumber(value, 'nl').length).toBeGreaterThan(0);
      expect(spellNumber(value, 'es').length).toBeGreaterThan(0);
    }
  });

  it('is not an arithmetic question', () => {
    // Deliberate: in a maths game, a sum on the door is a test a child can
    // fail at the very skill the game exists to build confidence in
    const challenge = newChallenge();
    // Not the hyphen: the one in "forty-two" is a spelling, not an operator
    ['+', '−', '×', '÷', '*', '/', '='].forEach(sign => {
      expect(spellNumber(challenge.value, 'en')).not.toContain(sign);
    });
  });
});

describe('reading what an adult typed', () => {
  it('takes plain digits', () => {
    expect(gateAnswer('4206')).toBe(4206);
  });

  it('forgives the separators people reach for', () => {
    expect(gateAnswer('4 206')).toBe(4206);
    expect(gateAnswer('4.206')).toBe(4206);
    expect(gateAnswer('4,206')).toBe(4206);
    expect(gateAnswer(" 4206 ")).toBe(4206);
  });

  it('refuses anything that is not a number', () => {
    expect(gateAnswer('')).toBeNull();
    expect(gateAnswer('four thousand')).toBeNull();
    expect(gateAnswer('42a6')).toBeNull();
    expect(gateAnswer('-4206')).toBeNull();
    expect(gateAnswer(null as any)).toBeNull();
  });

  it('refuses a number past anything it could have asked for', () => {
    expect(gateAnswer('99999')).toBeNull();
  });
});

describe('passing the gate', () => {
  it('opens on the right number, however it was typed', () => {
    const challenge = { value: 4206 };
    expect(isGatePassed(challenge, '4206')).toBe(true);
    expect(isGatePassed(challenge, '4 206')).toBe(true);
  });

  it('stays shut on anything else', () => {
    const challenge = { value: 4206 };
    expect(isGatePassed(challenge, '4207')).toBe(false);
    expect(isGatePassed(challenge, '')).toBe(false);
    expect(isGatePassed(challenge, 'four thousand two hundred and six')).toBe(false);
  });

  it('cannot be passed by typing the challenge back in words', () => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const challenge = newChallenge();
      expect(isGatePassed(challenge, spellNumber(challenge.value, 'en'))).toBe(false);
    }
  });

  it('opens for its own value, every time', () => {
    for (let attempt = 0; attempt < 500; attempt++) {
      const challenge = newChallenge();
      expect(isGatePassed(challenge, String(challenge.value))).toBe(true);
    }
  });
});
