import { NO_ITEM, WARDROBE, findItem } from './avatar-model';
import { ICON_SLOTS, ITEM_ICONS, itemIcon } from './item-icons';

describe('item icons', () => {
  it('gives every pet and everything for the back an icon of its own', () => {
    const shown = WARDROBE.filter(item => ICON_SLOTS.indexOf(item.slot) >= 0 && item.id !== NO_ITEM);
    expect(shown.length).toBe(5);
    const icons = shown.map(item => itemIcon(item));
    icons.forEach(icon => expect(icon.length).toBeGreaterThan(0));
    expect(new Set(icons).size).toBe(icons.length);
    // And "nothing" has one too, in each of those rows
    ICON_SLOTS.forEach(slot => expect(itemIcon(findItem(slot as any, NO_ITEM))).toBe(ITEM_ICONS[NO_ITEM]));
  });

  it('gives nothing an icon that the character is shown wearing', () => {
    expect(itemIcon(findItem('hat', 'crown'))).toBe('');
    expect(itemIcon(findItem('top', 'hoodie'))).toBe('');
    expect(itemIcon(undefined)).toBe('');
  });
});
