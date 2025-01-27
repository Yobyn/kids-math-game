import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private currentScore = 0;
  private questionsAnswered = 0;
  private scoreSubject = new BehaviorSubject<number>(0);
  private questionsSubject = new BehaviorSubject<number>(0);

  constructor() {}

  incrementScore() {
    this.currentScore++;
    this.questionsAnswered++;
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
  }

  incrementQuestionsAnswered() {
    this.questionsAnswered++;
    this.questionsSubject.next(this.questionsAnswered);
  }

  getCurrentScore(): Observable<number> {
    return this.scoreSubject.asObservable();
  }

  getQuestionsAnswered(): Observable<number> {
    return this.questionsSubject.asObservable();
  }

  resetScore() {
    this.currentScore = 0;
    this.questionsAnswered = 0;
    this.scoreSubject.next(this.currentScore);
    this.questionsSubject.next(this.questionsAnswered);
  }

  isGameComplete(): boolean {
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