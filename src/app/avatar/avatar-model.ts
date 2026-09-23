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
 * when they are trying to make a character theirs.
 *
 * SKIN TONE ALONE IS NOT REPRESENTATION, and this model used to behave as if
 * it were. Work on inclusive avatars (Mack et al., CHI 2023, and the EGAL
 * guidance drawn from it) is explicit: changing skin colour is not enough to
 * represent people of colour, because the shapes of eyes, mouths, hairstyles
 * and HAIR TEXTURES are key physical characteristics too. This had six skin
 * tones and four hair shapes, none of which was a coil, a braid or a loc —
 * so a child could tint the character their colour and still not find
 * themselves in it. Zhang et al. (CHI 2025) separately record that children
 * ask for more hairstyle options than games give them. So none of that is earned —
 * it is free from the first moment, before a single round is played. A child
 * should never have to climb a ladder to be allowed to look like themselves.
 * Items ARE earned. Showing a locked one is the point rather than a tease:
 * a visible goal is what creates the wanting, and an item that records the
 * level it was won at says something about the child who wears it — which is
 * exactly what a bought one cannot say.
 */

export interface Avatar {
  skin: string;
  faceShape: FaceShape;
  hairStyle: HairStyle;
  hairTexture: HairTexture;
  hairColour: string;
  eyeShape: EyeShape;
  eyeColour: string;
  mouthShape: MouthShape;
  /** Item ids, or NO_ITEM. Earned, unlike everything above. */
  hat: string;
  glasses: string;
  top: string;
}

export type ItemSlot = 'hat' | 'glasses' | 'top';

/** Wearing nothing in a slot is always available and never locked. */
export const NO_ITEM = 'none';

export interface WardrobeItem {
  id: string;
  slot: ItemSlot;
  /** The level that wins it. 1 means it was never locked. */
  unlockLevel: number;
  /** The item's main colour — a swatch where it is listed. Drawn in the sprite. */
  colour: string;
  /**
   * Won by playing while a seasonal event is on, rather than by reaching a
   * level. Its `unlockLevel` is never consulted.
   */
  event?: string;
}

export type HairStyle =
  | 'short' | 'long' | 'curly' | 'bun'
  | 'afro' | 'coils' | 'braids' | 'locs' | 'buzz';

export type FaceShape = 'round' | 'oval' | 'square' | 'heart';

/**
 * The shape of the eyes, which used to be one pair of circles on every child.
 * Mack et al. name eye shape among the physical characteristics that skin
 * tone alone cannot stand in for.
 */
export type EyeShape = 'round' | 'almond' | 'wide' | 'narrow';

/** And the mouth, which used to be one curve on every child. */
export type MouthShape = 'smile' | 'grin' | 'soft' | 'open';

/**
 * Hair texture, separate from the shape the hair is cut into — so long hair
 * can be coily, which it could not be while texture was bundled into the
 * style. Drawn as a rim along the hair's own outline rather than as a second
 * silhouette per style, which would have meant nine paths times three.
 */
export type HairTexture = 'smooth' | 'wavy' | 'coily';

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

/**
 * Nine, and the five added last are the point: a coil, a braid, a loc, an
 * afro and a buzz. The first four were all versions of the same hair.
 */
export const HAIR_STYLES: HairStyle[] = [
  'short', 'long', 'curly', 'bun', 'afro', 'coils', 'braids', 'locs', 'buzz'
];

export const FACE_SHAPES: FaceShape[] = ['round', 'oval', 'square', 'heart'];

export const EYE_SHAPES: EyeShape[] = ['round', 'almond', 'wide', 'narrow'];

export const MOUTH_SHAPES: MouthShape[] = ['smile', 'grin', 'soft', 'open'];

export const HAIR_TEXTURES: HairTexture[] = ['smooth', 'wavy', 'coily'];

export function defaultAvatar(): Avatar {
  return {
    skin: SKIN_TONES[2],
    faceShape: 'round',
    hairStyle: 'short',
    hairTexture: 'smooth',
    hairColour: HAIR_COLOURS[1],
    eyeShape: 'round',
    eyeColour: EYE_COLOURS[0],
    mouthShape: 'smile',
    hat: NO_ITEM,
    glasses: NO_ITEM,
    top: NO_ITEM
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
export function normaliseAvatar(raw: any, level = 1, earnedEvents: string[] = []): Avatar {
  const fallback = defaultAvatar();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  return {
    skin: pick(SKIN_TONES, raw.skin, fallback.skin),
    // Absent on every character saved before faces could change, which reads
    // as the round one they have been looking at all along
    faceShape: pick(FACE_SHAPES, raw.faceShape, fallback.faceShape) as FaceShape,
    hairStyle: pick(HAIR_STYLES, raw.hairStyle, fallback.hairStyle) as HairStyle,
    // Absent on every character saved before these could change, and every
    // fallback is exactly what was drawn then — so nobody's character moves
    hairTexture: pick(HAIR_TEXTURES, raw.hairTexture, fallback.hairTexture) as HairTexture,
    hairColour: pick(HAIR_COLOURS, raw.hairColour, fallback.hairColour),
    eyeShape: pick(EYE_SHAPES, raw.eyeShape, fallback.eyeShape) as EyeShape,
    eyeColour: pick(EYE_COLOURS, raw.eyeColour, fallback.eyeColour),
    mouthShape: pick(MOUTH_SHAPES, raw.mouthShape, fallback.mouthShape) as MouthShape,
    hat: wearable('hat', raw.hat, level, earnedEvents),
    glasses: wearable('glasses', raw.glasses, level, earnedEvents),
    top: wearable('top', raw.top, level, earnedEvents)
  };
}

/** The item if it exists and has been earned, otherwise nothing in that slot. */
function wearable(slot: ItemSlot, id: any, level: number, earnedEvents: string[]): string {
  const item = typeof id === 'string' ? findItem(slot, id) : undefined;
  return item && isUnlocked(item, level, earnedEvents) ? item.id : NO_ITEM;
}

function pick<T>(allowed: T[], value: any, fallback: T): T {
  return allowed.indexOf(value) >= 0 ? value : fallback;
}

/*
 * THE ART IS NOT HERE ANY MORE. Hair, faces, eyes, mouths, the body and every
 * wearable item are drawn in src/assets/avatar/parts.svg, generated from
 * scripts/avatar-art/geometry.js, where each hair style is fitted to each
 * face by construction. They used to be fixed path strings in this file, one
 * per style over a shared box, which is why hair floated on 32 of the 36
 * face-and-hair combinations — and why detailed art could not have lived
 * here: this file is in the first load on every screen.
 */

/**
 * A lighter version of a colour, for the texture rim. Kept here rather than
 * in CSS because the hair colour is chosen at runtime and the rim has to
 * follow it — a fixed highlight would read as grey hair on a dark head and
 * as nothing at all on a light one.
 */
export function lighten(colour: string, amount = 0.35): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour || '');
  if (!hex) {
    return colour;
  }
  const value = parseInt(hex[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const lifted = channels.map(channel =>
    Math.max(0, Math.min(255, Math.round(channel + (255 - channel) * amount))));
  return '#' + lifted.map(channel => channel.toString(16).padStart(2, '0')).join('');
}

/** Everything a child can change today, in the order the chooser shows it. */
export const AVATAR_CHOICES: { key: keyof Avatar; options: string[] }[] = [
  { key: 'skin', options: SKIN_TONES },
  { key: 'faceShape', options: FACE_SHAPES },
  { key: 'eyeShape', options: EYE_SHAPES },
  { key: 'eyeColour', options: EYE_COLOURS },
  { key: 'mouthShape', options: MOUTH_SHAPES },
  { key: 'hairStyle', options: HAIR_STYLES },
  { key: 'hairTexture', options: HAIR_TEXTURES },
  { key: 'hairColour', options: HAIR_COLOURS }
];

/**
 * What levels hand over. The early ones come quickly — a first item inside a
 * round or two, so the ladder proves it pays — and then spread out, because a
 * reward at every turn stops reading as a reward at all.
 *
 * An item is data here and a drawing in the sprite: a new one is a line in
 * this list and a function in scripts/avatar-art/build-sprite.js, fitted to
 * each face there. A test fails if an item here has no drawing.
 */
export const WARDROBE: WardrobeItem[] = [
  { id: NO_ITEM, slot: 'hat', unlockLevel: 1, colour: '' },
  {
    id: 'cap',
    slot: 'hat',
    unlockLevel: 2,
    colour: '#c1442e',
  },
  {
    id: 'beanie',
    slot: 'hat',
    unlockLevel: 4,
    colour: '#3f8fd6',
  },
  {
    id: 'crown',
    slot: 'hat',
    unlockLevel: 8,
    colour: '#e0b35a',
  },
  {
    id: 'wizard',
    slot: 'hat',
    unlockLevel: 12,
    colour: '#6b4bb8',
  },

  { id: NO_ITEM, slot: 'glasses', unlockLevel: 1, colour: '' },
  {
    id: 'round-glasses',
    slot: 'glasses',
    unlockLevel: 3,
    colour: '#2b2118',
  },
  {
    id: 'shades',
    slot: 'glasses',
    unlockLevel: 6,
    colour: '#241b33',
  },
  {
    id: 'goggles',
    slot: 'glasses',
    unlockLevel: 10,
    colour: '#3f8f5a',
  }
];

/**
 * The items levels hand over — everything except the empty options and the
 * event items, whose unlockLevel is a sentinel no level ever reaches.
 * Anything reasoning about the level ladder should start here rather than
 * sweeping the whole wardrobe and tripping over that sentinel.
 */
export function levelItems(): WardrobeItem[] {
  return WARDROBE.filter(item => item.id !== NO_ITEM && !item.event);
}

export function itemsForSlot(slot: ItemSlot): WardrobeItem[] {
  return WARDROBE.filter(item => item.slot === slot);
}

export function findItem(slot: ItemSlot, id: string): WardrobeItem | undefined {
  return WARDROBE.find(item => item.slot === slot && item.id === id);
}

/**
 * An item by id alone, for the places that have kept an id and not the slot
 * it came from — a result written down, a keepsake in the scrapbook. Ids are
 * unique across slots apart from the "wearing nothing" option each slot has,
 * which is never a thing anyone earned; a test holds both halves of that.
 */
export function itemById(id: string): WardrobeItem | undefined {
  return id === NO_ITEM ? undefined : WARDROBE.find(item => item.id === id);
}

/**
 * An event item is earned by having been there, not by climbing — so the
 * level says nothing about it either way.
 */
export function isUnlocked(
  item: WardrobeItem,
  level: number,
  earnedEvents: string[] = []
): boolean {
  if (item.event) {
    return earnedEvents.indexOf(item.event) >= 0;
  }
  return level >= item.unlockLevel;
}

/**
 * Exactly what reaching this level hands over — used to name the reward.
 * Wearing nothing is not a reward, so the empty options never count.
 */
export function itemsUnlockedAt(level: number): WardrobeItem[] {
  return levelItems().filter(item => item.unlockLevel === level);
}

/** The next thing to want, so a child can see what they are climbing toward. */
export function nextUnlock(level: number): WardrobeItem | undefined {
  return levelItems()
    .filter(item => item.unlockLevel > level)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
}

/**
 * The character below the chin. Drawn only in the fuller framing: guidance on
 * small avatars is that a circular mask eats the corners first and that thin
 * marks vanish, and the header draws this at 44px inside a circle. Pushing a
 * torso into the same square would crop the shoulders away and shrink the
 * face to pay for them — so the head keeps its own framing, and clothes get
 * a taller one.
 */
export const FULL_VIEW_BOX = '0 0 100 132';
export const PORTRAIT_VIEW_BOX = '0 0 100 100';

/** What the shirt is when a child has not earned another one. */
export const DEFAULT_TOP_COLOUR = '#5b679a';

/**
 * Tops sit between the hats and the glasses in what they cost, so something
 * arrives at nearly every early level without any single slot filling up.
 */
export const TOP_ITEMS: WardrobeItem[] = [
  { id: NO_ITEM, slot: 'top', unlockLevel: 1, colour: DEFAULT_TOP_COLOUR },
  {
    id: 'striped',
    slot: 'top',
    unlockLevel: 5,
    colour: '#c1442e',
  },
  {
    id: 'star-tee',
    slot: 'top',
    unlockLevel: 7,
    colour: '#3f8fd6',
  },
  {
    id: 'hoodie',
    slot: 'top',
    unlockLevel: 9,
    colour: '#3f8f5a',
  }
];

WARDROBE.push(...TOP_ITEMS);

/** The colour the shirt is drawn in, worn or not. */
export function topColour(avatar: Avatar): string {
  const item = findItem('top', avatar.top);
  return item && item.colour ? item.colour : DEFAULT_TOP_COLOUR;
}

/**
 * What the seasonal events hand over. These have no level: a child earns one
 * by playing a round while its event is on, and keeps it for good afterwards.
 * The event comes back next year, so missing one costs nothing permanent.
 */
export const EVENT_ITEMS: WardrobeItem[] = [
  {
    id: 'bobble-hat',
    slot: 'hat',
    event: 'winter',
    unlockLevel: Infinity,
    colour: '#c1442e',
  },
  {
    id: 'flower-tee',
    slot: 'top',
    event: 'spring',
    unlockLevel: Infinity,
    colour: '#8ab84f',
  },
  {
    id: 'spooky-glasses',
    slot: 'glasses',
    event: 'autumn',
    unlockLevel: Infinity,
    colour: '#e07b2a',
  }
];

WARDROBE.push(...EVENT_ITEMS);

/** The item an event hands over, if it has one. */
export function itemForEvent(eventId: string): WardrobeItem | undefined {
  return WARDROBE.find(item => item.event === eventId);
}
