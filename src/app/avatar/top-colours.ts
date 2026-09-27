import { Avatar, DEFAULT_TOP_COLOUR, NO_ITEM, findItem } from './avatar-model';

/**
 * The colours any top can be worn in, besides its own. Bright and plain, so
 * each reads at a glance on a small swatch and on the character, and none is
 * near another or near a top's own colour (a test holds both).
 *
 * Only the dressing-up screen and the 3D character use these, both lazy, so
 * the list stays out of the first load: the saved character carries
 * `topColour` as it is, and a value not on this list means the top's own.
 */
export const TOP_COLOURS = ['#ff5a5a', '#f28c28', '#f5c518', '#3dbb5e', '#8e5bd6', '#e85aa7', '#f2f2f5', '#2d2d38'];

/** The colour a top is: its own, or the one chosen for it if that is on offer. */
export function ownTopColour(avatar: Pick<Avatar, 'top'>): string {
  const top = findItem('top', avatar.top);
  return top && top.id !== NO_ITEM ? top.colour : DEFAULT_TOP_COLOUR;
}

export function topColourOf(avatar: Pick<Avatar, 'top' | 'topColour'>): string {
  return TOP_COLOURS.indexOf(avatar.topColour) >= 0 ? avatar.topColour : ownTopColour(avatar);
}
