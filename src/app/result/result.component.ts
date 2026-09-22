import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { AuthService } from '../services/auth.service';
import { LevelProgress, levelProgress, xpForRound } from '../levels/level-curve';
import { WardrobeItem, itemForEvent, itemsUnlockedAt } from '../avatar/avatar-model';
import { activeEvent } from '../events/seasonal-events';
import { EASED_KEY } from '../levels/in-round-tuner';

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
  xpEarned = 0;
  level: LevelProgress = levelProgress(0);
  leveledUp = false;
  /** What this level actually handed over, if anything. */
  unlocked: WardrobeItem[] = [];
  /** An event item earned by having played while the event was on. */
  eventItem?: WardrobeItem;
  eventJustEarned = false;
  /** Where the bar starts before it fills, so the round's gain is visible. */
  levelFillPercent = 0;

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
      grade: Number(localStorage.getItem('grade')) || 1,
      difficulty: this.difficultyPlayed()
    });
    this.roundsPlayed = this.progressService.getRoundsPlayed();
    this.awardExperience();
    this.awardEventItem();

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
    this.fillLevelBar();

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

  /**
   * The setting this round was actually played at, or nothing when it changed
   * part way through. A round that cannot say how hard it was must not be
   * counted as evidence about how hard the next one should be — and the
   * suggestion on the difficulty screen reads exactly this field.
   */
  private difficultyPlayed(): string | undefined {
    try {
      if (localStorage.getItem(EASED_KEY) === 'true') {
        localStorage.removeItem(EASED_KEY);
        return undefined;
      }
      return localStorage.getItem('difficulty') || undefined;
    } catch {
      return undefined;
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

  /**
   * Finishing a round always pays, so a hard round still moves the bar. A
   * child who is struggling is exactly the one who must not watch the ladder
   * stand still.
   */
  private awardExperience() {
    this.xpEarned = xpForRound(this.correctAnswers, this.total);

    const before = levelProgress(this.progressService.getXp());
    this.progressService.addXp(this.xpEarned);
    this.level = levelProgress(this.progressService.getXp());
    this.leveledUp = this.level.level > before.level;

    // Every level crossed on this round, not just the last — a big round can
    // cross two, and the child earned both.
    this.unlocked = [];
    for (let level = before.level + 1; level <= this.level.level; level++) {
      this.unlocked = this.unlocked.concat(itemsUnlockedAt(level));
    }

    // Start the bar where the child left it, unless they have just levelled
    // up — then it genuinely starts from the bottom of the new level.
    const startFraction = this.leveledUp ? 0 : before.fraction;
    this.levelFillPercent = Math.round(startFraction * 100);
  }

  private fillLevelBar() {
    const target = Math.round(this.level.fraction * 100);

    if (this.prefersReducedMotion()) {
      this.levelFillPercent = target;
      return;
    }

    const start = this.levelFillPercent;
    const steps = 20;
    for (let step = 1; step <= steps; step++) {
      this.timers.push(window.setTimeout(() => {
        this.levelFillPercent = Math.round(start + ((target - start) * step) / steps);
      }, 40 * step));
    }
  }

  itemName(item: WardrobeItem): string {
    return this.languageService.translate(('item-' + item.id) as TranslationKeys);
  }

  /**
   * Finishing a round while an event is on earns its item. Nothing is timed
   * at the child and nothing is taken away later: the event returns next
   * year, so a child who was not here has missed nothing permanent.
   */
  private awardEventItem() {
    const event = activeEvent(new Date());
    if (!event) {
      return;
    }

    this.eventJustEarned = this.progressService.getEarnedEvents().indexOf(event.id) < 0;
    this.progressService.earnEvent(event.id);
    this.eventItem = itemForEvent(event.id);
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

  seeProgress() {
    this.router.navigate(['/progress']);
  }

  playAgain() {
    this.scoreService.resetScore();
    // Clear the stored grade and difficulty to force new selection
    localStorage.removeItem('grade');
    localStorage.removeItem('difficulty');
    this.router.navigate(['/grade']);
  }
}
