import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';
import { SoundService } from '../services/sound.service';
import { MissedFact, ProgressService } from '../services/progress.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { workedStep } from '../teaching/worked-step';
import { applyKey, placeholderFor } from '../keypad/answer-entry';
import { EASED_KEY, OfferState, easierThan, shouldOfferEasier } from '../levels/in-round-tuner';
import { trigger, state, style, animate, transition } from '@angular/animations';

/** The quiz is ten questions long; ScoreService.isGameComplete() agrees. */
const TOTAL_QUESTIONS = 10;
/** A missed question comes back this many questions later — soon, not last. */
const REPLAY_GAP = 2;

interface PendingReplay {
  question: { num1: number; num2: number; operation: string; moneyPrompt?: string };
  dueAfter: number;
  /**
   * The stored fact this came from, when it came from an earlier day's queue
   * rather than from a miss in this round. Getting it right is what moves it
   * along its schedule, so the fact itself has to travel with it.
   */
  reviewOf?: MissedFact;
}

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
  
  isReplay = false;
  private missed: PendingReplay[] = [];
  /** Set while the question on screen is a review from an earlier day. */
  private reviewing?: MissedFact;
  currentQuestion: { num1: number; num2: number; operation: string; moneyPrompt?: string } = {
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
  /** How the fact is reached, shown only once the answer is given away. */
  workedLine = '';
  correctAnswer = 0;
  showShakeAnimation: boolean = false;
  answerWasCorrect: boolean | null = null;
  readonly totalQuestions = TOTAL_QUESTIONS;
  streakCount: number = 0;
  useKeypad: boolean = false;
  /**
   * Every finished question this round, in order, so the offer below can read
   * a run of misses rather than a single bad question.
   */
  private results: boolean[] = [];
  /** True while the "easier ones?" offer is in front of the child. */
  showEasierOffer = false;
  /** Set once the offer has been answered, either way. It never comes back. */
  private offerSpent = false;
  /** What the offer would switch to, for naming it on the button. */
  easierSetting = '';

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService,
    private soundService: SoundService,
    private progressService: ProgressService,
    private fieldPulse: FieldPulseService
  ) {
    this.difficulty = localStorage.getItem('difficulty') || 'medium';
    this.grade = Number(localStorage.getItem('grade')) || 1;
  }

  ngOnInit() {
    this.useKeypad = this.isTouchDevice();
    if (!localStorage.getItem('difficulty') || !localStorage.getItem('grade')) {
      this.router.navigate(['/difficulty']);
      return;
    }
    this.scoreService.resetScore();
    // A round abandoned half way could leave this set; a new round is honest
    // about its own setting until it is not.
    this.clearEasedFlag();
    this.seedMissedFromLastRound();
    this.generateQuestion();
    this.scoreService.getCurrentScore().subscribe(score => {
      this.currentScore = score;
    });
    this.scoreService.getQuestionsAnswered().subscribe(questions => {
      this.questionsAnswered = questions;
    });
  }

  /** How far through the ten questions the child is, as a percentage. */
  get progressPercent(): number {
    const answered = Math.min(Math.max(this.questionsAnswered, 0), TOTAL_QUESTIONS);
    return (answered / TOTAL_QUESTIONS) * 100;
  }

  private isTouchDevice(): boolean {
    return typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (!!window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
  }

  /**
   * What a key does to the answer box. The keypad emits a key and says
   * nothing about what it means; the rules live in answer-entry.ts, where
   * they can be checked against every state of the box.
   */
  onKeypadPress(key: string) {
    if (this.showOkButton) {
      return;
    }
    this.vibrate(10);
    this.userAnswer = applyKey(this.userAnswer, key);
    this.inputPlaceholder = placeholderFor(this.userAnswer);
  }

  private vibrate(pattern: number | number[]) {
    this.soundService.vibrate(pattern);
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

  /**
   * Facts missed in an earlier round come back near the start of this one —
   * but never as the very first question, which would open on a failure.
   */
  private seedMissedFromLastRound() {
    this.progressService.takeMissedFacts(2).forEach((fact, index) => {
      this.missed.push({
        question: { num1: fact.num1, num2: fact.num2, operation: fact.operation,
                    moneyPrompt: fact.moneyPrompt },
        dueAfter: index + 1,
        reviewOf: fact
      });
    });
  }

  /**
   * Money is taught in stages: counting totals well before working out change,
   * which children generally reach around nine or ten. So grades 2-3 only ever
   * get totals, and change questions start at grade 4.
   */
  private shouldAskAboutMoney(): boolean {
    return this.grade >= 2 && Math.random() < 0.25;
  }

  private generateMoneyQuestion() {
    // Whole euros only — decimals come after this age group has the idea
    const cap = Math.max(5, Math.min(this.getNumberRange(), 20));
    const askForChange = this.grade >= 4;

    if (askForChange) {
      const price = Math.floor(Math.random() * (cap - 1)) + 1;
      const paid = price + Math.floor(Math.random() * (cap - price)) + 1;
      this.currentQuestion.operation = '-';
      this.currentQuestion.num1 = paid;
      this.currentQuestion.num2 = price;
      this.currentQuestion.moneyPrompt = this.languageService
        .translate('money-change')
        .replace('{price}', String(price))
        .replace('{paid}', String(paid));
    } else {
      const first = Math.floor(Math.random() * cap) + 1;
      const second = Math.floor(Math.random() * cap) + 1;
      this.currentQuestion.operation = '+';
      this.currentQuestion.num1 = first;
      this.currentQuestion.num2 = second;
      this.currentQuestion.moneyPrompt = this.languageService
        .translate('money-total')
        .replace('{first}', String(first))
        .replace('{second}', String(second));
    }
  }

  generateQuestion() {
    if (this.scoreService.isGameComplete()) {
      this.router.navigate(['/result']);
      return;
    }

    this.isReplay = false;
    this.reviewing = undefined;
    const dueIndex = this.missed.findIndex(item => item.dueAfter <= this.questionsAnswered);
    if (dueIndex !== -1) {
      const [due] = this.missed.splice(dueIndex, 1);
      this.currentQuestion = { ...due.question };
      this.isReplay = true;
      this.reviewing = due.reviewOf;
      this.userAnswer = '';
      this.feedback = '';
      this.workedLine = '';
      this.inputPlaceholder = '?';
      this.showOkButton = false;
      return;
    }

    this.currentQuestion.moneyPrompt = undefined;
    if (this.shouldAskAboutMoney()) {
      this.generateMoneyQuestion();
      this.userAnswer = '';
      this.feedback = '';
      this.workedLine = '';
      this.inputPlaceholder = '?';
      this.showOkButton = false;
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
        // For grade 1-2, keep the sum inside the range. Draw the first number
        // with room to spare, then a second that fits in what is left: re-rolling
        // only num2 could never converge once num1 had taken the whole range,
        // which froze the tab mid-round for the youngest players.
        if (this.grade <= 2 && this.currentQuestion.operation === '+') {
          this.currentQuestion.num1 = Math.floor(Math.random() * (range - 1)) + 1;
          this.currentQuestion.num2 =
            Math.floor(Math.random() * (range - this.currentQuestion.num1)) + 1;
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
    this.workedLine = '';
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
    this.answerWasCorrect = true;
    this.results.push(true);
    // A fact retrieved correctly on its review day moves along its schedule,
    // and leaves the queue entirely once it has been retrieved often enough.
    if (this.reviewing) {
      this.progressService.passedReview(this.reviewing);
      this.reviewing = undefined;
    }
    this.streakCount++;
    const bonusPoints = this.calculateBonusPoints();
    this.feedback = this.languageService.translate('correct');
    if (bonusPoints > 1) {
      this.feedback += ` +${bonusPoints} ${this.languageService.translate('bonus-points')}!`;
    }
    this.scoreService.incrementCorrectAnswers();
    this.scoreService.incrementScore(bonusPoints);
    this.showOkButton = true;
    // A streak is worth more of a surge than a single right answer
    this.fieldPulse.pulse(this.streakCount >= 3 ? 0.85 : 0.5);
    this.vibrate([0, 30, 40, 30]);
    this.playSuccessSound();
    // Set focus on the next button after it appears
    setTimeout(() => {
      if (this.nextButton) {
        this.nextButton.nativeElement.focus();
      }
    }, 0);
  }

  private handleWrongAnswer() {
    this.answerWasCorrect = false;
    this.streakCount = 0;
    this.wrongAttempts++;
    this.vibrate(120);

    if (this.wrongAttempts === 1) {
      // No verdict on the first miss — an invitation to try again teaches more
      this.feedback = this.languageService.translate('try-again');
      this.isSecondAttempt = true;
      this.userAnswer = '';
      if (!this.useKeypad) {
        setTimeout(() => this.answerInput.nativeElement.focus(), 100);
      }
    } else {
      // Retrieval practice works best when a missed fact returns a couple of
      // questions later, not at the very end — so queue it, unless this was
      // already a second look at the same question.
      if (!this.isReplay) {
        this.missed.push({
          question: { ...this.currentQuestion },
          dueAfter: this.questionsAnswered + REPLAY_GAP
        });
      }
      // Kept for the next round too, whether or not this was already a replay:
      // a fact missed twice in one round is exactly the one to revisit later.
      this.progressService.recordMissed({ ...this.currentQuestion });

      // Out of attempts: show the answer itself. A child who only hears "wrong"
      // learns nothing from the question they just spent two tries on.
      this.feedback = `${this.languageService.translate('answer-is')} ${this.correctAnswer}. ` +
        this.languageService.translate('good-try');
      // The answer is being given away either way, so give the method with
      // it. Money questions are worded, not a bare fact, and have no step.
      this.workedLine = this.currentQuestion.moneyPrompt
        ? ''
        : workedStep(this.currentQuestion.num1, this.currentQuestion.num2,
                     this.currentQuestion.operation) || '';
      this.showOkButton = true;
      this.results.push(false);
      this.considerEasierOffer();
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

  /**
   * Asks, once a round at most, whether the child would like the rest of it
   * easier. It asks rather than acts on purpose: see in-round-tuner.ts. A
   * change made for a child without their knowing is one they will feel
   * anyway, and it takes the win with it.
   */
  private considerEasierOffer() {
    const state: OfferState = {
      results: this.results,
      difficulty: this.difficulty,
      totalQuestions: TOTAL_QUESTIONS,
      spent: this.offerSpent
    };

    if (!shouldOfferEasier(state)) {
      return;
    }

    this.easierSetting = easierThan(this.difficulty) || '';
    this.showEasierOffer = true;
  }

  /** Yes: the rest of the round runs a rung easier, and says so. */
  takeEasier() {
    const easier = easierThan(this.difficulty);
    this.dismissOffer();
    if (!easier) {
      return;
    }

    this.difficulty = easier;
    // The stored choice is left alone: this is a decision about the rest of
    // this round, not about what the child picked or what they play next.
    try {
      localStorage.setItem(EASED_KEY, 'true');
    } catch {
      // Worth carrying on without; the round still gets easier
    }
  }

  /** No: nothing changes, and nothing asks again. */
  keepGoing() {
    this.dismissOffer();
  }

  private dismissOffer() {
    this.showEasierOffer = false;
    this.offerSpent = true;
  }

  private clearEasedFlag() {
    try {
      localStorage.removeItem(EASED_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable
    }
  }

  private calculateBonusPoints(): number {
    if (this.streakCount >= 5) return 3;
    if (this.streakCount >= 3) return 2;
    return 1;
  }

  private playSuccessSound() {
    this.soundService.playSuccess();
  }

  private playErrorSound() {
    this.soundService.playError();
  }

  moveToNextQuestion() {
    this.feedback = '';
    this.answerWasCorrect = null;
    this.userAnswer = '';
    this.isSecondAttempt = false;
    this.showOkButton = false;
    this.wrongAttempts = 0;
    this.generateQuestion();
    if (!this.useKeypad) {
      setTimeout(() => this.answerInput.nativeElement.focus(), 100);
    }
  }

  returnToGrade() {
    this.router.navigate(['/grade']);
  }
}
