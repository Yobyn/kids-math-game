import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;

  const round = (percentage: number) => ({
    correctAnswers: Math.round(percentage / 10),
    total: 10,
    percentage,
    score: percentage,
    grade: 3
  });

  beforeEach(() => {
    localStorage.clear();
    service = new ProgressService();
  });

  afterEach(() => localStorage.clear());

  it('starts with no history and no best', () => {
    expect(service.getHistory()).toEqual([]);
    expect(service.getBestPercentage()).toBeNull();
    expect(service.getRoundsPlayed()).toBe(0);
  });

  it('remembers a finished round', () => {
    service.record(round(80));

    const history = service.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].percentage).toBe(80);
    expect(history[0].date).toBeTruthy();
  });

  it('keeps the newest round first', () => {
    service.record(round(40));
    service.record(round(90));

    expect(service.getHistory()[0].percentage).toBe(90);
  });

  it('reports the best round, not the most recent', () => {
    service.record(round(90));
    service.record(round(50));

    expect(service.getBestPercentage()).toBe(90);
  });

  it('keeps history bounded at twenty rounds', () => {
    for (let i = 0; i < 25; i++) {
      service.record(round(50));
    }

    expect(service.getRoundsPlayed()).toBe(20);
  });

  it('survives a corrupt store rather than breaking the game', () => {
    localStorage.setItem('roundHistory', 'not json at all');

    expect(service.getHistory()).toEqual([]);
    expect(() => service.record(round(70))).not.toThrow();
    expect(service.getBestPercentage()).toBe(70);
  });

  it('ignores a stored value that is not a list', () => {
    localStorage.setItem('roundHistory', '{"nope":true}');

    expect(service.getHistory()).toEqual([]);
  });
});
