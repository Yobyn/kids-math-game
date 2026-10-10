import { Avatar, NO_ITEM, itemById } from '../avatar/avatar-model';

/**
 * The child's own colour for the middle of the paddle: the top their
 * character wears, in the colour they picked for it, or its own colour.
 * Null when there is none to take (no top, or not the kid hero), and the
 * paddle is then the field's colours end to end.
 */
export function paddleColour(avatar: Avatar | null | undefined): string | null {
  if (!avatar || avatar.family !== 'kid' || !avatar.top || avatar.top === NO_ITEM) {
    return null;
  }
  if (/^#[0-9a-f]{6}$/i.test(avatar.topColour || '')) {
    return avatar.topColour;
  }
  const item = itemById(avatar.top);
  return item && /^#[0-9a-f]{6}$/i.test(item.colour) ? item.colour : null;
}
