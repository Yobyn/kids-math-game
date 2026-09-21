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
