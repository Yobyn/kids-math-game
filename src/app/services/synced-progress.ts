/**
 * Merging one child's progress across two devices.
 *
 * THE RULE IS: a pull never overwrites what this device already has. It fills
 * gaps, and for numbers that only ever rise it takes the higher of the two.
 * Nothing a child earned anywhere can be destroyed by opening the game
 * somewhere else, which is the only guarantee worth making here — two devices
 * that have both been played on will each have rounds the other has never
 * seen, and no clock can be trusted to say which is "newer" when one tablet's
 * date is a year out.
 *
 * THE SUBTLE PART, and the one that would have quietly doubled every child's
 * experience: this is NOT the same merge as a guest signing up. Adopting a
 * guest's progress SUMS experience and totals, because a guest and an account
 * are two different identities whose separate earnings are being combined.
 * Two devices are two copies of ONE identity, so summing would count the same
 * round twice, and do it again on every sync. Here, numbers take the maximum.
 *
 * Kept free of Angular and of localStorage so it can be tested as what it is:
 * a function of two objects.
 */

/** The version of the shape, so an older client's push is recognisable. */
export const SYNCED_VERSION = 1;

/** Enough to show improvement over time; matches the history cap on device. */
const MAX_ROUNDS = 20;

export interface SyncedTotals {
  rounds: number;
  questions: number;
  correct: number;
}

export interface SyncedRound {
  date: string;
  [key: string]: any;
}

export interface SyncedEarned {
  id: string;
  date?: string;
}

/**
 * What crosses the network. Everything is optional: a device that has never
 * played has none of it, and an older client may not know a later field.
 *
 * What is NOT here is the point — see server/progress-store.js. The facts a
 * child keeps getting wrong never leave the device.
 */
export interface SyncedProgress {
  version: number;
  roundHistory?: SyncedRound[];
  xp?: number;
  totals?: SyncedTotals;
  events?: SyncedEarned[];
  keepsakes?: SyncedEarned[];
  avatar?: any;
}

function list(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

/** A count that can be compared: never NaN, never negative. */
function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * Two copies of a round are the same round when they happened at the same
 * instant. The date is an ISO timestamp written at the moment a round ended,
 * so two devices agreeing on it means one of them synced the other's round —
 * not that a child played twice in the same millisecond.
 */
function roundKey(round: SyncedRound): string {
  return String(round && round.date);
}

/** Newest first, nothing dropped that this device had, capped. */
export function mergeRounds(mine: any, theirs: any): SyncedRound[] {
  const seen = new Set<string>();
  return [...list(mine), ...list(theirs)]
    .filter(round => round && typeof round === 'object' && round.date)
    .filter(round => {
      const key = roundKey(round);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_ROUNDS);
}

/** Union by id. This device's own entry wins, since it carries its own date. */
export function mergeEarned(mine: any, theirs: any): SyncedEarned[] {
  const merged = list(mine).filter(entry => entry && typeof entry === 'object' && entry.id);
  list(theirs)
    .filter(entry => entry && typeof entry === 'object' && entry.id)
    .forEach(entry => {
      if (!merged.some(own => own.id === entry.id)) {
        merged.push(entry);
      }
    });
  return merged;
}

export function mergeTotals(mine: any, theirs: any): SyncedTotals {
  const a = mine || {};
  const b = theirs || {};
  return {
    rounds: Math.max(whole(a.rounds), whole(b.rounds)),
    questions: Math.max(whole(a.questions), whole(b.questions)),
    correct: Math.max(whole(a.correct), whole(b.correct))
  };
}

/**
 * Merges what the server had into what this device has.
 *
 * `mine` always wins where the two disagree about something that is a choice
 * rather than an accumulation — the avatar. A child who is looking at this
 * device right now should not watch their character change under them; the
 * server's is taken only when this device has never had one, which is exactly
 * the new-phone case this whole feature exists for.
 */
export function mergeSynced(mine: SyncedProgress | null, theirs: SyncedProgress | null): SyncedProgress {
  const own = mine || { version: SYNCED_VERSION };
  const other = theirs || { version: SYNCED_VERSION };

  const merged: SyncedProgress = {
    version: SYNCED_VERSION,
    roundHistory: mergeRounds(own.roundHistory, other.roundHistory),
    xp: Math.max(whole(own.xp), whole(other.xp)),
    totals: mergeTotals(own.totals, other.totals),
    events: mergeEarned(own.events, other.events),
    keepsakes: mergeEarned(own.keepsakes, other.keepsakes)
  };

  const avatar = own.avatar || other.avatar;
  if (avatar) {
    merged.avatar = avatar;
  }
  return merged;
}

/** True when there is anything in here worth a network round trip. */
export function worthSyncing(progress: SyncedProgress | null): boolean {
  if (!progress) {
    return false;
  }
  return !!(
    (progress.roundHistory && progress.roundHistory.length) ||
    progress.xp ||
    (progress.totals && progress.totals.rounds) ||
    (progress.events && progress.events.length) ||
    (progress.keepsakes && progress.keepsakes.length) ||
    progress.avatar
  );
}

/**
 * True when `merged` holds something `against` does not.
 *
 * Both sides are run through the same merge before comparing, so the answer
 * is about content and not about key order or a missing empty list — which
 * matters, because this decides whether a request is made at all.
 */
export function addsTo(merged: SyncedProgress, against: SyncedProgress | null): boolean {
  return JSON.stringify(merged) !== JSON.stringify(mergeSynced(against, against));
}
