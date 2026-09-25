import { DEFAULT_SOUND_SET, SOUND_SET_IDS, readChoice } from './sound-choice';

describe('readChoice', () => {
  it('reads every set, and no sound', () => {
    SOUND_SET_IDS.forEach(id => expect(readChoice(id, null)).toBe(id));
    expect(readChoice('off', null)).toBe('off');
  });

  it('starts a new child on the default set', () => {
    expect(readChoice(null, null)).toBe(DEFAULT_SOUND_SET);
  });

  it('keeps an old "sound off" off, and an old "sound on" on the default set', () => {
    expect(readChoice(null, 'false')).toBe('off');
    expect(readChoice(null, 'true')).toBe(DEFAULT_SOUND_SET);
  });

  it('lets a new choice win over the old switch', () => {
    expect(readChoice('space', 'false')).toBe('space');
  });

  it('treats anything it does not recognise as not chosen', () => {
    expect(readChoice('kazoo', null)).toBe(DEFAULT_SOUND_SET);
    expect(readChoice('', 'false')).toBe('off');
    expect(readChoice('constructor', null)).toBe(DEFAULT_SOUND_SET);
  });
});
