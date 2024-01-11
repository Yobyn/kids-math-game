import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.css']
})
export class QuestionComponent implements OnInit {
  num1: number;
  num2: number;
  answer: number;
  userAnswer: number;
  isCorrect: boolean;
  showResult: boolean;

  constructor() {
    this.num1 = 0; // Initialize num1 with a default value
    this.num2 = 0; // Initialize num2 with a default value
    this.answer = 0; // Initialize answer with a default value
    this.userAnswer = 0; // Initialize userAnswer with a default value
    this.isCorrect = false; // Initialize isCorrect with a default value
    this.showResult = false; // Initialize showResult with a default value
  }

  ngOnInit(): void {
    this.generateQuestion();
  }

  generateQuestion() {
    this.num1 = Math.floor(Math.random() * 10);
    this.num2 = Math.floor(Math.random() * 10);
    this.answer = this.num1 + this.num2;
    this.isCorrect = false;
    this.showResult = false;
    this.userAnswer = 0; // Reset userAnswer to 0
  }

  clearAnswer() {
    this.userAnswer = 0;
  }

  checkAnswer() {
    if (this.userAnswer === this.answer) {
      this.isCorrect = true;
    } else {
      this.isCorrect = false;
    }
    this.showResult = true;
  }
}
