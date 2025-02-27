import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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