import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css'],
  animations: [
    trigger('feedbackAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ]),
    trigger('buttonAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class QuestionComponent implements OnInit {
  @ViewChild('answerInput') answerInput!: ElementRef;
  @ViewChild('nextButton') nextButton!: ElementRef;
  
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
  isSecondAttempt: boolean = false;
  showOkButton: boolean = false;
  wrongAttempts = 0;
  correctAnswer = 0;
  showShakeAnimation: boolean = false;
  streakCount: number = 0;

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
    this.showOkButton = false;
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
    if (this.userAnswer === null || this.userAnswer === undefined || this.userAnswer === '') {
      this.showShakeAnimation = true;
      setTimeout(() => this.showShakeAnimation = false, 500);
      return;
    }

    const answer = Number(this.userAnswer);
    let isCorrect = false;

    switch (this.currentQuestion.operation) {
      case '+':
        isCorrect = answer === this.currentQuestion.num1 + this.currentQuestion.num2;
        this.correctAnswer = this.currentQuestion.num1 + this.currentQuestion.num2;
        break;
      case '-':
        isCorrect = answer === this.currentQuestion.num1 - this.currentQuestion.num2;
        this.correctAnswer = this.currentQuestion.num1 - this.currentQuestion.num2;
        break;
      case '*':
        isCorrect = answer === this.currentQuestion.num1 * this.currentQuestion.num2;
        this.correctAnswer = this.currentQuestion.num1 * this.currentQuestion.num2;
        break;
      case '/':
        isCorrect = answer === this.currentQuestion.num1 / this.currentQuestion.num2;
        this.correctAnswer = this.currentQuestion.num1 / this.currentQuestion.num2;
        break;
    }

    if (isCorrect) {
      this.handleCorrectAnswer();
    } else {
      this.handleWrongAnswer();
    }
  }

  private handleCorrectAnswer() {
    this.streakCount++;
    const bonusPoints = this.calculateBonusPoints();
    this.feedback = this.languageService.translate('correct');
    if (bonusPoints > 1) {
      this.feedback += ` +${bonusPoints} ${this.languageService.translate('bonus-points')}!`;
    }
    this.scoreService.incrementCorrectAnswers();
    this.scoreService.incrementScore(bonusPoints);
    this.showOkButton = true;
    this.playSuccessSound();
    // Set focus on the next button after it appears
    setTimeout(() => {
      if (this.nextButton) {
        this.nextButton.nativeElement.focus();
      }
    }, 0);
  }

  private handleWrongAnswer() {
    this.streakCount = 0;
    this.wrongAttempts++;
    this.feedback = this.languageService.translate('wrong');
    
    if (this.wrongAttempts === 1) {
      this.feedback += '. ' + this.languageService.translate('try-again');
      this.isSecondAttempt = true;
      this.userAnswer = '';
      setTimeout(() => this.answerInput.nativeElement.focus(), 100);
    } else {
      this.showOkButton = true;
      // Use the service to increment questions answered
      this.scoreService.incrementQuestionsAnswered();
      if (this.scoreService.isGameComplete()) {
        setTimeout(() => this.router.navigate(['/result']), 1500);
      }
      // Set focus on the next button after it appears
      setTimeout(() => {
        if (this.nextButton) {
          this.nextButton.nativeElement.focus();
        }
      }, 0);
    }
    this.playErrorSound();
  }

  private calculateBonusPoints(): number {
    if (this.streakCount >= 5) return 3;
    if (this.streakCount >= 3) return 2;
    return 1;
  }

  private playSuccessSound() {
    const audio = new Audio('assets/sounds/success.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore errors if sound can't play
  }

  private playErrorSound() {
    const audio = new Audio('assets/sounds/error.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors if sound can't play
  }

  moveToNextQuestion() {
    this.feedback = '';
    this.userAnswer = '';
    this.isSecondAttempt = false;
    this.showOkButton = false;
    this.wrongAttempts = 0;
    this.generateQuestion();
    setTimeout(() => this.answerInput.nativeElement.focus(), 100);
  }

  returnToGrade() {
    this.router.navigate(['/grade']);
  }
}
