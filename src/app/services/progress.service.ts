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
/** Enough to carry a round's mistakes forward without burying the next one. */
const MAX_MISSED = 12;
/** Enough to show improvement over time without growing without bound. */
const MAX_ROUNDS = 20;

/**
 * Remembers how past rounds went, so a child can see their own improvement.
 * Deliberately personal-best rather than streak-based: missing a day should
 * never cost a child anything they earned.
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  getHistory(): RoundResult[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // A corrupt or unreadable store should never block a game
      return [];
    }
  }

  record(result: Omit<RoundResult, 'date'>): void {
    const history = [{ ...result, date: new Date().toISOString() }, ...this.getHistory()];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ROUNDS)));
    } catch {
      // Private browsing and full storage are not worth failing a round over
    }
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
    try {
      const stored = localStorage.getItem(MISSED_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  recordMissed(fact: MissedFact): void {
    const signature = (f: MissedFact) => `${f.num1}${f.operation}${f.num2}`;
    const existing = this.getMissedFacts().filter(f => signature(f) !== signature(fact));
    this.writeMissed([fact, ...existing].slice(0, MAX_MISSED));
  }

  /** Hands back up to `limit` facts and forgets them — they are being asked now. */
  takeMissedFacts(limit: number): MissedFact[] {
    const all = this.getMissedFacts();
    const taken = all.slice(0, limit);
    this.writeMissed(all.slice(limit));
    return taken;
  }

  private writeMissed(facts: MissedFact[]): void {
    try {
      localStorage.setItem(MISSED_KEY, JSON.stringify(facts));
    } catch {
      // Storage being unavailable must never break a round
    }
  }
}
