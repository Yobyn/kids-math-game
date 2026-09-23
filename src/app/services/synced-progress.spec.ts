import {
  SYNCED_VERSION,
  SyncedProgress,
  addsTo,
  mergeEarned,
  mergeRounds,
  mergeSynced,
  mergeTotals,
  worthSyncing
} from './synced-progress';

function round(date: string, percentage = 50): any {
  return { date, correctAnswers: 5, total: 10, percentage, score: 50, grade: 1 };
}

describe('merging one child across two devices', () => {
  it('keeps every round both devices have, newest first', () => {
    const merged = mergeRounds(
      [round('2026-09-22T10:00:00.000Z')],
      [round('2026-09-23T10:00:00.000Z'), round('2026-09-21T10:00:00.000Z')]
    );

    expect(merged.map(r => r.date)).toEqual([
      '2026-09-23T10:00:00.000Z',
      '2026-09-22T10:00:00.000Z',
      '2026-09-21T10:00:00.000Z'
    ]);
  });

  it('does not stack up copies of the same round on every sync', () => {
    // Without this, a child who syncs ten times has ten of every round and
    // their whole history falls off the end of the cap
    const mine = [round('2026-09-22T10:00:00.000Z'), round('2026-09-21T10:00:00.000Z')];

    let merged = mergeRounds(mine, mine);
    for (let sync = 0; sync < 10; sync++) {
      merged = mergeRounds(merged, mine);
    }

    expect(merged.length).toBe(2);
  });

  it('keeps the newest twenty when two devices have more between them', () => {
    const mine = Array.from({ length: 15 }, (_, i) => round(`2026-09-${10 + i}T10:00:00.000Z`));
    const theirs = Array.from({ length: 15 }, (_, i) => round(`2026-08-${10 + i}T10:00:00.000Z`));

    const merged = mergeRounds(mine, theirs);

    expect(merged.length).toBe(20);
    expect(merged[0].date).toBe('2026-09-24T10:00:00.000Z');
    // The fifteen from this device all survived; the cap ate the older ones
    expect(merged.filter(r => r.date.startsWith('2026-09')).length).toBe(15);
  });

  it('ignores junk rather than letting it into the history', () => {
    const merged = mergeRounds([null, 'a round', { score: 5 }, round('2026-09-22T10:00:00.000Z')], 'nope');

    expect(merged.length).toBe(1);
  });

  it('takes the higher experience rather than the sum, or syncing doubles it', () => {
    // This is the bug this rule exists to prevent: the same child's XP seen
    // twice is not twice as much XP
    const merged = mergeSynced({ version: 1, xp: 240 }, { version: 1, xp: 240 });

    expect(merged.xp).toBe(240);
  });

  it('takes the higher experience when one device is ahead', () => {
    expect(mergeSynced({ version: 1, xp: 240 }, { version: 1, xp: 600 }).xp).toBe(600);
    expect(mergeSynced({ version: 1, xp: 600 }, { version: 1, xp: 240 }).xp).toBe(600);
  });

  it('takes the higher of each total, field by field', () => {
    const merged = mergeTotals(
      { rounds: 10, questions: 100, correct: 80 },
      { rounds: 4, questions: 140, correct: 60 }
    );

    expect(merged).toEqual({ rounds: 10, questions: 140, correct: 80 });
  });

  it('never lets a total go backwards, or come back as NaN', () => {
    expect(mergeTotals({ rounds: 10 }, null)).toEqual({ rounds: 10, questions: 0, correct: 0 });
    expect(mergeTotals({ rounds: 'lots' }, { rounds: -5 })).toEqual({ rounds: 0, questions: 0, correct: 0 });
  });

  it('keeps everything either device won, once each', () => {
    const merged = mergeEarned(
      [{ id: 'acorn', date: 'mine' }],
      [{ id: 'acorn', date: 'theirs' }, { id: 'snowflake' }]
    );

    expect(merged.map(e => e.id)).toEqual(['acorn', 'snowflake']);
    // This device's own entry wins, since it carries the date this device knows
    expect(merged[0].date).toBe('mine');
  });

  it('never changes the character out from under a child who is looking at it', () => {
    const merged = mergeSynced(
      { version: 1, avatar: { hat: 'crown' } },
      { version: 1, avatar: { hat: 'beanie' } }
    );

    expect(merged.avatar).toEqual({ hat: 'crown' });
  });

  it('gives a new device the character the account already had', () => {
    // The whole point of the feature: a new phone should not meet a stranger
    const merged = mergeSynced({ version: 1, xp: 0 }, { version: 1, avatar: { hat: 'crown' } });

    expect(merged.avatar).toEqual({ hat: 'crown' });
  });

  it('never destroys anything this device already had', () => {
    const mine: SyncedProgress = {
      version: 1,
      roundHistory: [round('2026-09-22T10:00:00.000Z')],
      xp: 600,
      totals: { rounds: 12, questions: 120, correct: 90 },
      events: [{ id: 'harvest' }],
      keepsakes: [{ id: 'acorn' }],
      avatar: { hat: 'crown' }
    };

    // An account that has never been played on anywhere else
    const merged = mergeSynced(mine, { version: 1 });

    expect(merged).toEqual({ ...mine, version: SYNCED_VERSION });
  });

  it('survives a server that has nothing at all', () => {
    const merged = mergeSynced(null, null);

    expect(merged.xp).toBe(0);
    expect(merged.roundHistory).toEqual([]);
    expect(worthSyncing(merged)).toBe(false);
  });

  it('is stable: merging twice changes nothing more', () => {
    const mine: SyncedProgress = { version: 1, xp: 240, roundHistory: [round('2026-09-22T10:00:00.000Z')] };
    const theirs: SyncedProgress = { version: 1, xp: 600, keepsakes: [{ id: 'acorn' }] };

    const once = mergeSynced(mine, theirs);
    const twice = mergeSynced(once, theirs);

    expect(twice).toEqual(once);
  });

  it('knows when a merge added nothing, so no request is made', () => {
    const mine: SyncedProgress = { version: 1, xp: 600, keepsakes: [{ id: 'acorn' }] };

    expect(addsTo(mergeSynced(mine, mine), mine)).toBe(false);
    expect(addsTo(mergeSynced(mine, { version: 1, xp: 700 }), mine)).toBe(true);
    expect(addsTo(mergeSynced(mine, { version: 1 }), { version: 1 })).toBe(true);
  });

  it('counts an empty account as not worth a network round trip', () => {
    expect(worthSyncing(null)).toBe(false);
    expect(worthSyncing({ version: 1 })).toBe(false);
    expect(worthSyncing({ version: 1, totals: { rounds: 0, questions: 0, correct: 0 } })).toBe(false);
    expect(worthSyncing({ version: 1, xp: 5 })).toBe(true);
    expect(worthSyncing({ version: 1, avatar: { hat: 'crown' } })).toBe(true);
  });
});
