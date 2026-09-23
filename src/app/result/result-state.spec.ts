import {
  RESULT_VERSION,
  RESULT_WINDOW_MS,
  SavedResult,
  isShowable,
  isUnseen,
  parseResult,
  resultAge,
  serialiseResult
} from './result-state';

const NOW = Date.parse('2026-09-23T18:00:00Z');

/**
 * Built in the order the interface declares, INCLUDING the optional event —
 * spreading overrides on the end would put that key last and make the
 * round-trip check below a test of the fixture rather than of the parser.
 */
function result(overrides: Partial<SavedResult> = {}): SavedResult {
  const merged = {
    version: RESULT_VERSION,
    savedAt: NOW,
    seen: false,
    score: 16,
    total: 10,
    correctAnswers: 8,
    percentage: 80,
    previousBest: 70 as number | null,
    isPersonalBest: true,
    roundsPlayed: 4,
    xpEarned: 26,
    xpAfter: 140,
    leveledUp: true,
    unlockedIds: ['cap'],
    eventJustEarned: false,
    ...overrides
  };

  return {
    version: merged.version,
    savedAt: merged.savedAt,
    seen: merged.seen,
    score: merged.score,
    total: merged.total,
    correctAnswers: merged.correctAnswers,
    percentage: merged.percentage,
    previousBest: merged.previousBest,
    isPersonalBest: merged.isPersonalBest,
    roundsPlayed: merged.roundsPlayed,
    xpEarned: merged.xpEarned,
    xpAfter: merged.xpAfter,
    leveledUp: merged.leveledUp,
    unlockedIds: merged.unlockedIds,
    ...((merged as SavedResult).eventId ? { eventId: (merged as SavedResult).eventId } : {}),
    eventJustEarned: merged.eventJustEarned
  };
}

describe('result-state: writing down the end of a round', () => {
  it('comes back exactly as it went in', () => {
    const before = result();

    expect(parseResult(serialiseResult(before))).toEqual(before);
  });

  it('survives being written out and read back byte for byte', () => {
    const first = serialiseResult(result({ eventId: 'winter' }));

    expect(serialiseResult(parseResult(first)!)).toBe(first);
  });

  it('keeps which event was on, when one was', () => {
    const back = parseResult(serialiseResult(result({ eventId: 'spring', eventJustEarned: true })));

    expect(back!.eventId).toBe('spring');
    expect(back!.eventJustEarned).toBe(true);
  });

  it('leaves the event off entirely rather than storing nothing under it', () => {
    const back = parseResult(serialiseResult(result()));

    expect('eventId' in back!).toBe(false);
  });
});

describe('result-state: what it refuses to show', () => {
  it('reads nothing at all as nothing', () => {
    expect(parseResult(null)).toBeNull();
    expect(parseResult(undefined)).toBeNull();
    expect(parseResult('')).toBeNull();
  });

  it('reads rubbish as nothing', () => {
    expect(parseResult('{')).toBeNull();
    expect(parseResult('[]')).toBeNull();
    expect(parseResult('"a string"')).toBeNull();
    expect(parseResult('null')).toBeNull();
  });

  it('refuses a version it does not know', () => {
    const old = JSON.parse(serialiseResult(result()));
    old.version = RESULT_VERSION + 1;

    expect(parseResult(JSON.stringify(old))).toBeNull();
  });

  it('refuses a round with no questions in it', () => {
    // This is the shape a score service that has just been reset produces,
    // and it used to reach the screen as NaN%
    expect(parseResult(serialiseResult(result({ total: 0 })))).toBeNull();
  });

  it('refuses one with no time on it', () => {
    const broken = JSON.parse(serialiseResult(result()));
    broken.savedAt = 'yesterday';

    expect(parseResult(JSON.stringify(broken))).toBeNull();
  });
});

describe('result-state: numbers a child could be shown', () => {
  it('never hands back more right answers than questions asked', () => {
    const edited = JSON.parse(serialiseResult(result()));
    edited.correctAnswers = 99;

    expect(parseResult(JSON.stringify(edited))!.correctAnswers).toBe(10);
  });

  it('keeps a percentage on the scale', () => {
    [[-40, 0], [0, 0], [55, 55], [100, 100], [900, 100]].forEach(([stored, shown]) => {
      const edited = JSON.parse(serialiseResult(result()));
      edited.percentage = stored;

      expect(parseResult(JSON.stringify(edited))!.percentage).toBe(shown);
    });
  });

  it('turns an unreadable percentage into zero rather than NaN', () => {
    const edited = JSON.parse(serialiseResult(result()));
    edited.percentage = 'lots';

    expect(parseResult(JSON.stringify(edited))!.percentage).toBe(0);
  });

  it('reads a missing previous best as there having been none', () => {
    const edited = JSON.parse(serialiseResult(result()));
    delete edited.previousBest;

    expect(parseResult(JSON.stringify(edited))!.previousBest).toBeNull();
  });

  it('drops anything in the unlocked list that is not an id', () => {
    const edited = JSON.parse(serialiseResult(result()));
    edited.unlockedIds = ['cap', 42, null, '', 'crown'];

    expect(parseResult(JSON.stringify(edited))!.unlockedIds).toEqual(['cap', 'crown']);
  });

  it('reads an unlocked list that is not a list as nothing unlocked', () => {
    const edited = JSON.parse(serialiseResult(result()));
    edited.unlockedIds = 'cap';

    expect(parseResult(JSON.stringify(edited))!.unlockedIds).toEqual([]);
  });

  it('treats every flag as false unless it is exactly true', () => {
    const edited = JSON.parse(serialiseResult(result()));
    edited.seen = 'yes';
    edited.isPersonalBest = 1;
    edited.leveledUp = 'true';

    const back = parseResult(JSON.stringify(edited))!;
    expect(back.seen).toBe(false);
    expect(back.isPersonalBest).toBe(false);
    expect(back.leveledUp).toBe(false);
  });
});

describe('result-state: how long it is worth showing', () => {
  it('is fresh the moment it is written', () => {
    expect(resultAge(result(), NOW)).toBe(0);
    expect(isShowable(result(), NOW)).toBe(true);
  });

  it('is still worth showing at the very edge of the window', () => {
    expect(isShowable(result(), NOW + RESULT_WINDOW_MS)).toBe(true);
  });

  it('is not worth showing a millisecond past it', () => {
    expect(isShowable(result(), NOW + RESULT_WINDOW_MS + 1)).toBe(false);
  });

  it('sweeps the whole window rather than trusting the two edges', () => {
    for (let age = 0; age <= RESULT_WINDOW_MS + 60000; age += 60000) {
      expect(isShowable(result(), NOW + age)).toBe(age <= RESULT_WINDOW_MS);
    }
  });

  it('reads a clock that has gone backwards as brand new, not as ancient', () => {
    expect(resultAge(result(), NOW - 60000)).toBe(0);
    expect(isShowable(result(), NOW - 60000)).toBe(true);
  });

  it('shows nothing when there is nothing', () => {
    expect(isShowable(null, NOW)).toBe(false);
    expect(isUnseen(null, NOW)).toBe(false);
  });
});

describe('result-state: offering it back only once', () => {
  it('offers a result the child never saw', () => {
    expect(isUnseen(result({ seen: false }), NOW)).toBe(true);
  });

  it('never offers one they have read', () => {
    // Showing it again is not closure, it is a repeat
    expect(isUnseen(result({ seen: true }), NOW)).toBe(false);
  });

  it('still SHOWS one they have read, if they go and look', () => {
    // The offer is the thing that stops, not the screen
    expect(isShowable(result({ seen: true }), NOW)).toBe(true);
  });

  it('never offers one that has aged out, seen or not', () => {
    const old = NOW + RESULT_WINDOW_MS + 1;

    expect(isUnseen(result({ seen: false }), old)).toBe(false);
    expect(isUnseen(result({ seen: true }), old)).toBe(false);
  });
});
