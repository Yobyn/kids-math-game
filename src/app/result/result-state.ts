/**
 * The end of a round, written down so it can still be SEEN.
 *
 * Round persistence stopped at the tenth answer. Everything a finished round
 * earned was already safe — the round went into history, the experience was
 * added, a level's items and an event's item were recorded — but if the phone
 * took the screen away between the last answer and the result, none of it was
 * ever shown. Reloading the tab landed on a screen with no score behind it.
 *
 * WHAT IS LOST THERE IS NOT PROGRESS, IT IS ACKNOWLEDGEMENT, and the research
 * is specifically about that difference. Poeller et al. (Proceedings of the
 * ACM on Human-Computer Interaction / CHI PLAY 2024, "Disengagement From
 * Games", peer-reviewed) find that satisfying exits happen at STRUCTURAL
 * ENDPOINTS — a level completed, a round finished — and that the exits
 * players describe as bad are the ones where effort went UNACKNOWLEDGED. The
 * strongest single facilitator of a good exit in their survey was avoidance
 * of progress loss. A finished round whose result was never seen is exactly
 * the bad case: the work was done, the numbers were kept, and the child was
 * never told.
 *
 * So the result is saved when it is shown, and shown again if it never was.
 *
 * TWO RULES MAKE THAT SAFE:
 *  - Nothing here is ever awarded twice. What is stored is what to SAY, not
 *    what to give; the giving already happened and is recorded elsewhere.
 *  - A result is only offered back if it was never seen. Once a child has
 *    read their result, showing it again is not closure, it is a repeat.
 */

export const RESULT_VERSION = 1;

/**
 * How long a result is still worth showing. The same four hours a round is
 * offered back for, and for the same reason: long enough for a meal, a
 * school run or a flat battery, short enough that a child is not handed a
 * celebration for a round they no longer remember playing.
 */
export const RESULT_WINDOW_MS = 4 * 60 * 60 * 1000;

export interface SavedResult {
  version: number;
  /** Epoch milliseconds. The only thing the window below is measured from. */
  savedAt: number;
  /** True once the child has actually looked at it. */
  seen: boolean;
  score: number;
  total: number;
  correctAnswers: number;
  percentage: number;
  /** The best before this round, for saying whether this one beat it. */
  previousBest: number | null;
  isPersonalBest: boolean;
  roundsPlayed: number;
  xpEarned: number;
  /** Experience AFTER the round, so the level and bar are recomputed, not stored. */
  xpAfter: number;
  leveledUp: boolean;
  /** Ids of what the level handed over. The items themselves are looked up. */
  unlockedIds: string[];
  /** The seasonal event that was on, if any. */
  eventId?: string;
  eventJustEarned: boolean;
}

function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/** A percentage safe to put in front of a child: never NaN, never off the scale. */
function percent(value: any): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(100, Math.max(0, parsed));
}

export function serialiseResult(result: SavedResult): string {
  return JSON.stringify(result);
}

/**
 * A stored result, or null. Null covers every way this can go wrong, because
 * all of them mean the same thing: there is nothing to show, so do not show
 * anything. A result screen is never worth an error in front of a child.
 *
 * A round with no questions in it is null too. That is not a result, it is
 * the shape a score service that has just been reset produces — and it used
 * to reach the screen as `NaN%`.
 */
export function parseResult(raw: string | null | undefined): SavedResult | null {
  if (!raw) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || parsed.version !== RESULT_VERSION) {
    return null;
  }

  const savedAt = Number(parsed.savedAt);
  const total = whole(parsed.total);
  if (!Number.isFinite(savedAt) || !total) {
    return null;
  }

  const previousBest = Number(parsed.previousBest);

  return {
    version: RESULT_VERSION,
    savedAt,
    seen: parsed.seen === true,
    score: whole(parsed.score),
    total,
    // Never more right answers than questions asked, whatever the store says
    correctAnswers: Math.min(total, whole(parsed.correctAnswers)),
    percentage: percent(parsed.percentage),
    previousBest: Number.isFinite(previousBest) ? percent(previousBest) : null,
    isPersonalBest: parsed.isPersonalBest === true,
    roundsPlayed: whole(parsed.roundsPlayed),
    xpEarned: whole(parsed.xpEarned),
    xpAfter: whole(parsed.xpAfter),
    leveledUp: parsed.leveledUp === true,
    unlockedIds: Array.isArray(parsed.unlockedIds)
      ? parsed.unlockedIds.filter((id: any) => typeof id === 'string' && id)
      : [],
    ...(typeof parsed.eventId === 'string' && parsed.eventId
      ? { eventId: parsed.eventId }
      : {}),
    eventJustEarned: parsed.eventJustEarned === true
  };
}

/** How old a saved result is. A clock moved backwards reads as brand new. */
export function resultAge(result: SavedResult, now: number): number {
  return Math.max(0, now - result.savedAt);
}

/**
 * Whether this is still worth putting on the screen at all — for the child
 * coming back to the result screen itself, where the question is only "is
 * this still today's round".
 */
export function isShowable(result: SavedResult | null, now: number): boolean {
  return !!result && resultAge(result, now) <= RESULT_WINDOW_MS;
}

/**
 * Whether to OFFER it from somewhere else, which is a stricter question. A
 * result the child has already read is not closure waiting to happen; it is
 * a screen they have finished with, and putting it back in front of them
 * would be the game deciding they had not finished with it.
 */
export function isUnseen(result: SavedResult | null, now: number): boolean {
  return isShowable(result, now) && !result!.seen;
}
