import { ItemSlot, WARDROBE, WardrobeItem, levelItems } from './avatar-model';

/*
 * Wardrobe questions that only the dressing-up screen asks; here rather
 * than in avatar-model.ts, which is in the first load, so they load with
 * that screen.
 */

export function itemsForSlot(slot: ItemSlot): WardrobeItem[] {
  return WARDROBE.filter(item => item.slot === slot);
}

/** The next thing to want, so a child can see what they are climbing toward. */
export function nextUnlock(level: number): WardrobeItem | undefined {
  return levelItems()
    .filter(item => item.unlockLevel > level)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0];
}
