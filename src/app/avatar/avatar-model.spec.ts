import {
  Avatar,
  NO_ITEM,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_PATHS,
  HAIR_STYLES,
  SKIN_TONES,
  WARDROBE,
  defaultAvatar,
  findItem,
  isUnlocked,
  itemsForSlot,
  itemsUnlockedAt,
  nextUnlock,
  normaliseAvatar
} from './avatar-model';

describe('the character a child can make', () => {
  it('offers a range of skin tones wide enough to find yourself in', () => {
    expect(SKIN_TONES.length).toBeGreaterThanOrEqual(5);
    expect(new Set(SKIN_TONES).size).toBe(SKIN_TONES.length);
  });

  it('spans light to deep rather than clustering at one end', () => {
    const brightness = SKIN_TONES.map(tone => {
      const value = parseInt(tone.slice(1), 16);
      return ((value >> 16) & 255) + ((value >> 8) & 255) + (value & 255);
    });
    const descending = brightness.every((b, i) => i === 0 || b < brightness[i - 1]);

    expect(descending).toBe(true);
    expect(brightness[0] - brightness[brightness.length - 1]).toBeGreaterThan(300);
  });

  it('has a drawable shape for every hair style offered', () => {
    HAIR_STYLES.forEach(style => {
      expect(HAIR_PATHS[style]).toBeTruthy();
      expect(HAIR_PATHS[style]).toMatch(/^M/);
    });
  });

  it('starts everyone somewhere valid', () => {
    const start = defaultAvatar();

    expect(SKIN_TONES).toContain(start.skin);
    expect(HAIR_COLOURS).toContain(start.hairColour);
    expect(EYE_COLOURS).toContain(start.eyeColour);
    expect(HAIR_STYLES).toContain(start.hairStyle);
  });

  it('hands back a fresh copy each time, not a shared one', () => {
    const a = defaultAvatar();
    a.skin = SKIN_TONES[5];

    expect(defaultAvatar().skin).not.toBe(SKIN_TONES[5]);
  });
});

describe('reading a stored character', () => {
  it('keeps every choice that is still valid', () => {
    const chosen: Avatar = {
      skin: SKIN_TONES[4],
      hairStyle: 'curly',
      hairColour: HAIR_COLOURS[5],
      eyeColour: EYE_COLOURS[2],
      hat: NO_ITEM,
      glasses: NO_ITEM,
      top: NO_ITEM
    };

    expect(normaliseAvatar(chosen)).toEqual(chosen);
  });

  it('keeps the parts that survived a half-corrupt store', () => {
    const result = normaliseAvatar({
      skin: SKIN_TONES[5],
      hairStyle: 'mohawk',
      hairColour: 'not a colour',
      eyeColour: EYE_COLOURS[3]
    });

    // The two good choices are kept; only the nonsense falls back
    expect(result.skin).toBe(SKIN_TONES[5]);
    expect(result.eyeColour).toBe(EYE_COLOURS[3]);
    expect(HAIR_STYLES).toContain(result.hairStyle);
    expect(HAIR_COLOURS).toContain(result.hairColour);
  });

  it('refuses a colour that was never on offer', () => {
    // Otherwise a hand-edited store could paint anything, including
    // something unreadable against the backdrop
    expect(normaliseAvatar({ skin: '#000000' }).skin).not.toBe('#000000');
    expect(SKIN_TONES).toContain(normaliseAvatar({ skin: '#000000' }).skin);
  });

  it('treats nothing at all as a fresh character', () => {
    expect(normaliseAvatar(null)).toEqual(defaultAvatar());
    expect(normaliseAvatar(undefined)).toEqual(defaultAvatar());
    expect(normaliseAvatar('a string')).toEqual(defaultAvatar());
    expect(normaliseAvatar(42)).toEqual(defaultAvatar());
  });
});

describe('the wardrobe', () => {
  it('gives a slot an empty option that is never locked', () => {
    (['hat', 'glasses', 'top'] as const).forEach(slot => {
      const empty = itemsForSlot(slot).filter(item => item.id === NO_ITEM);

      expect(empty.length).toBe(1);
      expect(empty[0].unlockLevel).toBe(1);
    });
  });

  it('hands over the first item early, so the ladder proves it pays', () => {
    const earliest = Math.min(...WARDROBE
      .filter(item => item.unlockLevel > 1)
      .map(item => item.unlockLevel));

    expect(earliest).toBe(2);
  });

  it('spreads later items out, so a reward stays a reward', () => {
    const levels = WARDROBE
      .filter(item => item.unlockLevel > 1)
      .map(item => item.unlockLevel)
      .sort((a, b) => a - b);

    // Gaps grow: something at almost every early level, then further apart
    const gaps = levels.slice(1).map((level, i) => level - levels[i]);
    expect(gaps[0]).toBeLessThanOrEqual(gaps[gaps.length - 1]);
    expect(new Set(levels).size).toBe(levels.length);
  });

  it('has something to draw for every item that is not the empty one', () => {
    WARDROBE.filter(item => item.id !== NO_ITEM).forEach(item => {
      expect(item.path).toBeTruthy();
      expect(item.path).toMatch(/^M/);
      expect(item.colour).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('keeps item ids unique within a slot', () => {
    (['hat', 'glasses', 'top'] as const).forEach(slot => {
      const ids = itemsForSlot(slot).map(item => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('knows exactly what a level hands over', () => {
    const atTwo = itemsUnlockedAt(2);

    expect(atTwo.length).toBe(1);
    expect(atTwo[0].id).toBe('cap');
  });

  it('hands over nothing at a level that wins nothing', () => {
    // Found from the wardrobe rather than written down, so adding an item at
    // some level does not quietly turn this test into a lie
    const winning = new Set(WARDROBE.map(item => item.unlockLevel));
    const barren = [3, 5, 7, 9, 11, 13, 15, 17].find(level => !winning.has(level));

    expect(barren).toBeDefined();
    expect(itemsUnlockedAt(barren!)).toEqual([]);
  });

  it('never counts the empty option as something a level unlocks', () => {
    expect(itemsUnlockedAt(1).length).toBe(0);
  });

  it('points at the next thing worth climbing for', () => {
    const earned = WARDROBE.filter(item => item.id !== NO_ITEM);

    for (let level = 1; level < 20; level++) {
      const ahead = earned
        .filter(item => item.unlockLevel > level)
        .map(item => item.unlockLevel);
      const next = nextUnlock(level);

      if (!ahead.length) {
        expect(next).toBeUndefined();
      } else {
        // Always the nearest one, never something further up the ladder
        expect(next!.unlockLevel).toBe(Math.min(...ahead));
      }
    }
  });

  it('runs out of things to promise once everything is won', () => {
    const highest = Math.max(...WARDROBE.map(item => item.unlockLevel));

    expect(nextUnlock(highest)).toBeUndefined();
  });

  it('unlocks on reaching the level, not after it', () => {
    const cap = findItem('hat', 'cap')!;

    expect(isUnlocked(cap, 1)).toBe(false);
    expect(isUnlocked(cap, 2)).toBe(true);
    expect(isUnlocked(cap, 9)).toBe(true);
  });
});

describe('wearing what has been earned', () => {
  it('lets a child wear an item they have reached', () => {
    const worn = normaliseAvatar({ ...defaultAvatar(), hat: 'crown' }, 8);

    expect(worn.hat).toBe('crown');
  });

  it('takes off an item the child has not earned', () => {
    // A hand-edited store should not be able to put on a crown
    const worn = normaliseAvatar({ ...defaultAvatar(), hat: 'crown' }, 3);

    expect(worn.hat).toBe(NO_ITEM);
  });

  it('keeps the earned item when another in the same outfit is not', () => {
    const worn = normaliseAvatar(
      { ...defaultAvatar(), hat: 'cap', glasses: 'goggles' },
      3
    );

    expect(worn.hat).toBe('cap');
    expect(worn.glasses).toBe(NO_ITEM);
  });

  it('refuses an item that does not exist, and one from the wrong slot', () => {
    expect(normaliseAvatar({ hat: 'sombrero' }, 99).hat).toBe(NO_ITEM);
    expect(normaliseAvatar({ hat: 'goggles' }, 99).hat).toBe(NO_ITEM);
    expect(normaliseAvatar({ glasses: 'crown' }, 99).glasses).toBe(NO_ITEM);
  });

  it('starts a new character wearing nothing', () => {
    expect(defaultAvatar().hat).toBe(NO_ITEM);
    expect(defaultAvatar().glasses).toBe(NO_ITEM);
  });

  it('treats a missing level as a brand new player', () => {
    // The default must be the cautious one: nothing earned yet
    expect(normaliseAvatar({ hat: 'cap' }).hat).toBe(NO_ITEM);
  });
});
