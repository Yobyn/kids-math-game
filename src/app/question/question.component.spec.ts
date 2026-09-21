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

  describe('money questions', () => {
    const generateMoney = (grade: number) => {
      component.grade = grade;
      spyOn(Math, 'random').and.returnValue(0.1); // under the 0.25 money threshold
      component.generateQuestion();
    };

    it('never asks a grade 1 child about money', () => {
      component.grade = 1;
      spyOn(Math, 'random').and.returnValue(0.1);
      for (let i = 0; i < 10; i++) {
        component.generateQuestion();
        expect(component.currentQuestion.moneyPrompt).toBeUndefined();
      }
    });

    it('asks younger children for a total, never for change', () => {
      generateMoney(2);

      expect(component.currentQuestion.moneyPrompt).toContain('€');
      expect(component.currentQuestion.operation).toBe('+');
    });

    it('asks older children to work out change', () => {
      generateMoney(5);

      expect(component.currentQuestion.moneyPrompt).toContain('€');
      expect(component.currentQuestion.operation).toBe('-');
    });

    it('never asks for change larger than what was paid', () => {
      component.grade = 5;
      for (let i = 0; i < 30; i++) {
        (component as any).generateMoneyQuestion();
        expect(component.currentQuestion.num1).toBeGreaterThan(component.currentQuestion.num2);
      }
    });

    it('keeps the amounts whole euros', () => {
      component.grade = 4;
      for (let i = 0; i < 30; i++) {
        (component as any).generateMoneyQuestion();
        expect(Number.isInteger(component.currentQuestion.num1)).toBe(true);
        expect(Number.isInteger(component.currentQuestion.num2)).toBe(true);
      }
    });

    it('fills every placeholder in the sentence', () => {
      generateMoney(5);

      expect(component.currentQuestion.moneyPrompt).not.toContain('{');
    });

    it('marks the right answer correct through the normal check', () => {
      generateMoney(5);
      const expected = component.currentQuestion.num1 - component.currentQuestion.num2;

      component.userAnswer = String(expected);
      component.checkAnswer();

      expect(component.answerWasCorrect).toBe(true);
    });

    it('shows the sentence instead of the bare sum', () => {
      generateMoney(2);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.money-prompt')).toBeTruthy();
      expect(fixture.nativeElement.querySelectorAll('.math-problem .number').length).toBe(0);
      expect(fixture.nativeElement.querySelector('.currency').textContent).toContain('€');
    });
  });

  describe('progress through the quiz', () => {
    it('starts empty', () => {
      component.questionsAnswered = 0;
      expect(component.progressPercent).toBe(0);
    });

    it('tracks the questions answered so far', () => {
      component.questionsAnswered = 3;
      expect(component.progressPercent).toBe(30);
    });

    it('is full on the last answer, never beyond', () => {
      component.questionsAnswered = 10;
      expect(component.progressPercent).toBe(100);

      component.questionsAnswered = 12;
      expect(component.progressPercent).toBe(100);
    });

    it('never goes negative', () => {
      component.questionsAnswered = -1;
      expect(component.progressPercent).toBe(0);
    });

    it('sits clear of the question card rather than behind it', () => {
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.progress-track').getBoundingClientRect();
      const card = fixture.nativeElement.querySelector('.question-box').getBoundingClientRect();

      // A visible gap between the bar and the card it belongs to
      expect(card.top - track.bottom).toBeGreaterThan(8);
      // and the same width, so it does not read as a stray sliver
      expect(Math.abs(track.width - card.width)).toBeLessThanOrEqual(1);
    });

    it('renders the fill and announces position to assistive tech', () => {
      component.questionsAnswered = 4;
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.progress-track');
      const fill = fixture.nativeElement.querySelector('.progress-fill');

      expect(track.getAttribute('aria-valuenow')).toBe('4');
      expect(track.getAttribute('aria-valuemax')).toBe('10');
      expect(fill.style.width).toBe('40%');
    });
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
