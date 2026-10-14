import { bonusBest, recordBonusBest } from './bonus-best';

describe('each bonus game\'s best, for its end card', () => {
  const KEY = 'bonusBest:guest';

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('keeps each game\'s best, only ever raised', () => {
    expect(bonusBest(KEY, 'balloons')).toBe(0);
    // The first game sets a best but beats none
    expect(recordBonusBest(KEY, 'balloons', 7)).toEqual({ best: 7, beaten: false });
    expect(bonusBest(KEY, 'balloons')).toBe(7);
    // A lower or equal game leaves it
    expect(recordBonusBest(KEY, 'balloons', 3)).toEqual({ best: 7, beaten: false });
    expect(recordBonusBest(KEY, 'balloons', 7)).toEqual({ best: 7, beaten: false });
    // A higher one raises it, and says so
    expect(recordBonusBest(KEY, 'balloons', 9)).toEqual({ best: 9, beaten: true });
    expect(bonusBest(KEY, 'balloons')).toBe(9);
    // Each game has its own
    expect(bonusBest(KEY, 'pong')).toBe(0);
    expect(recordBonusBest(KEY, 'pong', 0)).toEqual({ best: 0, beaten: false });
    expect(bonusBest(KEY, 'pong')).toBe(0);
  });

  it('keeps one child\'s best apart from another\'s', () => {
    recordBonusBest(KEY, 'jump', 12);
    expect(bonusBest('bonusBest:user:sam', 'jump')).toBe(0);
  });

  it('shrugs off a spoiled store', () => {
    localStorage.setItem(KEY, '{not json');
    expect(bonusBest(KEY, 'jump')).toBe(0);
    localStorage.setItem(KEY, JSON.stringify({ jump: -4, pong: 'lots', balloons: 5.7 }));
    expect(bonusBest(KEY, 'jump')).toBe(0);
    expect(bonusBest(KEY, 'pong')).toBe(0);
    expect(bonusBest(KEY, 'balloons')).toBe(5);
    expect(recordBonusBest(KEY, 'pong', 2)).toEqual({ best: 2, beaten: false });
  });
});
