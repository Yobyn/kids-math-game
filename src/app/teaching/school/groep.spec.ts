import { CURRICULUM, Moment, Random, SchoolSum, TABLES_FIRST, TABLES_GROEP_4, TOPICS, carries, momentFor, schoolSum } from './groep';

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
    case '%': return sum.num1 % sum.num2;
    case '≈': return nearest(sum.num1, sum.num2);
    default: return sum.num1 / sum.num2;
  }
}

/** The multiple of `to` nearest to n, by distance; halfway (345 to tens) goes up, as taught. */
function nearest(n: number, to: number): number {
  const down = n - n % to;
  return n - down < down + to - n ? down : down + to;
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

    it('never asks a times or share sum, and never goes past 100', () => {
      (['B', 'M', 'E'] as Moment[]).forEach(moment => Object.keys(CURRICULUM[3][moment]).forEach(topic => made(topic, 100).forEach(sum => {
        // A half is kept as a share by 2, but asked as "de helft van": never written with :
        expect(sum.form === 'helft' ? '-' : sum.operation).withContext(topic).toMatch(/^[+-]$/);
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

  describe('groep 5', () => {
    it('starts the year where groep 4 ended', () => {
      Object.keys(CURRICULUM[5].B).forEach(topic => expect(Object.keys(CURRICULUM[4].E)).withContext(topic).toContain(topic));
    });

    it('learns the tables of 6, 7, 8 and 9 in the middle of the year, so every table to 10 is known: never one past 10', () => {
      const tables = new Set<number>();
      (['M', 'E'] as Moment[]).forEach(moment => Object.keys(CURRICULUM[5][moment])
        .filter(topic => /^(deel)?tafels/.test(topic))
        .forEach(topic => made(topic, 600).forEach(sum => tables.add(sum.num2))));
      expect(tables).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
      made('tafels-6-7-8-9').forEach(sum => expect(sum.num1).toBeLessThanOrEqual(10));
      made('deeltafels-6-7-8-9').forEach(sum => expect(answer(sum)).toBeLessThanOrEqual(10));
    });

    it('adds and takes away to 1000 without going through a ten or a hundred in the middle of the year, through them at its end', () => {
      const columns = (sum: SchoolSum) => {
        const d = (n: number) => [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10];
        const [a, b] = [d(sum.num1), d(sum.num2)];
        return a.some((digit, i) => sum.operation === '+' ? digit + b[i] > 9 : digit < b[i]);
      };
      made('tot-1000-zonder', 600).forEach(sum => {
        expect(columns(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeFalse();
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(1000);
        // more than a tens sum: a hundreds number in it
        expect(Math.max(sum.num1, answer(sum))).toBeGreaterThanOrEqual(100);
      });
      made('tot-1000-over', 600).forEach(sum => {
        expect(columns(sum)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeTrue();
        expect(Math.max(sum.num1, answer(sum))).toBeLessThan(1000);
        // Two numbers of three digits, as in a kolomsgewijs sum: 367 + 258
        expect(Math.min(sum.num1, sum.num2)).withContext(`${sum.num1} ${sum.operation} ${sum.num2}`).toBeGreaterThanOrEqual(100);
      });
      // Both + and − come up
      ['tot-1000-zonder', 'tot-1000-over'].forEach(topic =>
        expect(new Set(made(topic).map(sum => sum.operation))).toEqual(new Set(['+', '-'])));
    });

    it('shares out with something left over at the end of the year: inside the tables, the rest more than nothing and less than the share', () => {
      made('delen-met-rest', 600).forEach(sum => {
        const at = `${sum.num1} : ${sum.num2}`;
        expect(sum.operation).toBe('%');
        expect(sum.num2).withContext(at).toBeGreaterThanOrEqual(2);
        expect(sum.num2).withContext(at).toBeLessThanOrEqual(9);
        expect(answer(sum)).withContext(at).toBeGreaterThanOrEqual(1);
        expect(answer(sum)).withContext(at).toBeLessThan(sum.num2);
        // the whole part is a table fact
        expect(Math.floor(sum.num1 / sum.num2)).withContext(at).toBeLessThanOrEqual(9);
      });
    });

    it('changes a measure into a smaller unit by what the unit is: 100 cm in a metre, 1000 m in a kilometre and g in a kilogram, 60 minutes in an hour', () => {
      const seen = new Set<string>();
      made('maten', 600).forEach(sum => {
        seen.add(sum.form!);
        expect(sum.operation).toBe('*');
        expect(sum.num2).withContext(sum.form!).toBe(({ 'm-cm': 100, 'km-m': 1000, 'kg-g': 1000, 'uur-min': 60 } as any)[sum.form!]);
        expect(sum.num1).toBeGreaterThanOrEqual(2);
        expect(sum.num1).toBeLessThanOrEqual(9);
      });
      expect(seen).toEqual(new Set(['m-cm', 'km-m', 'kg-g', 'uur-min']));
    });

    it('multiplies by a ten (4 × 30) in the middle of the year and a ten-and-ones by one digit (4 × 23) at its end', () => {
      made('keer-tiental').forEach(sum => {
        expect(sum.num1).toBeLessThan(10);
        expect(sum.num2 % 10).toBe(0);
        expect(sum.num2).toBeGreaterThanOrEqual(20);
        expect(sum.num2).toBeLessThan(100);
      });
      made('te-keer-e').forEach(sum => {
        expect(sum.num1).toBeGreaterThanOrEqual(2);
        expect(sum.num1).toBeLessThan(10);
        expect(sum.num2).toBeGreaterThan(10);
        expect(sum.num2 % 10).not.toBe(0);
        expect(answer(sum)).toBeLessThanOrEqual(200);
      });
    });
  });

  describe('groep 6', () => {
    const at = (sum: SchoolSum) => `${sum.num1} ${sum.operation} ${sum.num2}`;
    const figures = (n: number) => String(n).length;

    it('starts the year where groep 5 ended', () => {
      Object.keys(CURRICULUM[6].B).forEach(topic => expect(Object.keys(CURRICULUM[5].E)).withContext(topic).toContain(topic));
      // and its sums are built: groep 6 no longer gets the old questions
      (['B', 'M', 'E'] as Moment[]).forEach(moment => expect(schoolSum(6, moment)).withContext(moment).not.toBeNull());
    });

    it('adds and takes away to 10 000 in columns in the middle of the year: two numbers of four figures, something carried or borrowed', () => {
      const sums = made('tot-10000', 800);
      sums.forEach(sum => {
        expect(figures(sum.num1)).withContext(at(sum)).toBe(4);
        expect(figures(sum.num2)).withContext(at(sum)).toBe(4);
        expect(answer(sum)).withContext(at(sum)).toBeGreaterThan(0);
        expect(answer(sum)).withContext(at(sum)).toBeLessThan(10000);
        // some column, read off the written figures, carries or borrows
        const [a, b] = [String(sum.num1), String(sum.num2).padStart(4, '0')].map(n => n.split('').map(Number));
        expect(a.some((figure, i) => sum.operation === '+' ? figure + b[i] > 9 : figure < b[i])).withContext(at(sum)).toBeTrue();
      });
      expect(new Set(sums.map(sum => sum.operation))).toEqual(new Set(['+', '-']));
      // Past the thousand: answers in the thousands, not only just over one
      expect(sums.some(sum => answer(sum) >= 5000)).toBeTrue();
    });

    it('carries and borrows in the thousands column too: 5003 − 2468 borrows, 2000 + 1000 does not', () => {
      expect(carries(5003, 2468, '-')).toBeTrue();
      expect(carries(2400, 1600, '+')).toBeTrue();
      expect(carries(2000, 1000, '+')).toBeFalse();
      expect(carries(5000, 1000, '-')).toBeFalse();
      expect(carries(9000, 1000, '+')).toBeTrue();
    });

    it('multiplies two figures by a table past groep 5\'s 200 in the middle of the year: 25 × 8, never a round ten', () => {
      const sums = made('keer-groter', 800);
      sums.forEach(sum => {
        expect(figures(sum.num1)).withContext(at(sum)).toBe(2);
        expect(sum.num1 % 10).withContext(at(sum)).not.toBe(0);
        expect(sum.num2).withContext(at(sum)).toBeGreaterThanOrEqual(3);
        expect(sum.num2).withContext(at(sum)).toBeLessThanOrEqual(9);
        expect(answer(sum)).withContext(at(sum)).toBeLessThanOrEqual(600);
      });
      expect(sums.some(sum => answer(sum) > 200)).toBeTrue();
      expect(sums.some(sum => sum.num1 > 50)).toBeTrue();
    });

    it('shares out past the tables in the middle of the year: 96 : 4, 150 : 6, coming out whole between 10 and 50', () => {
      const sums = made('delen-groter', 800);
      sums.forEach(sum => {
        expect(sum.operation).toBe('/');
        expect(isWhole(answer(sum))).withContext(at(sum)).toBeTrue();
        expect(answer(sum)).withContext(at(sum)).toBeGreaterThan(10);
        expect(answer(sum)).withContext(at(sum)).toBeLessThan(50);
        expect(answer(sum) % 10).withContext(at(sum)).not.toBe(0);
        expect(sum.num2).withContext(at(sum)).toBeGreaterThanOrEqual(2);
        expect(sum.num2).withContext(at(sum)).toBeLessThanOrEqual(9);
      });
      expect(sums.some(sum => sum.num1 > 100)).toBeTrue();
      expect(new Set(sums.map(sum => sum.num2))).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9]));
    });

    it('multiplies two figures by two figures at the end of the year: 23 × 14, neither a round ten', () => {
      made('te-keer-te', 800).forEach(sum => {
        expect(sum.operation).toBe('*');
        [sum.num1, sum.num2].forEach(n => {
          expect(n).withContext(at(sum)).toBeGreaterThan(10);
          expect(n).withContext(at(sum)).toBeLessThan(40);
          expect(n % 10).withContext(at(sum)).not.toBe(0);
        });
      });
    });

    it('rounds to tens and to hundreds at the end of the year: a number that is not one already, a 5 going up', () => {
      const sums = made('afronden', 800);
      sums.forEach(sum => {
        expect(sum.operation).toBe('≈');
        expect(sum.form).toBe('afronden');
        expect([10, 100]).toContain(sum.num2);
        // 340 to tens is nothing to round
        expect(sum.num1 % sum.num2).withContext(at(sum)).not.toBe(0);
        expect(figures(sum.num1)).withContext(at(sum)).toBeGreaterThanOrEqual(3);
        expect(answer(sum)).withContext(at(sum)).toBeLessThanOrEqual(10000);
        if (sum.num2 === 10) {
          expect(figures(sum.num1)).withContext(at(sum)).toBe(3);
        }
      });
      expect(new Set(sums.map(sum => sum.num2))).toEqual(new Set([10, 100]));
      expect(sums.some(sum => sum.num2 === 100 && sum.num1 >= 1000)).toBeTrue();
      // the halfway case comes up: 345, which rounds up
      expect(sums.some(sum => sum.num2 === 10 && sum.num1 % 10 === 5)).toBeTrue();
    });

    it('keeps practising at the end of the year everything that was new in its middle', () => {
      const end = Object.keys(CURRICULUM[6].E);
      Object.keys(CURRICULUM[6].M).filter(topic => !Object.keys(CURRICULUM[6].B).includes(topic))
        .forEach(topic => expect(end).withContext(topic).toContain(topic));
    });

    it('asks nothing a child cannot type in the keypad\'s six figures', () => {
      (['B', 'M', 'E'] as Moment[]).forEach(moment => Object.keys(CURRICULUM[6][moment]).forEach(topic =>
        made(topic).forEach(sum => expect(figures(answer(sum))).withContext(`${topic} ${at(sum)}`).toBeLessThanOrEqual(6))));
    });
  });

  describe('a round', () => {
    it('reads the difficulty as the moment in the school year: easy the start, medium the middle, hard the end', () => {
      expect(momentFor('easy')).toBe('B');
      expect(momentFor('medium')).toBe('M');
      expect(momentFor('hard')).toBe('E');
    });

    it('asks every topic of a moment, the new ones about twice as often as the ones they build on', () => {
      ([3, 4, 5, 6] as number[]).forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment => {
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
      const before: [number, Moment, number, Moment][] = [
        [3, 'M', 3, 'B'], [3, 'E', 3, 'M'], [4, 'M', 4, 'B'], [4, 'E', 4, 'M'], [5, 'M', 5, 'B'], [5, 'E', 5, 'M'],
        [6, 'M', 6, 'B'], [6, 'E', 6, 'M']
      ];
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
      [7, 8, 9].forEach(groep => expect(schoolSum(groep, 'M')).withContext(`groep ${groep}`).toBeNull());
    });
  });
});
