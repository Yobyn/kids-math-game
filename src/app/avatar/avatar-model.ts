/**
 * The child's character, kept free of the DOM so it can be tested directly.
 *
 * Everything here is drawn from primitives and tinted at runtime — no art
 * pipeline, no image assets, and it stays sharp at any size on a phone or a
 * tablet.
 *
 * What is here and what is deliberately not: research on children's avatars
 * finds that the act of customising is itself what builds identification with
 * the character, and that skin tone, hair and eyes are what children reach for
 * when they are trying to make a character theirs. So none of that is earned —
 * it is free from the first moment, before a single round is played. A child
 * should never have to climb a ladder to be allowed to look like themselves.
 * Clothing and items are what levels will unlock, and they hang off this
 * model rather than replacing any of it.
 */

export interface Avatar {
  skin: string;
  hairStyle: HairStyle;
  hairColour: string;
  eyeColour: string;
}

export type HairStyle = 'short' | 'long' | 'curly' | 'bun';

export interface Choice {
  id: string;
  /** The colour to show on the swatch, for colour choices. */
  colour?: string;
}

/**
 * A range wide enough that a child can find themselves in it. Ordered light to
 * deep with even steps, so no tone reads as the default and the rest as
 * variations on it.
 */
export const SKIN_TONES: string[] = [
  '#ffd9b8',
  '#f0c08a',
  '#d99e63',
  '#b57644',
  '#8a552f',
  '#5c381f'
];

/** Four natural colours and two that are frankly not, because children ask. */
export const HAIR_COLOURS: string[] = [
  '#2b2118',
  '#5a3a22',
  '#a4682f',
  '#e0b35a',
  '#c1442e',
  '#3f8fd6'
];

export const EYE_COLOURS: string[] = [
  '#4a3123',
  '#8a6a3a',
  '#3f7fc1',
  '#3f8f5a'
];

export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'curly', 'bun'];

export function defaultAvatar(): Avatar {
  return {
    skin: SKIN_TONES[2],
    hairStyle: 'short',
    hairColour: HAIR_COLOURS[1],
    eyeColour: EYE_COLOURS[0]
  };
}

/**
 * Takes whatever came out of storage and returns something drawable. A child
 * whose stored character is half-corrupt keeps the parts that survived rather
 * than being reset to a stranger.
 */
export function normaliseAvatar(raw: any): Avatar {
  const fallback = defaultAvatar();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  return {
    skin: pick(SKIN_TONES, raw.skin, fallback.skin),
    hairStyle: pick(HAIR_STYLES, raw.hairStyle, fallback.hairStyle) as HairStyle,
    hairColour: pick(HAIR_COLOURS, raw.hairColour, fallback.hairColour),
    eyeColour: pick(EYE_COLOURS, raw.eyeColour, fallback.eyeColour)
  };
}

function pick<T>(allowed: T[], value: any, fallback: T): T {
  return allowed.indexOf(value) >= 0 ? value : fallback;
}

/**
 * The hair shapes, as SVG path data over a 100x100 box shared with the face.
 * Kept here rather than in the template so the set can be tested and extended
 * without touching rendering.
 */
export const HAIR_PATHS: { [style in HairStyle]: string } = {
  short: 'M22 46 C22 12 78 12 78 46 C78 34 66 30 50 30 C34 30 22 34 22 46 Z',
  long: 'M18 50 C18 8 82 8 82 50 L82 82 L70 82 L70 50 C70 38 62 32 50 32 '
      + 'C38 32 30 38 30 50 L30 82 L18 82 Z',
  curly: 'M20 44 A10 10 0 0 1 32 28 A10 10 0 0 1 50 22 A10 10 0 0 1 68 28 '
       + 'A10 10 0 0 1 80 44 C74 34 64 28 50 28 C36 28 26 34 20 44 Z',
  bun: 'M22 46 C22 12 78 12 78 46 C78 34 66 30 50 30 C34 30 22 34 22 46 Z '
     + 'M50 18 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0'
};

/** Everything a child can change today, in the order the chooser shows it. */
export const AVATAR_CHOICES: { key: keyof Avatar; options: string[] }[] = [
  { key: 'skin', options: SKIN_TONES },
  { key: 'hairStyle', options: HAIR_STYLES },
  { key: 'hairColour', options: HAIR_COLOURS },
  { key: 'eyeColour', options: EYE_COLOURS }
];
