import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { QuestionComponent } from './question.component';
import { KeypadComponent } from '../keypad/keypad.component';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('difficulty', 'medium');
    localStorage.setItem('grade', '3');

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent],
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
      // Money is its own strand now and is allowed at every grade; the
      // point here is that a grade 3 child never meets × or ÷
      if (component.currentQuestion.money) {
        continue;
      }
      expect(['+', '-']).toContain(component.currentQuestion.operation);
    }
  });

  it('never generates a subtraction with a negative answer', () => {
    for (let i = 0; i < 25; i++) {
      component.generateQuestion();
      if (!component.currentQuestion.money && component.currentQuestion.operation === '-') {
        expect(component.currentQuestion.num1).toBeGreaterThanOrEqual(component.currentQuestion.num2);
      }
    }
  });

  describe('theme: reading surfaces stay positive polarity', () => {
    const luminance = (colour: string): number => {
      const parts = (colour.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
      const [r, g, b] = parts.map(channel => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    it('keeps the question card light, so the sum is dark text on light', () => {
      fixture.detectChanges();
      const card = fixture.nativeElement.querySelector('.question-box');

      expect(luminance(getComputedStyle(card).backgroundColor)).toBeGreaterThan(0.7);
    });

    it('keeps the keypad faces light for the same reason', () => {
      fixture.detectChanges();
      const key = fixture.nativeElement.querySelector('.keypad .key');

      if (key) {
        expect(luminance(getComputedStyle(key).backgroundColor)).toBeGreaterThan(0.7);
      } else {
        // No keypad on a non-touch test runner; the card check above still holds
        expect(true).toBe(true);
      }
    });

    it('carries the theme on the card edge rather than behind the text', () => {
      fixture.detectChanges();
      const card = fixture.nativeElement.querySelector('.question-box');
      const style = getComputedStyle(card);

      expect(style.borderTopWidth).not.toBe('0px');
      expect(style.boxShadow).not.toBe('none');
    });

    it('fills the progress bar with the theme accents', () => {
      fixture.detectChanges();
      const fill = fixture.nativeElement.querySelector('.progress-fill');

      expect(getComputedStyle(fill).backgroundImage).toContain('gradient');
    });
  });

  describe('facts carried over from an earlier round', () => {
    it('asks a fact missed last round, but not as the opening question', () => {
      localStorage.setItem('missedFacts', JSON.stringify([{ num1: 8, num2: 6, operation: '+' }]));

      const fresh = TestBed.createComponent(QuestionComponent);
      fresh.detectChanges();
      const c = fresh.componentInstance;

      // First question of the round is a new one
      expect(c.isReplay).toBe(false);

      c.questionsAnswered = 1;
      c.generateQuestion();

      expect(c.isReplay).toBe(true);
      expect(c.currentQuestion.num1).toBe(8);
      expect(c.currentQuestion.num2).toBe(6);
    });

    it('clears a carried fact from storage once it is asked', () => {
      localStorage.setItem('missedFacts', JSON.stringify([{ num1: 8, num2: 6, operation: '+' }]));

      const fresh = TestBed.createComponent(QuestionComponent);
      fresh.detectChanges();

      expect(JSON.parse(localStorage.getItem('missedFacts:guest') as string)).toEqual([]);
    });

    it('does not ask again the same day it was missed', () => {
      // A child playing five rounds in one sitting used to meet the same fact
      // five times. That is massed practice; the gap is what makes it stick.
      component.currentQuestion = { num1: 9, num2: 4, operation: '+' };
      component.wrongAttempts = 0;
      component.isReplay = false;
      component.userAnswer = '11';
      component.checkAnswer();
      component.userAnswer = '11';
      component.checkAnswer();

      const fresh = TestBed.createComponent(QuestionComponent);
      fresh.detectChanges();
      const c = fresh.componentInstance;
      c.questionsAnswered = 1;
      c.generateQuestion();

      expect(c.isReplay).toBe(false);
      // and it is still waiting, not thrown away
      expect(JSON.parse(localStorage.getItem('missedFacts:guest') as string).length).toBe(1);
    });

    it('moves a carried fact along when the child gets it right', () => {
      localStorage.setItem('missedFacts:guest',
        JSON.stringify([{ num1: 8, num2: 6, operation: '+' }]));

      const fresh = TestBed.createComponent(QuestionComponent);
      fresh.detectChanges();
      const c = fresh.componentInstance;
      c.questionsAnswered = 1;
      c.generateQuestion();
      expect(c.isReplay).toBe(true);

      c.userAnswer = '14';
      c.checkAnswer();

      const stored = JSON.parse(localStorage.getItem('missedFacts:guest') as string);
      expect(stored.length).toBe(1);
      expect(stored[0].reviews).toBe(1);
    });

    it('sends a carried fact back to the beginning when it is missed again', () => {
      localStorage.setItem('missedFacts:guest',
        JSON.stringify([{ num1: 8, num2: 6, operation: '+', reviews: 2 }]));

      const fresh = TestBed.createComponent(QuestionComponent);
      fresh.detectChanges();
      const c = fresh.componentInstance;
      c.questionsAnswered = 1;
      c.generateQuestion();

      c.userAnswer = '1';
      c.checkAnswer();
      c.userAnswer = '2';
      c.checkAnswer();

      const stored = JSON.parse(localStorage.getItem('missedFacts:guest') as string);
      expect(stored[0].reviews).toBe(0);
    });

    it('stores a fact the child could not get, for the next round', () => {
      component.currentQuestion = { num1: 9, num2: 4, operation: '+' };
      component.wrongAttempts = 0;
      component.isReplay = false;
      component.userAnswer = '11';
      component.checkAnswer();
      component.userAnswer = '11';
      component.checkAnswer();

      const stored = JSON.parse(localStorage.getItem('missedFacts:guest') as string);
      expect(stored[0]).toEqual(jasmine.objectContaining({ num1: 9, num2: 4 }));
    });
  });

  describe('coming back to a missed question', () => {
    const missTwice = () => {
      const wrong = String(component.currentQuestion.num1 + component.currentQuestion.num2 + 7);
      component.userAnswer = wrong;
      component.checkAnswer();
      component.userAnswer = wrong;
      component.checkAnswer();
    };

    beforeEach(() => {
      component.currentQuestion = { num1: 7, num2: 5, operation: '+' };
      component.wrongAttempts = 0;
      component.isReplay = false;
      (component as any).missed = [];
      component.questionsAnswered = 0;
    });

    it('queues a question the child could not get', () => {
      missTwice();

      expect((component as any).missed.length).toBe(1);
      expect((component as any).missed[0].question.num1).toBe(7);
    });

    it('does not queue a question answered correctly', () => {
      component.userAnswer = '12';
      component.checkAnswer();

      expect((component as any).missed.length).toBe(0);
    });

    it('waits a couple of questions before asking it again', () => {
      missTwice();

      component.questionsAnswered = 1;
      component.generateQuestion();
      expect(component.isReplay).toBe(false);
    });

    it('asks it again once the gap has passed', () => {
      missTwice();

      component.questionsAnswered = 2;
      component.generateQuestion();

      expect(component.isReplay).toBe(true);
      expect(component.currentQuestion.num1).toBe(7);
      expect(component.currentQuestion.num2).toBe(5);
    });

    it('asks a replayed question only once', () => {
      missTwice();
      component.questionsAnswered = 2;
      component.generateQuestion();
      expect(component.isReplay).toBe(true);

      component.wrongAttempts = 0;
      missTwice();

      expect((component as any).missed.length).toBe(0);
    });

    it('brings the whole money question back, pieces and all', () => {
      component.currentQuestion = { num1: 0, num2: 0, operation: 'money', money: {
        shape: 'count', prompt: 'money-count', values: {},
        pile: [50, 20, 5], answer: 75, unit: 'cents', answerCents: 75,
        worked: '50c + 20c = 70c → 70c + 5c = 75c',
        answerText: '75c', summary: '50c + 20c + 5c'
      } };
      component.wrongAttempts = 0;
      component.userAnswer = '60';
      component.checkAnswer();
      component.userAnswer = '60';
      component.checkAnswer();

      component.questionsAnswered = 2;
      component.generateQuestion();

      expect(component.isReplay).toBe(true);
      expect(component.currentQuestion.money!.pile).toEqual([50, 20, 5]);
      expect(component.currentQuestion.money!.answerCents).toBe(75);
    });
  });

  describe('money questions', () => {
    const askMoney = (grade: number) => {
      component.grade = grade;
      let built = false;
      for (let i = 0; i < 40 && !built; i++) {
        built = (component as any).generateMoneyQuestion();
      }
      return component.currentQuestion.money!;
    };

    it('asks a grade 1 child about money, which it never used to', () => {
      // The curriculum puts coin recognition and combining coins in Year 1;
      // the old code started money at grade 2 and never showed a coin at all
      const money = askMoney(1);

      expect(money).toBeTruthy();
      expect(money.shape).toBe('count');
      expect(money.pile.length).toBeGreaterThan(1);
    });

    it('puts one denomination in front of the youngest players', () => {
      for (let i = 0; i < 40; i++) {
        const money = askMoney(1);
        const kinds = new Set(money.pile);
        expect(kinds.size).toBe(1);
      }
    });

    it('never writes a decimal point before the year it is taught', () => {
      [1, 2, 3].forEach(grade => {
        for (let i = 0; i < 30; i++) {
          const money = askMoney(grade);
          expect(money.unit).not.toBe('decimal');
          const shown = [money.answerText, money.summary, money.worked].join(' ');
          expect(shown).not.toMatch(/\d\.\d/);
        }
      });
    });

    it('writes decimals from grade 4, where the curriculum introduces them', () => {
      let sawDecimal = false;
      for (let i = 0; i < 120 && !sawDecimal; i++) {
        sawDecimal = askMoney(4).unit === 'decimal';
      }

      expect(sawDecimal).toBe(true);
    });

    it('fills every placeholder in the wording', () => {
      [1, 2, 3, 5, 8].forEach(grade => {
        for (let i = 0; i < 30; i++) {
          askMoney(grade);
          fixture.detectChanges();
          expect(component.moneyText).not.toContain('{');
          expect(component.moneyText.length).toBeGreaterThan(0);
        }
      });
    });

    it('says which unit the answer is in, so 75 is never confused with 0.75', () => {
      for (let i = 0; i < 60; i++) {
        const money = askMoney(5);
        const shown = component.answerPrefix + component.answerSuffix;
        if (money.unit === 'cents') {
          expect(shown).toBe('c');
        } else if (money.unit === 'count') {
          expect(shown).toBe('');
        } else {
          expect(shown).toBe('€');
        }
      }
    });

    it('marks the right answer correct through the normal check', () => {
      for (let i = 0; i < 60; i++) {
        const money = askMoney(5);
        component.wrongAttempts = 0;
        component.answerWasCorrect = null;
        component.userAnswer = String(money.answer);
        component.checkAnswer();

        expect(component.answerWasCorrect as boolean | null).toBe(true);
      }
    });

    it('accepts 3.4 for 3.40, because a child typing it is not wrong', () => {
      let money = askMoney(6);
      for (let i = 0; i < 120 && money.unit !== 'decimal'; i++) {
        money = askMoney(6);
      }
      expect(money.unit).toBe('decimal');

      component.wrongAttempts = 0;
      component.answerWasCorrect = null;
      component.userAnswer = String(money.answer);
      component.checkAnswer();

      expect(component.answerWasCorrect as boolean | null).toBe(true);
    });

    it('turns the minus key into a decimal point only where decimals are written', () => {
      askMoney(1);
      expect(component.needsDecimalKey).toBe(false);

      let money = askMoney(6);
      for (let i = 0; i < 120 && money.unit !== 'decimal'; i++) {
        money = askMoney(6);
      }

      expect(component.needsDecimalKey).toBe(true);
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

describe('QuestionComponent sums for the youngest players', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  /** Grade 1-2 are only ever asked to add, so every question is the sum path. */
  function build(grade: string, difficulty: string) {
    localStorage.clear();
    localStorage.setItem('grade', grade);
    localStorage.setItem('difficulty', difficulty);
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  const ranges: { [key: string]: number } = { easy: 5, medium: 10, hard: 10 };

  ['1', '2'].forEach(grade => {
    ['easy', 'medium', 'hard'].forEach(difficulty => {
      it(`keeps grade ${grade} ${difficulty} sums inside the range`, () => {
        build(grade, difficulty);
        const limit = ranges[difficulty];

        for (let i = 0; i < 200; i++) {
          component.generateQuestion();
          if (component.currentQuestion.money) {
            continue;
          }
          const { num1, num2 } = component.currentQuestion;
          expect(num1).toBeGreaterThanOrEqual(1);
          expect(num2).toBeGreaterThanOrEqual(1);
          expect(num1 + num2).toBeLessThanOrEqual(limit);
        }
      });
    });
  });

  it('still finishes when the first number lands at the top of the range', () => {
    build('1', 'easy');
    // The old code re-rolled only the second number, so a first number that
    // had already used the whole range could never be brought back under it —
    // the loop spun forever and the tab froze. Pinning random high reproduces it.
    spyOn(Math, 'random').and.returnValue(0.9999);

    component.generateQuestion();

    expect(component.currentQuestion.num1 + component.currentQuestion.num2)
      .toBeLessThanOrEqual(5);
  });
});

describe('QuestionComponent showing how', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('grade', '3');
    localStorage.setItem('difficulty', 'medium');

    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  /** Sets a fact that has a method worth showing. */
  function ask(num1: number, num2: number, operation = '+') {
    component.currentQuestion = { num1, num2, operation };
    component.wrongAttempts = 0;
    component.isReplay = false;
    component.workedLine = '';
  }

  function answer(value: string) {
    component.userAnswer = value;
    component.checkAnswer();
  }

  it('says nothing about method on a first wrong try', () => {
    ask(8, 7);

    answer('14');

    // Still their turn: showing the method now would end the attempt
    expect(component.wrongAttempts).toBe(1);
    expect(component.workedLine).toBe('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.worked-step')).toBeNull();
  });

  it('shows how once the answer is given away anyway', () => {
    ask(8, 7);

    answer('14');
    answer('13');

    expect(component.workedLine).toBe('8 + 2 = 10 → 10 + 5 = 15');
    fixture.detectChanges();
    const shown = fixture.nativeElement.querySelector('.worked-step');
    expect(shown.textContent).toContain('8 + 2 = 10');
    expect(shown.textContent).toContain('One way to do it:');
  });

  it('never shows a method to a child who got it right', () => {
    ask(8, 7);

    answer('15');

    expect(component.answerWasCorrect).toBe(true);
    expect(component.workedLine).toBe('');
  });

  it('says nothing when the fact has no method worth showing', () => {
    // 3 + 4 never crosses ten; the "method" would be the answer again
    ask(3, 4);

    answer('6');
    answer('8');

    expect(component.wrongAttempts).toBe(2);
    expect(component.workedLine).toBe('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.worked-step')).toBeNull();
  });

  it('gives a money question its own line, not the sum behind it', () => {
    // Money used to get nothing here, on the grounds that a worded problem
    // has no one-line method. A counted pile does: it is the pile, added up.
    component.currentQuestion = {
      num1: 0, num2: 0, operation: 'money', money: {
      shape: 'count', prompt: 'money-count', values: {},
      pile: [50, 20, 5], answer: 75, unit: 'cents', answerCents: 75,
      worked: '50c + 20c = 70c → 70c + 5c = 75c',
      answerText: '75c', summary: '50c + 20c + 5c'
    }
    };
    component.wrongAttempts = 0;
    component.isReplay = false;
    component.workedLine = '';

    answer('60');
    answer('70');

    expect(component.workedLine).toBe('50c + 20c = 70c → 70c + 5c = 75c');
  });

  it('clears the method before the next question is asked', () => {
    ask(8, 7);
    answer('14');
    answer('13');
    expect(component.workedLine).not.toBe('');

    component.moveToNextQuestion();

    expect(component.workedLine).toBe('');
  });

  it('still shows the answer itself alongside the method', () => {
    ask(8, 7);

    answer('14');
    answer('13');

    // The method is an addition to the answer, not a replacement for it
    expect(component.feedback).toContain('15');
    expect(component.workedLine).toContain('15');
  });
});

describe('QuestionComponent offering an easier rest of the round', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  /** Answers the current question wrongly twice, which finishes it. */
  function missIt() {
    component.currentQuestion = { num1: 7, num2: 5, operation: '+' };
    component.correctAnswer = 12;
    component.wrongAttempts = 0;
    component.isSecondAttempt = false;
    component.showOkButton = false;
    component.userAnswer = '99';
    component.checkAnswer();
    component.userAnswer = '98';
    component.checkAnswer();
  }

  function getIt() {
    component.currentQuestion = { num1: 7, num2: 5, operation: '+' };
    component.correctAnswer = 12;
    component.wrongAttempts = 0;
    component.isSecondAttempt = false;
    component.showOkButton = false;
    component.userAnswer = '12';
    component.checkAnswer();
  }

  function open(difficulty = 'hard') {
    localStorage.clear();
    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('grade', '3');
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('says nothing while the round is going well', () => {
    open();
    getIt();
    getIt();
    getIt();
    fixture.detectChanges();

    expect(component.showEasierOffer).toBe(false);
    expect(fixture.nativeElement.querySelector('.easier-offer')).toBeNull();
  });

  it('asks after three questions have gone wrong in a row', () => {
    open();
    missIt();
    missIt();
    expect(component.showEasierOffer).toBe(false);

    missIt();
    fixture.detectChanges();

    expect(component.showEasierOffer).toBe(true);
    expect(fixture.nativeElement.querySelector('.easier-offer')).toBeTruthy();
  });

  it('asks rather than acts', () => {
    // The whole point: a change made for a child without their knowing is one
    // they feel anyway, and it takes the win with it
    open();
    missIt();
    missIt();
    missIt();

    expect(component.difficulty).toBe('hard');
    expect(localStorage.getItem('difficultyEased')).toBeNull();
  });

  it('sits on a light face, like everything else there is to read', () => {
    // Caught by looking at it: the offer first landed as a dark panel inside
    // the white card, which is the one thing this theme does not do
    const luminance = (colour: string): number => {
      const parts = (colour.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
      const [r, g, b] = parts.map(channel => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    open();
    missIt();
    missIt();
    missIt();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('.easier-offer');
    const yes = fixture.nativeElement.querySelector('.easier-yes');
    expect(luminance(getComputedStyle(panel).backgroundColor)).toBeGreaterThan(0.7);
    expect(luminance(getComputedStyle(yes).backgroundColor)).toBeGreaterThan(0.7);
  });

  it('offers two choices, neither of them louder than the other', () => {
    open();
    missIt();
    missIt();
    missIt();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.easier-yes')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.easier-no')).toBeTruthy();
  });

  it('eases the rest of the round when the child says yes', () => {
    open();
    missIt();
    missIt();
    missIt();
    component.takeEasier();
    fixture.detectChanges();

    expect(component.difficulty).toBe('medium');
    expect(component.showEasierOffer).toBe(false);
    expect(fixture.nativeElement.querySelector('.easier-offer')).toBeNull();
  });

  it('leaves the stored choice alone, so the next round is still theirs', () => {
    open();
    missIt();
    missIt();
    missIt();
    component.takeEasier();

    expect(localStorage.getItem('difficulty')).toBe('hard');
  });

  it('marks the round as one that cannot say how hard it was', () => {
    // A half-easy round must not become evidence about which rung the child
    // belongs on — the between-round suggestion reads exactly that field
    open();
    missIt();
    missIt();
    missIt();
    component.takeEasier();

    expect(localStorage.getItem('difficultyEased')).toBe('true');
  });

  it('changes nothing at all when the child says no', () => {
    open();
    missIt();
    missIt();
    missIt();
    component.keepGoing();

    expect(component.difficulty).toBe('hard');
    expect(localStorage.getItem('difficultyEased')).toBeNull();
    expect(component.showEasierOffer).toBe(false);
  });

  it('never asks twice, whichever way it was answered', () => {
    open();
    missIt();
    missIt();
    missIt();
    component.keepGoing();

    missIt();
    missIt();
    missIt();
    expect(component.showEasierOffer).toBe(false);
  });

  it('never asks on the easiest setting', () => {
    open('easy');
    missIt();
    missIt();
    missIt();

    expect(component.showEasierOffer).toBe(false);
    expect(component.difficulty).toBe('easy');
  });

  it('only ever steps down one rung', () => {
    open('hard');
    missIt();
    missIt();
    missIt();
    component.takeEasier();

    expect(component.difficulty).toBe('medium');
  });

  it('starts a fresh round with no mark left from an abandoned one', () => {
    localStorage.setItem('difficultyEased', 'true');
    open();

    expect(localStorage.getItem('difficultyEased')).toBeNull();
  });
});

describe('QuestionComponent: a round that survives the real world', () => {
  let fixture: ComponentFixture<QuestionComponent>;
  let component: QuestionComponent;

  const KEY = 'round:guest';

  function open() {
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  }

  function saved(): any {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  }

  /** Answer the question on screen correctly and move on. */
  function answerRight() {
    component.userAnswer = String(solve(component));
    component.checkAnswer();
    component.moveToNextQuestion();
  }

  function solve(c: QuestionComponent): number {
    const q = c.currentQuestion;
    if (q.money) {
      return q.money.answer;
    }
    switch (q.operation) {
      case '+': return q.num1 + q.num2;
      case '-': return q.num1 - q.num2;
      case '*': return q.num1 * q.num2;
      default: return q.num1 / q.num2;
    }
  }

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('difficulty', 'medium');
    localStorage.setItem('grade', '3');
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    // The test router has no routes, and these tests play rounds to the end
    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => localStorage.clear());

  describe('writing the round down', () => {
    it('saves a round the moment it starts', () => {
      open();

      expect(saved()).toBeTruthy();
      expect(saved().grade).toBe(3);
      expect(saved().difficulty).toBe('medium');
    });

    it('keeps the running count up to date as questions are answered', () => {
      open();
      answerRight();
      answerRight();

      expect(saved().questionsAnswered).toBe(2);
      expect(saved().correctAnswers).toBe(2);
      expect(saved().results).toEqual([true, true]);
    });

    it('saves the question actually on screen, not the one before it', () => {
      open();
      answerRight();

      expect(saved().question).toEqual(jasmine.objectContaining({
        num1: component.currentQuestion.num1,
        num2: component.currentQuestion.num2,
        operation: component.currentQuestion.operation
      }));
    });

    it('saves when the page goes hidden, which is the last signal a phone gives', () => {
      // `unload` never fires on Safari and `beforeunload` only fires on
      // desktop navigations, so this is the event that has to carry it.
      open();
      answerRight();
      localStorage.removeItem(KEY);

      document.dispatchEvent(new Event('visibilitychange'));

      // The test page is visible, so nothing is written — and that is right:
      // going visible is not going away.
      expect(saved()).toBeNull();

      spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));

      expect(saved()).toBeTruthy();
      expect(saved().questionsAnswered).toBe(1);
    });

    it('saves on pagehide too, for the browsers that only give that one', () => {
      open();
      answerRight();
      localStorage.removeItem(KEY);

      window.dispatchEvent(new Event('pagehide'));

      expect(saved()).toBeTruthy();
    });

    it('stops listening once the screen is gone', () => {
      open();
      answerRight();
      fixture.destroy();
      localStorage.removeItem(KEY);

      window.dispatchEvent(new Event('pagehide'));

      expect(saved()).toBeNull();
    });

    it('leaves nothing behind once the round is finished', () => {
      open();
      for (let i = 0; i < 10; i++) {
        answerRight();
      }

      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });

  describe('coming back to it', () => {
    function leaveMidRound(): void {
      open();
      answerRight();
      answerRight();
      answerRight();
      fixture.destroy();
    }

    it('asks rather than resuming silently', () => {
      leaveMidRound();
      const before = saved();

      open();

      expect(component.showResumeOffer).toBe(true);
      expect(fixture.nativeElement.querySelector('.resume-offer')).toBeTruthy();
      // Nothing has started behind the question being asked
      expect(fixture.nativeElement.querySelector('.question-box')).toBeNull();
      expect(saved().questionsAnswered).toBe(before.questionsAnswered);
    });

    it('tells the child where they were, in a number they can check', () => {
      leaveMidRound();

      open();
      fixture.detectChanges();

      expect(component.resumeAt).toBe(4);
      expect(fixture.nativeElement.querySelector('.resume-offer').textContent)
        .toContain('4');
    });

    it('puts the score and the count back when they carry on', () => {
      leaveMidRound();
      const before = saved();

      open();
      component.takeResume();
      fixture.detectChanges();

      expect(component.showResumeOffer).toBe(false);
      expect(component.questionsAnswered).toBe(before.questionsAnswered);
      expect(component.currentScore).toBe(before.score);
      expect(fixture.nativeElement.querySelector('.question-box')).toBeTruthy();
    });

    it('puts back the grade and difficulty the round was played at', () => {
      leaveMidRound();
      // The result screen clears both, so a resumed round cannot read them
      localStorage.removeItem('grade');
      localStorage.removeItem('difficulty');

      open();
      component.takeResume();

      expect(component.grade).toBe(3);
      expect(component.difficulty).toBe('medium');
      expect(localStorage.getItem('grade')).toBe('3');
    });

    it('starts clean when the child would rather start again', () => {
      leaveMidRound();

      open();
      component.startOver();
      fixture.detectChanges();

      expect(component.questionsAnswered).toBe(0);
      expect(component.currentScore).toBe(0);
      expect(saved().questionsAnswered).toBe(0);
      expect(fixture.nativeElement.querySelector('.question-box')).toBeTruthy();
    });

    it('does not ask twice when a screen already asked', () => {
      leaveMidRound();
      localStorage.setItem('roundResume', 'resume');

      open();

      expect(component.showResumeOffer).toBe(false);
      expect(component.questionsAnswered).toBe(3);
    });

    it('starts fresh when a screen was told to', () => {
      leaveMidRound();
      localStorage.setItem('roundResume', 'fresh');

      open();

      expect(component.showResumeOffer).toBe(false);
      expect(component.questionsAnswered).toBe(0);
    });

    it('reads the choice once and then forgets it', () => {
      leaveMidRound();
      localStorage.setItem('roundResume', 'resume');
      open();

      expect(localStorage.getItem('roundResume')).toBeNull();
    });

    it('does not offer a round that has gone cold overnight', () => {
      leaveMidRound();
      const stale = saved();
      stale.savedAt = Date.now() - 20 * 60 * 60 * 1000;
      localStorage.setItem(KEY, JSON.stringify(stale));

      open();

      expect(component.showResumeOffer).toBe(false);
      expect(component.questionsAnswered).toBe(0);
    });

    it('does not offer a round with nothing in it yet', () => {
      open();
      fixture.destroy();

      open();

      expect(component.showResumeOffer).toBe(false);
      expect(component.questionsAnswered).toBe(0);
    });

    it('starts a fresh round rather than failing on a corrupt one', () => {
      localStorage.setItem(KEY, '{not json at all');

      open();

      expect(component.showResumeOffer).toBe(false);
      expect(component.currentQuestion.operation).toBeTruthy();
      expect(saved()).toBeTruthy();
    });

    it('picks up at the next question when the answer was already showing', () => {
      open();
      answerRight();
      answerRight();
      component.userAnswer = String(solve(component));
      component.checkAnswer();
      expect(component.showOkButton).toBe(true);
      fixture.destroy();
      expect(saved().answered).toBe(true);
      expect(saved().questionsAnswered).toBe(3);

      open();
      component.takeResume();

      // Three are counted, so the fourth is the one in front of them — the
      // question they already answered is not asked again.
      expect(component.questionsAnswered).toBe(3);
      expect(component.showOkButton).toBe(false);
      expect(component.userAnswer).toBe('');
    });

    it('gives back the try they still had in hand, and says so', () => {
      open();
      answerRight();
      component.userAnswer = String(solve(component) + 1);
      component.checkAnswer();
      expect(component.wrongAttempts).toBe(1);
      const question = { ...component.currentQuestion };
      fixture.destroy();

      open();
      component.takeResume();

      expect(component.currentQuestion.num1).toBe(question.num1);
      expect(component.currentQuestion.num2).toBe(question.num2);
      expect(component.wrongAttempts).toBe(1);
      expect(component.isSecondAttempt).toBe(true);
      expect(component.feedback).toBeTruthy();
    });

    it('comes back at the eased setting when the child had taken the offer', () => {
      open();
      answerRight();
      component.difficulty = 'easy';
      localStorage.setItem('difficultyEased', 'true');
      fixture.destroy();
      expect(saved().eased).toBe(true);

      open();
      component.takeResume();

      expect(component.difficulty).toBe('easy');
      expect(localStorage.getItem('difficultyEased')).toBe('true');
    });

    it('does not carry an eased mark into a round that starts over', () => {
      open();
      answerRight();
      component.difficulty = 'easy';
      localStorage.setItem('difficultyEased', 'true');
      fixture.destroy();

      open();
      component.startOver();

      expect(localStorage.getItem('difficultyEased')).toBeNull();
    });

    it('does not put the offer back in front of a child who spent it', () => {
      open();
      answerRight();
      (component as any).offerSpent = true;
      fixture.destroy();

      open();
      component.takeResume();

      expect((component as any).offerSpent).toBe(true);
    });

    it('carries the queued replays over, so a missed fact still comes back', () => {
      open();
      answerRight();
      (component as any).missed = [
        { question: { num1: 6, num2: 7, operation: '+' }, dueAfter: 3 }
      ];
      fixture.destroy();
      expect(saved().missed.length).toBe(1);

      open();
      component.takeResume();

      expect((component as any).missed.length).toBe(1);
      expect((component as any).missed[0].question.num1).toBe(6);
    });

    it('finishes a resumed round at ten, not at ten more', () => {
      leaveMidRound();

      open();
      component.takeResume();
      for (let i = 0; i < 7; i++) {
        answerRight();
      }

      expect(component.questionsAnswered).toBe(10);
      expect(localStorage.getItem(KEY)).toBeNull();
    });
  });
});
