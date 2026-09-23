import {
  MONEY_PIECES,
  MoneyQuestion,
  MoneyShape,
  bandFor,
  formatCents,
  moneyAnswerMatches,
  moneyQuestion,
  pieceKind,
  typedValue,
  unitFor,
  unitPrefix,
  unitSuffix
} from './money';

/** Every grade the game offers. */
const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * A seeded generator, so the sweep below covers the whole unit range rather
 * than a handful of fixed draws, and still fails the same way twice.
 */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** Many questions from one grade, built across a spread of draws. */
function sample(grade: number, count = 250): MoneyQuestion[] {
  const random = seeded(grade * 7919 + 11);
  const built: MoneyQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const question = moneyQuestion(grade, random);
    if (question) {
      built.push(question);
    }
  }
  return built;
}

/** Reads a printed amount back as cents, whichever way the band wrote it. */
function centsOf(text: string): number {
  const decimal = text.match(/^-?€(\d+)\.(\d{2})$/);
  if (decimal) {
    return Number(decimal[1]) * 100 + Number(decimal[2]);
  }
  const both = text.match(/^-?€(\d+) \w+ (\d+)c$/);
  if (both) {
    return Number(both[1]) * 100 + Number(both[2]);
  }
  const euros = text.match(/^-?€(\d+)$/);
  if (euros) {
    return Number(euros[1]) * 100;
  }
  const cents = text.match(/^-?(\d+)c$/);
  return cents ? Number(cents[1]) : NaN;
}

describe('money: how an amount is written', () => {
  it('writes an amount under a euro in cents alone', () => {
    expect(formatCents(5)).toBe('5c');
    expect(formatCents(75)).toBe('75c');
    expect(formatCents(99)).toBe('99c');
  });

  it('writes a whole number of euros without any cents', () => {
    expect(formatCents(100)).toBe('€1');
    expect(formatCents(500)).toBe('€5');
  });

  it('keeps the euros and the cents apart before decimals are taught', () => {
    // The curriculum is explicit: £2 and 30 pence, not £2.30, until Year 4
    expect(formatCents(230, false)).toBe('€2 and 30c');
    expect(formatCents(305, false)).toBe('€3 and 5c');
  });

  it('writes the same amount with a point once they are', () => {
    expect(formatCents(230, true)).toBe('€2.30');
    expect(formatCents(305, true)).toBe('€3.05');
  });

  it('pads the cents, so €3.05 is never written €3.5', () => {
    expect(formatCents(305, true)).toBe('€3.05');
    expect(formatCents(301, true)).toBe('€3.01');
  });

  it('says "and" in the language the child is playing in', () => {
    expect(formatCents(230, false, { and: 'en' })).toBe('€2 en 30c');
    expect(formatCents(230, false, { and: 'y' })).toBe('€2 y 30c');
  });

  it('reads every amount it writes back to the same number', () => {
    for (let cents = 1; cents <= 2000; cents++) {
      expect(centsOf(formatCents(cents, false))).toBe(cents);
      expect(centsOf(formatCents(cents, true))).toBe(cents);
    }
  });
});

describe('money: which number a child types', () => {
  const plain = bandFor(1);
  const decimal = bandFor(5);

  it('takes anything under a euro in cents', () => {
    expect(unitFor(75, plain)).toBe('cents');
    expect(typedValue(75, 'cents')).toBe(75);
  });

  it('takes a whole number of euros in euros', () => {
    expect(unitFor(300, plain)).toBe('euros');
    expect(typedValue(300, 'euros')).toBe(3);
  });

  it('refuses a mixed amount where the child cannot write one', () => {
    // €3 and 40c has no single number behind it, and there is no decimal
    // point on that band's keypad either
    expect(unitFor(340, plain)).toBeNull();
  });

  it('takes the same amount once the decimal point exists', () => {
    expect(unitFor(340, decimal)).toBe('decimal');
    expect(typedValue(340, 'decimal')).toBe(3.4);
  });

  it('puts the euro sign in front and the c after, never both', () => {
    expect(unitPrefix('euros') + unitSuffix('euros')).toBe('€');
    expect(unitPrefix('decimal') + unitSuffix('decimal')).toBe('€');
    expect(unitPrefix('cents') + unitSuffix('cents')).toBe('c');
    expect(unitPrefix('count') + unitSuffix('count')).toBe('');
  });
});

describe('money: marking the answer', () => {
  const question = (over: Partial<MoneyQuestion>): MoneyQuestion => ({
    shape: 'count', prompt: 'money-count', values: {}, pile: [],
    answer: 75, unit: 'cents', answerCents: 75, worked: '',
    answerText: '75c', summary: '75c', ...over
  });

  it('marks the exact number right', () => {
    expect(moneyAnswerMatches('75', question({}))).toBe(true);
  });

  it('marks anything else wrong', () => {
    expect(moneyAnswerMatches('74', question({}))).toBe(false);
    expect(moneyAnswerMatches('750', question({}))).toBe(false);
  });

  it('marks an empty box wrong rather than throwing', () => {
    expect(moneyAnswerMatches('', question({}))).toBe(false);
    expect(moneyAnswerMatches(null as any, question({}))).toBe(false);
    expect(moneyAnswerMatches('abc', question({}))).toBe(false);
  });

  it('accepts 3.4 for 3.40, because a child typing it is not wrong', () => {
    const decimal = question({ unit: 'decimal', answer: 3.4, answerCents: 340 });

    expect(moneyAnswerMatches('3.4', decimal)).toBe(true);
    expect(moneyAnswerMatches('3.40', decimal)).toBe(true);
    expect(moneyAnswerMatches('3.41', decimal)).toBe(false);
    expect(moneyAnswerMatches('340', decimal)).toBe(false);
  });

  it('never lets a float decide whether a child was right', () => {
    // 0.1 + 0.2 arithmetic must not creep into marking
    for (let cents = 1; cents < 1000; cents++) {
      const decimal = question({
        unit: 'decimal', answer: Math.round(cents) / 100, answerCents: cents
      });
      expect(moneyAnswerMatches(String(cents / 100), decimal)).toBe(true);
    }
  });
});

describe('money: the bands follow the taught progression', () => {
  it('gives a grade 1 child one denomination to count, and nothing else', () => {
    const band = bandFor(1);

    expect(band.shapes).toEqual(['count']);
    expect(band.kinds).toBe(1);
    expect(band.decimal).toBe(false);
  });

  it('adds a second denomination and making an amount at grade 2', () => {
    const band = bandFor(2);

    expect(band.kinds).toBe(2);
    expect(band.shapes).toContain('make');
    expect(band.decimal).toBe(false);
  });

  it('brings in totals and change at grade 3, still without a point', () => {
    const band = bandFor(3);

    expect(band.shapes).toContain('total');
    expect(band.shapes).toContain('change');
    expect(band.decimal).toBe(false);
  });

  it('introduces the decimal form at grade 4, where the curriculum does', () => {
    expect(bandFor(3).decimal).toBe(false);
    expect(bandFor(4).decimal).toBe(true);
  });

  it('never goes backwards as a child moves up', () => {
    let shapes = 0;
    let decimal = false;
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      expect(band.shapes.length).toBeGreaterThanOrEqual(shapes);
      expect(band.decimal || !decimal).toBe(true);
      shapes = band.shapes.length;
      decimal = band.decimal;
    });
  });

  it('only ever puts real euro pieces on the table', () => {
    GRADES.forEach(grade => {
      bandFor(grade).pieces.forEach(piece => {
        expect(MONEY_PIECES).toContain(piece);
      });
    });
  });

  it('draws each piece the way that piece really looks', () => {
    expect(pieceKind(1)).toBe('copper');
    expect(pieceKind(5)).toBe('copper');
    expect(pieceKind(10)).toBe('gold');
    expect(pieceKind(50)).toBe('gold');
    expect(pieceKind(100)).toBe('silverCentre');
    expect(pieceKind(200)).toBe('goldCentre');
    expect(pieceKind(500)).toBe('note');
  });
});

describe('money: every question a child can be asked', () => {
  it('builds something for every grade', () => {
    GRADES.forEach(grade => {
      expect(sample(grade, 20).length).toBeGreaterThan(0);
    });
  });

  it('only asks shapes its own band allows', () => {
    GRADES.forEach(grade => {
      const allowed = bandFor(grade).shapes;
      sample(grade).forEach(question => {
        expect(allowed).toContain(question.shape as MoneyShape);
      });
    });
  });

  it('never asks for an amount its band cannot write', () => {
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      sample(grade).forEach(question => {
        // The separation rule is about what a child TYPES. Nothing is typed
        // on a picking question, so "€1 and 25c" is available to it below
        // the decimal band — which is exactly the mixed-unit recording Year
        // 3 does, and the one thing the answer box could never ask for.
        if (question.unit === 'pieces') {
          expect(question.answerText).toBeTruthy();
          return;
        }
        expect(unitFor(question.answerCents, band)).not.toBeNull();
      });
    });
  });

  it('asks a picking question for amounts the box could not have asked for', () => {
    // Without this the new shape would only be a new way to enter answers
    // the old one already accepted, which would not have been worth a screen
    const mixed: MoneyQuestion[] = [];
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      if (band.decimal || band.maxCents <= 100) {
        return;
      }
      sample(grade, 400).forEach(question => {
        if (question.unit === 'pieces' && unitFor(question.answerCents, band) === null) {
          mixed.push(question);
        }
      });
    });

    expect(mixed.length).toBeGreaterThan(0);
    mixed.forEach(question => expect(question.answerText).toContain('and'));
  });

  it('never asks a child for a number they cannot type', () => {
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      sample(grade).forEach(question => {
        expect(Number.isFinite(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThan(0);
        if (!band.decimal) {
          // No point on this keypad, so no answer may need one
          expect(Number.isInteger(question.answer)).toBe(true);
        }
      });
    });
  });

  it('writes no decimal point anywhere before grade 4', () => {
    [1, 2, 3].forEach(grade => {
      sample(grade).forEach(question => {
        const shown = [question.answerText, question.summary, question.worked]
          .concat(Object.keys(question.values).map(name => question.values[name]))
          .join(' ');
        expect(shown).not.toMatch(/\d\.\d/);
      });
    });
  });

  it('does reach the decimal form from grade 4', () => {
    const decimals = [4, 5, 6, 8, 10].map(
      grade => sample(grade, 300).filter(question => question.unit === 'decimal').length
    );

    decimals.forEach(count => expect(count).toBeGreaterThan(0));
  });

  it('only shows pieces its band has', () => {
    GRADES.forEach(grade => {
      const allowed = bandFor(grade).pieces;
      sample(grade).forEach(question => {
        question.pile.forEach(piece => expect(allowed).toContain(piece));
      });
    });
  });

  it('keeps a pile to the number of denominations the band allows', () => {
    GRADES.forEach(grade => {
      const kinds = bandFor(grade).kinds;
      sample(grade).forEach(question => {
        expect(new Set(question.pile).size).toBeLessThanOrEqual(kinds);
      });
    });
  });

  it('never puts a pile on the screen that is not the answer', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape === 'count') {
          const total = question.pile.reduce((sum, piece) => sum + piece, 0);
          expect(total).toBe(question.answerCents);
        }
      });
    });
  });

  it('shows more than one piece to count, or it is not counting', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape === 'count') {
          expect(question.pile.length).toBeGreaterThan(1);
        }
      });
    });
  });

  it('stays inside the amount its band asks about', () => {
    GRADES.forEach(grade => {
      const band = bandFor(grade);
      sample(grade).forEach(question => {
        if (question.shape === 'count' || question.shape === 'total') {
          expect(question.answerCents).toBeLessThanOrEqual(band.maxCents);
        }
      });
    });
  });

  it('fills every placeholder the wording will need', () => {
    const needed: { [prompt: string]: string[] } = {
      'money-count': [],
      'money-make': ['coin', 'target'],
      'money-pick': ['target'],
      'money-total': ['first', 'second'],
      'money-change': ['price', 'paid']
    };

    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        needed[question.prompt].forEach(name => {
          expect(question.values[name]).toBeTruthy();
        });
      });
    });
  });

  it('writes the answer out the way its band would', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.unit === 'count') {
          expect(question.answerText).toBe(String(question.answer));
        } else {
          expect(centsOf(question.answerText)).toBe(question.answerCents);
        }
      });
    });
  });

  it('never asks for change bigger than what was handed over', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape === 'change') {
          expect(centsOf(question.values['paid'])).toBeGreaterThan(centsOf(question.values['price']));
          expect(question.answerCents)
            .toBe(centsOf(question.values['paid']) - centsOf(question.values['price']));
        }
      });
    });
  });

  it('asks for a whole number of coins when it asks how many', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape === 'make') {
          expect(Number.isInteger(question.answer)).toBe(true);
          expect(question.answer).toBeGreaterThanOrEqual(2);
          expect(centsOf(question.values['coin']) * question.answer)
            .toBe(centsOf(question.values['target']));
        }
      });
    });
  });

  it('adds up to the total it asks for', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape === 'total') {
          expect(centsOf(question.values['first']) + centsOf(question.values['second']))
            .toBe(question.answerCents);
        }
      });
    });
  });

  it('returns null rather than looping when it cannot build one', () => {
    // A generator with no randomness at all is the worst case it can meet
    expect(() => moneyQuestion(1, () => 0)).not.toThrow();
    expect(() => moneyQuestion(10, () => 0.999999)).not.toThrow();
  });

  it('is deterministic given the same draws', () => {
    const first = moneyQuestion(5, seeded(42));
    const second = moneyQuestion(5, seeded(42));

    expect(first).toEqual(second);
  });

  it('reaches every shape its band allows, rather than one of them', () => {
    // A generator that only ever builds the first shape would pass every
    // other test in this file
    GRADES.forEach(grade => {
      const seen = new Set(sample(grade, 400).map(question => question.shape));
      bandFor(grade).shapes.forEach(shape => expect(Array.from(seen)).toContain(shape));
    });
  });

  it('builds a question almost every time it is asked', () => {
    // Falling back constantly would quietly turn every band into counting
    GRADES.forEach(grade => {
      expect(sample(grade, 200).length).toBeGreaterThan(190);
    });
  });
});

describe('money: the line that shows how', () => {
  /** Reads `a + b = c` back as arithmetic and checks it is true. */
  function stepIsTrue(step: string): boolean {
    const parts = step.split('=');
    if (parts.length !== 2) {
      return false;
    }
    const left = parts[0].split('+').map(part => centsOf(part.trim()));
    const right = centsOf(parts[1].trim());
    if (left.some(value => !Number.isFinite(value)) || !Number.isFinite(right)) {
      return false;
    }
    return left.reduce((sum, value) => sum + value, 0) === right;
  }

  it('prints nothing but true arithmetic, at every grade', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (!question.worked || question.shape === 'make') {
          return;
        }
        question.worked.split(' → ').forEach(step => {
          expect(stepIsTrue(step)).toBe(true, `${grade}: ${question.worked}`);
        });
      });
    });
  });

  it('checks the multiplication a "how many coins" line claims', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (question.shape !== 'make' || !question.worked) {
          return;
        }
        const match = question.worked.match(/^(.+) × (\d+) = (.+)$/);
        expect(match).toBeTruthy();
        expect(centsOf(match![1]) * Number(match![2])).toBe(centsOf(match![3]));
      });
    });
  });

  it('ends every line on the answer it is explaining', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        if (!question.worked || question.shape === 'make') {
          return;
        }
        const last = question.worked.split(' → ').pop()!;
        const result = centsOf(last.split('=')[1].trim());
        const target = question.shape === 'change'
          ? centsOf(question.values['paid'])   // change is counted UP to what was paid
          : question.answerCents;
        expect(result).toBe(target);
      });
    });
  });

  it('says nothing when the method would just be the answer again', () => {
    // Two coins added is the question restated, and teaches nothing
    const twoCoins = sample(1).filter(question => question.pile.length === 2);

    expect(twoCoins.length).toBeGreaterThan(0);
    twoCoins.forEach(question => expect(question.worked).toBe(''));
  });

  it('never runs longer than three steps, whatever the pile', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        expect(question.worked.split(' → ').length).toBeLessThanOrEqual(3);
      });
    });
  });

  it('writes the line in the same notation as the rest of the band', () => {
    [1, 2, 3].forEach(grade => {
      sample(grade).forEach(question => expect(question.worked).not.toMatch(/\d\.\d/));
    });
  });
});

describe('money: the one-line summary an adult sees', () => {
  it('gives every question one', () => {
    GRADES.forEach(grade => {
      sample(grade).forEach(question => {
        expect(question.summary.length).toBeGreaterThan(0);
        expect(question.summary).not.toContain('{');
      });
    });
  });

  it('shows a counted pile as the pile', () => {
    const counts = sample(2).filter(question => question.shape === 'count');

    expect(counts.length).toBeGreaterThan(0);
    counts.forEach(question => {
      const pieces = question.summary.split(' + ').map(centsOf);
      expect(pieces.reduce((sum, value) => sum + value, 0)).toBe(question.answerCents);
    });
  });
});
