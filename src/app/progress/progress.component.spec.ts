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

  it('keeps a gutter either side of the card on a phone', () => {
    // A media query on the window, and karma cannot resize its window: this
    // only runs where the runner's window is phone-sized
    if (!window.matchMedia('(max-width: 632px)').matches) {
      pending('the window is wider than a phone');
      return;
    }
    open();
    const card: HTMLElement = fixture.nativeElement.querySelector('.progress-page');
    const style = getComputedStyle(card);

    expect(parseFloat(style.marginLeft)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(style.marginRight)).toBeGreaterThanOrEqual(16);
  });

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
      ['rounds', t('round-finished')],
      ['questions', t('questions-answered')],
      ['right', t('answers-right')],
      ['best', t('your-best')]
    ]);
  });

  it('says one in the singular: "1 ronde gespeeld", not "1 rondes" (2026-11-16)', () => {
    // After a child's first round the screen said "1 rondes gespeeld", "1 rounds finished", "1 rondas jugadas"
    const counts = () => Array.from(fixture.nativeElement.querySelectorAll('.count:not([data-kind="best"])') as NodeListOf<HTMLElement>)
      .map(tile => `${tile.querySelector('.count-value')!.textContent!.trim()} ${tile.querySelector('.count-label')!.textContent!.trim()}`);
    const said: { [language: string]: string[][] } = {
      nl: [['1 ronde gespeeld', '10 vragen beantwoord', '1 goed antwoord'], ['2 rondes gespeeld', '20 vragen beantwoord', '3 goede antwoorden']],
      en: [['1 round finished', '10 questions answered', '1 answer right'], ['2 rounds finished', '20 questions answered', '3 answers right']],
      es: [['1 ronda jugada', '10 preguntas respondidas', '1 respuesta correcta'], ['2 rondas jugadas', '20 preguntas respondidas', '3 respuestas correctas']]
    };
    Object.keys(said).forEach(language => {
      localStorage.clear();
      localStorage.setItem('language', language);
      TestBed.inject(LanguageService).setLanguage(language as any);
      progress.record(round(1));
      open();
      expect(counts()).withContext(language).toEqual(said[language][0]);
      progress.record(round(2));
      open();
      expect(counts()).withContext(language).toEqual(said[language][1]);
    });
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
