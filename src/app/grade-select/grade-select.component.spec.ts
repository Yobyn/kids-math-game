import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { GradeSelectComponent } from './grade-select.component';

describe('GradeSelectComponent', () => {
  let fixture: ComponentFixture<GradeSelectComponent>;
  let component: GradeSelectComponent;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [GradeSelectComponent]
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
      declarations: [GradeSelectComponent]
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
