import { Injectable } from '@angular/core';

export interface RoundResult {
  date: string;
  correctAnswers: number;
  total: number;
  percentage: number;
  score: number;
  grade: number;
}

const STORAGE_KEY = 'roundHistory';
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
}
