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
  path: string;
  colour: string;
  /** Drawn as an outline rather than a filled shape. */
  outline?: boolean;
  /**
   * A top colours the whole shirt rather than sitting on top of the face, so
   * its `path` is decoration drawn over that shirt — stripes, a badge — and
   * may be empty.
   */
  decorationColour?: string;
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
     + 'M50 18 m-9 0 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0',
  // Wider than the face on both sides, which is the whole shape of it
  afro: 'M12 50 A38 38 0 0 1 88 50 C88 34 71 26 50 26 C29 26 12 34 12 50 Z',
  // Tight and close to the scalp, scalloped rather than smooth
  coils: 'M22 47 A9 9 0 0 1 33 30 A9 9 0 0 1 41 22 A9 9 0 0 1 50 17 '
       + 'A9 9 0 0 1 59 22 A9 9 0 0 1 67 30 A9 9 0 0 1 78 47 '
       + 'C73 36 63 31 50 31 C37 31 27 36 22 47 Z',
  braids: 'M22 46 C22 12 78 12 78 46 C78 34 66 30 50 30 C34 30 22 34 22 46 Z '
        + 'M19 42 L29 42 L29 86 L19 86 Z M71 42 L81 42 L81 86 L71 86 Z',
  locs: 'M22 46 C22 12 78 12 78 46 C78 34 66 30 50 30 C34 30 22 34 22 46 Z '
      + 'M18 44 L23 44 L23 82 L18 82 Z M25 47 L30 47 L30 74 L25 74 Z '
      + 'M70 47 L75 47 L75 74 L70 74 Z M77 44 L82 44 L82 82 L77 82 Z',
  // Cropped right down: a thin cap that follows the skull
  buzz: 'M25 45 C25 8 75 8 75 45 C75 30 64 26 50 26 C36 26 25 30 25 45 Z'
};

/**
 * The face shapes, over the same box. `round` is exactly the circle the face
 * was before it could change, so every character saved until now looks
 * identical after this.
 */
export const FACE_PATHS: { [shape in FaceShape]: string } = {
  round: 'M50 24 C66.6 24 80 37.4 80 54 C80 70.6 66.6 84 50 84 '
       + 'C33.4 84 20 70.6 20 54 C20 37.4 33.4 24 50 24 Z',
  oval: 'M50 22 C64.9 22 77 36.3 77 54 C77 71.7 64.9 86 50 86 '
      + 'C35.1 86 23 71.7 23 54 C23 36.3 35.1 22 50 22 Z',
  // Wide and flat-jawed, so the difference is in the silhouette and not only
  // in the bounding box a test can measure
  square: 'M34 25 L66 25 Q82 25 82 42 L82 66 Q82 83 64 83 L36 83 '
        + 'Q18 83 18 66 L18 42 Q18 25 34 25 Z',
  // Broad at the temples and tapering to a point, which is what makes it
  // read as a different face rather than a slightly smaller one
  heart: 'M50 22 C70 22 82 35 82 50 C82 66 69 77 50 89 '
       + 'C31 77 18 66 18 50 C18 35 30 22 50 22 Z'
};

/**
 * Both eyes in one path, so a shape is one string rather than a pair that can
 * drift apart. `round` is exactly the two circles the eyes were before this,
 * to the same centres and radius, so no saved character changes.
 *
 * Every shape covers (39, 50.5) and (61, 50.5), because that is where the
 * white glint sits and a glint outside the eye is a freckle.
 */
export const EYE_PATHS: { [shape in EyeShape]: string } = {
  round: 'M34.5 52 a4.5 4.5 0 1 0 9 0 a4.5 4.5 0 1 0 -9 0 '
       + 'M56.5 52 a4.5 4.5 0 1 0 9 0 a4.5 4.5 0 1 0 -9 0',
  // Tapered at both corners, which is the shape a circle cannot make
  almond: 'M33 52 Q39 46 45 52 Q39 58 33 52 Z '
        + 'M55 52 Q61 46 67 52 Q61 58 55 52 Z',
  wide: 'M33 52 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 '
      + 'M55 52 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
  // Long and low, and still tall enough at the centre to hold the glint
  narrow: 'M32.5 52 Q39 47.5 45.5 52 Q39 55.5 32.5 52 Z '
        + 'M54.5 52 Q61 47.5 67.5 52 Q61 55.5 54.5 52 Z'
};

export interface Mouth {
  d: string;
  /** Filled shapes are drawn rather than traced. */
  filled?: boolean;
}

/** `smile` is exactly the curve every child used to have. */
export const MOUTH_PATHS: { [shape in MouthShape]: Mouth } = {
  smile: { d: 'M40 66 Q50 74 60 66' },
  grin: { d: 'M36 65 Q50 78 64 65' },
  soft: { d: 'M42 68 Q50 71.5 58 68' },
  open: { d: 'M41 65 Q50 62 59 65 Q50 78 41 65 Z', filled: true }
};

/**
 * Texture as a rim along the hair's own outline: a dash pattern, drawn in a
 * lighter tint of the hair colour over the same path.
 *
 * THE OBVIOUS DESIGN WAS A SECOND SILHOUETTE PER STYLE, and it does not
 * survive contact with the styles already here: nine styles times three
 * textures is twenty-seven hand-drawn shapes, and five of the styles — afro,
 * coils, braids, locs, curly — ARE a texture, so a texture control over them
 * would be asking the same question twice. A rim composes with every style,
 * costs no new paths, and lets a child have long coily hair, which is the
 * thing that was actually missing.
 *
 * An empty pattern means no rim at all, so `smooth` draws exactly what was
 * drawn before.
 */
export const TEXTURE_DASHES: { [texture in HairTexture]: string } = {
  smooth: '',
  wavy: '7 5',
  coily: '0.5 4'
};

/** How wide the rim is drawn, which is what makes a dash read as a coil. */
export const TEXTURE_WIDTH: { [texture in HairTexture]: number } = {
  smooth: 0,
  wavy: 3,
  coily: 4
};

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

export const NECK_PATH = 'M42 78 L58 78 L58 96 L42 96 Z';
export const TORSO_PATH = 'M50 90 C28 90 16 104 16 132 L84 132 C84 104 72 90 50 90 Z';

/** What the shirt is when a child has not earned another one. */
export const DEFAULT_TOP_COLOUR = '#5b679a';

/**
 * Tops sit between the hats and the glasses in what they cost, so something
 * arrives at nearly every early level without any single slot filling up.
 */
export const TOP_ITEMS: WardrobeItem[] = [
  { id: NO_ITEM, slot: 'top', unlockLevel: 1, path: '', colour: DEFAULT_TOP_COLOUR },
  {
    id: 'striped',
    slot: 'top',
    unlockLevel: 5,
    colour: '#c1442e',
    decorationColour: '#f5ece0',
    path: 'M22 106 L80 106 L81 113 L21 113 Z M17 120 L84 120 L84 127 L16 127 Z'
  },
  {
    id: 'star-tee',
    slot: 'top',
    unlockLevel: 7,
    colour: '#3f8fd6',
    decorationColour: '#ffd34d',
    path: 'M50 102 L55 114 L68 114 L58 122 L62 132 L50 125 L38 132 L42 122 L32 114 L45 114 Z'
  },
  {
    id: 'hoodie',
    slot: 'top',
    unlockLevel: 9,
    colour: '#3f8f5a',
    decorationColour: '#26603c',
    path: 'M50 90 C40 90 34 96 34 104 C40 98 44 96 50 96 C56 96 60 98 66 104 '
        + 'C66 96 60 90 50 90 Z M49 106 L51 106 L51 126 L49 126 Z'
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
    path: 'M25 34 C25 12 75 12 75 34 Z M21 32 L79 32 L79 40 L21 40 Z '
        + 'M50 10 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0'
  },
  {
    id: 'flower-tee',
    slot: 'top',
    event: 'spring',
    unlockLevel: Infinity,
    colour: '#8ab84f',
    decorationColour: '#f5d6e8',
    path: 'M50 106 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 '
        + 'M38 116 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 '
        + 'M62 116 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 '
        + 'M50 126 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0'
  },
  {
    id: 'spooky-glasses',
    slot: 'glasses',
    event: 'autumn',
    unlockLevel: Infinity,
    colour: '#e07b2a',
    path: 'M26 44 L48 44 L44 60 L30 60 Z M52 44 L74 44 L70 60 L56 60 Z '
        + 'M48 47 L52 47 L52 50 L48 50 Z'
  }
];

WARDROBE.push(...EVENT_ITEMS);

/** The item an event hands over, if it has one. */
export function itemForEvent(eventId: string): WardrobeItem | undefined {
  return WARDROBE.find(item => item.event === eventId);
}
