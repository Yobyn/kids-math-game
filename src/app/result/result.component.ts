import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';

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
    private router: Router
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
      this.message = 'Outstanding! You\'re a math genius! 🌟';
    } else if (this.percentage >= 70) {
      this.message = 'Great job! Keep up the good work! 🎉';
    } else if (this.percentage >= 50) {
      this.message = 'Good effort! Practice makes perfect! 💪';
    } else {
      this.message = 'Keep practicing! You\'ll get better! 📚';
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
