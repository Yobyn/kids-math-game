import { FAMILIES, Family } from '../avatar/avatar-model';

/**
 * Experience per kind of character (Yobyn, 2026-10-10: "when you level you
 * only level that avatar, because if you switch now you can have all
 * unlocked"). Each family climbs on its own: a robot played to level 12 is a
 * mech, and the dragon the child switches to next starts as an egg until it
 * is played too. What a round or the ball game pays goes to the character
 * being played.
 *
 * Kept free of Angular and of localStorage so the rules can be tested as
 * what they are: functions of plain objects.
 */
export type FamilyXp = { [family in Family]?: number };

/** A count that can be compared: never NaN, never negative. */
function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/** Only families there are, only whole amounts above nothing. */
export function cleanFamilyXp(raw: any): FamilyXp {
  const clean: FamilyXp = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return clean;
  }
  FAMILIES.forEach(family => {
    const xp = whole(raw[family]);
    if (xp) {
      clean[family] = xp;
    }
  });
  return clean;
}

/** The family a stored character is, or the kid hero everyone starts as. */
export function familyOf(avatar: any): Family {
  const family = avatar && typeof avatar === 'object' ? avatar.family : undefined;
  return FAMILIES.indexOf(family) >= 0 ? family : 'kid';
}

/**
 * The experience in something saved before it was kept per family: one
 * number for everything. It goes to the character the child had then, the
 * one they earned it with, so nobody's character shrinks on the update.
 */
export function fromShared(xp: any, avatar: any): FamilyXp {
  const amount = whole(xp);
  return amount ? { [familyOf(avatar)]: amount } : {};
}

/**
 * Both sets, family by family. `combine` is the whole difference between the
 * two merges there are: the higher of two copies of one child (two devices),
 * or the sum of two children's earnings (a guest signing up).
 */
export function combineFamilyXp(a: FamilyXp, b: FamilyXp, combine: (x: number, y: number) => number): FamilyXp {
  const own = cleanFamilyXp(a);
  const other = cleanFamilyXp(b);
  return cleanFamilyXp(FAMILIES.reduce((all, family) => ({
    ...all,
    [family]: combine(own[family] || 0, other[family] || 0)
  }), {} as FamilyXp));
}

/** Everything earned with every character, for "is there anything here". */
export function totalXp(xp: FamilyXp): number {
  return FAMILIES.reduce((sum, family) => sum + (cleanFamilyXp(xp)[family] || 0), 0);
}
