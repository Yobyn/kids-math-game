import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.css']
})
export class ResultComponent implements OnInit {
  score = 0;
  total = 0;
  percentage = 0;
  message = '';

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    const finalScore = this.scoreService.getFinalScore();
    this.score = finalScore.score;
    this.total = finalScore.total;
    this.percentage = finalScore.percentage;
    this.setMessage();
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
