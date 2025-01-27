import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit {
  currentQuestion: { num1: number; num2: number; operation: string } = {
    num1: 0,
    num2: 0,
    operation: '+'
  };
  userAnswer: string = '';
  feedback: string = '';
  operations = ['+', '-', '*', '/'];
  currentScore = 0;
  questionsAnswered = 0;
  difficulty: string;
  grade: number;
  inputPlaceholder: string = '?';

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService
  ) {
    this.difficulty = localStorage.getItem('difficulty') || 'medium';
    this.grade = Number(localStorage.getItem('grade')) || 1;
  }

  ngOnInit() {
    if (!localStorage.getItem('difficulty') || !localStorage.getItem('grade')) {
      this.router.navigate(['/difficulty']);
      return;
    }
    this.scoreService.resetScore();
    this.generateQuestion();
    this.scoreService.getCurrentScore().subscribe(score => {
      this.currentScore = score;
    });
    this.scoreService.getQuestionsAnswered().subscribe(questions => {
      this.questionsAnswered = questions;
    });
  }

  onInputFocus() {
    this.inputPlaceholder = '';
  }

  onInputBlur() {
    if (!this.userAnswer) {
      this.inputPlaceholder = '?';
    }
  }

  private getAvailableOperations(): string[] {
    if (this.grade <= 2) {
      return ['+'];
    } else if (this.grade <= 4) {
      return ['+', '-'];
    } else if (this.grade <= 6) {
      return ['+', '-', '*'];
    } else {
      return ['+', '-', '*', '/'];
    }
  }

  generateQuestion() {
    if (this.scoreService.isGameComplete()) {
      this.router.navigate(['/result']);
      return;
    }

    const availableOperations = this.getAvailableOperations();
    this.currentQuestion.operation = availableOperations[Math.floor(Math.random() * availableOperations.length)];
    
    // Generate appropriate numbers based on operation and difficulty
    const range = this.getNumberRange();
    
    switch (this.currentQuestion.operation) {
      case '+':
      case '-':
        this.currentQuestion.num1 = Math.floor(Math.random() * range) + 1;
        this.currentQuestion.num2 = Math.floor(Math.random() * range) + 1;
        // Ensure num1 is larger for subtraction
        if (this.currentQuestion.operation === '-' && this.currentQuestion.num1 < this.currentQuestion.num2) {
          [this.currentQuestion.num1, this.currentQuestion.num2] = 
          [this.currentQuestion.num2, this.currentQuestion.num1];
        }
        // For grade 1-2, ensure sum doesn't exceed range
        if (this.grade <= 2 && this.currentQuestion.operation === '+') {
          while (this.currentQuestion.num1 + this.currentQuestion.num2 > range) {
            this.currentQuestion.num2 = Math.floor(Math.random() * range) + 1;
          }
        }
        break;
      case '*':
        const multiplyRange = Math.min(this.getNumberRange(), 10); // Keep multiplication tables manageable
        this.currentQuestion.num1 = Math.floor(Math.random() * multiplyRange) + 1;
        this.currentQuestion.num2 = Math.floor(Math.random() * multiplyRange) + 1;
        break;
      case '/':
        const divisionRange = Math.min(this.getNumberRange(), 10); // Keep division manageable
        this.currentQuestion.num2 = Math.floor(Math.random() * (divisionRange - 1)) + 1; // 1-range
        const result = Math.floor(Math.random() * divisionRange) + 1; // 1-range
        this.currentQuestion.num1 = this.currentQuestion.num2 * result; // ensures clean division
        break;
    }

    this.userAnswer = '';
    this.feedback = '';
    this.inputPlaceholder = '?';
  }

  private getNumberRange(): number {
    // Base ranges for each grade
    let baseRange: number;
    if (this.grade <= 2) {
      baseRange = 10;
    } else if (this.grade === 3) {
      baseRange = 20;
    } else if (this.grade <= 4) {
      baseRange = 50;
    } else if (this.grade <= 6) {
      baseRange = 100;
    } else if (this.grade <= 8) {
      baseRange = 500;
    } else {
      baseRange = 1000;
    }
    
    // Adjust range based on difficulty
    switch (this.difficulty) {
      case 'easy':
        return Math.floor(baseRange * 0.5);
      case 'medium':
        return baseRange;
      case 'hard':
        return Math.min(baseRange * 1.5, this.grade <= 2 ? 10 : (this.grade === 3 ? 20 : baseRange * 1.5));
      default:
        return baseRange;
    }
  }

  checkAnswer() {
    let correctAnswer: number;
    switch (this.currentQuestion.operation) {
      case '+':
        correctAnswer = this.currentQuestion.num1 + this.currentQuestion.num2;
        break;
      case '-':
        correctAnswer = this.currentQuestion.num1 - this.currentQuestion.num2;
        break;
      case '*':
        correctAnswer = this.currentQuestion.num1 * this.currentQuestion.num2;
        break;
      case '/':
        correctAnswer = this.currentQuestion.num1 / this.currentQuestion.num2;
        break;
      default:
        correctAnswer = 0;
    }

    const userAnswerNum = parseFloat(this.userAnswer);
    if (userAnswerNum === correctAnswer) {
      this.feedback = this.languageService.translate('correct');
      this.scoreService.incrementScore();
    } else {
      this.feedback = `${this.languageService.translate('wrong')}. ${this.languageService.translate('correct-answer')}: ${correctAnswer}`;
      this.scoreService.incrementQuestionsAnswered();
    }

    if (this.scoreService.isGameComplete()) {
      this.router.navigate(['/result']);
    } else {
      setTimeout(() => {
        this.feedback = '';
        this.userAnswer = '';
        this.generateQuestion();
      }, 1500);
    }
  }
}
