import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DifficultySelectComponent } from './difficulty-select.component';

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
