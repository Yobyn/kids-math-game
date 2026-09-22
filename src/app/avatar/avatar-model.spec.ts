import {
  Avatar,
  EVENT_ITEMS,
  EYE_COLOURS,
  EYE_PATHS,
  EYE_SHAPES,
  HAIR_COLOURS,
  HAIR_PATHS,
  HAIR_STYLES,
  HAIR_TEXTURES,
  MOUTH_PATHS,
  MOUTH_SHAPES,
  NO_ITEM,
  SKIN_TONES,
  TEXTURE_DASHES,
  TEXTURE_WIDTH,
  WARDROBE,
  defaultAvatar,
  findItem,
  isUnlocked,
  itemForEvent,
  itemsForSlot,
  itemsUnlockedAt,
  levelItems,
  lighten,
  nextUnlock,
  normaliseAvatar
} from './avatar-model';
import { SEASONAL_EVENTS } from '../events/seasonal-events';

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
      faceShape: 'square',
      hairStyle: 'curly',
      hairTexture: 'coily',
      hairColour: HAIR_COLOURS[5],
      eyeShape: 'almond',
      eyeColour: EYE_COLOURS[2],
      mouthShape: 'grin',
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
    const earliest = Math.min(...levelItems().map(item => item.unlockLevel));

    expect(earliest).toBe(2);
  });

  it('spreads later items out, so a reward stays a reward', () => {
    const levels = levelItems()
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
    const winning = new Set(levelItems().map(item => item.unlockLevel));
    const barren = [3, 5, 7, 9, 11, 13, 15, 17].find(level => !winning.has(level));

    expect(barren).toBeDefined();
    expect(itemsUnlockedAt(barren!)).toEqual([]);
  });

  it('never counts the empty option as something a level unlocks', () => {
    expect(itemsUnlockedAt(1).length).toBe(0);
  });

  it('points at the next thing worth climbing for', () => {
    const earned = levelItems();

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

describe('items won by being there', () => {
  it('gives every event exactly one item', () => {
    SEASONAL_EVENTS.forEach(event => {
      const item = itemForEvent(event.id);
      expect(item).toBeDefined();
      expect(item!.event).toBe(event.id);
    });
  });

  it('spreads event items across the slots rather than piling them up', () => {
    const slots = EVENT_ITEMS.map(item => item.slot);

    expect(new Set(slots).size).toBe(EVENT_ITEMS.length);
  });

  it('never unlocks one by levelling, however high', () => {
    EVENT_ITEMS.forEach(item => {
      expect(isUnlocked(item, 1)).toBe(false);
      expect(isUnlocked(item, 500)).toBe(false);
    });
  });

  it('unlocks one for a child who was there', () => {
    const winter = itemForEvent('winter')!;

    expect(isUnlocked(winter, 1, ['winter'])).toBe(true);
    expect(isUnlocked(winter, 1, ['spring'])).toBe(false);
  });

  it('keeps event items out of what a level hands over', () => {
    // Otherwise a level up would announce a reward it did not give
    for (let level = 1; level <= 30; level++) {
      itemsUnlockedAt(level).forEach(item => expect(item.event).toBeUndefined());
      const next = nextUnlock(level);
      if (next) {
        expect(next.event).toBeUndefined();
      }
    }
  });

  it('takes an event item off a character who never earned it', () => {
    const worn = normaliseAvatar({ ...defaultAvatar(), hat: 'bobble-hat' }, 99, []);

    expect(worn.hat).toBe(NO_ITEM);
  });

  it('leaves it on for a child who did', () => {
    const worn = normaliseAvatar({ ...defaultAvatar(), hat: 'bobble-hat' }, 1, ['winter']);

    expect(worn.hat).toBe('bobble-hat');
  });

  it('has something to draw for every event item', () => {
    EVENT_ITEMS.forEach(item => {
      expect(item.path).toMatch(/^M/);
      expect(item.colour).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe('the parts of a face that skin tone cannot stand in for', () => {
  it('offers a shape for the eyes, which used to be one pair of circles', () => {
    expect(EYE_SHAPES.length).toBeGreaterThan(1);
    EYE_SHAPES.forEach(shape => expect(EYE_PATHS[shape]).toBeTruthy());
  });

  it('offers a shape for the mouth, which used to be one curve', () => {
    expect(MOUTH_SHAPES.length).toBeGreaterThan(1);
    MOUTH_SHAPES.forEach(shape => expect(MOUTH_PATHS[shape].d).toBeTruthy());
  });

  it('draws every eye shape differently from every other', () => {
    const drawn = EYE_SHAPES.map(shape => EYE_PATHS[shape]);

    expect(new Set(drawn).size).toBe(EYE_SHAPES.length);
  });

  it('draws every mouth shape differently from every other', () => {
    const drawn = MOUTH_SHAPES.map(shape => MOUTH_PATHS[shape].d);

    expect(new Set(drawn).size).toBe(MOUTH_SHAPES.length);
  });

  it('draws both eyes in every shape, not one', () => {
    // One path holds the pair, so they cannot drift apart. Two subpaths.
    EYE_SHAPES.forEach(shape => {
      const starts = (EYE_PATHS[shape].match(/M/g) || []).length;
      expect(starts).toBe(2, shape);
    });
  });

  it('leaves the default character exactly as it was drawn before', () => {
    // A child who saved a character last week must find the same one
    const fresh = defaultAvatar();

    expect(fresh.eyeShape).toBe('round');
    expect(fresh.mouthShape).toBe('smile');
    expect(fresh.hairTexture).toBe('smooth');
    expect(EYE_PATHS.round).toContain('4.5');
    expect(MOUTH_PATHS.smile.d).toBe('M40 66 Q50 74 60 66');
    expect(TEXTURE_DASHES.smooth).toBe('');
  });

  it('reads a character saved before any of these existed as the old one', () => {
    const before = {
      skin: SKIN_TONES[4], faceShape: 'oval', hairStyle: 'long',
      hairColour: HAIR_COLOURS[2], eyeColour: EYE_COLOURS[1],
      hat: NO_ITEM, glasses: NO_ITEM, top: NO_ITEM
    };

    const read = normaliseAvatar(before);

    expect(read.eyeShape).toBe('round');
    expect(read.mouthShape).toBe('smile');
    expect(read.hairTexture).toBe('smooth');
    // And keeps everything it did have
    expect(read.skin).toBe(SKIN_TONES[4]);
    expect(read.hairStyle).toBe('long');
  });

  it('drops a shape that is not one of the shapes', () => {
    const read = normaliseAvatar({ eyeShape: 'googly', mouthShape: 'fangs', hairTexture: 'wet' });

    expect(read.eyeShape).toBe('round');
    expect(read.mouthShape).toBe('smile');
    expect(read.hairTexture).toBe('smooth');
  });
});

describe('hair texture, separate from the shape the hair is cut into', () => {
  it('lets long hair be coily, which it could not be before', () => {
    // The gap this closes: texture used to be bundled into the style, so the
    // only coily options were short ones
    const coilyLong = normaliseAvatar({ hairStyle: 'long', hairTexture: 'coily' });

    expect(coilyLong.hairStyle).toBe('long');
    expect(coilyLong.hairTexture).toBe('coily');
  });

  it('composes with every style, without a silhouette for each pairing', () => {
    HAIR_STYLES.forEach(style => {
      HAIR_TEXTURES.forEach(texture => {
        const both = normaliseAvatar({ hairStyle: style, hairTexture: texture });
        expect(both.hairStyle).toBe(style);
        expect(both.hairTexture).toBe(texture);
      });
    });
  });

  it('draws nothing at all for smooth hair', () => {
    expect(TEXTURE_DASHES.smooth).toBe('');
    expect(TEXTURE_WIDTH.smooth).toBe(0);
  });

  it('draws something, and something different, for each of the others', () => {
    const textured = HAIR_TEXTURES.filter(texture => texture !== 'smooth');

    textured.forEach(texture => {
      expect(TEXTURE_DASHES[texture]).toBeTruthy();
      expect(TEXTURE_WIDTH[texture]).toBeGreaterThan(0);
    });
    expect(new Set(textured.map(texture => TEXTURE_DASHES[texture])).size)
      .toBe(textured.length);
  });
});

describe('the lighter tint the texture rim is drawn in', () => {
  it('lifts a colour towards white', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(lighten('#ffffff', 0.5)).toBe('#ffffff');
  });

  it('follows the hair colour rather than being a fixed highlight', () => {
    // A fixed one reads as grey hair on a dark head and as nothing on a light
    expect(lighten('#2b2118')).not.toBe(lighten('#e0b35a'));
  });

  it('always lands on a colour a browser can read', () => {
    HAIR_COLOURS.forEach(colour => {
      expect(lighten(colour)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('is always lighter than what it came from, never darker', () => {
    const brightness = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

    HAIR_COLOURS.forEach(colour => {
      expect(brightness(lighten(colour))).toBeGreaterThan(brightness(colour) - 1);
    });
  });

  it('hands back anything that is not a colour unchanged, rather than NaN', () => {
    expect(lighten('')).toBe('');
    expect(lighten('rebeccapurple')).toBe('rebeccapurple');
    expect(lighten(null as any)).toBe(null as any);
  });
});
