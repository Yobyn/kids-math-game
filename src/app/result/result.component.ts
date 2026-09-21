import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { AuthService } from '../services/auth.service';

/**
 * How many rounds a guest plays before the game mentions an account. Guidance
 * on children's apps is blunt about the cost of getting this wrong: a child
 * who meets an ask every time they finish learns to brace at the moment of
 * success. So the offer waits until there is genuinely something to lose,
 * sits below the celebration rather than over it, and does not come back once
 * it has been waved away.
 */
const ROUNDS_BEFORE_OFFER = 3;
const OFFER_DISMISSED_KEY = 'keepOfferDismissed';

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
  previousBest: number | null = null;
  isPersonalBest = false;
  roundsPlayed = 0;
  showKeepOffer = false;

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService,
    private progressService: ProgressService,
    private fieldPulse: FieldPulseService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const finalScore = this.scoreService.getFinalScore();
    this.score = finalScore.score;
    this.total = finalScore.total;
    this.correctAnswers = finalScore.correctAnswers;
    this.percentage = finalScore.percentage;
    this.setMessage();

    // Read the old best before recording, so this round can be compared to it
    this.previousBest = this.progressService.getBestPercentage();
    this.isPersonalBest = this.previousBest !== null && this.percentage > this.previousBest;
    this.progressService.record({
      correctAnswers: this.correctAnswers,
      total: this.total,
      percentage: this.percentage,
      score: this.score,
      grade: Number(localStorage.getItem('grade')) || 1
    });
    this.roundsPlayed = this.progressService.getRoundsPlayed();

    this.showKeepOffer = this.shouldOfferToKeepProgress();

    this.starsEarned = this.getStarsEarned();
    this.fieldPulse.pulse(1);
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

  private shouldOfferToKeepProgress(): boolean {
    return this.authService.isGuest() &&
      this.roundsPlayed >= ROUNDS_BEFORE_OFFER &&
      !this.offerWasDismissed();
  }

  private offerWasDismissed(): boolean {
    try {
      return localStorage.getItem(OFFER_DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  createAccount() {
    this.router.navigate(['/login'], { queryParams: { create: 1 } });
  }

  /**
   * Asked once and turned down is an answer. The header keeps a "Sign in"
   * button, so the way back is never hidden — it just stops being pushed.
   */
  dismissKeepOffer() {
    this.showKeepOffer = false;
    try {
      localStorage.setItem(OFFER_DISMISSED_KEY, 'true');
    } catch {
      // If the choice cannot be remembered, the offer reappearing is the
      // lesser harm against failing the screen outright
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
