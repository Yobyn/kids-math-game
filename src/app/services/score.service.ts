import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';


/** A count safe to put in front of a child: never NaN, never negative. */
function whole(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private currentScore = 0;
  private questionsAnswered = 0;
  private correctAnswers = 0;
  private scoreSubject = new BehaviorSubject<number>(0);
  private questionsSubject = new BehaviorSubject<number>(0);
  private correctAnswersSubject = new BehaviorSubject<number>(0);

  constructor() {}

  incrementScore(points: number = 1) {
    this.currentScore += points;
    this.questionsAnswered++;
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
  }

  incrementCorrectAnswers() {
    this.correctAnswers++;
    this.correctAnswersSubject.next(this.correctAnswers);
  }

  incrementQuestionsAnswered() {
    this.questionsAnswered++;
    this.questionsSubject.next(this.questionsAnswered);
  }

  /**
   * The counters as they stand, for a round being written down mid-play.
   * The observables above are how a screen follows the numbers; this is how
   * something saving the round reads them once, without subscribing.
   */
  snapshot(): { score: number; questionsAnswered: number; correctAnswers: number } {
    return {
      score: this.currentScore,
      questionsAnswered: this.questionsAnswered,
      correctAnswers: this.correctAnswers
    };
  }

  /**
   * Puts back the counters of a round that was interrupted. Deliberately
   * separate from the increments above: those are the only way the numbers
   * move during play, and this is the one moment they come from outside.
   * Anything unreadable lands on zero rather than on NaN in front of a child.
   */
  restore(state: { score: number; questionsAnswered: number; correctAnswers: number }) {
    this.currentScore = whole(state.score);
    this.questionsAnswered = whole(state.questionsAnswered);
    this.correctAnswers = whole(state.correctAnswers);
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
    this.correctAnswersSubject.next(this.correctAnswers);
  }

  getCurrentScore(): Observable<number> {
    return this.scoreSubject.asObservable();
  }

  getQuestionsAnswered(): Observable<number> {
    return this.questionsSubject.asObservable();
  }

  getCorrectAnswers(): Observable<number> {
    return this.correctAnswersSubject.asObservable();
  }

  resetScore() {
    this.currentScore = 0;
    this.questionsAnswered = 0;
    this.correctAnswers = 0;
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
    this.correctAnswersSubject.next(this.correctAnswers);
  }

  isGameComplete(): boolean {
    return this.questionsAnswered >= 10;
  }

  getFinalScore() {
    return {
      score: this.currentScore,
      total: this.questionsAnswered,
      correctAnswers: this.correctAnswers,
      percentage: (this.correctAnswers / this.questionsAnswered) * 100
    };
  }
}