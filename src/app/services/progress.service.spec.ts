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

  describe('facts to revisit next round', () => {
    const fact = (num1: number, num2: number, operation = '+') => ({ num1, num2, operation });

    it('starts with nothing to revisit', () => {
      expect(service.getMissedFacts()).toEqual([]);
      expect(service.takeMissedFacts(2)).toEqual([]);
    });

    it('keeps a missed fact for later', () => {
      service.recordMissed(fact(7, 5));

      expect(service.getMissedFacts()).toEqual([jasmine.objectContaining({ num1: 7, num2: 5 })]);
    });

    it('does not store the same fact twice', () => {
      service.recordMissed(fact(7, 5));
      service.recordMissed(fact(7, 5));

      expect(service.getMissedFacts().length).toBe(1);
    });

    it('treats a different operation as a different fact', () => {
      service.recordMissed(fact(7, 5, '+'));
      service.recordMissed(fact(7, 5, '-'));

      expect(service.getMissedFacts().length).toBe(2);
    });

    it('hands back only what was asked for, and forgets it', () => {
      service.recordMissed(fact(1, 1));
      service.recordMissed(fact(2, 2));
      service.recordMissed(fact(3, 3));

      const taken = service.takeMissedFacts(2);

      expect(taken.length).toBe(2);
      expect(service.getMissedFacts().length).toBe(1);
    });

    it('keeps the newest mistakes and caps the list', () => {
      for (let i = 0; i < 20; i++) {
        service.recordMissed(fact(i, i));
      }

      const stored = service.getMissedFacts();
      expect(stored.length).toBe(12);
      expect(stored[0].num1).toBe(19);
    });

    it('carries the money wording with the fact', () => {
      service.recordMissed({ num1: 10, num2: 6, operation: '-', moneyPrompt: 'A toy costs €6.' });

      expect(service.getMissedFacts()[0].moneyPrompt).toBe('A toy costs €6.');
    });

    it('survives a corrupt store', () => {
      localStorage.setItem('missedFacts', 'not json');

      expect(service.getMissedFacts()).toEqual([]);
    });
  });

  it('ignores a stored value that is not a list', () => {
    localStorage.setItem('roundHistory', '{"nope":true}');

    expect(service.getHistory()).toEqual([]);
  });
});
