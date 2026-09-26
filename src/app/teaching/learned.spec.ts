import {
  LEARNED_WINDOW_DAYS,
  LearnedFact,
  MAX_LEARNED,
  parseLearned,
  rememberLearned
} from './learned';
import { dayKey } from './review-schedule';
import { learnedSince } from './learned-since';

const TODAY = new Date(2026, 8, 23, 12);

function entry(key: string, on: Date = TODAY): LearnedFact {
  const [num1, num2] = key.split('+').map(Number);
  return { fact: { num1, num2, operation: '+' }, on: dayKey(on), key };
}

function daysBefore(days: number): Date {
  return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - days, 12);
}

describe('learned: remembering what stuck', () => {
  it('keeps the newest first', () => {
    const list = rememberLearned(rememberLearned([], entry('8+7')), entry('9+6'));

    expect(list.map(item => item.key)).toEqual(['9+6', '8+7']);
  });

  it('leaves the caller their own list', () => {
    const before: LearnedFact[] = [entry('8+7')];
    rememberLearned(before, entry('9+6'));

    expect(before.length).toBe(1);
  });

  it('records the day it happened, not the time', () => {
    expect(rememberLearned([], entry('8+7'))[0].on).toBe('2026-09-23');
  });

  it('counts a fact learned, missed and learned again ONCE', () => {
    // Two entries would read as two different facts and quietly inflate a
    // list an adult is being asked to trust
    const first = rememberLearned([], entry('8+7', daysBefore(5)));
    const again = rememberLearned(first, entry('8+7'));

    expect(again.length).toBe(1);
    expect(again[0].on).toBe(dayKey(TODAY));
  });

  it('never grows past the cap', () => {
    let list: LearnedFact[] = [];
    for (let i = 0; i < MAX_LEARNED * 2; i++) {
      list = rememberLearned(list, entry(`${i}+1`));
    }

    expect(list.length).toBe(MAX_LEARNED);
  });

  it('drops the oldest when it is full, not the newest', () => {
    let list: LearnedFact[] = [];
    for (let i = 0; i < MAX_LEARNED; i++) {
      list = rememberLearned(list, entry(`${i}+1`));
    }
    list = rememberLearned(list, entry('999+1'));

    expect(list[0].key).toBe('999+1');
    expect(list.some(item => item.key === '0+1')).toBe(false);
  });

  it('survives a list that is not a list', () => {
    expect(rememberLearned(null as any, entry('8+7')).length).toBe(1);
  });
});

describe('learned: what counts as recent', () => {
  it('includes something learned today', () => {
    expect(learnedSince([entry('8+7')], TODAY).length).toBe(1);
  });

  it('includes the whole window, to its last day', () => {
    const list = [entry('8+7', daysBefore(LEARNED_WINDOW_DAYS - 1))];

    expect(learnedSince(list, TODAY).length).toBe(1);
  });

  it('drops anything a day older than the window', () => {
    const list = [entry('8+7', daysBefore(LEARNED_WINDOW_DAYS))];

    expect(learnedSince(list, TODAY)).toEqual([]);
  });

  it('sweeps every day in and around the window rather than the two edges', () => {
    for (let ago = 0; ago <= LEARNED_WINDOW_DAYS + 3; ago++) {
      const list = [entry('8+7', daysBefore(ago))];

      expect(learnedSince(list, TODAY).length)
        .toBe(ago <= LEARNED_WINDOW_DAYS - 1 ? 1 : 0);
    }
  });

  it('ignores a day in the future, which is a clock that moved', () => {
    const tomorrow = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1);

    expect(learnedSince([entry('8+7', tomorrow)], TODAY)).toEqual([]);
  });

  it('gives back the newest first', () => {
    const list = [
      entry('1+1', daysBefore(4)),
      entry('2+2', daysBefore(1)),
      entry('3+3', daysBefore(6))
    ];

    expect(learnedSince(list, TODAY).map(item => item.key)).toEqual(['2+2', '1+1', '3+3']);
  });

  it('says nothing when nothing has stuck', () => {
    expect(learnedSince([], TODAY)).toEqual([]);
    expect(learnedSince(null as any, TODAY)).toEqual([]);
  });
});

describe('learned: reading a store that may hold anything', () => {
  it('reads what it wrote', () => {
    const list = rememberLearned([], entry('8+7'));

    expect(parseLearned(JSON.parse(JSON.stringify(list)))).toEqual(list);
  });

  it('reads nothing as nothing', () => {
    expect(parseLearned(null)).toEqual([]);
    expect(parseLearned(undefined)).toEqual([]);
    expect(parseLearned('a string')).toEqual([]);
    expect(parseLearned({})).toEqual([]);
  });

  it('drops an entry with no real day on it', () => {
    ['yesterday', '2026-9-3', '', 20260923, null].forEach(on => {
      expect(parseLearned([{ fact: { num1: 8, num2: 7, operation: '+' }, on, key: 'k' }]))
        .toEqual([]);
    });
  });

  it('drops an entry with no fact in it', () => {
    expect(parseLearned([{ on: '2026-09-23', key: 'k' }])).toEqual([]);
    expect(parseLearned([{ fact: {}, on: '2026-09-23', key: 'k' }])).toEqual([]);
    expect(parseLearned([{ fact: { num1: 'x', num2: 7 }, on: '2026-09-23', key: 'k' }]))
      .toEqual([]);
  });

  it('drops an entry with nothing to tell it apart by', () => {
    expect(parseLearned([{ fact: { num1: 8, num2: 7, operation: '+' }, on: '2026-09-23' }]))
      .toEqual([]);
  });

  it('keeps a money fact, which has no numbers of its own', () => {
    const money = {
      fact: { num1: 0, num2: 0, operation: 'money', money: { summary: '75c', answerText: '75c' } },
      on: '2026-09-23',
      key: 'money:pick:75'
    };

    expect(parseLearned([money]).length).toBe(1);
  });

  it('keeps the good entries out of a mixed store', () => {
    const mixed = [
      { fact: { num1: 8, num2: 7, operation: '+' }, on: '2026-09-23', key: 'a' },
      { rubbish: true },
      { fact: { num1: 9, num2: 6, operation: '*' }, on: '2026-09-22', key: 'b' }
    ];

    expect(parseLearned(mixed).map(item => item.key)).toEqual(['a', 'b']);
  });

  it('never returns more than the cap, whatever is stored', () => {
    const many = Array.from({ length: MAX_LEARNED * 3 }, (_, i) => ({
      fact: { num1: i, num2: 1, operation: '+' }, on: '2026-09-23', key: `k${i}`
    }));

    expect(parseLearned(many).length).toBe(MAX_LEARNED);
  });
});
