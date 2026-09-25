import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService, PlayTotals } from '../services/progress.service';
import { GateChallenge, isGatePassed, newChallenge } from './parent-gate';
import { spellNumber } from './number-words';
import { PracticePlan, practicePlan } from './practice-plan';
import { AuthService } from '../services/auth.service';
import { ProgressSyncService } from '../services/progress-sync.service';
import { ADULTS_WORDS } from './adults-words';

/** Where the honest trend is drawn, in its own coordinate space. */
const CHART_WIDTH = 300;
const CHART_HEIGHT = 100;

/**
 * The grown-ups' screen: the one place in the game that tells the truth
 * about how a child is doing, because it is the one place the child is not
 * reading.
 *
 * Two decisions are worth keeping straight here.
 *
 * The door is not arithmetic. Every parental gate convention reaches for a
 * small sum, and in a maths game that turns a locked door into a test a child
 * can fail at the exact skill the product exists to build confidence in. The
 * gate asks an adult to read a number written out in words instead, and a
 * wrong answer never says "wrong" — it just hands over a different number.
 *
 * What is behind the door is a plan, not a report. See practice-plan.ts for
 * why: handing a maths-anxious adult a list of their child's weaknesses is
 * the intervention most likely to make things worse, and the thing that
 * protects against it is structure — a short, scripted, finishable ask.
 */
@Component({
  selector: 'app-adults',
  templateUrl: './adults.component.html',
  styleUrls: ['./adults.component.css']
})
export class AdultsComponent implements OnInit {
  locked = true;
  challenge: GateChallenge = newChallenge();
  typed = '';

  totals: PlayTotals = { rounds: 0, questions: 0, correct: 0 };
  plan: PracticePlan = { trend: [], facts: [], accuracy: null, waiting: 0, stuck: [] };

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;

  /** The states of asking the account to forget its copy. */
  forgetState: 'idle' | 'asking' | 'working' | 'done' = 'idle';

  constructor(
    private progressService: ProgressService,
    private router: Router,
    public languageService: LanguageService,
    private authService: AuthService,
    private progressSync: ProgressSyncService
  ) {
    languageService.extend(ADULTS_WORDS);
  }

  ngOnInit() {
    this.challenge = newChallenge();
  }

  /** The challenge written out, in whichever language the adult is reading. */
  get challengeInWords(): string {
    return spellNumber(this.challenge.value, this.languageService.getLanguage());
  }

  /**
   * Opens the screen when the number was read correctly, and quietly swaps in
   * a different number when it was not. Nothing is ever called wrong.
   */
  tryGate() {
    if (isGatePassed(this.challenge, this.typed)) {
      this.locked = false;
      this.load();
      return;
    }

    this.typed = '';
    this.challenge = newChallenge();
  }

  private load() {
    this.totals = this.progressService.getTotals();
    this.plan = practicePlan(
      this.progressService.getHistory(),
      this.progressService.getMissedFacts(),
      new Date(),
      this.progressService.getLearned()
    );
  }

  /**
   * What stuck this week, in words. Plural-aware, because "1 facts" in front
   * of a parent reads as a machine talking rather than a report about their
   * child.
   */
  get stuckLine(): string {
    const count = this.plan.stuck.length;
    return this.languageService
      .translate(count === 1 ? 'adults-stuck-one' : 'adults-stuck-many')
      .replace('{count}', String(count));
  }

  /** Who this is about, so an adult sharing a tablet knows which child. */
  get playerName(): string {
    try {
      return localStorage.getItem('username') || this.languageService.translate('guest-player');
    } catch {
      return this.languageService.translate('guest-player');
    }
  }

  get heading(): string {
    return this.languageService.translate('adults-for').replace('{name}', this.playerName);
  }

  get hasTrend(): boolean {
    return this.plan.trend.length > 0;
  }

  /**
   * The rounds as a polyline. A single round is still drawn, as a flat line
   * across the middle of the space rather than a point nobody can see.
   */
  get trendPoints(): string {
    const trend = this.plan.trend;
    if (!trend.length) {
      return '';
    }

    const step = trend.length > 1 ? CHART_WIDTH / (trend.length - 1) : 0;
    return trend
      .map((point, index) => {
        const x = trend.length > 1 ? index * step : CHART_WIDTH / 2;
        const y = CHART_HEIGHT - (point.percentage / 100) * CHART_HEIGHT;
        return `${round(x)},${round(y)}`;
      })
      .join(' ');
  }

  /** The dots, so a two-round history is not an invisible line segment. */
  get trendDots(): { x: number; y: number; percentage: number }[] {
    const trend = this.plan.trend;
    const step = trend.length > 1 ? CHART_WIDTH / (trend.length - 1) : 0;
    return trend.map((point, index) => ({
      x: round(trend.length > 1 ? index * step : CHART_WIDTH / 2),
      y: round(CHART_HEIGHT - (point.percentage / 100) * CHART_HEIGHT),
      percentage: point.percentage
    }));
  }

  /** The operation missed most, named in words rather than as a sign. */
  get weakestName(): string | null {
    const names: { [operation: string]: TranslationKeys } = {
      '+': 'op-plus',
      '-': 'op-minus',
      '*': 'op-times',
      '/': 'op-divide'
    };
    const key = this.plan.weakest ? names[this.plan.weakest] : undefined;
    return key ? this.languageService.translate(key) : null;
  }

  /** How many facts are waiting for their day, worded for an adult. */
  get waitingLine(): string {
    return this.languageService.translate('adults-waiting')
      .replace('{count}', String(this.plan.waiting));
  }

  get weakestLine(): string {
    return this.languageService.translate('adults-weakest')
      .replace('{operation}', this.weakestName || '');
  }

  /**
   * Only an account has a copy anywhere but this device, so a guest is never
   * shown a control for deleting something that does not exist.
   */
  get canForget(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Deleting is one click plus a confirmation, not a support request — an
   * adult who wants the copy gone should be able to make it gone. It is also
   * worded so nobody is tricked into thinking it wipes the child's game: what
   * is on this device stays, and only the account's copy is forgotten.
   */
  askToForget(): void {
    this.forgetState = 'asking';
  }

  cancelForget(): void {
    this.forgetState = 'idle';
  }

  confirmForget(): void {
    this.forgetState = 'working';
    // It says done either way: a server that cannot be reached is holding
    // nothing this adult can act on, and a spinner that never stops is worse
    this.progressSync.forget().subscribe(() => {
      this.forgetState = 'done';
    });
  }

  back() {
    this.router.navigate(['/grade']);
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
