import { Injectable } from '@angular/core';

export interface RoundResult {
  date: string;
  correctAnswers: number;
  total: number;
  percentage: number;
  score: number;
  grade: number;
}

export interface MissedFact {
  num1: number;
  num2: number;
  operation: string;
  moneyPrompt?: string;
}

const STORAGE_KEY = 'roundHistory';
const MISSED_KEY = 'missedFacts';
const XP_KEY = 'xp';
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

export function factSignature(fact: MissedFact): string {
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

  recordMissed(fact: MissedFact): void {
    const existing = this.getMissedFacts().filter(f => factSignature(f) !== factSignature(fact));
    this.writeMissed(this.currentOwner(), [fact, ...existing].slice(0, MAX_MISSED));
  }

  /** Hands back up to `limit` facts and forgets them — they are being asked now. */
  takeMissedFacts(limit: number): MissedFact[] {
    const owner = this.currentOwner();
    const all = this.readMissed(owner);
    const taken = all.slice(0, limit);
    this.writeMissed(owner, all.slice(limit));
    return taken;
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

    if (!guestHistory.length && !guestMissed.length && !guestXp) {
      return;
    }

    this.writeHistory(owner, mergeHistory(this.readHistory(owner), guestHistory));
    this.writeMissed(owner, mergeMissed(this.readMissed(owner), guestMissed));
    this.writeXp(owner, this.readXp(owner) + guestXp);
    this.remove(this.key(STORAGE_KEY, GUEST_OWNER));
    this.remove(this.key(MISSED_KEY, GUEST_OWNER));
    this.remove(this.key(XP_KEY, GUEST_OWNER));
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
