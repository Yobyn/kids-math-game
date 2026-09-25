import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService, PlayTotals } from '../services/progress.service';
import { AvatarService } from '../services/avatar.service';
import { Avatar, WardrobeItem, levelItems, isUnlocked, WARDROBE, NO_ITEM } from '../avatar/avatar-model';
import { LevelProgress, levelProgress } from '../levels/level-curve';
import { EffortTile, TileKind, effortTiles } from './progress-card';

/**
 * How far a child has come.
 *
 * Everything here only ever goes up. That is the whole design, and it comes
 * from the research: when recent poor results pile up, children get caught in
 * a performance loop — a discouraging place with lasting effects — and stop
 * being able to see that their learning is building at all. A line of scores
 * over time is exactly that pile of recent results, and on a bad week it
 * would tell a child they are getting worse at something they are in fact
 * practising more of.
 *
 * So a child sees effort, not performance: rounds finished, questions
 * answered, the level they have climbed to, the things they have earned, and
 * a personal best, which by definition never falls — shown as the round's
 * stars rather than a percentage (see progress-card.ts). The honest trend — dips
 * included — is a parent's view, and belongs on a screen of its own.
 */
@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.css']
})
export class ProgressComponent implements OnInit {
  totals: PlayTotals = { rounds: 0, questions: 0, correct: 0 };
  level: LevelProgress = levelProgress(0);
  best: number | null = null;
  avatar!: Avatar;
  earnedItems: WardrobeItem[] = [];

  constructor(
    private progressService: ProgressService,
    private avatarService: AvatarService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    this.totals = this.progressService.getTotals();
    this.level = levelProgress(this.progressService.getXp());
    this.best = this.progressService.getBestPercentage();
    this.avatar = this.avatarService.get();

    const events = this.progressService.getEarnedEvents();
    this.earnedItems = WARDROBE.filter(item =>
      item.id !== NO_ITEM && isUnlocked(item, this.level.level, events));
  }

  /** What the child has done, as tiles — see progress-card.ts. */
  get tiles(): EffortTile[] {
    return effortTiles(this.totals, this.best);
  }

  /** How far into the next level, for the bar. It only ever fills. */
  get levelPercent(): number {
    return Math.round(Math.min(Math.max(this.level.fraction, 0), 1) * 100);
  }

  labelFor(kind: TileKind): TranslationKeys {
    const labels: Record<TileKind, TranslationKeys> = {
      rounds: 'rounds-finished',
      questions: 'questions-answered',
      right: 'answers-right',
      best: 'your-best'
    };
    return labels[kind];
  }

  /**
   * How many there are in all. Not shown — "5 / 13" made a set to complete —
   * only used to know whether there is more to come.
   */
  get itemsInAll(): number {
    return WARDROBE.filter(item => item.id !== NO_ITEM).length;
  }

  /** Levels still ahead in the wardrobe, purely to say there is more coming. */
  get moreToWin(): boolean {
    return this.earnedItems.length < this.itemsInAll;
  }

  itemName(item: WardrobeItem): string {
    return this.languageService.translate(('item-' + item.id) as TranslationKeys);
  }

  get hasPlayed(): boolean {
    return this.totals.rounds > 0;
  }

  openBook() {
    this.router.navigate(['/scrapbook']);
  }

  back() {
    this.router.navigate(['/grade']);
  }
}
