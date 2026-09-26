import { NO_ITEM, WardrobeItem } from './avatar-model';

/**
 * What an item looks like where the character is a head and shoulders, or
 * flat: the dressing-up screen's swatches and the scrapbook. A pet sits
 * beside the stand and a backpack or cape is on the back, so a picture of the
 * character from the front looks much the same with one as without; the
 * thing is shown by itself instead.
 */
export const ITEM_ICONS: { [id: string]: string } = {
  [NO_ITEM]: '○',
  kitten: '🐱',
  puppy: '🐶',
  dragon: '🐲',
  backpack: '🎒',
  cape: '🦸'
};

/** The slots whose items are shown by an icon rather than worn by the character. */
export const ICON_SLOTS = ['pet', 'back'];

/** The icon for an item in one of those slots (each has its own), or '' for anything the character is shown wearing. */
export function itemIcon(item: WardrobeItem | undefined): string {
  return item && ICON_SLOTS.indexOf(item.slot) >= 0 ? ITEM_ICONS[item.id] : '';
}
