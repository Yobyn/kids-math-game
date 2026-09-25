/**
 * Which sounds a child has picked — the only part of the sound system in the
 * first load. The sounds themselves (sound-sets.ts) and what plays them
 * (sound-engine.ts) are fetched after the first screen is drawn.
 */

export const SOUND_SET_IDS = ['chimes', 'marimba', 'retro', 'bubbles', 'space'] as const;
export type SoundSetId = typeof SOUND_SET_IDS[number];

/** A set, or no sound at all. */
export type SoundChoice = SoundSetId | 'off';

export const DEFAULT_SOUND_SET: SoundSetId = 'chimes';

export const CHOICE_KEY = 'soundSet';
/** Where the old on/off switch was kept, read once so a child who had turned sound off keeps it off. */
export const LEGACY_KEY = 'soundEnabled';

/** What the game makes a sound for. */
export type SoundEvent = 'correct' | 'tryAgain' | 'tap' | 'star' | 'roundDone';

/**
 * Turns whatever is stored into a choice. Anything unrecognised is the
 * default set, except that an old "sound off" stays off.
 */
export function readChoice(stored: string | null, legacyEnabled: string | null): SoundChoice {
  if (stored === 'off' || (SOUND_SET_IDS as readonly string[]).includes(stored as string)) {
    return stored as SoundChoice;
  }
  return legacyEnabled === 'false' ? 'off' : DEFAULT_SOUND_SET;
}
