import { ProgressService, mergeHistory, mergeMissed } from './progress.service';
import { REVIEWS_TO_GRADUATE } from '../teaching/review-schedule';

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

  describe('facts to revisit on a later day', () => {
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
      const missedOn = new Date(2026, 8, 22);
      const tomorrow = new Date(2026, 8, 23);
      service.recordMissed(fact(1, 1), missedOn);
      service.recordMissed(fact(2, 2), missedOn);
      service.recordMissed(fact(3, 3), missedOn);

      const taken = service.takeMissedFacts(2, tomorrow);

      expect(taken.length).toBe(2);
      expect(service.getMissedFacts().length).toBe(1);
    });

    it('hands back nothing on the day a fact was missed', () => {
      // The thing that was broken: a fact used to come back "next round",
      // which for a child playing five rounds in a sitting meant minutes
      // later. That is massed practice, and the gap is what does the work.
      const missedOn = new Date(2026, 8, 22);
      service.recordMissed(fact(7, 5), missedOn);

      expect(service.takeMissedFacts(2, missedOn)).toEqual([]);
      expect(service.getMissedFacts().length).toBe(1);
    });

    it('hands it back the next day', () => {
      service.recordMissed(fact(7, 5), new Date(2026, 8, 22));

      expect(service.takeMissedFacts(2, new Date(2026, 8, 23)).length).toBe(1);
    });

    it('hands back a fact stored before the schedule existed', () => {
      // Migration: it was missed, and nothing says it has been seen since
      localStorage.setItem('missedFacts:guest',
        JSON.stringify([{ num1: 7, num2: 5, operation: '+' }]));

      expect(service.takeMissedFacts(2, new Date(2026, 8, 22)).length).toBe(1);
    });

    it('puts a fact answered right back for another day', () => {
      const day = new Date(2026, 8, 22);
      service.recordMissed(fact(7, 5), day);
      const [taken] = service.takeMissedFacts(1, new Date(2026, 8, 23));

      service.passedReview(taken, new Date(2026, 8, 23));

      expect(service.getMissedFacts().length).toBe(1);
      expect(service.getMissedFacts()[0].reviews).toBe(1);
      expect(service.takeMissedFacts(2, new Date(2026, 8, 23))).toEqual([]);
    });

    it('is done with a fact answered right on enough separate days', () => {
      service.recordMissed(fact(7, 5), new Date(2026, 8, 22));

      let day = 23;
      for (let review = 0; review < REVIEWS_TO_GRADUATE; review++, day++) {
        const [taken] = service.takeMissedFacts(1, new Date(2026, 8, day));
        expect(taken).toBeDefined();
        service.passedReview(taken, new Date(2026, 8, day));
      }

      expect(service.getMissedFacts()).toEqual([]);
    });

    it('sends a fact missed again back to the beginning', () => {
      service.recordMissed(fact(7, 5), new Date(2026, 8, 22));
      const [taken] = service.takeMissedFacts(1, new Date(2026, 8, 23));
      service.passedReview(taken, new Date(2026, 8, 23));

      const [again] = service.takeMissedFacts(1, new Date(2026, 8, 24));
      service.recordMissed(again, new Date(2026, 8, 24));

      expect(service.getMissedFacts()[0].reviews).toBe(0);
    });

    it('keeps the newest mistakes and caps the list', () => {
      for (let i = 0; i < 20; i++) {
        service.recordMissed(fact(i, i), new Date(2026, 8, 22));
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

describe('ProgressService per player', () => {
  let service: ProgressService;

  const round = (percentage: number, date: string) => ({
    date, percentage, correctAnswers: 9, total: 10, score: 20, grade: 2
  });

  beforeEach(() => {
    localStorage.clear();
    service = new ProgressService();
  });

  afterEach(() => localStorage.clear());

  it('files a guest round under the guest, not under a shared key', () => {
    service.record({ correctAnswers: 9, total: 10, percentage: 90, score: 20, grade: 2 });

    expect(localStorage.getItem('roundHistory:guest')).toBeTruthy();
    expect(localStorage.getItem('roundHistory')).toBeNull();
  });

  it('keeps two children on one tablet apart', () => {
    localStorage.setItem('username', 'ada');
    service.record({ correctAnswers: 10, total: 10, percentage: 100, score: 25, grade: 3 });

    localStorage.setItem('username', 'linus');
    expect(service.getHistory()).toEqual([]);
    expect(service.getBestPercentage()).toBeNull();

    localStorage.setItem('username', 'ada');
    expect(service.getRoundsPlayed()).toBe(1);
    expect(service.getBestPercentage()).toBe(100);
  });

  it('adopts rounds stored before progress was filed per player', () => {
    localStorage.setItem('roundHistory', JSON.stringify([round(80, '2026-09-01T10:00:00.000Z')]));

    expect(service.getRoundsPlayed()).toBe(1);
    expect(localStorage.getItem('roundHistory')).toBeNull();
    expect(localStorage.getItem('roundHistory:guest')).toBeTruthy();
  });

  it('carries a guest’s rounds into the account they sign up for', () => {
    service.record({ correctAnswers: 8, total: 10, percentage: 80, score: 18, grade: 2 });
    service.recordMissed({ num1: 7, num2: 5, operation: '+' });

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getRoundsPlayed()).toBe(1);
    expect(service.getBestPercentage()).toBe(80);
    expect(service.getMissedFacts().length).toBe(1);
  });

  it('leaves nothing behind for the next guest on the device', () => {
    service.record({ correctAnswers: 8, total: 10, percentage: 80, score: 18, grade: 2 });
    service.recordMissed({ num1: 7, num2: 5, operation: '+' });

    service.adoptGuestProgress('ada');

    expect(service.getHistory()).toEqual([]);
    expect(service.getMissedFacts()).toEqual([]);
    expect(service.hasGuestProgress()).toBe(false);
  });

  it('merges rather than overwrites when the account already has rounds', () => {
    localStorage.setItem('username', 'ada');
    service.record({ correctAnswers: 10, total: 10, percentage: 100, score: 25, grade: 3 });

    localStorage.removeItem('username');
    service.record({ correctAnswers: 6, total: 10, percentage: 60, score: 12, grade: 2 });

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getRoundsPlayed()).toBe(2);
    expect(service.getBestPercentage()).toBe(100);
  });

  it('does nothing when the guest has played nothing', () => {
    localStorage.setItem('username', 'ada');
    service.record({ correctAnswers: 10, total: 10, percentage: 100, score: 25, grade: 3 });
    const before = localStorage.getItem('roundHistory:user:ada');

    localStorage.removeItem('username');
    service.adoptGuestProgress('ada');

    expect(localStorage.getItem('roundHistory:user:ada')).toBe(before);
  });

  it('survives a corrupt guest store when adopting', () => {
    localStorage.setItem('roundHistory:guest', 'not json');
    localStorage.setItem('missedFacts:guest', '{"nope":true}');

    expect(() => service.adoptGuestProgress('ada')).not.toThrow();
  });

  it('reports whether a guest has anything worth keeping', () => {
    expect(service.hasGuestProgress()).toBe(false);

    service.record({ correctAnswers: 5, total: 10, percentage: 50, score: 10, grade: 1 });

    expect(service.hasGuestProgress()).toBe(true);
  });
});

describe('progress merging', () => {
  const round = (percentage: number, date: string) => ({
    date, percentage, correctAnswers: 9, total: 10, score: 20, grade: 2
  });

  it('orders merged rounds newest first', () => {
    const merged = mergeHistory(
      [round(90, '2026-09-03T00:00:00.000Z'), round(70, '2026-09-01T00:00:00.000Z')],
      [round(80, '2026-09-02T00:00:00.000Z')]
    );

    expect(merged.map(r => r.percentage)).toEqual([90, 80, 70]);
  });

  it('caps a merged history at twenty rounds', () => {
    const many = Array.from({ length: 18 }, (_, i) =>
      round(50 + i, `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`));

    expect(mergeHistory(many, many).length).toBe(20);
  });

  it('keeps the same fact only once, account side first', () => {
    const merged = mergeMissed(
      [{ num1: 3, num2: 4, operation: '+' }],
      [{ num1: 3, num2: 4, operation: '+' }, { num1: 9, num2: 2, operation: '+' }]
    );

    expect(merged.length).toBe(2);
    expect(merged[0]).toEqual({ num1: 3, num2: 4, operation: '+' });
  });

  it('caps merged facts at twelve', () => {
    const facts = Array.from({ length: 10 }, (_, i) => ({ num1: i, num2: 1, operation: '+' }));
    const others = Array.from({ length: 10 }, (_, i) => ({ num1: i, num2: 2, operation: '+' }));

    expect(mergeMissed(facts, others).length).toBe(12);
  });
});

describe('ProgressService experience', () => {
  let service: ProgressService;

  beforeEach(() => {
    localStorage.clear();
    service = new ProgressService();
  });

  afterEach(() => localStorage.clear());

  it('starts a new player at nothing earned', () => {
    expect(service.getXp()).toBe(0);
  });

  it('accumulates across rounds', () => {
    service.addXp(24);
    service.addXp(18);

    expect(service.getXp()).toBe(42);
  });

  it('files experience per player, like everything else', () => {
    service.addXp(30);
    localStorage.setItem('username', 'ada');

    expect(service.getXp()).toBe(0);

    localStorage.removeItem('username');
    expect(service.getXp()).toBe(30);
  });

  it('survives history rolling off the end', () => {
    // History is capped at twenty rounds; a level must not be capped with it
    for (let i = 0; i < 25; i++) {
      service.record({ correctAnswers: 8, total: 10, percentage: 80, score: 18, grade: 2 });
      service.addXp(26);
    }

    expect(service.getRoundsPlayed()).toBe(20);
    expect(service.getXp()).toBe(25 * 26);
  });

  it('ignores nothing, negatives and junk', () => {
    service.addXp(0);
    service.addXp(-40);
    service.addXp(NaN);

    expect(service.getXp()).toBe(0);
  });

  it('reads a corrupt total as a fresh start rather than NaN', () => {
    localStorage.setItem('xp:guest', 'plenty');

    expect(service.getXp()).toBe(0);

    service.addXp(10);
    expect(service.getXp()).toBe(10);
  });

  it('carries experience into the account a guest signs up for', () => {
    service.addXp(120);

    service.adoptGuestProgress('ada');

    expect(service.getXp()).toBe(0);
    localStorage.setItem('username', 'ada');
    expect(service.getXp()).toBe(120);
  });

  it('adds to what an account already had rather than replacing it', () => {
    localStorage.setItem('username', 'ada');
    service.addXp(200);
    localStorage.removeItem('username');
    service.addXp(50);

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getXp()).toBe(250);
  });

  it('carries experience even when no rounds are left in history', () => {
    service.addXp(75);
    localStorage.removeItem('roundHistory:guest');

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getXp()).toBe(75);
  });
});

describe('ProgressService remembering events', () => {
  let service: ProgressService;

  beforeEach(() => {
    localStorage.clear();
    service = new ProgressService();
  });

  afterEach(() => localStorage.clear());

  it('starts with no events behind a child', () => {
    expect(service.getEarnedEvents()).toEqual([]);
  });

  it('remembers an event they were here for', () => {
    service.earnEvent('winter');

    expect(service.getEarnedEvents()).toEqual(['winter']);
    expect(new ProgressService().getEarnedEvents()).toEqual(['winter']);
  });

  it('never records the same event twice', () => {
    service.earnEvent('winter');
    service.earnEvent('winter');
    service.earnEvent('winter');

    expect(service.getEarnedEvents()).toEqual(['winter']);
  });

  it('keeps every event, not just the latest', () => {
    service.earnEvent('winter');
    service.earnEvent('spring');

    expect(service.getEarnedEvents()).toEqual(['winter', 'spring']);
  });

  it('ignores an empty id rather than storing one', () => {
    service.earnEvent('');

    expect(service.getEarnedEvents()).toEqual([]);
  });

  it('reads a corrupt store as no events rather than breaking', () => {
    localStorage.setItem('events:guest', 'not json');

    expect(new ProgressService().getEarnedEvents()).toEqual([]);
  });

  it('files events per player like everything else', () => {
    service.earnEvent('winter');
    localStorage.setItem('username', 'ada');

    expect(service.getEarnedEvents()).toEqual([]);
  });

  it('carries events into the account a guest signs up for', () => {
    service.earnEvent('winter');

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getEarnedEvents()).toEqual(['winter']);
  });

  it('unions them rather than replacing what the account already had', () => {
    localStorage.setItem('username', 'ada');
    service.earnEvent('spring');
    localStorage.removeItem('username');
    service.earnEvent('winter');

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getEarnedEvents().sort()).toEqual(['spring', 'winter']);
  });

  it('carries events even when nothing else was earned', () => {
    service.earnEvent('autumn');

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getEarnedEvents()).toEqual(['autumn']);
  });
});

describe('ProgressService counting everything done', () => {
  let service: ProgressService;

  const round = (correct: number, total = 10) => ({
    correctAnswers: correct, total, percentage: (correct / total) * 100,
    score: correct * 2, grade: 2
  });

  beforeEach(() => {
    localStorage.clear();
    service = new ProgressService();
  });

  afterEach(() => localStorage.clear());

  it('starts a new child at nothing done', () => {
    expect(service.getTotals()).toEqual({ rounds: 0, questions: 0, correct: 0 });
  });

  it('counts a round as it is recorded', () => {
    service.record(round(7));

    expect(service.getTotals()).toEqual({ rounds: 1, questions: 10, correct: 7 });
  });

  it('keeps counting past the twenty rounds history remembers', () => {
    // The whole reason these are stored rather than derived
    for (let i = 0; i < 25; i++) {
      service.record(round(6));
    }

    expect(service.getRoundsPlayed()).toBe(20);
    expect(service.getTotals().rounds).toBe(25);
    expect(service.getTotals().questions).toBe(250);
    expect(service.getTotals().correct).toBe(150);
  });

  it('never goes down, whatever the round was like', () => {
    let previous = service.getTotals();

    [10, 0, 3, 0, 9, 1].forEach(correct => {
      service.record(round(correct));
      const now = service.getTotals();

      // A bad round still moves every number forward
      expect(now.rounds).toBeGreaterThan(previous.rounds);
      expect(now.questions).toBeGreaterThan(previous.questions);
      expect(now.correct).toBeGreaterThanOrEqual(previous.correct);
      previous = now;
    });
  });

  it('survives a reload', () => {
    service.record(round(8));

    expect(new ProgressService().getTotals().rounds).toBe(1);
  });

  it('reads a corrupt count as nothing done rather than NaN on a screen', () => {
    localStorage.setItem('totals:guest', 'not json');
    expect(new ProgressService().getTotals()).toEqual({ rounds: 0, questions: 0, correct: 0 });

    localStorage.setItem('totals:guest', JSON.stringify({ rounds: 'lots', questions: -4 }));
    expect(new ProgressService().getTotals()).toEqual({ rounds: 0, questions: 0, correct: 0 });
  });

  it('counts per player, like everything else', () => {
    service.record(round(9));
    localStorage.setItem('username', 'ada');

    expect(service.getTotals().rounds).toBe(0);
  });

  it('adds a guest’s totals to the account they sign up for', () => {
    localStorage.setItem('username', 'ada');
    service.record(round(10));
    localStorage.removeItem('username');
    service.record(round(4));
    service.record(round(6));

    service.adoptGuestProgress('ada');

    localStorage.setItem('username', 'ada');
    expect(service.getTotals()).toEqual({ rounds: 3, questions: 30, correct: 20 });
  });
});
