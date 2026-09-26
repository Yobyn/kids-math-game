import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ScoreService } from '../services/score.service';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService } from '../services/progress.service';
import { FieldPulseService } from '../services/field-pulse.service';
import { AuthService } from '../services/auth.service';
import { LevelProgress, levelProgress, xpForRound } from '../levels/level-curve';
import { WardrobeItem, itemById, itemForEvent, itemsUnlockedAt } from '../avatar/avatar-model';
import { activeEvent } from '../events/seasonal-events';
import { AvatarService } from '../services/avatar.service';
import { ProgressSyncService } from '../services/progress-sync.service';
import { SoundService } from '../services/sound.service';
import { Avatar } from '../avatar/avatar-model';
import { EASED_KEY } from '../levels/in-round-tuner';
import { RESULT_VERSION, SavedResult, isShowable } from './result-state';
import { StarCount, Tile, praiseFor, revealTimeline, roundTiles, starsFor } from './round-card';

/**
 * How many rounds a guest plays before the game mentions an account. Guidance
 * on children's apps is blunt about the cost of getting this wrong: a child
 * who meets an ask every time they finish learns to brace at the moment of
 * success. So the offer waits until there is genuinely something to lose,
 * sits below the celebration rather than over it, and does not come back once
 * it has been waved away.
 */
const ROUNDS_BEFORE_OFFER = 3;
/** The round's tune starts this long after the last star rings. */
export const ROUND_TUNE_AFTER_STARS_MS = 250;
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
  /** The headline: praise for the work, at every star count. */
  message = '';
  starsEarned: StarCount = 0;
  starsShown = 0;
  /** The character's hop for joy, as the round's tune plays. */
  hopping = false;
  /** What the child did this round, shown as tiles — see round-card.ts. */
  tiles: Tile[] = [];
  tilesShown = 0;
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
  /** Which event it was, for writing the result down. */
  private eventId?: string;
  /** Where the bar starts before it fills, so the round's gain is visible. */
  levelFillPercent = 0;
  /** Drawn on the way in to the character, so it reads as a door to it. */
  avatar!: Avatar;
  /**
   * True when this screen is showing a round that FINISHED earlier and was
   * never seen — a reload, or the app reopened. Everything on it was already
   * banked at the time; nothing here is awarded again.
   */
  showingAgain = false;

  constructor(
    private scoreService: ScoreService,
    private router: Router,
    public languageService: LanguageService,
    private progressService: ProgressService,
    private fieldPulse: FieldPulseService,
    private authService: AuthService,
    private avatarService: AvatarService,
    private progressSync: ProgressSyncService,
    private soundService: SoundService
  ) {}

  ngOnInit() {
    const finalScore = this.scoreService.getFinalScore();

    // A round that has just been played, a round played earlier and never
    // seen, or nothing at all — and the three are not the same screen.
    if (finalScore.total > 0) {
      this.bankRound(finalScore);
    } else if (!this.showBanked()) {
      // Nothing behind this screen. It used to render `NaN%` and write a
      // round of nothing into the history.
      this.router.navigate(['/grade']);
      return;
    }

    this.avatar = this.avatarService.get();
    this.starsEarned = this.getStarsEarned();
    this.fieldPulse.pulse(1);
    this.celebrate();
    // Read now, so nothing offers it back from anywhere else
    this.progressService.markResultSeen();
  }

  /** The round that has just been played: counted, awarded, written down. */
  private bankRound(finalScore: { score: number; total: number; correctAnswers: number; percentage: number }) {
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
    this.progressService.saveResult(this.asSavedResult());

    // A round is the moment something new exists to keep. It goes to the
    // account in the background: nothing on this screen waits for it, and a
    // child with no signal never learns it was tried.
    this.progressSync.push().subscribe();
  }

  /**
   * A round finished earlier whose result was never shown. Everything here
   * is READ: the history entry, the experience, the level's items and the
   * event's item were all written the first time round, and writing any of
   * them again would pay a child twice for one round.
   */
  private showBanked(): boolean {
    const banked = this.progressService.readResult();
    if (!isShowable(banked, Date.now())) {
      return false;
    }

    const result = banked as SavedResult;
    this.showingAgain = true;
    this.score = result.score;
    this.total = result.total;
    this.correctAnswers = result.correctAnswers;
    this.percentage = result.percentage;
    this.setMessage();
    this.previousBest = result.previousBest;
    this.isPersonalBest = result.isPersonalBest;
    this.roundsPlayed = result.roundsPlayed;
    this.xpEarned = result.xpEarned;
    this.level = levelProgress(result.xpAfter);
    this.leveledUp = result.leveledUp;
    this.unlocked = result.unlockedIds
      .map(id => itemById(id))
      .filter((item): item is WardrobeItem => !!item);
    this.eventJustEarned = result.eventJustEarned;
    this.eventItem = result.eventId ? itemForEvent(result.eventId) : undefined;
    // Deliberately NOT offered here. The offer is about the moment a child
    // finishes a round; an hour later, on a screen they are being shown
    // because something interrupted them, it is an ambush.
    this.showKeepOffer = false;
    return true;
  }

  /** What to SAY about this round, which is all that is worth keeping. */
  private asSavedResult(): SavedResult {
    return {
      version: RESULT_VERSION,
      savedAt: Date.now(),
      seen: false,
      score: this.score,
      total: this.total,
      correctAnswers: this.correctAnswers,
      percentage: this.percentage,
      previousBest: this.previousBest,
      isPersonalBest: this.isPersonalBest,
      roundsPlayed: this.roundsPlayed,
      xpEarned: this.xpEarned,
      xpAfter: this.progressService.getXp(),
      leveledUp: this.leveledUp,
      unlockedIds: this.unlocked.map(item => item.id),
      ...(this.eventItem && this.eventId ? { eventId: this.eventId } : {}),
      eventJustEarned: this.eventJustEarned
    };
  }

  ngOnDestroy() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
  }

  private getStarsEarned(): StarCount {
    return starsFor(this.percentage);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Stars land one by one, then the tiles of what the child did. The order
   * lives in round-card.ts; nothing waits for it, the buttons work at once.
   */
  private celebrate() {
    this.fillLevelBar();
    this.tiles = roundTiles({
      correctAnswers: this.correctAnswers,
      xpEarned: this.xpEarned,
      isPersonalBest: this.isPersonalBest
    });

    const timeline = revealTimeline(this.starsEarned, this.tiles.length, this.prefersReducedMotion());
    if (timeline.done === 0) {
      this.starsShown = this.starsEarned;
      this.tilesShown = this.tiles.length;
      this.soundService.playRoundDone();
      return;
    }
    // Each star rings as it lands, a step higher than the last, and the
    // round's own tune follows — after no stars too: the work is praised
    // whatever the stars say
    timeline.stars.forEach((at, i) => this.timers.push(window.setTimeout(() => {
      this.starsShown = i + 1;
      this.soundService.playStar(i);
    }, at)));
    const afterStars = timeline.stars.length ? timeline.stars[timeline.stars.length - 1] + ROUND_TUNE_AFTER_STARS_MS : 0;
    // The character hops for joy as the round's tune plays
    this.timers.push(window.setTimeout(() => {
      this.soundService.playRoundDone();
      this.hopping = true;
    }, afterStars));
    timeline.tiles.forEach((at, i) => this.timers.push(window.setTimeout(() => this.tilesShown = i + 1, at)));
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
    this.message = this.languageService.translate(praiseFor(starsFor(this.percentage)));
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
    // Written down the moment it is won, because a level can say WHAT a
    // child has but never WHEN they got it
    this.unlocked.forEach(item => this.progressService.keepItem(item.id));

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
    this.eventId = event.id;

    this.eventJustEarned = this.progressService.getEarnedEvents().indexOf(event.id) < 0;
    this.progressService.earnEvent(event.id);
    this.eventItem = itemForEvent(event.id);
    // After the item is known, not before: the first draft of this recorded
    // a field that had not been assigned yet and kept nothing at all.
    if (this.eventItem) {
      this.progressService.keepItem(this.eventItem.id);
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

  seeProgress() {
    this.router.navigate(['/progress']);
  }

  /** True when this round handed something over that can actually be worn. */
  get justEarnedSomething(): boolean {
    return this.unlocked.length > 0 || this.eventJustEarned;
  }

  seeCharacter() {
    this.router.navigate(['/avatar']);
  }

  playAgain() {
    this.scoreService.resetScore();
    // Read and done with: a child choosing to play again has had their
    // closure, and nothing should offer this round back to them
    this.progressService.clearResult();
    // Clear the stored grade and difficulty to force new selection
    localStorage.removeItem('grade');
    localStorage.removeItem('difficulty');
    this.router.navigate(['/grade']);
  }
}
