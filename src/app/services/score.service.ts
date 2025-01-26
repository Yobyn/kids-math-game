import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private currentScore = 0;
  private questionsAnswered = 0;
  private scoreSubject = new BehaviorSubject<number>(0);
  private questionsSubject = new BehaviorSubject<number>(0);

  constructor() {}

  addScore(isCorrect: boolean) {
    if (isCorrect) {
      this.currentScore++;
    }
    this.questionsAnswered++;
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
  }

  getCurrentScore() {
    return this.scoreSubject.asObservable();
  }

  getQuestionsAnswered() {
    return this.questionsSubject.asObservable();
  }

  resetScore() {
    this.currentScore = 0;
    this.questionsAnswered = 0;
    this.scoreSubject.next(0);
    this.questionsSubject.next(0);
  }

  isGameComplete() {
    return this.questionsAnswered >= 10;
  }

  getFinalScore() {
    return {
      score: this.currentScore,
      total: this.questionsAnswered,
      percentage: (this.currentScore / this.questionsAnswered) * 100
    };
  }
} 