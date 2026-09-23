import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';
import { SoundService } from '../services/sound.service';
import { MissedFact, ProgressService } from '../services/progress.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { workedStep } from '../teaching/worked-step';
import {
  MoneyQuestion,
  moneyAnswerMatches,
  moneyQuestion,
  unitPrefix,
  unitSuffix
} from '../teaching/money';
import { MAX_PICKED, addPiece, pickMatches, removeAt } from '../teaching/coin-pick';
import { applyKey, placeholderFor } from '../keypad/answer-entry';
import { EASED_KEY, OfferState, easierThan, shouldOfferEasier } from '../levels/in-round-tuner';
import {
  QUESTIONS_IN_ROUND,
  RESUME_CHOICE_KEY,
  ROUND_VERSION,
  ResumeChoice,
  SavedRound,
  isResumable,
  resumeQuestionNumber
} from './round-state';

/** The quiz is ten questions long; ScoreService.isGameComplete() agrees. */
const TOTAL_QUESTIONS = QUESTIONS_IN_ROUND;
/** A missed question comes back this many questions later — soon, not last. */
const REPLAY_GAP = 2;

/**
 * What is on the screen. A money question carries its whole self — the
 * pieces to draw, the wording, the unit the answer is in — because it is no
 * longer a sum with a sentence in front of it.
 */
export interface AskedQuestion {
  num1: number;
  num2: number;
  operation: string;
  money?: MoneyQuestion;
}

interface PendingReplay {
  question: AskedQuestion;
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
})
export class QuestionComponent implements OnInit, OnDestroy {
  @ViewChild('answerInput') answerInput!: ElementRef;
  @ViewChild('nextButton') nextButton!: ElementRef;
  
  isReplay = false;
  private missed: PendingReplay[] = [];
  /** Set while the question on screen is a review from an earlier day. */
  private reviewing?: MissedFact;
  currentQuestion: AskedQuestion = {
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
  /** The answer as the child would write it, which for money is not a bare number. */
  correctAnswerText = '';
  showShakeAnimation: boolean = false;
  answerWasCorrect: boolean | null = null;
  readonly totalQuestions = TOTAL_QUESTIONS;
  streakCount: number = 0;
  useKeypad: boolean = false;
  /**
   * The coins a child has put down, for the one money shape whose answer is
   * a handful rather than a number. Empty for every other question.
   */
  picked: number[] = [];
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
  /**
   * True while the child is being asked whether to pick an interrupted round
   * back up. Nothing else is on screen while it is: restoring silently, or
   * wiping silently, are both decisions taken FOR a child about their own
   * work, and this game does not do that anywhere else either.
   */
  showResumeOffer = false;
  /** The round behind that offer, held until the child answers it. */
  private pendingRound: SavedRound | null = null;
  /** Where they had got to, for saying so in words they can check. */
  resumeAt = 0;
  /** Set once the round is live, so half-built state is never written down. */
  private roundLive = false;

  /**
   * The page is not reliably told it is closing. `unload` never fires on
   * Safari, `beforeunload` only fires on desktop navigations, and neither
   * runs when the OS closes a backgrounded tab. Going hidden is the last
   * signal that can be counted on, so it is the one the round is saved on.
   */
  private readonly onVisibilityChange = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'hidden') {
      this.saveRound();
    }
  };
  /** Next best, and the one that fires on a back-forward-cache eviction. */
  private readonly onPageHide = () => this.saveRound();

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
    this.listenForHiding();

    // Two ways back into an interrupted round, and they are not the same.
    // A grade screen that has already asked sends a choice with the child;
    // an OS that quietly reloaded this tab underneath them sends nothing, and
    // that second case is the common one on a phone. So when no choice
    // arrives and there is a round to come back to, ask here.
    const choice = this.takeResumeChoice();
    const saved = this.progressService.readRound();

    if (choice !== 'fresh' && isResumable(saved, Date.now(), TOTAL_QUESTIONS)) {
      if (choice === 'resume') {
        this.restoreRound(saved);
      } else {
        this.pendingRound = saved;
        this.resumeAt = resumeQuestionNumber(saved, TOTAL_QUESTIONS);
        this.showResumeOffer = true;
      }
      return;
    }

    this.progressService.clearRound();
    this.startFreshRound();
  }

  ngOnDestroy() {
    // Leaving the screen on purpose is itself a moment worth saving at: a
    // child who taps back and returns has not abandoned anything.
    this.saveRound();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
    }
  }

  private listenForHiding() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onPageHide);
    }
  }

  private startFreshRound() {
    if (!localStorage.getItem('difficulty') || !localStorage.getItem('grade')) {
      this.router.navigate(['/difficulty']);
      return;
    }
    this.scoreService.resetScore();
    // A round abandoned half way could leave this set; a new round is honest
    // about its own setting until it is not.
    this.clearEasedFlag();
    this.seedMissedFromLastRound();
    this.roundLive = true;
    this.generateQuestion();
    this.watchScore();
    this.saveRound();
  }

  private watchScore() {
    this.scoreService.getCurrentScore().subscribe(score => {
      this.currentScore = score;
    });
    this.scoreService.getQuestionsAnswered().subscribe(questions => {
      this.questionsAnswered = questions;
    });
  }

  /** Yes: back to exactly where they were. */
  takeResume() {
    const round = this.pendingRound;
    this.showResumeOffer = false;
    this.pendingRound = null;
    if (round) {
      this.restoreRound(round);
    } else {
      this.startFreshRound();
    }
  }

  /** No: the old round is gone, and a new one starts at their own settings. */
  startOver() {
    this.showResumeOffer = false;
    this.pendingRound = null;
    this.progressService.clearRound();
    this.startFreshRound();
  }

  /**
   * Puts a saved round back. The grade and difficulty travel WITH the round
   * rather than being read from storage, because the result screen clears
   * them: a round resumed after the app was closed would otherwise come back
   * at whatever the defaults happen to be, which is not the round they left.
   */
  private restoreRound(round: SavedRound) {
    this.grade = round.grade;
    this.difficulty = round.difficulty;
    try {
      localStorage.setItem('grade', String(round.grade));
      localStorage.setItem('difficulty', round.difficulty);
    } catch {
      // The round in memory is already right; storage only has to agree later
    }

    this.scoreService.restore({
      score: round.score,
      questionsAnswered: round.questionsAnswered,
      correctAnswers: round.correctAnswers
    });
    this.results = round.results.slice();
    this.missed = round.missed.map(item => ({
      question: { ...item.question },
      dueAfter: item.dueAfter,
      reviewOf: item.reviewOf
    }));
    this.offerSpent = round.offerSpent;
    this.streakCount = round.streak;
    this.setEasedFlag(round.eased);
    this.roundLive = true;
    this.watchScore();

    if (round.answered) {
      // They had already answered it and were reading the answer. Asking it
      // again would count a question they have been counted for, so the
      // round picks up at the next one instead.
      this.generateQuestion();
    } else {
      this.currentQuestion = { ...round.question };
      this.isReplay = round.isReplay;
      this.reviewing = round.reviewing;
      this.wrongAttempts = round.wrongAttempts;
      this.isSecondAttempt = round.wrongAttempts > 0;
      this.userAnswer = '';
      // Only for the question actually being restored, and only what it can
      // hold: a store hand-edited to carry coins for a typed question must
      // not put a purse on the screen
      this.picked = round.question.money && round.question.money.tray
        ? (round.picked || []).slice(0, MAX_PICKED)
        : [];
      this.workedLine = '';
      this.inputPlaceholder = '?';
      this.showOkButton = false;
      this.answerWasCorrect = null;
      // A child coming back to a second attempt should be told it is one,
      // rather than left to wonder why they have a try in hand.
      this.feedback = round.wrongAttempts > 0
        ? this.languageService.translate('try-again')
        : '';
    }

    this.saveRound();
  }

  /** The choice a screen that has already asked left behind, read once. */
  private takeResumeChoice(): ResumeChoice | null {
    try {
      const raw = localStorage.getItem(RESUME_CHOICE_KEY);
      localStorage.removeItem(RESUME_CHOICE_KEY);
      return raw === 'resume' || raw === 'fresh' ? raw : null;
    } catch {
      return null;
    }
  }

  /**
   * Writes the round down. Called after every question and whenever the page
   * goes away — never on a timer, because a save that only happens every few
   * seconds is a save that misses the interruption it exists for.
   */
  private saveRound() {
    if (!this.roundLive || this.scoreService.isGameComplete()) {
      return;
    }
    const counters = this.scoreService.snapshot();
    this.progressService.saveRound({
      version: ROUND_VERSION,
      savedAt: Date.now(),
      grade: this.grade,
      difficulty: this.difficulty,
      eased: this.isEased(),
      questionsAnswered: counters.questionsAnswered,
      correctAnswers: counters.correctAnswers,
      score: counters.score,
      streak: this.streakCount,
      results: this.results.slice(),
      question: { ...this.currentQuestion },
      isReplay: this.isReplay,
      reviewing: this.reviewing,
      missed: this.missed.map(item => ({
        question: { ...item.question },
        dueAfter: item.dueAfter,
        reviewOf: item.reviewOf
      })),
      offerSpent: this.offerSpent,
      picked: this.picked.slice(),
      answered: this.showOkButton,
      wrongAttempts: this.wrongAttempts
    });
  }

  /** The round is over; there is nothing left to come back to. */
  private finishRound() {
    this.roundLive = false;
    this.progressService.clearRound();
  }

  /** What to tell the child about where they were, in their own language. */
  get resumeLine(): string {
    return this.languageService.translate('resume-progress')
      .replace('{number}', String(this.resumeAt))
      .replace('{total}', String(TOTAL_QUESTIONS));
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

  /**
   * The answer box is not always on the screen — the resume card takes it
   * over, and the screen can be left before a queued focus comes round. The
   * button below has always been checked before being focused; this was not,
   * and a focus arriving after the box had gone threw.
   */
  private focusAnswer() {
    if (this.answerInput) {
      this.answerInput.nativeElement.focus();
    }
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
                    money: fact.money },
        dueAfter: index + 1,
        reviewOf: fact
      });
    });
  }

  /**
   * Money is a strand of its own now rather than a themed sum: which shapes
   * of question a child meets, which pieces are on the table, and whether
   * amounts are written €3 and 40c or €3.40, all follow the band for their
   * grade. See teaching/money.ts, which holds the progression and the reason
   * for it. Every grade from 1 gets money; it used to start at 2.
   */
  private shouldAskAboutMoney(): boolean {
    return this.grade >= 1 && Math.random() < 0.25;
  }

  private generateMoneyQuestion(): boolean {
    const question = moneyQuestion(this.grade, Math.random, {
      and: this.languageService.translate('money-and')
    });
    if (!question) {
      return false;
    }
    this.currentQuestion = { num1: 0, num2: 0, operation: 'money', money: question };
    return true;
  }

  /** The wording, with the amounts already written the way this band writes them. */
  get moneyText(): string {
    const money = this.currentQuestion.money;
    if (!money) {
      return '';
    }
    return Object.keys(money.values).reduce(
      (text, name) => text.split(`{${name}}`).join(money.values[name]),
      this.languageService.translate(money.prompt as any)
    );
  }

  /** What sits in front of the answer box, and what sits after it. */
  get answerPrefix(): string {
    return this.currentQuestion.money ? unitPrefix(this.currentQuestion.money.unit) : '';
  }

  get answerSuffix(): string {
    return this.currentQuestion.money ? unitSuffix(this.currentQuestion.money.unit) : '';
  }

  /** True where the band writes €3.40, which needs a point on the keypad. */
  get needsDecimalKey(): boolean {
    return this.currentQuestion.money ? this.currentQuestion.money.unit === 'decimal' : false;
  }

  generateQuestion() {
    if (this.scoreService.isGameComplete()) {
      this.finishRound();
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
      this.picked = [];
      this.feedback = '';
      this.workedLine = '';
      this.inputPlaceholder = '?';
      this.showOkButton = false;
      return;
    }

    if (this.shouldAskAboutMoney() && this.generateMoneyQuestion()) {
      this.userAnswer = '';
      this.picked = [];
      this.feedback = '';
      this.workedLine = '';
      this.inputPlaceholder = '?';
      this.showOkButton = false;
      return;
    }

    this.currentQuestion = { num1: 0, num2: 0, operation: '+' };
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
    this.picked = [];
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

  /** True when this question wants coins put down rather than a number typed. */
  get isPicking(): boolean {
    return !!(this.currentQuestion.money && this.currentQuestion.money.tray);
  }

  /** The denominations on offer, or none when the question is not that shape. */
  get tray(): number[] {
    return (this.currentQuestion.money && this.currentQuestion.money.tray) || [];
  }

  /**
   * Take a coin from the tray. The tray is not consumed — a child making 60c
   * from three 20s needs the same coin three times, and a real purse is not
   * the constraint being taught here.
   */
  takeFromTray(index: number) {
    if (this.showOkButton || index < 0 || index >= this.tray.length) {
      return;
    }
    this.picked = addPiece(this.picked, this.tray[index]);
    this.vibrate(10);
    this.saveRound();
  }

  /** Put one back. Every tap is undoable, exactly as on the keypad. */
  putBack(index: number) {
    if (this.showOkButton) {
      return;
    }
    this.picked = removeAt(this.picked, index);
    this.vibrate(10);
    this.saveRound();
  }

  checkAnswer() {
    const picking = this.currentQuestion.money;
    if (picking && picking.tray) {
      if (!this.picked.length) {
        this.showShakeAnimation = true;
        setTimeout(() => this.showShakeAnimation = false, 500);
        return;
      }
      this.correctAnswer = picking.answer;
      this.correctAnswerText = picking.answerText;
      // Any handful that comes to the amount. Which coins, how many, and in
      // what order are all beside the point — see teaching/coin-pick.ts.
      if (pickMatches(this.picked, picking.answerCents)) {
        this.handleCorrectAnswer();
      } else {
        this.handleWrongAnswer();
      }
      return;
    }

    if (this.userAnswer === null || this.userAnswer === undefined || this.userAnswer === '') {
      this.showShakeAnimation = true;
      setTimeout(() => this.showShakeAnimation = false, 500);
      return;
    }

    const money = this.currentQuestion.money;
    if (money) {
      this.correctAnswer = money.answer;
      this.correctAnswerText = money.answerText;
      if (moneyAnswerMatches(this.userAnswer, money)) {
        this.handleCorrectAnswer();
      } else {
        this.handleWrongAnswer();
      }
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

    this.correctAnswerText = String(this.correctAnswer);

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
    this.saveRound();
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
      this.picked = [];
      if (!this.useKeypad) {
        setTimeout(() => this.focusAnswer(), 100);
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
      this.feedback = `${this.languageService.translate('answer-is')} ${this.correctAnswerText}. ` +
        this.languageService.translate('good-try');
      // The answer is being given away either way, so give the method with
      // it. Money questions used to get nothing here; they now carry their
      // own line — a pile counted up, or change counted on from the price.
      this.workedLine = this.currentQuestion.money
        ? this.currentQuestion.money.worked
        : workedStep(this.currentQuestion.num1, this.currentQuestion.num2,
                     this.currentQuestion.operation) || '';
      this.showOkButton = true;
      this.results.push(false);
      this.saveRound();
      this.considerEasierOffer();
      // Use the service to increment questions answered
      this.scoreService.incrementQuestionsAnswered();
      if (this.scoreService.isGameComplete()) {
        this.finishRound();
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

  private isEased(): boolean {
    try {
      return localStorage.getItem(EASED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /** Put back with a resumed round, so it stays the round they were playing. */
  private setEasedFlag(eased: boolean) {
    if (!eased) {
      this.clearEasedFlag();
      return;
    }
    try {
      localStorage.setItem(EASED_KEY, 'true');
    } catch {
      // The round in memory is already at the eased setting either way
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
    this.picked = [];
    this.isSecondAttempt = false;
    this.showOkButton = false;
    this.wrongAttempts = 0;
    this.generateQuestion();
    this.saveRound();
    if (!this.useKeypad) {
      setTimeout(() => this.focusAnswer(), 100);
    }
  }

  returnToGrade() {
    this.router.navigate(['/grade']);
  }
}
