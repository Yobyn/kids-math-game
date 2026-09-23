import { Injectable } from '@angular/core';
import { afterMiss, afterReview, dayKey, dueFacts } from '../teaching/review-schedule';
import { SavedRound, parseRound, serialiseRound } from '../question/round-state';
import { SavedResult, parseResult, serialiseResult } from '../result/result-state';
import { LearnedFact, parseLearned, rememberLearned } from '../teaching/learned';
import { MoneyQuestion } from '../teaching/money';
import {
  SYNCED_VERSION,
  SyncedProgress,
  SyncedRound,
  worthSyncing
} from './synced-progress';
import {
  EarnedEvent,
  EarnedItem,
  readEarnedEvents,
  readEarnedItems
} from '../scrapbook/scrapbook';

export interface RoundResult {
  date: string;
  correctAnswers: number;
  total: number;
  percentage: number;
  score: number;
  grade: number;
  /**
   * The setting it was played at. Optional because rounds recorded before
   * this existed have no answer, and a round that cannot say how hard it was
   * must not be counted as evidence about how hard it should be.
   */
  difficulty?: string;
}

/**
 * Everything a child has done, counted rather than listed. Stored rather than
 * derived from history for the same reason experience is: history keeps only
 * the last twenty rounds, and a child who played fifty should not be told
 * they played twenty. These only ever go up.
 */
export interface PlayTotals {
  rounds: number;
  questions: number;
  correct: number;
}

export interface MissedFact {
  num1: number;
  num2: number;
  operation: string;
  /**
   * The whole money question, when that is what was missed. A money question
   * is no longer a sum with a sentence in front of it — the pieces on the
   * table and the unit the answer is in are part of the question, so they
   * have to come back with it tomorrow.
   */
  money?: MoneyQuestion;
  /**
   * The day this fact is ready to be asked again (YYYY-MM-DD, local). Absent
   * on facts stored before the schedule existed, which reads as due now.
   */
  due?: string;
  /** Correct retrievals, on separate days, since it was last missed. */
  reviews?: number;
}

const STORAGE_KEY = 'roundHistory';
const MISSED_KEY = 'missedFacts';
const XP_KEY = 'xp';
const EVENTS_KEY = 'events';
const TOTALS_KEY = 'totals';
/** The one round still in play, if any. At most one per owner. */
const ROUND_KEY = 'round';
const RESULT_KEY = 'result';
const LEARNED_KEY = 'learned';
/** Items won, with the day they were won. See scrapbook/scrapbook.ts. */
const KEEPSAKES_KEY = 'keepsakes';
/** Enough to carry a round's mistakes forward without burying the next one. */
const MAX_MISSED = 12;
/** Enough to show improvement over time without growing without bound. */
const MAX_ROUNDS = 20;

/** Who a stored round belongs to while nobody has signed in. */
export const GUEST_OWNER = 'guest';

/** The owner an account's progress is filed under. */
export function accountOwner(username: string): string {
  return `user:${username}`;
}

/** A count that is safe to put in front of a child: never NaN, never negative. */
function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function factSignature(fact: MissedFact): string {
  if (fact.money) {
    // Every money question has the same 0/money/0 sum behind it, so the
    // identity has to come from the question itself or they all collide.
    return `money:${fact.money.shape}:${fact.money.answerCents}:${fact.money.pile.join('-')}`
      + `:${Object.keys(fact.money.values).map(name => fact.money!.values[name]).join('-')}`;
  }
  return `${fact.num1}${fact.operation}${fact.num2}`;
}

/**
 * Newest first, capped, with nothing dropped that both sides did not already
 * agree on — a child who signs up should not watch rounds disappear.
 */
export function mergeHistory(existing: RoundResult[], incoming: RoundResult[]): RoundResult[] {
  return [...existing, ...incoming]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_ROUNDS);
}

/** The account's own facts come first; a guest's fill whatever room is left. */
export function mergeMissed(existing: MissedFact[], incoming: MissedFact[]): MissedFact[] {
  const seen = new Set<string>();
  return [...existing, ...incoming]
    .filter(fact => {
      const signature = factSignature(fact);
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    })
    .slice(0, MAX_MISSED);
}

/**
 * Remembers how past rounds went, so a child can see their own improvement.
 * Deliberately personal-best rather than streak-based: missing a day should
 * never cost a child anything they earned.
 *
 * Progress is filed per owner — a guest, or a named account — so two children
 * sharing one tablet do not end up sharing one history.
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  getHistory(): RoundResult[] {
    return this.readHistory(this.currentOwner());
  }

  record(result: Omit<RoundResult, 'date'>): void {
    const owner = this.currentOwner();
    const history = [{ ...result, date: new Date().toISOString() }, ...this.readHistory(owner)];
    this.writeHistory(owner, history.slice(0, MAX_ROUNDS));

    const totals = this.readTotals(owner);
    this.writeTotals(owner, {
      rounds: totals.rounds + 1,
      questions: totals.questions + Math.max(0, result.total || 0),
      correct: totals.correct + Math.max(0, result.correctAnswers || 0)
    });
  }

  /** What a child has done in total, however long ago. */
  getTotals(): PlayTotals {
    return this.readTotals(this.currentOwner());
  }

  /** The best percentage so far, or null when this is the first round. */
  getBestPercentage(): number | null {
    const history = this.getHistory();
    if (!history.length) {
      return null;
    }
    return Math.max(...history.map(round => round.percentage));
  }

  getRoundsPlayed(): number {
    return this.getHistory().length;
  }

  /**
   * Facts the child got wrong, kept for the next round. Reviewing a missed
   * fact a session later — rather than only minutes later — is where the
   * spacing effect actually lives.
   */
  getMissedFacts(): MissedFact[] {
    return this.readMissed(this.currentOwner());
  }

  /**
   * A fact just missed goes back to the beginning of the schedule, whatever
   * it had earned before: getting it wrong is evidence it was not learned.
   */
  recordMissed(fact: MissedFact, now: Date = new Date()): void {
    const existing = this.getMissedFacts().filter(f => factSignature(f) !== factSignature(fact));
    const scheduled = afterMiss(fact, now);
    this.writeMissed(this.currentOwner(), [scheduled, ...existing].slice(0, MAX_MISSED));
  }

  /**
   * Hands back up to `limit` facts that are DUE and forgets them — they are
   * being asked now, and whatever happens next re-files them. Facts whose day
   * has not come are left alone, so a child playing five rounds in one
   * sitting does not meet the same fact five times.
   */
  takeMissedFacts(limit: number, now: Date = new Date()): MissedFact[] {
    const owner = this.currentOwner();
    const all = this.readMissed(owner);
    const taken = dueFacts(all, now, limit);
    const takenSignatures = new Set(taken.map(factSignature));
    this.writeMissed(owner, all.filter(fact => !takenSignatures.has(factSignature(fact))));
    return taken;
  }

  /**
   * A fact answered right on its review day. It goes back in the queue for
   * another day unless it has now been retrieved correctly often enough, in
   * which case it is simply done and nothing is written.
   */
  passedReview(fact: MissedFact, now: Date = new Date()): void {
    const owner = this.currentOwner();
    const rest = this.readMissed(owner)
      .filter(f => factSignature(f) !== factSignature(fact));
    const again = afterReview(fact, now);
    this.writeMissed(owner, again ? [...rest, again].slice(0, MAX_MISSED) : rest);

    // `afterReview` returning nothing IS the moment a fact is learned, and
    // until now it was the moment the only record of it disappeared
    if (!again) {
      this.rememberLearned(owner, fact, now);
    }
  }

  /** The facts that stuck, newest first. See teaching/learned.ts. */
  getLearned(): LearnedFact[] {
    return parseLearned(this.readJson(this.key(LEARNED_KEY, this.currentOwner())));
  }

  private rememberLearned(owner: string, fact: MissedFact, now: Date): void {
    const entry: LearnedFact = { fact, on: dayKey(now), key: factSignature(fact) };
    this.writeLearned(owner, rememberLearned(this.getLearnedFor(owner), entry));
  }

  private getLearnedFor(owner: string): LearnedFact[] {
    return parseLearned(this.readJson(this.key(LEARNED_KEY, owner)));
  }

  private writeLearned(owner: string, learned: LearnedFact[]): void {
    try {
      localStorage.setItem(this.key(LEARNED_KEY, owner), JSON.stringify(learned));
    } catch {
      // A record of what stuck is worth less than the round being played
    }
  }

  /** Whatever JSON is under a key, or null for anything unreadable. */
  private readJson(key: string): any {
    try {
      return JSON.parse(this.item(key) || 'null');
    } catch {
      return null;
    }
  }

  /**
   * Experience is stored rather than derived from history: history is capped
   * at twenty rounds, and a child must never watch levels fall off the end of
   * it because they kept playing.
   */
  getXp(): number {
    return this.readXp(this.currentOwner());
  }

  addXp(amount: number): void {
    if (!(amount > 0)) {
      return;
    }
    const owner = this.currentOwner();
    this.writeXp(owner, this.readXp(owner) + Math.floor(amount));
  }

  /**
   * Seasonal events the child was here for. Once earned an event is never
   * taken away — the whole point of making them recur is that nothing is
   * lost, so nothing here ever removes one.
   */
  getEarnedEvents(): string[] {
    return this.readEvents(this.currentOwner()).map(event => event.id);
  }

  /** The same events, with the day each was earned where that is known. */
  getEventRecord(): EarnedEvent[] {
    return this.readEvents(this.currentOwner());
  }

  /**
   * Records an event the child was here for, and WHEN. The date is the part
   * that is new: events used to be stored as bare ids, so the scrapbook had
   * nothing to say about when any of it happened.
   */
  earnEvent(id: string, now: Date = new Date()): void {
    if (!id) {
      return;
    }
    const owner = this.currentOwner();
    const earned = this.readEvents(owner);
    if (earned.some(event => event.id === id)) {
      return;
    }
    this.write(this.key(EVENTS_KEY, owner), [...earned, { id, date: now.toISOString() }]);
  }

  /**
   * Items the child has won, with the day. Derived-from-level was enough to
   * decide what they may WEAR; it can never say when they got it.
   */
  getKeepsakes(): EarnedItem[] {
    return readEarnedItems(this.readList(KEEPSAKES_KEY, this.currentOwner()));
  }

  /** Writes down an item the moment it is won. Never records one twice. */
  keepItem(id: string, now: Date = new Date()): void {
    if (!id) {
      return;
    }
    const owner = this.currentOwner();
    const kept = readEarnedItems(this.readList(KEEPSAKES_KEY, owner));
    if (kept.some(item => item.id === id)) {
      return;
    }
    this.write(this.key(KEEPSAKES_KEY, owner), [...kept, { id, date: now.toISOString() }]);
  }

  /**
   * The round in play, so an interruption does not cost it. Filed per owner
   * like everything else here: two children sharing a tablet must never be
   * offered each other's half-finished round.
   */
  saveRound(round: SavedRound): void {
    try {
      localStorage.setItem(this.key(ROUND_KEY, this.currentOwner()), serialiseRound(round));
    } catch {
      // Storage being unavailable must never break a round that is being played
    }
  }

  /** Whatever was saved, or null for anything unreadable. See round-state.ts. */
  readRound(): SavedRound | null {
    return parseRound(this.item(this.key(ROUND_KEY, this.currentOwner())));
  }

  clearRound(): void {
    this.remove(this.key(ROUND_KEY, this.currentOwner()));
  }

  /**
   * The end of a round, so a child who never got to see it still can. What
   * the round EARNED is already written down elsewhere; this holds only what
   * to say about it. See result/result-state.ts.
   */
  saveResult(result: SavedResult): void {
    try {
      localStorage.setItem(this.key(RESULT_KEY, this.currentOwner()), serialiseResult(result));
    } catch {
      // A result that cannot be written down is a result not shown twice,
      // which is a smaller failure than a round that cannot be finished
    }
  }

  readResult(): SavedResult | null {
    return parseResult(this.item(this.key(RESULT_KEY, this.currentOwner())));
  }

  /** Marks it read, so nothing offers it again. Silent if there is none. */
  markResultSeen(): void {
    const result = this.readResult();
    if (result && !result.seen) {
      this.saveResult({ ...result, seen: true });
    }
  }

  clearResult(): void {
    this.remove(this.key(RESULT_KEY, this.currentOwner()));
  }

  /** True when a guest has anything an account would be worth keeping for. */
  hasGuestProgress(): boolean {
    return this.readHistory(GUEST_OWNER).length > 0;
  }

  /**
   * Moves what a guest earned into the account they have just created or
   * signed into. Signup is the one moment both identities are known, so the
   * move happens once, in a batch, and the guest's copy is then cleared —
   * leaving it behind would hand the next guest on this device someone
   * else's history.
   */
  adoptGuestProgress(username: string): void {
    const owner = accountOwner(username);
    const guestHistory = this.readHistory(GUEST_OWNER);
    const guestMissed = this.readMissed(GUEST_OWNER);
    const guestXp = this.readXp(GUEST_OWNER);
    const guestEvents = this.readEvents(GUEST_OWNER);
    const guestTotals = this.readTotals(GUEST_OWNER);

    if (!guestHistory.length && !guestMissed.length && !guestXp
        && !guestEvents.length && !guestTotals.rounds) {
      return;
    }

    this.writeHistory(owner, mergeHistory(this.readHistory(owner), guestHistory));
    this.writeMissed(owner, mergeMissed(this.readMissed(owner), guestMissed));
    this.writeXp(owner, this.readXp(owner) + guestXp);
    // Union: an event either child was here for stays earned, with whichever
    // date is known — the account's own first, since it is the one playing
    const merged = this.readEvents(owner);
    guestEvents.forEach(event => {
      if (!merged.some(mine => mine.id === event.id)) {
        merged.push(event);
      }
    });
    this.write(this.key(EVENTS_KEY, owner), merged);

    // And the items, which carry their own dates
    const keptOwn = readEarnedItems(this.readList(KEEPSAKES_KEY, owner));
    readEarnedItems(this.readList(KEEPSAKES_KEY, GUEST_OWNER)).forEach(item => {
      if (!keptOwn.some(mine => mine.id === item.id)) {
        keptOwn.push(item);
      }
    });
    this.write(this.key(KEEPSAKES_KEY, owner), keptOwn);
    this.remove(this.key(KEEPSAKES_KEY, GUEST_OWNER));
    this.remove(this.key(STORAGE_KEY, GUEST_OWNER));
    this.remove(this.key(MISSED_KEY, GUEST_OWNER));
    this.remove(this.key(XP_KEY, GUEST_OWNER));
    const ownTotals = this.readTotals(owner);
    this.writeTotals(owner, {
      rounds: ownTotals.rounds + guestTotals.rounds,
      questions: ownTotals.questions + guestTotals.questions,
      correct: ownTotals.correct + guestTotals.correct
    });
    this.remove(this.key(EVENTS_KEY, GUEST_OWNER));
    this.remove(this.key(TOTALS_KEY, GUEST_OWNER));
    // A half-finished round is not progress to carry over: the child is in
    // the middle of it right now, under whichever name they are playing.
    this.remove(this.key(ROUND_KEY, GUEST_OWNER));
  }

  /**
   * What this device would send to the account, or null when there is
   * nothing worth sending. Deliberately NOT everything: the facts a child
   * keeps getting wrong, the ones that have stuck, the round in play and the
   * last result all stay here. See server/progress-store.js for why.
   */
  exportSynced(): SyncedProgress | null {
    const owner = this.currentOwner();
    if (owner === GUEST_OWNER) {
      // A guest has no account to sync with, so there is nothing to send and
      // nowhere to send it
      return null;
    }
    const progress: SyncedProgress = {
      version: SYNCED_VERSION,
      roundHistory: this.readHistory(owner) as SyncedRound[],
      xp: this.readXp(owner),
      totals: this.readTotals(owner),
      events: this.readEvents(owner),
      keepsakes: readEarnedItems(this.readList(KEEPSAKES_KEY, owner))
    };
    return worthSyncing(progress) ? progress : null;
  }

  /**
   * Writes a merged copy back to this device. Takes the already-merged
   * result rather than merging here, so the rule about what beats what lives
   * in one place that can be read on its own.
   */
  importSynced(progress: SyncedProgress): void {
    const owner = this.currentOwner();
    if (owner === GUEST_OWNER) {
      return;
    }
    this.writeHistory(owner, (progress.roundHistory || []) as RoundResult[]);
    this.writeXp(owner, whole(progress.xp));
    this.writeTotals(owner, progress.totals || { rounds: 0, questions: 0, correct: 0 });
    this.write(this.key(EVENTS_KEY, owner), progress.events || []);
    this.write(this.key(KEEPSAKES_KEY, owner), progress.keepsakes || []);
  }

  private currentOwner(): string {
    try {
      const username = localStorage.getItem('username');
      return username ? accountOwner(username) : GUEST_OWNER;
    } catch {
      return GUEST_OWNER;
    }
  }

  private key(base: string, owner: string): string {
    return `${base}:${owner}`;
  }

  private readHistory(owner: string): RoundResult[] {
    const parsed = this.readList(STORAGE_KEY, owner);
    return parsed.filter(entry => entry && typeof entry === 'object') as RoundResult[];
  }

  private readMissed(owner: string): MissedFact[] {
    const parsed = this.readList(MISSED_KEY, owner);
    return parsed.filter(entry => entry && typeof entry === 'object') as MissedFact[];
  }

  /**
   * Reads an owner's list, adopting anything left under the old unowned key.
   * Rounds played before progress was filed per owner belong to whoever is
   * playing when the game next looks — in practice the guest who earned them.
   */
  private readList(base: string, owner: string): any[] {
    const owned = this.parse(this.item(this.key(base, owner)));
    if (owned.length) {
      return owned;
    }

    const legacy = this.parse(this.item(base));
    if (legacy.length) {
      this.write(this.key(base, owner), legacy);
      this.remove(base);
      return legacy;
    }

    return [];
  }

  private parse(raw: string | null): any[] {
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // A corrupt or unreadable store should never block a game
      return [];
    }
  }

  private item(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Reads the events, whichever shape they are in. Everything stored before
   * dates existed is a bare id string, and one of those still means "this
   * happened" — it is kept, without a date, which is the truth about it.
   */
  private readEvents(owner: string): EarnedEvent[] {
    return readEarnedEvents(this.readList(EVENTS_KEY, owner));
  }

  private readTotals(owner: string): PlayTotals {
    const empty: PlayTotals = { rounds: 0, questions: 0, correct: 0 };
    try {
      const raw = this.item(this.key(TOTALS_KEY, owner));
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') {
        return empty;
      }
      return {
        rounds: whole(parsed.rounds),
        questions: whole(parsed.questions),
        correct: whole(parsed.correct)
      };
    } catch {
      // A corrupt count reads as nothing done, never as NaN on a screen
      return empty;
    }
  }

  private writeTotals(owner: string, totals: PlayTotals): void {
    try {
      localStorage.setItem(this.key(TOTALS_KEY, owner), JSON.stringify(totals));
    } catch {
      // Storage being unavailable must never break a round
    }
  }

  private readXp(owner: string): number {
    const raw = this.item(this.key(XP_KEY, owner));
    const parsed = Number(raw);
    // A corrupt or missing value reads as nothing earned, never as NaN
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  }

  private writeXp(owner: string, xp: number): void {
    try {
      localStorage.setItem(this.key(XP_KEY, owner), String(xp));
    } catch {
      // Storage being unavailable must never break a round
    }
  }

  private writeHistory(owner: string, history: RoundResult[]): void {
    this.write(this.key(STORAGE_KEY, owner), history);
  }

  private writeMissed(owner: string, facts: MissedFact[]): void {
    this.write(this.key(MISSED_KEY, owner), facts);
  }

  private write(key: string, value: any[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private browsing and full storage are not worth failing a round over
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up if storage is unavailable
    }
  }
}
