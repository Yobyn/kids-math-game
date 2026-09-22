import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslationKeys } from '../services/language.service';
import { ProgressService, PlayTotals } from '../services/progress.service';
import { AvatarService } from '../services/avatar.service';
import { Avatar, WardrobeItem, levelItems, isUnlocked, WARDROBE, NO_ITEM } from '../avatar/avatar-model';
import { LevelProgress, levelProgress } from '../levels/level-curve';

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
 * a personal best, which by definition never falls. The honest trend — dips
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

  /** How many there are to collect in all, so the count has a denominator. */
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

  back() {
    this.router.navigate(['/grade']);
  }
}
