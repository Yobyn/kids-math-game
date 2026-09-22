import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DifficultySelectComponent } from './difficulty-select.component';
import { ProgressService } from '../services/progress.service';

describe('DifficultySelectComponent', () => {
  let fixture: ComponentFixture<DifficultySelectComponent>;
  let component: DifficultySelectComponent;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [DifficultySelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DifficultySelectComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers a card for every difficulty', () => {
    const cards = fixture.nativeElement.querySelectorAll('.difficulty-card');
    expect(cards.length).toBe(component.difficulties.length);
  });

  it('exposes each card to assistive tech as a button', () => {
    const card = fixture.nativeElement.querySelector('.difficulty-card');

    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('can be chosen with the keyboard, not just a tap', () => {
    const card = fixture.nativeElement.querySelector('.difficulty-card');
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(localStorage.getItem('difficulty')).toBe(component.difficulties[0].level);
  });
});

describe('DifficultySelectComponent suggesting a setting', () => {
  let fixture: ComponentFixture<DifficultySelectComponent>;
  let component: DifficultySelectComponent;
  let progress: ProgressService;

  function played(percentage: number, difficulty: string, grade = 2) {
    progress.record({
      correctAnswers: Math.round(percentage / 10),
      total: 10,
      percentage,
      score: 20,
      grade,
      difficulty
    });
  }

  function open() {
    fixture = TestBed.createComponent(DifficultySelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [DifficultySelectComponent]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
    localStorage.setItem('grade', '2');
  });

  afterEach(() => localStorage.clear());

  it('says nothing to a child arriving for the first time', () => {
    open();

    expect(component.suggested).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.difficulty-card.suggested')).toBeNull();
    expect(fixture.nativeElement.querySelector('.suggestion')).toBeNull();
  });

  it('marks a harder card after two rounds that were too easy', () => {
    played(90, 'easy');
    played(95, 'easy');
    open();

    const marked = fixture.nativeElement.querySelector('.difficulty-card.suggested');
    expect(component.suggested).toBe('medium');
    expect(marked).toBeTruthy();
    expect(marked.textContent).toContain('Ready for this one?');
  });

  it('marks an easier card after two rounds that were too hard', () => {
    played(30, 'hard');
    played(20, 'hard');
    open();

    expect(component.suggested).toBe('medium');
    expect(fixture.nativeElement.querySelector('.suggestion').textContent.trim())
      .toBe('Try this one today');
  });

  it('marks exactly one card, never two', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();

    expect(fixture.nativeElement.querySelectorAll('.difficulty-card.suggested').length).toBe(1);
  });

  it('leaves every card just as choosable as before', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();

    // The point of advising rather than deciding: nothing is taken away
    const cards = fixture.nativeElement.querySelectorAll('.difficulty-card');
    expect(cards.length).toBe(3);
    cards.forEach((card: HTMLElement) => {
      expect(card.hasAttribute('disabled')).toBe(false);
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });

  it('still lets a child pick a card the game did not suggest', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    // Suggested medium; the child picks hard anyway
    fixture.nativeElement.querySelectorAll('.difficulty-card')[2].click();

    expect(localStorage.getItem('difficulty')).toBe('hard');
    expect(router.navigate).toHaveBeenCalledWith(['/questions']);
  });

  it('tells a screen reader why a card is marked', () => {
    played(90, 'easy');
    played(90, 'easy');
    open();

    const marked = fixture.nativeElement.querySelector('.difficulty-card.suggested');
    const plain = fixture.nativeElement.querySelector('.difficulty-card:not(.suggested)');

    expect(marked.getAttribute('aria-label')).toContain('Ready for this one?');
    expect(plain.getAttribute('aria-label')).not.toContain('Ready');
  });

  it('says nothing about a grade the child has not played', () => {
    played(95, 'easy', 2);
    played(95, 'easy', 2);
    localStorage.setItem('grade', '5');
    open();

    expect(component.suggested).toBeUndefined();
  });
});
