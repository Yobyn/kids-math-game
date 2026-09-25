import { PROGRESS_WORDS } from './progress-words';
import { LanguageService } from '../services/language.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ProgressComponent } from './progress.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ProgressService } from '../services/progress.service';
import { xpToReach } from '../levels/level-curve';
import { WARDROBE, NO_ITEM } from '../avatar/avatar-model';

describe('ProgressComponent', () => {
  let fixture: ComponentFixture<ProgressComponent>;
  let component: ProgressComponent;
  let progress: ProgressService;

  const round = (correct: number) => ({
    correctAnswers: correct, total: 10, percentage: correct * 10,
    score: correct * 2, grade: 2
  });

  function open() {
    fixture = TestBed.createComponent(ProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ProgressComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('adds its own words to the language service when it opens: they are not in the first load', () => {
    const service = TestBed.inject(LanguageService);
    expect(service.translate('your-best')).toBe('your-best');
    open();
    Object.keys(PROGRESS_WORDS.en).forEach(key => expect(service.translate(key as any)).not.toBe(key));
    expect(service.translate('your-best')).toBe(PROGRESS_WORDS[service.getLanguage()]['your-best']);
  });

  it('says so kindly when there is nothing to show yet', () => {
    open();

    expect(component.hasPlayed).toBe(false);
    expect(fixture.nativeElement.querySelector('.nothing-yet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.counts')).toBeNull();
  });

  it('counts everything a child has done, not the last twenty rounds', () => {
    for (let i = 0; i < 25; i++) {
      progress.record(round(6));
    }
    open();

    expect(component.totals.rounds).toBe(25);
    expect(fixture.nativeElement.querySelector('.counts').textContent).toContain('25');
  });

  it('shows nothing that can go down after a bad round', () => {
    [9, 8, 10].forEach(c => progress.record(round(c)));
    open();
    const shown = () => Array.from(fixture.nativeElement.querySelectorAll('.count') as NodeListOf<HTMLElement>)
      .map(tile => tile.querySelector('.best-stars')
        ? tile.querySelectorAll('.star.earned').length
        : Number(tile.querySelector('.count-value')!.textContent));
    const before = shown();

    // The worst possible round: every number must still be at least as big
    progress.record(round(0));
    open();
    const after = shown();

    expect(after.length).toBe(before.length);
    after.forEach((value, i) => expect(value).toBeGreaterThanOrEqual(before[i]));
  });

  it('never draws a line of scores over time', () => {
    for (let i = 0; i < 6; i++) {
      progress.record(round(i));
    }
    open();

    // A chart of recent results is the performance loop this screen avoids
    expect(fixture.nativeElement.querySelector('svg.chart')).toBeNull();
    expect(fixture.nativeElement.querySelector('.trend')).toBeNull();
    expect(fixture.nativeElement.querySelector('.history')).toBeNull();
  });

  it('shows a personal best, which cannot fall either, as stars rather than a percentage', () => {
    progress.record(round(9));
    progress.record(round(2));
    open();

    expect(component.best).toBe(90);
    const best = fixture.nativeElement.querySelector('.count[data-kind="best"]');
    expect(best.querySelectorAll('.star.earned').length).toBe(3);
    expect(fixture.nativeElement.textContent).not.toContain('%');
  });

  it('lights only the stars the best round earned', () => {
    progress.record(round(8));
    open();

    const best = fixture.nativeElement.querySelector('.count[data-kind="best"]');
    expect(best.querySelectorAll('.star').length).toBe(3);
    expect(best.querySelectorAll('.star.earned').length).toBe(2);
  });

  it('labels every number with what it counts', () => {
    progress.record(round(9));
    open();

    const t = (key: any) => component.languageService.translate(key);
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.count') as NodeListOf<HTMLElement>)
      .map(tile => [tile.getAttribute('data-kind'), tile.querySelector('.count-label')!.textContent!.trim()]);
    expect(labels).toEqual([
      ['rounds', t('rounds-finished')],
      ['questions', t('questions-answered')],
      ['right', t('answers-right')],
      ['best', t('your-best')]
    ]);
  });

  it('shows no best at all when the best round earned no stars', () => {
    progress.record(round(3));
    open();

    expect(fixture.nativeElement.querySelector('.count[data-kind="best"]')).toBeNull();
  });

  it('fills a bar towards the next level, which only ever fills', () => {
    progress.record(round(5));
    progress.addXp(xpToReach(4) + 10);
    open();

    const bar = fixture.nativeElement.querySelector('.level-track');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(component.levelPercent).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('.level-fill').style.width).toBe(component.levelPercent + '%');
  });

  it('shows the level the child has climbed to', () => {
    progress.record(round(5));
    progress.addXp(xpToReach(4));
    open();

    expect(component.level.level).toBe(4);
    expect(fixture.nativeElement.querySelector('.level-badge').textContent).toContain('4');
  });

  it('lists what they have earned, and never out of everything there is', () => {
    progress.record(round(5));
    progress.addXp(xpToReach(3));
    open();

    expect(component.itemsInAll).toBe(WARDROBE.filter(i => i.id !== NO_ITEM).length);
    expect(component.earnedItems.length).toBeGreaterThan(0);
    expect(component.earnedItems.every(item => item.id !== NO_ITEM)).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.earned-item').length)
      .toBe(component.earnedItems.length);
    // "5 / 13" made a set to complete; the count of all is not shown
    const heading = fixture.nativeElement.querySelector('.collection h2').textContent;
    expect(heading).not.toContain('/');
    expect(heading).not.toContain(String(component.itemsInAll));
  });

  it('shows each thing earned in its own colour', () => {
    progress.record(round(5));
    progress.addXp(xpToReach(3));
    open();

    const swatch = fixture.nativeElement.querySelector('.earned-item .swatch') as HTMLElement;
    expect(swatch.style.background).toBeTruthy();
  });

  it('counts an event item among what they earned', () => {
    progress.record(round(5));
    progress.earnEvent('winter');
    open();

    expect(component.earnedItems.some(item => item.event === 'winter')).toBe(true);
  });

  it('promises there is more while anything is still unearned', () => {
    progress.record(round(5));
    open();

    expect(component.moreToWin).toBe(true);
    expect(fixture.nativeElement.querySelector('.more-coming')).toBeTruthy();
  });

  it('stops promising once everything is collected', () => {
    progress.record(round(5));
    progress.addXp(xpToReach(30));
    ['winter', 'spring', 'autumn'].forEach(id => progress.earnEvent(id));
    open();

    expect(component.earnedItems.length).toBe(component.itemsInAll);
    expect(component.moreToWin).toBe(false);
    expect(fixture.nativeElement.querySelector('.more-coming')).toBeNull();
  });

  it('shows the child their own character, dressed', () => {
    progress.record(round(5));
    open();

    expect(fixture.nativeElement.querySelector('.who app-avatar svg')).toBeTruthy();
    // The full framing, so what they have earned to wear is seen
    expect(fixture.nativeElement.querySelector('.who app-avatar svg').getAttribute('viewBox')).toBe('0 0 100 132');
    expect(fixture.nativeElement.querySelector('.who .field-ring app-avatar')).toBeTruthy();
  });

  it('goes back to playing', () => {
    open();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.back-btn').click();

    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });
});
