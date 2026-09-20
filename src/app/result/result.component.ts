import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css']
})
export class ResultComponent implements OnInit, OnDestroy {
  score = 0;
  total = 0;
  correctAnswers = 0;
  percentage = 0;
  message = '';
  starsEarned = 0;
  starsShown = 0;
  displayPercentage = 0;
  private timers: number[] = [];

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    const finalScore = this.scoreService.getFinalScore();
    this.score = finalScore.score;
    this.total = finalScore.total;
    this.correctAnswers = finalScore.correctAnswers;
    this.percentage = finalScore.percentage;
    this.setMessage();
    this.starsEarned = this.getStarsEarned();
    this.celebrate();
  }

  ngOnDestroy() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
  }

  private getStarsEarned(): number {
    if (this.percentage >= 90) return 3;
    if (this.percentage >= 70) return 2;
    if (this.percentage >= 50) return 1;
    return 0;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Pop the stars in one by one and count the percentage up, so finishing feels like a reward. */
  private celebrate() {
    if (this.prefersReducedMotion()) {
      this.starsShown = this.starsEarned;
      this.displayPercentage = this.percentage;
      return;
    }

    for (let star = 1; star <= this.starsEarned; star++) {
      this.timers.push(window.setTimeout(() => this.starsShown = star, 300 * star));
    }

    const steps = 20;
    for (let step = 1; step <= steps; step++) {
      this.timers.push(window.setTimeout(() => {
        this.displayPercentage = Math.round((this.percentage * step) / steps);
      }, 40 * step));
    }
  }

  private setMessage() {
    if (this.percentage >= 90) {
      this.message = this.languageService.translate('outstanding');
    } else if (this.percentage >= 70) {
      this.message = this.languageService.translate('great-job');
    } else if (this.percentage >= 50) {
      this.message = this.languageService.translate('good-effort');
    } else {
      this.message = this.languageService.translate('keep-practicing');
    }
  }

  playAgain() {
    this.scoreService.resetScore();
    // Clear the stored grade and difficulty to force new selection
    localStorage.removeItem('grade');
    localStorage.removeItem('difficulty');
    this.router.navigate(['/grade']);
  }
}
