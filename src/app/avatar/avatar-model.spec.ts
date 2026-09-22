import {
  Avatar,
  EYE_COLOURS,
  HAIR_COLOURS,
  HAIR_PATHS,
  HAIR_STYLES,
  SKIN_TONES,
  defaultAvatar,
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
      eyeColour: EYE_COLOURS[2]
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
