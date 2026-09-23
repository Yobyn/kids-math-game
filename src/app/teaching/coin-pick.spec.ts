import {
  MAX_PICKED,
  MIN_PIECES,
  addPiece,
  fewestPieces,
  pickMatches,
  pickTotal,
  removeAt,
  trayFor
} from './coin-pick';
import { MONEY_PIECES, bandFor, moneyQuestion } from './money';

/** A generator with no surprises in it, so a sweep means the same twice. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe('coin-pick: putting coins down', () => {
  it('adds a coin to the end, leaving the rest alone', () => {
    expect(addPiece([50, 20], 5)).toEqual([50, 20, 5]);
  });

  it('never grows past the cap, however many times it is tapped', () => {
    let picked: number[] = [];
    for (let i = 0; i < MAX_PICKED * 3; i++) {
      picked = addPiece(picked, 1);
    }

    expect(picked.length).toBe(MAX_PICKED);
  });

  it('leaves the caller their own array', () => {
    const before = [10, 10];
    addPiece(before, 5);

    expect(before).toEqual([10, 10]);
  });

  it('takes back exactly the coin tapped, not the first of its kind', () => {
    // Three 20s and a 5: taking back the middle 20 must leave two 20s
    expect(removeAt([20, 20, 5, 20], 1)).toEqual([20, 5, 20]);
  });

  it('ignores a position that is not there', () => {
    expect(removeAt([20, 5], 7)).toEqual([20, 5]);
    expect(removeAt([20, 5], -1)).toEqual([20, 5]);
  });

  it('can always be undone back to empty', () => {
    let picked = [200, 50, 20, 5, 1];
    // Bounded: a removeAt that does not actually remove would otherwise hang
    // the runner instead of failing it, which is a worse way to find out
    for (let guard = 0; guard < MAX_PICKED + 1 && picked.length; guard++) {
      picked = removeAt(picked, picked.length - 1);
    }

    expect(picked).toEqual([]);
    expect(pickTotal(picked)).toBe(0);
  });

  it('takes one coin off, not none and not two', () => {
    expect(removeAt([20, 10, 5], 2).length).toBe(2);
    expect(removeAt([20, 10, 5], 0).length).toBe(2);
    expect(removeAt([20], 0).length).toBe(0);
  });

  it('adds up what is down', () => {
    expect(pickTotal([])).toBe(0);
    expect(pickTotal([50, 20, 20, 5])).toBe(95);
  });

  it('survives a store with rubbish in it', () => {
    expect(pickTotal([20, NaN as number, 5])).toBe(25);
  });
});

describe('coin-pick: what counts as right', () => {
  it('accepts ANY handful that comes to the amount', () => {
    // The curriculum objective is finding different combinations that make
    // the same value; marking one of them correct would teach the opposite
    const ways = [[50, 20, 5], [20, 20, 20, 10, 5], [50, 10, 10, 5], [20, 50, 5]];

    ways.forEach(way => expect(pickMatches(way, 75)).toBe(true));
  });

  it('does not care what order they were put down in', () => {
    expect(pickMatches([5, 20, 50], 75)).toBe(true);
    expect(pickMatches([50, 5, 20], 75)).toBe(true);
  });

  it('refuses an empty purse, which is not an answer', () => {
    expect(pickMatches([], 0)).toBe(false);
    expect(pickMatches([], 75)).toBe(false);
  });

  it('sweeps every total against every target, and only the equal one passes', () => {
    // The whole rule in one place: a handful is right when it comes to the
    // amount and at no other time, whichever side it is out by
    const pieces = [50, 20, 10, 5, 2, 1];
    for (let target = 1; target <= 60; target++) {
      for (let total = 0; total <= 70; total++) {
        const handful = fewestPieces(total, pieces);
        if (total > 0 && !handful.length) {
          continue;
        }
        expect(pickMatches(handful, target)).toBe(total === target && total > 0);
      }
    }
  });

  it('refuses short and over alike', () => {
    expect(pickMatches([50, 20], 75)).toBe(false);
    expect(pickMatches([50, 20, 10], 75)).toBe(false);
  });
});

describe('coin-pick: the fewest coins', () => {
  it('is the greedy handful for the euro set', () => {
    expect(fewestPieces(75, MONEY_PIECES)).toEqual([50, 20, 5]);
    expect(fewestPieces(288, MONEY_PIECES)).toEqual([200, 50, 20, 10, 5, 2, 1]);
  });

  it('really is the fewest, checked against every combination up to €2', () => {
    // Greedy is exact for this denomination set; this is the assertion that
    // it is, rather than the assumption. Brute force over the pieces below a
    // euro, which is where a greedy failure would show up if it existed.
    const pieces = [1, 2, 5, 10, 20, 50, 100, 200];
    const best = new Array(201).fill(Infinity);
    best[0] = 0;
    for (let amount = 1; amount <= 200; amount++) {
      pieces.forEach(piece => {
        if (piece <= amount && best[amount - piece] + 1 < best[amount]) {
          best[amount] = best[amount - piece] + 1;
        }
      });
    }

    for (let amount = 1; amount <= 200; amount++) {
      expect(fewestPieces(amount, pieces).length).toBe(best[amount]);
    }
  });

  it('gives back nothing when these coins cannot make it', () => {
    expect(fewestPieces(7, [5, 10])).toEqual([]);
    expect(fewestPieces(3, [2])).toEqual([]);
  });

  it('always totals the amount when it gives anything back', () => {
    for (let amount = 1; amount <= 500; amount++) {
      const fewest = fewestPieces(amount, MONEY_PIECES);
      expect(pickTotal(fewest)).toBe(amount);
    }
  });
});

describe('coin-pick: the tray', () => {
  it('offers the band pieces, largest first', () => {
    expect(trayFor([1, 50, 10, 20, 2, 5], 100)).toEqual([50, 20, 10, 5, 2, 1]);
  });

  it('leaves out a coin bigger than the amount, which can never be part of it', () => {
    expect(trayFor(MONEY_PIECES, 30)).toEqual([20, 10, 5, 2, 1]);
  });

  it('keeps the coin that is exactly the amount, which can be', () => {
    // The boundary, and it is the one an off-by-one here would take away
    expect(trayFor(MONEY_PIECES, 20)).toContain(20);
    expect(trayFor(MONEY_PIECES, 200)).toContain(200);
  });

  it('can always make the amount it was built for', () => {
    // A tray that cannot make the target would be a question with no answer
    [7, 23, 60, 99, 135, 288, 500].forEach(target => {
      const tray = trayFor(MONEY_PIECES, target);
      expect(pickTotal(fewestPieces(target, tray))).toBe(target);
    });
  });
});

describe('coin-pick: the questions it is asked through', () => {
  const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  function picks(grade: number, count = 300) {
    const random = seeded(grade * 7717 + 13);
    const out = [];
    for (let i = 0; i < count; i++) {
      const question = moneyQuestion(grade, random);
      if (question && question.shape === 'pick') {
        out.push(question);
      }
    }
    return out;
  }

  it('is never asked of a child in their first year', () => {
    // Year 1 recognises and counts coins; combining them is a Year 2 objective
    expect(bandFor(1).shapes).toEqual(['count']);
    expect(picks(1).length).toBe(0);
  });

  it('is asked from the second year on', () => {
    [2, 3, 4, 6, 10].forEach(grade => expect(picks(grade).length).toBeGreaterThan(0));
  });

  it('always hands over a tray that can make the amount', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => {
        const tray = question.tray!;
        expect(tray.length).toBeGreaterThan(0);
        expect(pickTotal(fewestPieces(question.answerCents, tray))).toBe(question.answerCents);
      });
    });
  });

  it('never offers a coin too big to be part of the answer', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => {
        question.tray!.forEach(piece =>
          expect(piece).toBeLessThanOrEqual(question.answerCents));
      });
    });
  });

  it('never asks for an amount one coin would make on its own', () => {
    // "Combine amounts to make a particular value" needs combining
    GRADES.forEach(grade => {
      picks(grade).forEach(question => {
        expect(fewestPieces(question.answerCents, question.tray!).length)
          .toBeGreaterThanOrEqual(MIN_PIECES);
      });
    });
  });

  it('stays inside what its band is allowed to ask about', () => {
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      picks(grade).forEach(question => {
        expect(question.answerCents).toBeLessThanOrEqual(band.maxCents);
        question.tray!.forEach(piece => expect(band.pieces).toContain(piece));
      });
    });
  });

  it('can be answered within the cap on coins', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => {
        expect(fewestPieces(question.answerCents, question.tray!).length)
          .toBeLessThanOrEqual(MAX_PICKED);
      });
    });
  });

  it('shows its method as the fewest coins, and the arithmetic adds up', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => {
        if (!question.worked) {
          return;
        }
        const [left, right] = question.worked.split(' = ');
        const pieces = left.split(' + ');
        expect(pieces.length).toBeGreaterThanOrEqual(MIN_PIECES);
        expect(right).toBe(question.answerText);
      });
    });
  });

  it('puts nothing on the table to count — the tray is the whole question', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => expect(question.pile).toEqual([]));
    });
  });

  it('asks for no typed number at all', () => {
    GRADES.forEach(grade => {
      picks(grade).forEach(question => expect(question.unit).toBe('pieces'));
    });
  });
});
