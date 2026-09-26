import { Avatar, ItemSlot } from './avatar-model';
import { TranslationKeys } from '../services/language.service';

/**
 * How the character page is divided, kept free of the DOM so the one thing
 * that actually goes wrong here can be checked: a part of the character that
 * belongs to no section, or to two.
 *
 * WHY IT IS DIVIDED AT ALL. The page was one column of eight rows — 1862px
 * at 390px wide, 2.2 screenfuls, and 3.7 with the phone on its side, the
 * longest screen left in the game. Every row was equally present and none of
 * them was findable. Fu et al. (2025, preprint: 48 children aged 8-13,
 * interviews and observed play) put SELF-REPRESENTATION first among four
 * reasons children make avatars, ahead of experimenting, fitting in and
 * playing better — so the parts that make a face look like a particular child
 * are the ones that should not be at the bottom of a scroll.
 *
 * So: the face, the hair, and the things you put on — in that order, because
 * that is the order of how much they say about who the child is, and because
 * the last of the three is the only one with anything locked in it.
 */
export type SectionId = 'face' | 'hair' | 'wardrobe';

/** A row of choices: either a part of the character, or a slot to fill. */
export interface ChooserRow {
  /**
   * The heading's translation key, which is also the swatch's label. Typed
   * as a key rather than a string so a heading that was never translated
   * fails the build instead of showing a child a raw identifier.
   */
  heading: TranslationKeys;
  /** Set for the parts a child changes directly. */
  part?: keyof Avatar;
  /** Set for the earned rows instead. */
  slot?: ItemSlot;
  /** Colour swatches show a colour; shape swatches draw the character. */
  shape?: boolean;
  /**
   * Set for a choice the flat drawing cannot show (the figure is only in
   * 3D): each option is a word and a picture instead.
   */
  labels?: boolean;
}

export interface ChooserSection {
  id: SectionId;
  heading: TranslationKeys;
  rows: ChooserRow[];
}

/**
 * Boy or girl: asked above the sections, not in one of them. It is the
 * choice the rest are made on, and the face section already has its handful.
 */
export const BODY_ROW: ChooserRow = { heading: 'body-type', part: 'bodyType', labels: true };

export const SECTIONS: ChooserSection[] = [
  {
    id: 'face',
    heading: 'your-face',
    rows: [
      { heading: 'skin', part: 'skin' },
      { heading: 'face-shape', part: 'faceShape', shape: true },
      { heading: 'eye-shape', part: 'eyeShape', shape: true },
      { heading: 'eyes', part: 'eyeColour' },
      { heading: 'mouth-shape', part: 'mouthShape', shape: true }
    ]
  },
  {
    id: 'hair',
    heading: 'your-hair',
    rows: [
      { heading: 'hair-style', part: 'hairStyle', shape: true },
      { heading: 'hair-texture', part: 'hairTexture', shape: true },
      { heading: 'hair-colour', part: 'hairColour' }
    ]
  },
  {
    id: 'wardrobe',
    heading: 'things-to-wear',
    rows: [
      { heading: 'hats', slot: 'hat', shape: true },
      { heading: 'glasses', slot: 'glasses', shape: true },
      { heading: 'tops', slot: 'top', shape: true },
      { heading: 'on-your-back', slot: 'back', shape: true },
      { heading: 'pets', slot: 'pet', shape: true }
    ]
  }
];

/** Which section a part of the character lives in, or undefined for none. */
export function sectionOfPart(part: keyof Avatar): SectionId | undefined {
  const found = SECTIONS.find(section => section.rows.some(row => row.part === part));
  return found && found.id;
}

/** Which section a wearable slot lives in. */
export function sectionOfSlot(slot: ItemSlot): SectionId | undefined {
  const found = SECTIONS.find(section => section.rows.some(row => row.slot === slot));
  return found && found.id;
}

/** Every row across every section, in order. */
export function allRows(): ChooserRow[] {
  return SECTIONS.reduce((rows, section) => rows.concat(section.rows), [] as ChooserRow[]);
}
