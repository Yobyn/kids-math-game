import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

interface ScoreHistory {
  score: number;
  total: number;
  percentage: number;
  grade: number;
  difficulty: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private currentScore = 0;
  private questionsAnswered = 0;
  private scoreSubject = new BehaviorSubject<number>(0);
  private questionsSubject = new BehaviorSubject<number>(0);
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

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
    const finalScore = {
      score: this.currentScore,
      total: this.questionsAnswered,
      percentage: (this.currentScore / this.questionsAnswered) * 100,
      grade: Number(localStorage.getItem('grade')),
      difficulty: localStorage.getItem('difficulty') || 'medium',
      timestamp: new Date()
    };

    // Save score to backend
    this.saveScore(finalScore);

    return finalScore;
  }

  private saveScore(score: ScoreHistory) {
    this.http.post(`${this.apiUrl}/scores`, score).subscribe(
      () => console.log('Score saved successfully'),
      error => console.error('Error saving score:', error)
    );
  }

  getScoreHistory(): Observable<ScoreHistory[]> {
    return this.http.get<ScoreHistory[]>(`${this.apiUrl}/scores`);
  }
} 