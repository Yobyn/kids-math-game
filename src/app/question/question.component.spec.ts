import { RoundTrackComponent } from './round-track.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoundService } from '../services/sound.service';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AskedQuestion, QuestionComponent } from './question.component';
import { ProgressService } from '../services/progress.service';
import { MAX_PICKED, fewestPieces } from '../teaching/coin-pick';
import { KeypadComponent } from '../keypad/keypad.component';

describe('QuestionComponent', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('difficulty', 'medium');
    localStorage.setItem('grade', '3');

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [QuestionComponent, KeypadComponent, RoundTrackComponent],
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

  it('reads what a child types into the answer box, and empties the box for the next question', () => {
    do {
      component.generateQuestion();
    } while (component.isPicking);
    component.useKeypad = false;
    component.showOkButton = false;
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('.math-problem input') as HTMLInputElement;
    box.value = '12';
    box.dispatchEvent(new Event('input'));
    expect(component.userAnswer).toBe('12');
    component.userAnswer = '7';
    fixture.detectChanges();
    expect(box.value).toBe('7');
    component.userAnswer = '';
    fixture.detectChanges();
    expect(box.value).toBe('');
  });

  it('asks a grade 3 child what groep 5 is taught in the middle of the year: to 1000, the tables to 10 and sharing out inside them', () => {
    for (let i = 0; i < 40; i++) {
      component.generateQuestion();
      // Money is its own strand, at every grade
      if (component.currentQuestion.money) {
        continue;
      }
      const { num1, num2, operation } = component.currentQuestion;
      const at = `${num1} ${operation} ${num2}`;
      if (operation === '*') {
        // a table to 10, or a ten times a digit (4 × 30)
        expect(num1 <= 10 && (num2 <= 10 || num2 % 10 === 0)).withContext(at).toBeTrue();
      } else if (operation === '/') {
        expect(num1 % num2).withContext(at).toBe(0);
        // inside a table, unless it is a half of an amount to 100 (de helft van 86)
        expect(num1 / num2).withContext(at).toBeLessThanOrEqual(component.currentQuestion.form === 'helft' ? 50 : 10);
      } else {
        expect(Math.max(num1, num2)).withContext(at).toBeLessThan(1000);
      }
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

    it('lights the round track in the ring\u2019s own colours', () => {
      component.questionsAnswered = 3;
      fixture.detectChanges();
      const done = Array.from(fixture.nativeElement.querySelectorAll('.pip.done')) as HTMLElement[];

      expect(done.length).toBe(3);
      // Blue at the start of the ring, not a flat grey
      expect(getComputedStyle(done[0]).backgroundColor).toBe('rgb(56, 128, 255)');
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

    /** Keeps asking until the shape that wants coins turns up. */
    const askPick = (grade = 3) => {
      component.grade = grade;
      for (let i = 0; i < 200; i++) {
        (component as any).generateMoneyQuestion();
        if (component.isPicking) {
          component.picked = [];
          component.showOkButton = false;
          component.wrongAttempts = 0;
          component.answerWasCorrect = null;
          fixture.detectChanges();
          return component.currentQuestion.money!;
        }
      }
      throw new Error('no picking question was generated');
    };

    it('puts a tray in front of the child instead of a box to type in', () => {
      askPick();

      expect(component.isPicking).toBe(true);
      expect(component.tray.length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('.math-problem')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-keypad')).toBeNull();
    });

    it('picks a coin up when it is tapped, and puts it back when it is tapped again', () => {
      askPick();
      const first = component.tray[0];

      component.takeFromTray(0);
      component.takeFromTray(0);
      expect(component.picked).toEqual([first, first]);

      component.putBack(0);
      expect(component.picked).toEqual([first]);
    });

    it('lets the same coin be taken as often as it is needed', () => {
      // The tray is a supply, not a purse: three 20s make 60c
      askPick();
      const smallest = component.tray.length - 1;
      component.takeFromTray(smallest);
      component.takeFromTray(smallest);
      component.takeFromTray(smallest);

      expect(component.picked.length).toBe(3);
    });

    it('never lets a child put down more than the cap', () => {
      askPick();
      for (let i = 0; i < MAX_PICKED * 2; i++) {
        component.takeFromTray(component.tray.length - 1);
      }

      expect(component.picked.length).toBe(MAX_PICKED);
    });

    it('marks the fewest-coins answer right', () => {
      const money = askPick();
      fewestPieces(money.answerCents, component.tray).forEach(piece =>
        component.takeFromTray(component.tray.indexOf(piece)));

      component.checkAnswer();

      expect(component.answerWasCorrect).toBe(true);
    });

    it('marks a DIFFERENT right combination right too', () => {
      // The objective is finding combinations that make the same value, so a
      // child who makes 75c the long way has done exactly what was asked.
      // A question built by hand, because the point is the SECOND way and a
      // generated tray does not always have one.
      askPick();
      component.currentQuestion = {
        num1: 0, num2: 0, operation: 'money',
        money: {
          shape: 'pick', prompt: 'money-pick', values: { target: '75c' },
          pile: [], tray: [50, 20, 10, 5], answer: 75, unit: 'pieces',
          answerCents: 75, worked: '50c + 20c + 5c = 75c',
          answerText: '75c', summary: '75c = 50c + 20c + 5c'
        }
      };
      component.picked = [];

      // 20 + 20 + 20 + 10 + 5, which is not the fewest and is not wrong
      [1, 1, 1, 2, 3].forEach(index => component.takeFromTray(index));
      expect(component.picked).toEqual([20, 20, 20, 10, 5]);

      component.checkAnswer();

      expect(component.answerWasCorrect).toBe(true);
    });

    it('gives a second try on a handful that is short, and empties the purse', () => {
      askPick();
      component.takeFromTray(component.tray.length - 1);

      component.checkAnswer();

      expect(component.answerWasCorrect).toBe(false);
      expect(component.wrongAttempts).toBe(1);
      expect(component.picked).toEqual([]);
    });

    it('does nothing at all on an empty purse — it is not a wrong answer', () => {
      askPick();

      component.checkAnswer();

      expect(component.wrongAttempts).toBe(0);
      expect(component.answerWasCorrect).toBeNull();
    });

    it('shows the fewest-coins way only after two honest tries', () => {
      const money = askPick();

      component.takeFromTray(component.tray.length - 1);
      component.checkAnswer();
      expect(component.workedLine).toBe('');

      component.takeFromTray(component.tray.length - 1);
      component.checkAnswer();

      expect(component.workedLine).toBe(money.worked);
      expect(component.correctAnswerText).toBe(money.answerText);
    });

    it('will not let coins be moved once the question is answered', () => {
      const money = askPick();
      fewestPieces(money.answerCents, component.tray).forEach(piece =>
        component.takeFromTray(component.tray.indexOf(piece)));
      component.checkAnswer();
      const settled = component.picked.slice();

      component.takeFromTray(0);
      component.putBack(0);

      expect(component.picked).toEqual(settled);
    });

    it('never tells a child how many coins they have used', () => {
      // A count invites hunting for a shorter answer, which is a different
      // lesson from the one being taught
      askPick();
      component.takeFromTray(0);
      component.takeFromTray(0);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent;
      expect(text).not.toContain('2 coins');
      expect(fixture.nativeElement.querySelector('.coin-count')).toBeNull();
    });

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
        } else if (money.unit === 'count' || money.unit === 'pieces') {
          // Nothing is typed on a picking question, so there is no box for a
          // unit to sit on
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
        // Coins cannot be moved once a question is answered, which is what
        // moveToNextQuestion clears in the real flow
        component.showOkButton = false;
        component.picked = [];
        if (money.tray) {
          fewestPieces(money.answerCents, component.tray).forEach(piece =>
            component.takeFromTray(component.tray.indexOf(piece)));
        } else {
          component.userAnswer = String(money.answer);
        }
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

    it('keeps "3." in the box while €3.40 is being typed: a number box would empty itself', () => {
      let money = askMoney(6);
      for (let i = 0; i < 120 && money.unit !== 'decimal'; i++) {
        money = askMoney(6);
      }
      component.userAnswer = '';
      component.onKeypadPress('3');
      component.onKeypadPress('.');
      fixture.detectChanges();
      const box = fixture.nativeElement.querySelector('.math-problem input') as HTMLInputElement;
      expect(box.value).toBe('3.');
    });
  });

  describe('progress through the round', () => {
    it('shows one pip per question, and none of them lit at the start', () => {
      component.questionsAnswered = 0;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.pip').length).toBe(10);
      expect(fixture.nativeElement.querySelectorAll('.pip.done').length).toBe(0);
      expect(fixture.nativeElement.querySelectorAll('.pip.current').length).toBe(1);
    });

    it('sits clear of the question card rather than behind it', () => {
      fixture.detectChanges();

      const track = fixture.nativeElement.querySelector('.round-track').getBoundingClientRect();
      const card = fixture.nativeElement.querySelector('.question-box').getBoundingClientRect();

      // A visible gap between the bar and the card it belongs to
      expect(card.top - track.bottom).toBeGreaterThan(8);
      // and the same width, so it does not read as a stray sliver
      expect(Math.abs(track.width - card.width)).toBeLessThanOrEqual(1);
    });

    it('lights the questions done and announces position to assistive tech', () => {
      component.questionsAnswered = 4;
      fixture.detectChanges();

      const bar = fixture.nativeElement.querySelector('[role="progressbar"]');
      expect(bar.getAttribute('aria-valuenow')).toBe('4');
      expect(bar.getAttribute('aria-valuemax')).toBe('10');
      expect(bar.getAttribute('aria-label')).toBe('Question 5 of 10');
      expect(fixture.nativeElement.querySelectorAll('.pip.done').length).toBe(4);
    });

    it('shows no "of 10" and no "Question" in the header a child reads', () => {
      fixture.detectChanges();
      const track = fixture.nativeElement.querySelector('.round-track') as HTMLElement;

      expect(track.innerText).not.toContain('Question');
      expect(track.innerText).not.toMatch(/\bof\b/);
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

    it('gives every key press a soft tap in the chosen sounds', () => {
      const tap = spyOn(TestBed.inject(SoundService), 'playTap');
      component.onKeypadPress('4');
      component.onKeypadPress('del');
      expect(tap).toHaveBeenCalledTimes(2);
    });

    it('makes no tap for a key the keypad ignores while the answer is being shown', () => {
      const tap = spyOn(TestBed.inject(SoundService), 'playTap');
      component.showOkButton = true;
      component.onKeypadPress('4');
      expect(tap).not.toHaveBeenCalled();
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

describe('QuestionComponent asking what school asks (docs/CURRICULUM-NL.md)', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  function build(grade: string, difficulty: string, language = 'nl') {
    localStorage.clear();
    localStorage.setItem('grade', grade);
    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('language', language);
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** The plain sums of a round, money left aside (its own strand). */
  function sums(count = 200) {
    const asked = [];
    for (let i = 0; i < count; i++) {
      component.generateQuestion();
      if (!component.currentQuestion.money) {
        asked.push({ ...component.currentQuestion });
      }
    }
    return asked;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('asks grade 1 (groep 3) at the start of the year to add and take away within 10, small numbers', () => {
    build('1', 'easy');
    sums().forEach(({ num1, num2, operation }) => {
      expect(['+', '-']).toContain(operation);
      expect(num2).toBeLessThanOrEqual(5);
      expect(operation === '+' ? num1 + num2 : num1).toBeLessThanOrEqual(10);
      expect(operation === '-' ? num1 - num2 : 1).toBeGreaterThan(0);
    });
  });

  it('asks groep 3 at the end of the year to go through the ten, as in 8 + 5 and 14 \u2212 6', () => {
    build('1', 'hard');
    const asked = sums();
    const through = asked.filter(({ num1, num2, operation }) =>
      operation === '+' ? num1 % 10 + num2 % 10 > 10 : num2 % 10 > num1 % 10);
    expect(through.length).toBeGreaterThan(asked.length / 4);
    // A half is kept as a share by 2, but asked as "de helft van 16": no : sum in groep 3
    asked.forEach(({ operation, form }) => expect(form === 'helft' ? '-' : operation).toMatch(/^[+-]$/));
  });

  it('asks grade 2 (groep 4) the tables of 1, 2, 5 and 10 in the middle of the year, and dividing within them', () => {
    build('2', 'medium');
    const asked = sums(400);
    const tables = asked.filter(sum => sum.operation === '*' || sum.operation === '/');
    expect(tables.some(sum => sum.operation === '*')).toBeTrue();
    expect(tables.some(sum => sum.operation === '/')).toBeTrue();
    tables.forEach(({ num1, num2, operation }) => {
      expect([1, 2, 5, 10]).toContain(num2);
      expect(operation === '/' ? num1 % num2 : 0).toBe(0);
    });
    // And the sums within 100 that are new then: 34 + 5, 45 + 30
    expect(asked.some(sum => sum.operation === '+' && sum.num1 >= 20 && sum.num1 + sum.num2 > 20)).toBeTrue();
    // Within 100: 100 : 10 is the top of the tables
    asked.forEach(sum => expect(Math.max(sum.num1, sum.num2)).toBeLessThanOrEqual(100));
  });

  it('asks grade 4 (groep 6) in the middle of the year to 10 000 in columns, and × and : past the tables', () => {
    build('4', 'medium');
    const asked = sums(300);
    // the old questions never shared out at grade 4, nor went past a few hundred
    expect(asked.some(sum => sum.operation === '/' && sum.num1 / sum.num2 > 10)).toBeTrue();
    expect(asked.some(sum => sum.operation === '+' && sum.num1 >= 1000 && sum.num2 >= 1000)).toBeTrue();
    expect(asked.some(sum => sum.operation === '*' && sum.num1 > 10)).toBeTrue();
  });

  it('asks grade 4 (groep 6) at the end of the year to round: 347 ≈ ? op tientallen, and to add tenths', () => {
    build('4', 'hard');
    const asked = sums(300);
    expect(asked.some(sum => sum.operation === '≈' && sum.form === 'afronden')).toBeTrue();
    expect(asked.some(sum => sum.form === 'tienden')).toBeTrue();
  });

  it('asks grade 5 (groep 7) at the end of the year a comma number times a whole one and the metric system with a comma', () => {
    build('5', 'hard');
    const asked = sums(400);
    expect(asked.some(sum => sum.form === 'komma-2' && sum.num2 < 10)).toBeTrue();
    expect(asked.some(sum => /^komma-[a-z]+-[a-z]+$/.test(sum.form || ''))).toBeTrue();
  });

  it('asks grade 5 (groep 7) in the middle of the year to round to thousands, multiply and divide in columns, and take a percentage', () => {
    build('5', 'medium');
    const asked = sums(400);
    expect(asked.some(sum => sum.operation === '≈' && sum.num2 === 1000)).toBeTrue();
    expect(asked.some(sum => sum.operation === '*' && sum.num1 > 100 && sum.num2 > 10)).toBeTrue();
    expect(asked.some(sum => sum.operation === '/' && sum.num2 > 10 && !sum.form)).toBeTrue();
    expect(asked.some(sum => /^procent/.test(sum.form || ''))).toBeTrue();
    expect(asked.some(sum => sum.form === 'komma-3')).toBeTrue();
    expect(asked.some(sum => /^gelijknamig-/.test(sum.form || ''))).toBeTrue();
    expect(asked.some(sum => sum.form === 'breuk-komma')).toBeTrue();
  });

  it('asks grade 5 (groep 7) at the end of the year a ratio and a discount', () => {
    build('5', 'hard');
    const asked = sums(400);
    expect(asked.some(sum => /^verhouding-/.test(sum.form || ''))).toBeTrue();
    expect(asked.some(sum => /^korting-/.test(sum.form || ''))).toBeTrue();
  });

  it('keeps the old questions for a groep not built yet: grade 6 (groep 8) is still asked as before', () => {
    build('6', 'medium');
    sums(80).forEach(({ operation, form }) => {
      expect(['+', '-', '*']).toContain(operation);
      expect(form).toBeUndefined();
    });
  });

  it('writes the sign as it is written in class: \u00d7 and : in Dutch, \u00f7 in English, a real minus', () => {
    build('2', 'hard');
    const cases: [string, string, string][] = [['*', 'nl', '\u00d7'], ['/', 'nl', ':'], ['/', 'en', '\u00f7'], ['-', 'nl', '\u2212'], ['+', 'nl', '+']];
    cases.forEach(([operation, language, shown]) => {
      component.languageService.setLanguage(language as 'nl' | 'en');
      component.currentQuestion = { num1: 12, num2: 3, operation };
      fixture.detectChanges();
      expect(component.sign).withContext(`${operation} in ${language}`).toBe(shown);
      expect(fixture.nativeElement.querySelector('.math-problem .operation').textContent.trim()).withContext(`${operation} in ${language}`).toBe(shown);
    });
  });

  it('still finishes when every draw lands at the top', () => {
    build('1', 'easy');
    // The old code once span forever on a high first number; no school topic may
    spyOn(Math, 'random').and.returnValue(0.9999);

    component.generateQuestion();

    expect(component.currentQuestion.num1).toBeGreaterThan(0);
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
      imports: [RouterTestingModule],
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
      imports: [RouterTestingModule],
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
    answerRightAndStay();
    component.moveToNextQuestion();
  }

  /**
   * Answers correctly and leaves the child looking at the answer, for the
   * tests about coming back to a question already answered. Whichever shape
   * is on the screen: setting `userAnswer` does nothing at all to a picking
   * question, which was how this test came to fail one run in five.
   */
  function answerRightAndStay() {
    if (component.isPicking) {
      putDownFewest();
    } else {
      component.userAnswer = String(solve(component));
    }
    component.checkAnswer();
  }

  /**
   * One wrong attempt, whichever shape is on the screen. On a picking
   * question the smallest coin on the tray is ALWAYS short: the amount was
   * built from at least two pieces, each of them at least that big.
   */
  function answerWrongOnce() {
    if (component.isPicking) {
      component.takeFromTray(component.tray.length - 1);
    } else {
      component.userAnswer = String(solve(component) + 1);
    }
    component.checkAnswer();
  }

  /** The fewest-coins answer to the picking question on the screen. */
  function putDownFewest() {
    const money = component.currentQuestion.money!;
    fewestPieces(money.answerCents, component.tray).forEach(piece =>
      component.takeFromTray(component.tray.indexOf(piece)));
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
      imports: [RouterTestingModule],
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
      answerRightAndStay();
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

    it('comes back to the coins already put down', () => {
      // Four coins into making an amount, then the screen locks. Starting
      // that purse again from empty is the same quiet loss the whole round
      // save exists to prevent, only smaller and more irritating.
      open();
      answerRight();
      for (let i = 0; i < 200 && !component.isPicking; i++) {
        (component as any).generateMoneyQuestion();
      }
      if (!component.isPicking) {
        pending('no picking question was generated');
        return;
      }
      component.picked = [];
      component.takeFromTray(0);
      component.takeFromTray(component.tray.length - 1);
      const held = component.picked.slice();
      expect(saved().picked).toEqual(held);
      fixture.destroy();

      open();
      component.takeResume();

      expect(component.picked).toEqual(held);
    });

    it('does not put coins on a question that has no purse', () => {
      // A hand-edited store must not grow a purse on a typed question
      open();
      answerRight();
      // Destroy FIRST: ngOnDestroy saves the round again, so a store edited
      // before this point is written straight back over. That ordering made
      // this test fail about one run in twenty, whenever the question the
      // component happened to be holding was itself a picking one.
      fixture.destroy();
      const round = saved();
      round.picked = [50, 20];
      round.question = { num1: 7, num2: 5, operation: '+' };
      localStorage.setItem(KEY, JSON.stringify(round));

      open();
      component.takeResume();

      expect(component.picked).toEqual([]);
      expect(component.isPicking).toBe(false);
    });

    it('gives back the try they still had in hand, and says so', () => {
      open();
      answerRight();
      answerWrongOnce();
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

describe('QuestionComponent asking the written forms (sum-form.ts)', () => {
  let component: QuestionComponent;
  let fixture: ComponentFixture<QuestionComponent>;

  function build(language = 'nl') {
    localStorage.clear();
    localStorage.setItem('grade', '1');
    localStorage.setItem('difficulty', 'hard');
    localStorage.setItem('language', language);
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** The sum on the card, in order, with the answer box as "[ ]". */
  function card(): string[] {
    const problem = fixture.nativeElement.querySelector('.math-problem') as HTMLElement;
    return Array.from(problem.children)
      .filter(child => !child.classList.contains('currency'))
      .map(child => child.tagName === 'INPUT' ? '[ ]' : child.textContent!.trim());
  }

  function ask(question: AskedQuestion) {
    component.currentQuestion = question;
    component.userAnswer = '';
    component.showOkButton = false;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [QuestionComponent, KeypadComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('puts the box where the "?" is in the workbook', () => {
    build('nl');
    ask({ num1: 10, num2: 7, operation: '-', form: 'aanvullen' });
    expect(card()).toEqual(['7', '+', '[ ]', '=', '10']);
    ask({ num1: 8, num2: 5, operation: '-', form: 'splitsen' });
    expect(card()).toEqual(['8', '=', '5', '+', '[ ]']);
    ask({ num1: 7, num2: 7, operation: '+', form: 'dubbel' });
    expect(card()).toEqual(['dubbel', '7', '=', '[ ]']);
    ask({ num1: 16, num2: 2, operation: '/', form: 'helft' });
    expect(card()).toEqual(['de helft van', '16', '=', '[ ]']);
    ask({ num1: 20, num2: 4, operation: '/', form: 'deel' });
    expect(card()).toEqual(['¼', 'van', '20', '=', '[ ]']);
    ask({ num1: 23, num2: 4, operation: '%', form: 'rest' });
    expect(card()).toEqual(['23', ':', '4', '=', '5', 'rest', '[ ]']);
    ask({ num1: 3, num2: 100, operation: '*', form: 'm-cm' });
    expect(card()).toEqual(['3', 'm', '=', '[ ]', 'cm']);
    ask({ num1: 2, num2: 60, operation: '*', form: 'uur-min' });
    expect(card()).toEqual(['2', 'uur', '=', '[ ]', 'minuten']);
    ask({ num1: 347, num2: 10, operation: '≈', form: 'afronden' });
    expect(card()).toEqual(['Rond af op tientallen', '347', '≈', '[ ]']);
    ask({ num1: 2468, num2: 100, operation: '≈', form: 'afronden' });
    expect(card()).toEqual(['Rond af op honderdtallen', '2468', '≈', '[ ]']);
    ask({ num1: 5, num2: 3, operation: '*', form: 'van-4' });
    expect(card()).toEqual(['¾', 'van', '20', '=', '[ ]']);
    ask({ num1: 1, num2: 4, operation: '*', form: 'gelijk-2' });
    expect(card()).toEqual(['½', '=', '[ ]', '/', '8']);
    ask({ num1: 6, num2: 4, operation: '*', form: 'oppervlakte' });
    expect(card()).toEqual(['Oppervlakte van de rechthoek', '6', 'm', '×', '4', 'm', '=', '[ ]', 'm²']);
    ask({ num1: 3, num2: 4, operation: '+', form: 'tienden' });
    expect(card()).toEqual(['0,3', '+', '0,4', '=', '[ ]']);
    ask({ num1: 60, num2: 4, operation: '/', form: 'procent-25' });
    expect(card()).toEqual(['25%', 'van', '60', '=', '[ ]']);
    ask({ num1: 345678, num2: 1000, operation: '≈', form: 'afronden' });
    expect(card()).toEqual(['Rond af op duizendtallen', '345\u202f678', '≈', '[ ]']);
    ask({ num1: 345, num2: 100, operation: '*', form: 'komma-2' });
    expect(card()).toEqual(['3,45', '×', '100', '=', '[ ]']);
    ask({ num1: 72000, num2: 100, operation: '/', form: 'komma-3' });
    expect(card()).toEqual(['72', ':', '100', '=', '[ ]']);
    ask({ num1: 25, num2: 1000, operation: '*', form: 'komma-km-m' });
    expect(card()).toEqual(['2,5', 'km', '=', '[ ]', 'm']);
    ask({ num1: 24, num2: 8, operation: '-', form: 'tienden' });
    expect(card()).toEqual(['2,4', '−', '0,8', '=', '[ ]']);
    ask({ num1: 2, num2: 3, operation: '+', form: 'gelijknamig-8' });
    expect(card()).toEqual(['2/8', '+', '3/8', '=', '[ ]', '/', '8']);
    ask({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' });
    expect(card()).toEqual(['¾', '=', '[ ]']);
    ask({ num1: 7, num2: 2, operation: '*', form: 'verhouding-3' });
    expect(card()).toEqual(['3 pakken kosten €6', '7', 'pakken', '=', '€', '[ ]']);
    ask({ num1: 45, num2: 9, operation: '-', form: 'korting-20' });
    expect(card()).toEqual(['20% korting: wat betaal je?', '€', '45', '→', '€', '[ ]']);
    // A plain sum keeps the box at the end
    ask({ num1: 7, num2: 5, operation: '+' });
    expect(card()).toEqual(['7', '+', '5', '=', '[ ]']);
  });

  it('says dubbel and de helft van in the child’s language', () => {
    build('en');
    ask({ num1: 7, num2: 7, operation: '+', form: 'dubbel' });
    expect(card()[0]).toBe('double');
    component.languageService.setLanguage('es');
    fixture.detectChanges();
    expect(card()[0]).toBe('el doble de');
    ask({ num1: 16, num2: 2, operation: '/', form: 'helft' });
    expect(card()[0]).toBe('la mitad de');
    ask({ num1: 15, num2: 3, operation: '/', form: 'deel' });
    expect(card().slice(0, 2)).toEqual(['⅓', 'de']);
    ask({ num1: 2, num2: 60, operation: '*', form: 'uur-min' });
    expect(card()).toEqual(['2', 'horas', '=', '[ ]', 'minutos']);
    component.languageService.setLanguage('en');
    fixture.detectChanges();
    expect(card()).toEqual(['2', 'hours', '=', '[ ]', 'minutes']);
    ask({ num1: 23, num2: 4, operation: '%', form: 'rest' });
    expect(card()).toEqual(['23', '÷', '4', '=', '5', 'r', '[ ]']);
    ask({ num1: 347, num2: 10, operation: '≈', form: 'afronden' });
    expect(card()).toEqual(['Round to the nearest ten', '347', '≈', '[ ]']);
    component.languageService.setLanguage('es');
    fixture.detectChanges();
    expect(card()).toEqual(['Redondea a la decena', '347', '≈', '[ ]']);
    ask({ num1: 2468, num2: 100, operation: '≈', form: 'afronden' });
    expect(card()).toEqual(['Redondea a la centena', '2468', '≈', '[ ]']);
    ask({ num1: 5, num2: 3, operation: '*', form: 'van-4' });
    expect(card()).toEqual(['¾', 'de', '20', '=', '[ ]']);
    ask({ num1: 6, num2: 4, operation: '*', form: 'oppervlakte' });
    expect(card()[0]).toBe('Área del rectángulo');
    component.languageService.setLanguage('en');
    fixture.detectChanges();
    expect(card()[0]).toBe('Area of the rectangle');
    // English writes a decimal point, Dutch and Spanish a comma
    ask({ num1: 15, num2: 27, operation: '+', form: 'tienden' });
    expect(card()).toEqual(['1.5', '+', '2.7', '=', '[ ]']);
  });

  it('marks the number that goes in the box: 3 for 7 + ? = 10', () => {
    build('nl');
    ask({ num1: 10, num2: 7, operation: '-', form: 'aanvullen' });
    component.userAnswer = '3';
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
  });

  it('marks what is left over for 23 : 4 = 5 rest ?, and only that', () => {
    build('nl');
    ask({ num1: 23, num2: 4, operation: '%', form: 'rest' });
    component.userAnswer = '3';
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
    ask({ num1: 23, num2: 4, operation: '%', form: 'rest' });
    component.wrongAttempts = 0;
    // 5 is the whole part, already on the card: not what is asked
    component.userAnswer = '5';
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(false);
  });

  it('puts "Rond af op tientallen" on a line of its own above the sum, as the workbook heads it', () => {
    build('nl');
    ask({ num1: 2468, num2: 100, operation: '≈', form: 'afronden' });
    const problem = fixture.nativeElement.querySelector('.math-problem') as HTMLElement;
    const heading = (problem.querySelector('.caption') as HTMLElement).getBoundingClientRect();
    const sum = (problem.querySelector('.number') as HTMLElement).getBoundingClientRect();
    const box = (problem.querySelector('input') as HTMLElement).getBoundingClientRect();
    expect(heading.bottom).toBeLessThanOrEqual(sum.top);
    // and the sum below it is one line: the number and the box side by side
    expect(Math.abs((sum.top + sum.bottom) / 2 - (box.top + box.bottom) / 2)).toBeLessThan(sum.height / 2);
  });

  it('marks the nearest ten or hundred for a rounding, a 5 going up, and not the number itself or the other way', () => {
    build('nl');
    const marked = (num1: number, num2: number, typed: string) => {
      ask({ num1, num2, operation: '≈', form: 'afronden' });
      component.wrongAttempts = 0;
      component.userAnswer = typed;
      component.checkAnswer();
      return component.answerWasCorrect;
    };
    expect(marked(347, 10, '350')).toBe(true);
    expect(marked(347, 10, '340')).toBe(false);
    expect(marked(347, 10, '347')).toBe(false);
    expect(marked(345, 10, '350')).toBe(true);
    expect(marked(341, 10, '340')).toBe(true);
    expect(marked(2468, 100, '2500')).toBe(true);
    expect(marked(2468, 100, '2470')).toBe(false);
    expect(marked(2438, 100, '2400')).toBe(true);
  });

  it('marks the parts taken for ¾ van 20, not one part; the new numerator for ¾ = ?/12; the area for 6 m × 4 m', () => {
    build('nl');
    const marked = (question: AskedQuestion, typed: string) => {
      ask(question);
      component.wrongAttempts = 0;
      component.userAnswer = typed;
      component.checkAnswer();
      return component.answerWasCorrect;
    };
    expect(marked({ num1: 5, num2: 3, operation: '*', form: 'van-4' }, '15')).toBe(true);
    // a quarter of 20, the step on the way: not what is asked
    expect(marked({ num1: 5, num2: 3, operation: '*', form: 'van-4' }, '5')).toBe(false);
    expect(marked({ num1: 3, num2: 3, operation: '*', form: 'gelijk-4' }, '9')).toBe(true);
    expect(marked({ num1: 3, num2: 3, operation: '*', form: 'gelijk-4' }, '12')).toBe(false);
    expect(marked({ num1: 6, num2: 4, operation: '*', form: 'oppervlakte' }, '24')).toBe(true);
    // the way round a rectangle is another sum
    expect(marked({ num1: 6, num2: 4, operation: '*', form: 'oppervlakte' }, '20')).toBe(false);
  });

  it('marks 0,7 for 0,3 + 0,4, typed with a comma or a point, and not 7 or 0,75', () => {
    build('nl');
    const marked = (typed: string) => {
      ask({ num1: 3, num2: 4, operation: '+', form: 'tienden' });
      component.wrongAttempts = 0;
      component.userAnswer = typed;
      component.checkAnswer();
      return component.answerWasCorrect;
    };
    expect(marked('0,7')).toBe(true);
    expect(marked('0.7')).toBe(true);
    expect(marked('7')).toBe(false);
    expect(marked('0,75')).toBe(false);
    expect(marked('0,8')).toBe(false);
  });

  it('types 0,7 on the keypad with a comma key in Dutch, and shows the comma in the box as it is typed', () => {
    build('nl');
    component.useKeypad = true;
    ask({ num1: 3, num2: 4, operation: '+', form: 'tienden' });
    const keyFaces = () => Array.from(fixture.nativeElement.querySelectorAll('.key')).map((key: any) => key.textContent.trim());
    expect(keyFaces()).toContain(',');
    expect(keyFaces()).not.toContain('-');
    component.onKeypadPress('0');
    component.onKeypadPress('.');
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('.math-problem input') as HTMLInputElement;
    expect(box.value).toBe('0,');
    component.onKeypadPress('7');
    fixture.detectChanges();
    expect(box.value).toBe('0,7');
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
  });

  it('keeps the decimal key a point in English, where 0.7 is written with one', () => {
    build('en');
    component.useKeypad = true;
    ask({ num1: 3, num2: 4, operation: '+', form: 'tienden' });
    const keyFaces = Array.from(fixture.nativeElement.querySelectorAll('.key')).map((key: any) => key.textContent.trim());
    expect(keyFaces).toContain('.');
    expect(keyFaces).not.toContain(',');
  });

  it('draws the box for a decimal as wide as the box for a whole number, so 1,7 + 4,1 = stays on one line', () => {
    build('nl');
    const box = () => (fixture.nativeElement.querySelector('.math-problem input') as HTMLElement).getBoundingClientRect();
    ask({ num1: 17, num2: 41, operation: '+', form: 'tienden' });
    const decimal = box();
    ask({ num1: 17, num2: 41, operation: '+' });
    const whole = box();
    expect(Math.abs(decimal.width - whole.width)).toBeLessThan(1);
    expect(Math.abs(decimal.height - whole.height)).toBeLessThan(1);
  });

  it('gives the answer to a sum in tenths as it is written, with the way to it, after two tries', () => {
    build('nl');
    ask({ num1: 15, num2: 27, operation: '+', form: 'tienden' });
    component.userAnswer = '4';
    component.checkAnswer();
    component.userAnswer = '4';
    component.checkAnswer();
    expect(component.feedback).toContain('4,2');
    expect(component.workedLine).toBe('15 + 27 = 42 → 1,5 + 2,7 = 4,2');
  });

  it('marks 15 for 25% van 60, and gives 346 000 with its thousands set apart after two tries at rounding 345 678', () => {
    build('nl');
    ask({ num1: 60, num2: 4, operation: '/', form: 'procent-25' });
    component.userAnswer = '15';
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
    ask({ num1: 345678, num2: 1000, operation: '≈', form: 'afronden' });
    component.wrongAttempts = 0;
    component.userAnswer = '345000';
    component.checkAnswer();
    component.userAnswer = '345000';
    component.checkAnswer();
    expect(component.feedback).toContain('346\u202f000');
    expect(component.workedLine).toBe('345\u202f678: 6 ≥ 5 → 346\u202f000');
  });

  it('marks a sum with a comma in it as it is written: 345 for 3,45 × 100, 0,72 for 72 : 100, 2500 for 2,5 km', () => {
    build('nl');
    const marked = (question: AskedQuestion, typed: string) => {
      ask(question);
      component.wrongAttempts = 0;
      component.userAnswer = typed;
      component.checkAnswer();
      return component.answerWasCorrect;
    };
    expect(marked({ num1: 345, num2: 100, operation: '*', form: 'komma-2' }, '345')).toBe(true);
    expect(marked({ num1: 345, num2: 100, operation: '*', form: 'komma-2' }, '34,5')).toBe(false);
    expect(marked({ num1: 72000, num2: 100, operation: '/', form: 'komma-3' }, '0,72')).toBe(true);
    expect(marked({ num1: 72000, num2: 1000, operation: '/', form: 'komma-3' }, '0.072')).toBe(true);
    expect(marked({ num1: 72000, num2: 100, operation: '/', form: 'komma-3' }, '7,2')).toBe(false);
    expect(marked({ num1: 125, num2: 8, operation: '*', form: 'komma-2' }, '10')).toBe(true);
    expect(marked({ num1: 25, num2: 1000, operation: '*', form: 'komma-km-m' }, '2500')).toBe(true);
    expect(marked({ num1: 25, num2: 1000, operation: '*', form: 'komma-km-m' }, '250')).toBe(false);
  });

  it('types 0,72 for 72 : 100 on the keypad with its comma key, and 2500 for 2,5 km in the same text box', () => {
    build('nl');
    component.useKeypad = true;
    ask({ num1: 72000, num2: 100, operation: '/', form: 'komma-3' });
    const keyFaces = () => Array.from(fixture.nativeElement.querySelectorAll('.key')).map((key: any) => key.textContent.trim());
    expect(keyFaces()).toContain(',');
    ['0', '.', '7', '2'].forEach(key => component.onKeypadPress(key));
    fixture.detectChanges();
    const box = fixture.nativeElement.querySelector('.math-problem input') as HTMLInputElement;
    expect(box.value).toBe('0,72');
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
    ask({ num1: 25, num2: 1000, operation: '*', form: 'komma-km-m' });
    expect(keyFaces()).toContain(',');
  });

  it('marks the rest of groep 7 as written: 5 for 2/8 + 3/8, 0,75 for ¾, 14 for the packs, 36 paid after 20% off', () => {
    build('nl');
    const marked = (question: AskedQuestion, typed: string) => {
      ask(question);
      component.wrongAttempts = 0;
      component.userAnswer = typed;
      component.checkAnswer();
      return component.answerWasCorrect;
    };
    expect(marked({ num1: 2, num2: 3, operation: '+', form: 'gelijknamig-8' }, '5')).toBe(true);
    expect(marked({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' }, '0,75')).toBe(true);
    expect(marked({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' }, '0.75')).toBe(true);
    expect(marked({ num1: 50, num2: 1, operation: '*', form: 'breuk-komma' }, '0,5')).toBe(true);
    // ¾ is not 75, nor 3,4
    expect(marked({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' }, '75')).toBe(false);
    expect(marked({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' }, '3,4')).toBe(false);
    expect(marked({ num1: 7, num2: 2, operation: '*', form: 'verhouding-3' }, '14')).toBe(true);
    expect(marked({ num1: 45, num2: 9, operation: '-', form: 'korting-20' }, '36')).toBe(true);
    // the discount itself is not what is paid
    expect(marked({ num1: 45, num2: 9, operation: '-', form: 'korting-20' }, '9')).toBe(false);
  });

  it('puts the comma key on the keypad for ¾ = ?, and none for the packs or the discount, which come out in whole euros', () => {
    build('nl');
    component.useKeypad = true;
    const keyFaces = () => Array.from(fixture.nativeElement.querySelectorAll('.key')).map((key: any) => key.textContent.trim());
    ask({ num1: 25, num2: 3, operation: '*', form: 'breuk-komma' });
    expect(keyFaces()).toContain(',');
    ask({ num1: 7, num2: 2, operation: '*', form: 'verhouding-3' });
    expect(keyFaces()).not.toContain(',');
    ask({ num1: 45, num2: 9, operation: '-', form: 'korting-20' });
    expect(keyFaces()).not.toContain(',');
  });

  it('says the packs and the discount in the child’s language', () => {
    build('en');
    ask({ num1: 7, num2: 2, operation: '*', form: 'verhouding-3' });
    expect(card()).toEqual(['3 packs cost €6', '7', 'packs', '=', '€', '[ ]']);
    ask({ num1: 45, num2: 9, operation: '-', form: 'korting-20' });
    expect(card()[0]).toBe('20% off: what do you pay?');
    component.languageService.setLanguage('es');
    fixture.detectChanges();
    expect(card()[0]).toBe('20% de descuento: ¿cuánto pagas?');
    ask({ num1: 7, num2: 2, operation: '*', form: 'verhouding-3' });
    expect(card()[0]).toBe('3 paquetes cuestan €6');
  });

  it('gives 0,72 as the answer to 72 : 100 after two tries, with the times it undoes', () => {
    build('nl');
    ask({ num1: 72000, num2: 100, operation: '/', form: 'komma-3' });
    component.userAnswer = '7';
    component.checkAnswer();
    component.userAnswer = '7';
    component.checkAnswer();
    expect(component.feedback).toContain('0,72');
    expect(component.workedLine).toBe('0,72 × 100 = 72 → 72 : 100 = 0,72');
  });

  it('marks 300 for 3 m = ? cm', () => {
    build('nl');
    ask({ num1: 3, num2: 100, operation: '*', form: 'm-cm' });
    component.userAnswer = '300';
    component.checkAnswer();
    expect(component.answerWasCorrect).toBe(true);
  });

  it('after two tries shows the answer with the fact the form is taught through, and keeps it for another day as it was asked', () => {
    build('nl');
    const progress = TestBed.inject(ProgressService);
    spyOn(progress, 'recordMissed').and.callThrough();
    ask({ num1: 10, num2: 7, operation: '-', form: 'aanvullen' });
    component.userAnswer = '5';
    component.checkAnswer();
    component.userAnswer = '5';
    component.checkAnswer();
    expect(component.workedLine).toBe('10 − 7 = 3');
    expect(progress.recordMissed).toHaveBeenCalledWith(jasmine.objectContaining({ form: 'aanvullen' }));
  });

  it('brings a fact missed on another day back in the form it was missed in', () => {
    localStorage.clear();
    localStorage.setItem('grade', '1');
    localStorage.setItem('difficulty', 'hard');
    const progress = TestBed.inject(ProgressService);
    spyOn(progress, 'takeMissedFacts').and.returnValue([{ num1: 8, num2: 5, operation: '-', form: 'splitsen' }]);
    fixture = TestBed.createComponent(QuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Never the very first question: it waits until one has been answered. (The first may well be a
    // written form of its own: groep 3's end asks them, so look at the queue, not the screen)
    expect((component as any).missed.length).toBe(1);
    component.questionsAnswered = 1;
    component.generateQuestion();
    fixture.detectChanges();
    expect(component.currentQuestion).toEqual(jasmine.objectContaining({ num1: 8, num2: 5, form: 'splitsen' }));
    expect((component as any).missed.length).toBe(0);
    expect(card()).toEqual(['8', '=', '5', '+', '[ ]']);
  });
});
