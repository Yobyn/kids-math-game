import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { GradeSelectComponent } from './grade-select.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { routes } from '../app-routing.module';

describe('GradeSelectComponent', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GradeSelectComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers a card for every grade', () => {
    const cards = fixture.nativeElement.querySelectorAll('.grade-card');
    expect(cards.length).toBe(component.grades.length);
  });

  it('stores the chosen grade and moves on', () => {
    component.selectGrade(4);

    expect(localStorage.getItem('grade')).toBe('4');
    expect(router.navigate).toHaveBeenCalledWith(['/difficulty']);
  });

  it('exposes each card to assistive tech as a button', () => {
    const card = fixture.nativeElement.querySelector('.grade-card');

    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('aria-label')).toBe(component.grades[0].name);
  });

  it('can be chosen with the keyboard, not just a tap', () => {
    const card = fixture.nativeElement.querySelector('.grade-card');
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(localStorage.getItem('grade')).toBe('1');
  });

  it('keeps a card comfortably larger than the adult minimum target', () => {
    const card = fixture.nativeElement.querySelector('.grade-card');
    expect(card.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
  });
});

describe('GradeSelectComponent offering the grade last played', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;
  let router: Router;

  const round = (grade: number, daysAgo = 0) => ({
    date: new Date(2026, 8, 22 - daysAgo).toISOString(),
    correctAnswers: 7, total: 10, percentage: 70, score: 14, grade
  });

  function open(history: any[] = []) {
    if (history.length) {
      localStorage.setItem('roundHistory:guest', JSON.stringify(history));
    }
    fixture = TestBed.createComponent(GradeSelectComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('offers nothing to a child who has never played', () => {
    open();

    expect(component.carryOnGrade).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.carry-on')).toBeNull();
    expect(fixture.nativeElement.querySelector('.or-pick')).toBeNull();
  });

  it('offers the grade the child last played', () => {
    open([round(3)]);

    expect(component.carryOnGrade).toBe(3);
    expect(fixture.nativeElement.querySelector('.carry-on')).toBeTruthy();
  });

  it('names the grade rather than leaving a placeholder', () => {
    open([round(4)]);

    const label = fixture.nativeElement.querySelector('.carry-on').textContent;
    expect(label).toContain('4');
    expect(label).not.toContain('{grade}');
  });

  it('takes the most recent grade when the child has moved', () => {
    open([round(5), round(2, 1), round(2, 2)]);

    expect(component.carryOnGrade).toBe(5);
  });

  it('still shows every grade underneath, because it offers rather than decides', () => {
    open([round(3)]);

    expect(fixture.nativeElement.querySelectorAll('.grade-card').length)
      .toBe(component.grades.length);
    expect(fixture.nativeElement.querySelector('.or-pick')).toBeTruthy();
  });

  it('goes straight on when the offer is taken', () => {
    open([round(3)]);
    fixture.nativeElement.querySelector('.carry-on').click();

    expect(localStorage.getItem('grade')).toBe('3');
    expect(router.navigate).toHaveBeenCalledWith(['/difficulty']);
  });

  it('offers nothing when history says nothing sensible', () => {
    open([{ date: 'x', correctAnswers: 1, total: 10, percentage: 10, score: 1, grade: 0 } as any]);

    expect(component.carryOnGrade).toBeUndefined();
  });
});

describe('GradeSelectComponent marking a grade to try next', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;

  const round = (grade: number, percentage: number, difficulty = 'hard') => ({
    date: '2026-09-22T10:00:00.000Z',
    correctAnswers: Math.round(percentage / 10),
    total: 10, percentage, score: percentage, grade, difficulty
  });

  function open(history: any[]) {
    localStorage.setItem('roundHistory:guest', JSON.stringify(history));
    fixture = TestBed.createComponent(GradeSelectComponent);
    component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate');
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('marks the next grade after a run at the top rung', () => {
    open([round(3, 100), round(3, 95), round(3, 90)]);

    expect(component.suggestedGrade).toBe(4);
    const marked = fixture.nativeElement.querySelectorAll('.grade-card.suggested');
    expect(marked.length).toBe(1);
    expect(marked[0].textContent).toContain('4');
  });

  it('says why, in words, rather than only colouring the card', () => {
    open([round(3, 100), round(3, 95), round(3, 90)]);

    const line = fixture.nativeElement.querySelector('.grade-card.suggested .suggestion');
    expect(line).toBeTruthy();
    expect(line.textContent.trim().length).toBeGreaterThan(0);
  });

  it('leaves every other card exactly as choosable', () => {
    // A suggestion, not a decision — the same rule the difficulty screen keeps
    open([round(3, 100), round(3, 95), round(3, 90)]);

    const cards = fixture.nativeElement.querySelectorAll('.grade-card');
    expect(cards.length).toBe(component.grades.length);
    Array.from(cards).forEach((card: any) => {
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });

  it('marks nothing for a child having an ordinary time of it', () => {
    open([round(3, 70), round(3, 60), round(3, 80)]);

    expect(component.suggestedGrade).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.grade-card.suggested')).toBeNull();
  });

  it('marks nothing while there is still a harder rung at this grade', () => {
    open([round(3, 100, 'easy'), round(3, 100, 'easy'), round(3, 100, 'easy')]);

    expect(component.suggestedGrade).toBeUndefined();
  });

  it('marks nothing for a child who has never played', () => {
    open([]);

    expect(component.suggestedGrade).toBeUndefined();
  });

  it('carries on offering the grade they are on, alongside the suggestion', () => {
    // It points at a door; it does not close the one they are standing in
    open([round(3, 100), round(3, 95), round(3, 90)]);

    expect(component.carryOnGrade).toBe(3);
    expect(fixture.nativeElement.querySelector('.carry-on')).toBeTruthy();
  });
});

describe('GradeSelectComponent pointing at the character', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GradeSelectComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('names the way in rather than leaving it to an unlabelled circle', () => {
    const door = fixture.nativeElement.querySelector('.your-character');

    expect(door).toBeTruthy();
    expect(door.textContent.trim().length).toBeGreaterThan(0);
  });

  it('draws the character on it, so it looks like what it opens', () => {
    expect(fixture.nativeElement.querySelector('.your-character app-avatar')).toBeTruthy();
  });

  it('opens the character', () => {
    fixture.nativeElement.querySelector('.your-character').click();

    expect(router.navigate).toHaveBeenCalledWith(['/avatar']);
  });

  it('keeps a target a child can hit', () => {
    const door = fixture.nativeElement.querySelector('.your-character');

    expect(parseFloat(getComputedStyle(door).minHeight)).toBeGreaterThanOrEqual(44);
  });
});

describe('GradeSelectComponent: the round they left half finished', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;
  let router: Router;

  const KEY = 'round:guest';

  function storeRound(overrides: any = {}) {
    localStorage.setItem(KEY, JSON.stringify({
      version: 2,
      savedAt: Date.now(),
      grade: 5,
      difficulty: 'hard',
      eased: false,
      questionsAnswered: 6,
      correctAnswers: 5,
      score: 8,
      streak: 1,
      results: [true, true, true, false, true, true],
      question: { num1: 12, num2: 9, operation: '+' },
      isReplay: false,
      missed: [],
      offerSpent: false,
      answered: false,
      wrongAttempts: 0,
      ...overrides
    }));
  }

  function open() {
    fixture = TestBed.createComponent(GradeSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => localStorage.clear());

  it('says nothing when there is nothing half finished', () => {
    open();

    expect(component.unfinished).toBeNull();
    expect(fixture.nativeElement.querySelector('.resume-round')).toBeNull();
  });

  it('offers the round back, and says which question they were on', () => {
    storeRound();

    open();

    expect(component.unfinished).toBeTruthy();
    const button = fixture.nativeElement.querySelector('.resume-round');
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('7');
  });

  it('puts it above the grade list, because it is the more specific offer', () => {
    storeRound();
    localStorage.setItem('roundHistory:guest', JSON.stringify([{
      date: new Date().toISOString(), correctAnswers: 8, total: 10,
      percentage: 80, score: 10, grade: 5
    }]));

    open();

    const order = Array.from(
      fixture.nativeElement.querySelectorAll('.resume-round, .carry-on, .grade-card')
    ).map((element: any) => element.className.split(' ')[0]);
    expect(order[0]).toBe('resume-round');
  });

  it('sends them somewhere that actually exists', () => {
    // A path that is only ALMOST right ('/question' for '/questions') hits the
    // wildcard and lands the child back where they started, and a test that
    // only checks what was asked for cannot see it.
    storeRound();
    open();

    fixture.nativeElement.querySelector('.resume-round').click();

    const target = (router.navigate as jasmine.Spy).calls.mostRecent().args[0][0];
    expect(routes.some(route => `/${route.path}` === target)).toBe(true);
  });

  it('carries the round back with its own grade and difficulty', () => {
    storeRound();
    open();

    fixture.nativeElement.querySelector('.resume-round').click();

    expect(localStorage.getItem('grade')).toBe('5');
    expect(localStorage.getItem('difficulty')).toBe('hard');
    expect(localStorage.getItem('roundResume')).toBe('resume');
    expect(router.navigate).toHaveBeenCalledWith(['/questions']);
  });

  it('does not offer a round that has gone cold', () => {
    storeRound({ savedAt: Date.now() - 9 * 60 * 60 * 1000 });

    open();

    expect(component.unfinished).toBeNull();
  });

  it('does not offer a round with nothing answered in it', () => {
    storeRound({ questionsAnswered: 0 });

    open();

    expect(component.unfinished).toBeNull();
  });

  it('does not offer a finished round, which belongs on the result screen', () => {
    storeRound({ questionsAnswered: 10 });

    open();

    expect(component.unfinished).toBeNull();
  });

  it('shows nothing rather than failing on a round it cannot read', () => {
    localStorage.setItem(KEY, 'half a round');

    open();

    expect(component.unfinished).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.grade-card').length).toBe(10);
  });

  it('lets the half-finished round go when a grade is chosen instead', () => {
    // Picking a grade is choosing to start something new, said out loud
    storeRound();
    open();

    component.selectGrade(2);

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(component.unfinished).toBeNull();
  });

  it('keeps a target a child can hit', () => {
    storeRound();
    open();

    const button = fixture.nativeElement.querySelector('.resume-round');

    expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(44);
  });
});

describe('GradeSelectComponent offering a result the child never saw', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;
  let router: Router;

  const banked = (overrides: any = {}) => JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    seen: false,
    score: 16,
    total: 10,
    correctAnswers: 8,
    percentage: 80,
    previousBest: 70,
    isPersonalBest: true,
    roundsPlayed: 4,
    xpEarned: 26,
    xpAfter: 140,
    leveledUp: false,
    unlockedIds: [],
    eventJustEarned: false,
    ...overrides
  });

  function open(result?: string) {
    if (result) {
      localStorage.setItem('result:guest', result);
    }
    fixture = TestBed.createComponent(GradeSelectComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  }

  const card = () => fixture.nativeElement.querySelector('.see-result');

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent, AvatarComponent]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('offers nothing when no round has finished', () => {
    open();

    expect(component.unseenResult).toBeNull();
    expect(card()).toBeNull();
  });

  it('offers a finished round whose result was never seen', () => {
    open(banked());

    expect(component.unseenResult).toBeTruthy();
    expect(card()).toBeTruthy();
  });

  it('says how it went, rather than making a child open it to find out', () => {
    open(banked());

    expect(card().textContent).toContain('8');
    expect(card().textContent).toContain('10');
    expect(component.unseenResultLine).not.toContain('{');
  });

  it('never offers a result the child has already read', () => {
    open(banked({ seen: true }));

    expect(component.unseenResult).toBeNull();
    expect(card()).toBeNull();
  });

  it('never offers one that has gone cold', () => {
    open(banked({ savedAt: Date.now() - (5 * 60 * 60 * 1000) }));

    expect(component.unseenResult).toBeNull();
  });

  it('never offers a result with nothing in it', () => {
    open(banked({ total: 0 }));

    expect(component.unseenResult).toBeNull();
  });

  it('opens the result screen when it is taken', () => {
    open(banked());

    card().click();

    expect(router.navigate).toHaveBeenCalledWith(['/result']);
  });

  it('goes to a route the app actually has', () => {
    // The same check the resume card carries: the argument passing a test
    // proves nothing about whether the wildcard bounces a child straight out
    open(banked());
    card().click();

    const target = (router.navigate as jasmine.Spy).calls.mostRecent().args[0][0];
    expect(routes.some(route => '/' + route.path === target)).toBe(true);
  });

  it('gives the offer a target a child can hit', () => {
    open(banked());

    const rect = card().getBoundingClientRect();
    expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
  });

  it('stops offering it once the child starts something new', () => {
    // Choosing a grade is an answer to the offer too
    open(banked());

    component.selectGrade(3);

    expect(component.unseenResult).toBeNull();
    expect(JSON.parse(localStorage.getItem('result:guest')!).seen).toBe(true);
  });

  it('puts an unfinished round above it, because that one is still in play', () => {
    localStorage.setItem('round:guest', JSON.stringify({
      version: 2, savedAt: Date.now(), grade: 3, difficulty: 'medium', eased: false,
      questionsAnswered: 4, correctAnswers: 3, score: 6, streak: 1,
      results: [true, true, false, true],
      question: { num1: 7, num2: 8, operation: '+' },
      isReplay: false, missed: [], offerSpent: false, answered: false, wrongAttempts: 0
    }));
    open(banked());

    const cards = Array.from(fixture.nativeElement.querySelectorAll('.resume-round, .see-result'));
    expect(cards.length).toBe(2);
    expect((cards[0] as HTMLElement).className).toContain('resume-round');
  });
});
