import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ResultComponent } from './result.component';
import { ScoreService } from '../services/score.service';
import { ProgressService } from '../services/progress.service';

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

  describe('personal best', () => {
    let progress: ProgressService;

    beforeEach(() => {
      localStorage.clear();
      progress = TestBed.inject(ProgressService);
    });

    afterEach(() => localStorage.clear());

    it('records the finished round', () => {
      renderWith(80);

      expect(progress.getRoundsPlayed()).toBe(1);
      expect(progress.getHistory()[0].percentage).toBe(80);
    });

    it('says nothing about a best on the very first round', () => {
      renderWith(100);

      expect(component.isPersonalBest).toBe(false);
      expect(component.previousBest).toBeNull();
      expect(fixture.nativeElement.querySelector('.personal-best')).toBeNull();
    });

    it('celebrates beating the old best', () => {
      progress.record({ correctAnswers: 5, total: 10, percentage: 50, score: 5, grade: 3 });
      renderWith(80);

      expect(component.isPersonalBest).toBe(true);
      expect(fixture.nativeElement.querySelector('.personal-best').textContent)
        .toContain(component.languageService.translate('new-best'));
    });

    it('shows the old best quietly when this round fell short', () => {
      progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 9, grade: 3 });
      renderWith(60);

      expect(component.isPersonalBest).toBe(false);
      expect(component.previousBest).toBe(90);
      expect(fixture.nativeElement.querySelector('.personal-best.quiet').textContent).toContain('90');
    });

    it('does not celebrate merely matching the old best', () => {
      progress.record({ correctAnswers: 7, total: 10, percentage: 70, score: 7, grade: 3 });
      renderWith(70);

      expect(component.isPersonalBest).toBe(false);
    });
  });

  it('clears its animation timers on destroy', () => {
    renderWith(100);
    fixture.destroy();
    expect(component['timers'].length).toBe(0);
  });
});
