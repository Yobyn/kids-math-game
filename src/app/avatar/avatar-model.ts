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
 * Items ARE earned. Showing a locked one is the point rather than a tease:
 * a visible goal is what creates the wanting, and an item that records the
 * level it was won at says something about the child who wears it — which is
 * exactly what a bought one cannot say.
 */

export interface Avatar {
  skin: string;
  hairStyle: HairStyle;
  hairColour: string;
  eyeColour: string;
  /** Item ids, or NO_ITEM. Earned, unlike everything above. */
  hat: string;
  glasses: string;
}

export type ItemSlot = 'hat' | 'glasses';

/** Wearing nothing in a slot is always available and never locked. */
export const NO_ITEM = 'none';

export interface WardrobeItem {
  id: string;
  slot: ItemSlot;
  /** The level that wins it. 1 means it was never locked. */
  unlockLevel: number;
  path: string;
  colour: string;
  /** Drawn as an outline rather than a filled shape. */
  outline?: boolean;
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
    eyeColour: EYE_COLOURS[0],
    hat: NO_ITEM,
    glasses: NO_ITEM
  };
}

/**
 * Takes whatever came out of storage and returns something drawable. A child
 * whose stored character is half-corrupt keeps the parts that survived rather
 * than being reset to a stranger.
 *
 * `level` is what the child has actually earned. An item above it comes off:
 * a crown that was never won is not a crown, and a hand-edited store should
 * not be able to put one on.
 */
export function normaliseAvatar(raw: any, level = 1): Avatar {
  const fallback = defaultAvatar();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  return {
    skin: pick(SKIN_TONES, raw.skin, fallback.skin),
    hairStyle: pick(HAIR_STYLES, raw.hairStyle, fallback.hairStyle) as HairStyle,
    hairColour: pick(HAIR_COLOURS, raw.hairColour, fallback.hairColour),
    eyeColour: pick(EYE_COLOURS, raw.eyeColour, fallback.eyeColour),
    hat: wearable('hat', raw.hat, level),
    glasses: wearable('glasses', raw.glasses, level)
  };
}

/** The item if it exists and has been earned, otherwise nothing in that slot. */
function wearable(slot: ItemSlot, id: any, level: number): string {
  const item = typeof id === 'string' ? findItem(slot, id) : undefined;
  return item && isUnlocked(item, level) ? item.id : NO_ITEM;
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

/**
 * What levels hand over. The early ones come quickly — a first item inside a
 * round or two, so the ladder proves it pays — and then spread out, because a
 * reward at every turn stops reading as a reward at all.
 *
 * Each item is one path over the same 100x100 box as the face, so a new one
 * costs a line here and nothing anywhere else.
 */
export const WARDROBE: WardrobeItem[] = [
  { id: NO_ITEM, slot: 'hat', unlockLevel: 1, path: '', colour: '' },
  {
    id: 'cap',
    slot: 'hat',
    unlockLevel: 2,
    colour: '#c1442e',
    path: 'M25 33 C25 8 75 8 75 33 Z M13 33 Q33 25 52 33 Q33 39 13 33 Z'
  },
  {
    id: 'beanie',
    slot: 'hat',
    unlockLevel: 4,
    colour: '#3f8fd6',
    path: 'M25 31 C25 6 75 6 75 31 Z M21 29 L79 29 L79 38 L21 38 Z'
  },
  {
    id: 'crown',
    slot: 'hat',
    unlockLevel: 8,
    colour: '#e0b35a',
    path: 'M26 34 L26 12 L38 23 L50 8 L62 23 L74 12 L74 34 Z'
  },
  {
    id: 'wizard',
    slot: 'hat',
    unlockLevel: 12,
    colour: '#6b4bb8',
    path: 'M50 0 L70 33 L30 33 Z M18 33 L82 33 L82 40 L18 40 Z'
  },

  { id: NO_ITEM, slot: 'glasses', unlockLevel: 1, path: '', colour: '' },
  {
    id: 'round-glasses',
    slot: 'glasses',
    unlockLevel: 3,
    colour: '#2b2118',
    outline: true,
    path: 'M31 52 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 '
        + 'M53 52 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M47 52 L53 52'
  },
  {
    id: 'shades',
    slot: 'glasses',
    unlockLevel: 6,
    colour: '#241b33',
    path: 'M27 45 L47 45 L45 59 L29 59 Z M53 45 L73 45 L71 59 L55 59 Z '
        + 'M47 48 L53 48 L53 51 L47 51 Z'
  },
  {
    id: 'goggles',
    slot: 'glasses',
    unlockLevel: 10,
    colour: '#3f8f5a',
    path: 'M18 49 L82 49 L82 55 L18 55 Z '
        + 'M30 52 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0 '
        + 'M50 52 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0'
  }
];

export function itemsForSlot(slot: ItemSlot): WardrobeItem[] {
  return WARDROBE.filter(item => item.slot === slot);
}

export function findItem(slot: ItemSlot, id: string): WardrobeItem | undefined {
  return WARDROBE.find(item => item.slot === slot && item.id === id);
}

export function isUnlocked(item: WardrobeItem, level: number): boolean {
  return level >= item.unlockLevel;
}

/**
 * Exactly what reaching this level hands over — used to name the reward.
 * Wearing nothing is not a reward, so the empty options never count.
 */
export function itemsUnlockedAt(level: number): WardrobeItem[] {
  return WARDROBE.filter(item => item.id !== NO_ITEM && item.unlockLevel === level);
}

/** The next thing to want, so a child can see what they are climbing toward. */
export function nextUnlock(level: number): WardrobeItem | undefined {
  return WARDROBE
    .filter(item => item.id !== NO_ITEM && item.unlockLevel > level)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
}
