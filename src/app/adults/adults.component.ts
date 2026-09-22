import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService, PlayTotals } from '../services/progress.service';
import { GateChallenge, isGatePassed, newChallenge } from './parent-gate';
import { spellNumber } from './number-words';
import { PracticePlan, practicePlan } from './practice-plan';

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
  plan: PracticePlan = { trend: [], facts: [], accuracy: null };

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;

  constructor(
    private progressService: ProgressService,
    private router: Router,
    public languageService: LanguageService
  ) {}

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
      this.progressService.getMissedFacts()
    );
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

  get weakestLine(): string {
    return this.languageService.translate('adults-weakest')
      .replace('{operation}', this.weakestName || '');
  }

  back() {
    this.router.navigate(['/grade']);
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
