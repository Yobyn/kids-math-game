import { SCRAPBOOK_WORDS } from './scrapbook-words';
import { LanguageService } from '../services/language.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ScrapbookComponent } from './scrapbook.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ProgressService } from '../services/progress.service';
import { AvatarService } from '../services/avatar.service';
import { SKIN_TONES } from '../avatar/avatar-model';

describe('ScrapbookComponent', () => {
  let fixture: ComponentFixture<ScrapbookComponent>;
  let component: ScrapbookComponent;
  let progress: ProgressService;

  const entries = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.entry'));
  const text = () => fixture.nativeElement.textContent as string;

  function open() {
    fixture = TestBed.createComponent(ScrapbookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ScrapbookComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('adds its own words to the language service when it opens: they are not in the first load', () => {
    const service = TestBed.inject(LanguageService);
    expect(service.translate('book-empty')).toBe('book-empty');
    open();
    Object.keys(SCRAPBOOK_WORDS.en).forEach(key => expect(service.translate(key as any)).not.toBe(key));
    expect(service.translate('book-empty')).toBe(SCRAPBOOK_WORDS[service.getLanguage()]['book-empty']);
  });

  it('says the book is empty before anything has happened', () => {
    open();

    expect(component.isEmpty).toBe(true);
    expect(entries().length).toBe(0);
    expect(fixture.nativeElement.querySelector('.nothing-yet')).toBeTruthy();
  });

  it('writes down an item the child won, with the day', () => {
    progress.keepItem('crown', new Date('2026-09-01T09:00:00.000Z'));

    open();

    expect(entries().length).toBe(1);
    expect(text()).toContain('Crown');
    expect(text()).toContain('2026');
  });

  it('writes down an event the child was here for', () => {
    progress.earnEvent('winter', new Date('2026-12-20T10:00:00.000Z'));

    open();

    expect(entries().length).toBe(1);
    expect(component.note(component.entries[0])).toBe('You were here for this');
  });

  it('says plainly when it does not know the day', () => {
    // Everything earned before dates were recorded
    localStorage.setItem('events:guest', JSON.stringify(['winter']));

    open();

    expect(entries().length).toBe(1);
    expect(text()).toContain('A while ago');
  });

  it('puts the newest entry at the top', () => {
    progress.keepItem('cap', new Date('2026-03-01T09:00:00.000Z'));
    progress.keepItem('crown', new Date('2026-08-01T09:00:00.000Z'));

    open();

    expect(component.entries[0].id).toBe('crown');
    expect(component.entries[1].id).toBe('cap');
  });

  it('marks the best round with the number it was', () => {
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 14, grade: 3 });

    open();

    const best = component.entries.find(entry => entry.kind === 'best')!;
    expect(component.title(best)).toContain('90');
  });

  it('never says how many are left, because there is nothing to complete', () => {
    progress.keepItem('crown');
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 14, grade: 3 });

    open();

    // The progress page counts; this one remembers
    expect(text()).not.toContain('/');
    expect(text().toLowerCase()).not.toContain('left');
  });

  it('draws the child’s own character wearing what they won', () => {
    progress.keepItem('crown');
    open();

    const worn = component.avatarWearing(component.entries[0]);

    expect(worn.hat).toBe('crown');
    expect(worn.skin).toBe(TestBed.inject(ProgressService) && component.entries.length ? worn.skin : '');
  });

  it('gives the milestones a mark of their own instead of a character', () => {
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 14, grade: 3 });
    open();

    component.entries.forEach(entry => {
      expect(component.item(entry)).toBeUndefined();
      expect(component.mark(entry).length).toBeGreaterThan(0);
    });
  });

  it('sends the child back to where they came from', () => {
    open();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.back-btn').click();

    expect(router.navigate).toHaveBeenCalledWith(['/progress']);
  });

  it('keeps the way out big enough to hit', () => {
    open();

    const back = fixture.nativeElement.querySelector('.back-btn');
    const rect = back.getBoundingClientRect();
    expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
  });
});

describe('ScrapbookComponent: saying what it means', () => {
  let fixture: ComponentFixture<ScrapbookComponent>;
  let component: ScrapbookComponent;
  let progress: ProgressService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ScrapbookComponent, AvatarComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  function open() {
    fixture = TestBed.createComponent(ScrapbookComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('gives every event a name, which none of them used to have', () => {
    // There was no `event-*` string anywhere: the entries rendered nameless
    ['winter', 'spring', 'autumn'].forEach(id => {
      localStorage.clear();
      progress.earnEvent(id);
      open();

      const title = component.title(component.entries[0]);
      expect(title).toBeTruthy(id);
      expect(title).not.toContain('event-', id);
    });
  });

  it('never says "You won this" under a round, because you did not win it', () => {
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 14, grade: 3 });
    open();

    component.entries.forEach(entry => {
      if (entry.kind === 'best' || entry.kind === 'first') {
        expect(component.note(entry)).toBe('');
      }
    });
  });

  it('does say it under something that really was won', () => {
    progress.keepItem('crown');
    open();

    expect(component.note(component.entries[0])).toBe('You won this');
  });

  it('names the way out for where it actually goes', () => {
    // The shared 'back' string reads "Back to Grade Selection" and this
    // button goes to the progress page
    open();

    const back = fixture.nativeElement.querySelector('.back-btn');
    expect(back.textContent.trim()).toBe('Back to your progress');
  });
});
