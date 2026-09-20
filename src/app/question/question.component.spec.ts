import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { QuestionComponent } from './question.component';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('difficulty', 'medium');
    localStorage.setItem('grade', '3');

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('only asks a grade 3 child to add and subtract', () => {
    for (let i = 0; i < 25; i++) {
      component.generateQuestion();
      expect(['+', '-']).toContain(component.currentQuestion.operation);
    }
  });

  it('never generates a subtraction with a negative answer', () => {
    for (let i = 0; i < 25; i++) {
      component.generateQuestion();
      if (component.currentQuestion.operation === '-') {
        expect(component.currentQuestion.num1).toBeGreaterThanOrEqual(component.currentQuestion.num2);
      }
    }
  });

  describe('wrong-answer feedback', () => {
    beforeEach(() => {
      component.currentQuestion = { num1: 7, num2: 5, operation: '+' };
      component.wrongAttempts = 0;
      component.feedback = '';
      component.showOkButton = false;
      component.answerWasCorrect = null;
    });

    it('invites a second try without passing judgement on the first miss', () => {
      component.userAnswer = '11';
      component.checkAnswer();

      expect(component.feedback).toBe(component.languageService.translate('try-again'));
      expect(component.feedback).not.toContain(component.languageService.translate('wrong'));
      expect(component.showOkButton).toBe(false);
    });

    it('shows the correct answer once the attempts run out', () => {
      component.userAnswer = '11';
      component.checkAnswer();
      component.userAnswer = '13';
      component.checkAnswer();

      expect(component.feedback).toContain('12');
      expect(component.feedback).toContain(component.languageService.translate('answer-is'));
      expect(component.showOkButton).toBe(true);
    });

    it('ends on encouragement rather than a verdict', () => {
      component.userAnswer = '11';
      component.checkAnswer();
      component.userAnswer = '13';
      component.checkAnswer();

      expect(component.feedback).toContain(component.languageService.translate('good-try'));
      expect(component.feedback).not.toContain(component.languageService.translate('wrong'));
    });

    it('marks the answer wrong for styling without relying on translated text', () => {
      component.userAnswer = '11';
      component.checkAnswer();
      expect(component.answerWasCorrect).toBe(false);

      component.moveToNextQuestion();
      expect(component.answerWasCorrect).toBeNull();
    });

    it('marks a correct answer and keeps the streak going', () => {
      component.userAnswer = '12';
      component.checkAnswer();

      expect(component.answerWasCorrect).toBe(true);
      expect(component.feedback).toContain(component.languageService.translate('correct'));
      expect(component.streakCount).toBe(1);
    });
  });

  describe('touch keypad', () => {
    beforeEach(() => {
      component.userAnswer = '';
      component.showOkButton = false;
    });

    it('appends digits in order', () => {
      component.onKeypadPress('4');
      component.onKeypadPress('2');
      expect(component.userAnswer).toBe('42');
    });

    it('deletes the last digit', () => {
      component.onKeypadPress('4');
      component.onKeypadPress('2');
      component.onKeypadPress('del');
      expect(component.userAnswer).toBe('4');
    });

    it('toggles the minus sign rather than inserting it twice', () => {
      component.onKeypadPress('7');
      component.onKeypadPress('-');
      expect(component.userAnswer).toBe('-7');

      component.onKeypadPress('-');
      expect(component.userAnswer).toBe('7');
    });

    it('stops at six digits so the answer stays readable', () => {
      '1234567890'.split('').forEach(digit => component.onKeypadPress(digit));
      expect(component.userAnswer).toBe('123456');
    });

    it('ignores presses once the answer is locked in', () => {
      component.onKeypadPress('5');
      component.showOkButton = true;
      component.onKeypadPress('9');
      expect(component.userAnswer).toBe('5');
    });
  });
});
