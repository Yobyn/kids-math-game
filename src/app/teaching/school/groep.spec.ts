import { CURRICULUM, Moment, Random, SchoolSum, TABLES_FIRST, TABLES_GROEP_4, TOPICS, momentFor, schoolSum } from './groep';

/** A repeatable source of numbers, so a failure can be found again. */
function seeded(seed: number): Random {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function answer(sum: SchoolSum): number {
  switch (sum.operation) {
    case '+': return sum.num1 + sum.num2;
    case '-': return sum.num1 - sum.num2;
    case '*': return sum.num1 * sum.num2;
    default: return sum.num1 / sum.num2;
  }
}

/** Many sums of one topic. */
function made(topic: string, count = 400, seed = 7): SchoolSum[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => ({ ...TOPICS[topic](random), topic }));
}

const ones = (n: number) => n % 10;
const isWhole = (n: number) => Number.isInteger(n);

/** Does this + or − sum go through a ten (8 + 5, 14 − 6), not just up to one (7 + 3)? */
function crossesTen(sum: SchoolSum): boolean {
  return sum.operation === '+' ? ones(sum.num1) + ones(sum.num2) > 10 : ones(sum.num2) > ones(sum.num1);
}

/** Does it stay clear of the ten: 13 + 4, not 13 + 7 = 20, which is aanvullen to the ten, a topic of its own? */
function staysInsideTen(sum: SchoolSum): boolean {
  return sum.operation === '+' ? ones(sum.num1) + ones(sum.num2) < 10 : ones(sum.num2) <= ones(sum.num1);
}

describe('school sums (docs/CURRICULUM-NL.md)', () => {
  it('asks only what a child can type: whole numbers, never below nought, a division that comes out', () => {
    const misses: string[] = [];
    Object.keys(TOPICS).forEach(topic => made(topic).forEach(sum => {
      const result = answer(sum);
      if (!isWhole(sum.num1) || !isWhole(sum.num2) || !isWhole(result) || result < 0 || sum.num1 <= 0 || sum.num2 <= 0) {
        misses.push(`${topic}: ${sum.num1} ${sum.operation} ${sum.num2}`);
      }
    }));
    expect(misses.slice(0, 5)).toEqual([]);
  });

  describe('groep 3', () => {
    it('starts within 10 with small numbers, then all of within 10', () => {
      made('plus-tot-10-klein').concat(made('min-tot-10-klein')).forEach(sum => {
        expect(Math.max(sum.num1, answer(sum))).toBeLessThanOrEqual(10);
        expect(sum.num2).toBeLessThanOrEqual(5);
      });
      made('plus-tot-10').concat(made('min-tot-10')).forEach(sum =>
        expect(Math.max(sum.num1, sum.num2, answer(sum))).toBeLessThanOrEqual(10));
    });

    it('adds and takes away in the teens without going through the ten in the middle of the year, through it at the end', () => {
      made('plus-tot-20-zonder').concat(made('min-tot-20-zonder')).forEach(sum => {
        expect(staysInsideTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue();
        expect(Math.max(sum.num1, answer(sum))).toBeLessThanOrEqual(20);
        expect(Math.min(sum.num1, answer(sum))).toBeGreaterThanOrEqual(10);
      });
      made('plus-tot-20-over').concat(made('min-tot-20-over')).forEach(sum => {
        expect(crossesTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue();
        expect(Math.max(sum.num1, answer(sum))).toBeLessThanOrEqual(20);
        // One side of the ten and the other: 8 + 5 = 13, 14 − 6 = 8
        expect(Math.min(sum.num1, answer(sum))).toBeLessThan(10);
      });
    });

    it('doubles a number with itself, within 10 and then within 20', () => {
      made('dubbel-tot-10').forEach(sum => {
        expect(sum.num1).toBe(sum.num2);
        expect(answer(sum)).toBeLessThanOrEqual(10);
      });
      made('dubbel-tot-20').forEach(sum => {
        expect(sum.num1).toBe(sum.num2);
        expect(answer(sum)).toBeGreaterThan(10);
        expect(answer(sum)).toBeLessThanOrEqual(20);
      });
    });

    it('jumps by tens within 100', () => {
      made('sprong-van-10').forEach(sum => {
        expect(sum.num2).toBe(10);
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(100);
      });
    });

    it('never multiplies or divides, and never goes past 100', () => {
      (['B', 'M', 'E'] as Moment[]).forEach(moment => Object.keys(CURRICULUM[3][moment]).forEach(topic => made(topic, 100).forEach(sum => {
        expect(['+', '-']).withContext(topic).toContain(sum.operation);
        expect(Math.max(sum.num1, sum.num2, answer(sum))).withContext(topic).toBeLessThanOrEqual(100);
      })));
    });
  });

  describe('groep 4', () => {
    it('adds and takes away tens, a ten-and-ones and ones, a ten-and-ones and tens, within 100', () => {
      made('tientallen').forEach(sum => {
        expect(sum.num1 % 10 + sum.num2 % 10).toBe(0);
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(100);
      });
      made('te-e-zonder').concat(made('te-e-over')).forEach(sum => {
        expect(sum.num1).toBeGreaterThanOrEqual(10);
        expect(sum.num2).toBeLessThan(10);
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(100);
      });
      made('te-e-zonder').forEach(sum => expect(staysInsideTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue());
      made('te-e-over').forEach(sum => expect(crossesTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue());
      made('te-t').forEach(sum => {
        expect(sum.num1 % 10).not.toBe(0);
        expect(sum.num2 % 10).toBe(0);
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(100);
      });
    });

    it('adds and takes away two two-digit numbers, without and with going through a ten, within 100', () => {
      const twoDigit = (n: number) => n >= 10 && n < 100 && n % 10 !== 0;
      made('te-te-zonder').concat(made('te-te-over')).forEach(sum => {
        expect(twoDigit(sum.num1) && twoDigit(sum.num2)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue();
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(100);
      });
      made('te-te-zonder').forEach(sum => expect(staysInsideTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue());
      made('te-te-over').forEach(sum => expect(crossesTen(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue());
    });

    it('adds and takes away hundreds within 1000', () => {
      made('honderdtallen').forEach(sum => {
        expect(sum.num1 % 100 + sum.num2 % 100).toBe(0);
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(1000);
      });
    });

    it('learns the tables of 1, 2, 5 and 10 first, then 3 and 4: never 6 to 9, which come in groep 5', () => {
      const tablesOf = (moment: Moment) => Object.keys(CURRICULUM[4][moment])
        .filter(topic => /^tafels|^deeltafels/.test(topic))
        .map(topic => made(topic, 600).map(sum => sum.num2))
        .reduce((all, list) => all.concat(list), [] as number[]);
      expect(new Set(tablesOf('M'))).toEqual(new Set([1, 2, 5, 10]));
      expect(new Set(tablesOf('E'))).toEqual(new Set([1, 2, 3, 4, 5, 10]));
      expect(TABLES_FIRST.every(table => TABLES_GROEP_4.includes(table))).toBeTrue();
      // A keersom is up to ten times the table; a deelsom comes out at one to ten
      made('tafels-1-5-10').forEach(sum => expect(sum.num1).toBeLessThanOrEqual(10));
      // Sharing out by 1 teaches nothing a child does not already know
      made('deeltafels-2-5-10').concat(made('deeltafels-1-5-10')).forEach(sum => expect(sum.num2).toBeGreaterThan(1));
      made('deeltafels-1-5-10').forEach(sum => {
        expect(answer(sum)).toBeGreaterThanOrEqual(1);
        expect(answer(sum)).toBeLessThanOrEqual(10);
      });
    });

    it('starts the year where groep 3 ended: crossing the ten within 20', () => {
      Object.keys(CURRICULUM[4].B).forEach(topic => expect(Object.keys(CURRICULUM[3].E)).withContext(topic).toContain(topic));
    });
  });

  describe('a round', () => {
    it('reads the difficulty as the moment in the school year: easy the start, medium the middle, hard the end', () => {
      expect(momentFor('easy')).toBe('B');
      expect(momentFor('medium')).toBe('M');
      expect(momentFor('hard')).toBe('E');
    });

    it('asks every topic of a moment, the new ones about twice as often as the ones they build on', () => {
      ([3, 4] as number[]).forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment => {
        const weights = CURRICULUM[groep][moment];
        const random = seeded(groep * 10 + moment.charCodeAt(0));
        const counts: { [topic: string]: number } = {};
        const draws = 6000;
        for (let i = 0; i < draws; i++) {
          const sum = schoolSum(groep, moment, random)!;
          counts[sum.topic] = (counts[sum.topic] || 0) + 1;
        }
        const total = Object.keys(weights).reduce((sum, topic) => sum + weights[topic], 0);
        Object.keys(weights).forEach(topic => {
          const expected = draws * weights[topic] / total;
          expect(counts[topic] || 0).withContext(`groep ${groep} ${moment} ${topic}`).toBeGreaterThan(expected * 0.8);
          expect(counts[topic] || 0).withContext(`groep ${groep} ${moment} ${topic}`).toBeLessThan(expected * 1.2);
        });
        // Nothing that is not on the list for this moment
        Object.keys(counts).forEach(topic => expect(Object.keys(weights)).withContext(`groep ${groep} ${moment}`).toContain(topic));
      }));
    });

    it('asks what is new at a moment about twice as often as what it carries on from the moment before', () => {
      const before: [number, Moment, number, Moment][] = [[3, 'M', 3, 'B'], [3, 'E', 3, 'M'], [4, 'M', 4, 'B'], [4, 'E', 4, 'M']];
      before.forEach(([groep, moment, earlierGroep, earlier]) => {
        const random = seeded(groep * 7 + moment.charCodeAt(0));
        const counts: { [topic: string]: number } = {};
        for (let i = 0; i < 8000; i++) {
          const sum = schoolSum(groep, moment, random)!;
          counts[sum.topic] = (counts[sum.topic] || 0) + 1;
        }
        const carried = Object.keys(CURRICULUM[earlierGroep][earlier]);
        const topics = Object.keys(CURRICULUM[groep][moment]);
        const fresh = topics.filter(topic => !carried.includes(topic));
        const again = topics.filter(topic => carried.includes(topic));
        expect(fresh.length).withContext(`groep ${groep} ${moment}`).toBeGreaterThan(0);
        again.forEach(old => fresh.forEach(topic => {
          const ratio = counts[topic] / counts[old];
          expect(ratio).withContext(`groep ${groep} ${moment}: ${topic} against ${old}`).toBeGreaterThan(1.6);
          expect(ratio).withContext(`groep ${groep} ${moment}: ${topic} against ${old}`).toBeLessThan(2.5);
        }));
        // With nothing carried over (groep 3's start, its middle), the new topics come up alike
        if (!again.length) {
          fresh.forEach(topic => expect(counts[topic] / counts[fresh[0]]).withContext(`groep ${groep} ${moment}: ${topic}`).toBeGreaterThan(0.8));
        }
      });
    });

    it('builds every topic it names', () => {
      Object.keys(CURRICULUM).forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment =>
        Object.keys(CURRICULUM[+groep][moment]).forEach(topic => expect(TOPICS[topic]).withContext(topic).toBeDefined())));
    });

    it('leaves a groep not built yet to the old questions', () => {
      [5, 6, 7, 8, 9].forEach(groep => expect(schoolSum(groep, 'M')).withContext(`groep ${groep}`).toBeNull());
    });
  });
});
