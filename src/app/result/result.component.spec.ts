import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ResultComponent } from './result.component';
import { ScoreService } from '../services/score.service';

describe('ResultComponent', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let scoreService: ScoreService;

  function renderWith(percentage: number) {
    spyOn(scoreService, 'getFinalScore').and.returnValue({
      score: 10,
      total: 10,
      correctAnswers: Math.round(percentage / 10),
      percentage
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    scoreService = TestBed.inject(ScoreService);
  });

  it('should create', () => {
    renderWith(100);
    expect(component).toBeTruthy();
  });

  it('awards three stars for 90% and up', () => {
    renderWith(90);
    expect(component.starsEarned).toBe(3);
  });

  it('awards two stars at 70%', () => {
    renderWith(70);
    expect(component.starsEarned).toBe(2);
  });

  it('awards one star at 50%', () => {
    renderWith(50);
    expect(component.starsEarned).toBe(1);
  });

  it('awards no stars below 50%', () => {
    renderWith(40);
    expect(component.starsEarned).toBe(0);
  });

  it('clears its animation timers on destroy', () => {
    renderWith(100);
    fixture.destroy();
    expect(component['timers'].length).toBe(0);
  });
});
