import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdultsComponent } from './adults.component';
import { ProgressService } from '../services/progress.service';
import { LanguageService } from '../services/language.service';
import { spellNumber } from './number-words';

describe('AdultsComponent', () => {
  let fixture: ComponentFixture<AdultsComponent>;
  let component: AdultsComponent;
  let progress: ProgressService;
  let language: LanguageService;

  function open() {
    fixture = TestBed.createComponent(AdultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** Types the right answer for whatever challenge is currently showing. */
  function passGate() {
    component.typed = String(component.challenge.value);
    component.tryGate();
    fixture.detectChanges();
  }

  const round = (correct: number) => ({
    correctAnswers: correct, total: 10, percentage: correct * 10,
    score: correct * 2, grade: 3
  });

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, HttpClientTestingModule],
      declarations: [AdultsComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
    language = TestBed.inject(LanguageService);
  });

  afterEach(() => localStorage.clear());

  describe('the door', () => {
    it('is shut on arrival', () => {
      open();

      expect(component.locked).toBe(true);
      expect(fixture.nativeElement.querySelector('.gate')).toBeTruthy();
    });

    it('shows nothing about the child while it is shut', () => {
      progress.record(round(3));
      open();

      expect(fixture.nativeElement.querySelector('.chart')).toBeNull();
      expect(fixture.nativeElement.querySelector('.facts')).toBeNull();
      expect(fixture.nativeElement.querySelector('.counts')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('30%');
    });

    it('asks for a number written out in words', () => {
      open();

      const shown = fixture.nativeElement.querySelector('.gate-number').textContent.trim();
      expect(shown).toBe(spellNumber(component.challenge.value, 'en'));
      expect(shown).not.toMatch(/[0-9]/);
    });

    it('asks in the language the adult is reading', () => {
      language.setLanguage('nl');
      open();

      expect(component.challengeInWords).toBe(spellNumber(component.challenge.value, 'nl'));
    });

    it('opens on the right number', () => {
      open();
      passGate();

      expect(component.locked).toBe(false);
      expect(fixture.nativeElement.querySelector('.gate')).toBeNull();
    });

    it('stays shut on the wrong one', () => {
      open();
      component.typed = String(component.challenge.value + 1);
      component.tryGate();
      fixture.detectChanges();

      expect(component.locked).toBe(true);
    });

    it('never tells anyone they got it wrong', () => {
      // A child who wandered in must not leave having failed at something —
      // least of all here, in a game built to make maths feel survivable
      open();
      component.typed = '1';
      component.tryGate();
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent.toLowerCase();
      expect(text).not.toContain('wrong');
      expect(text).not.toContain('incorrect');
      expect(text).not.toContain('try again');
      expect(fixture.nativeElement.querySelector('.error')).toBeNull();
    });

    it('hands over a different number after a wrong try', () => {
      // Otherwise a child could work through it by guessing the same one
      open();
      const first = component.challenge.value;
      let changed = false;

      for (let attempt = 0; attempt < 20 && !changed; attempt++) {
        component.typed = '1';
        component.tryGate();
        changed = component.challenge.value !== first;
      }

      expect(changed).toBe(true);
      expect(component.typed).toBe('');
    });

    it('cannot be opened by typing the words back', () => {
      open();
      component.typed = component.challengeInWords;
      component.tryGate();

      expect(component.locked).toBe(true);
    });

    it('does not put a sum on the door', () => {
      // Deliberate, and the one thing this gate may never become: a maths
      // test standing between a child and a screen
      open();

      const gate = fixture.nativeElement.querySelector('.gate').textContent;
      ['+', '−', '×', '÷', '='].forEach(sign => {
        expect(gate).not.toContain(sign);
      });
    });
  });

  describe('behind the door', () => {
    it('shows the honest trend, dips and all', () => {
      progress.record(round(9));
      progress.record(round(2));
      open();
      passGate();

      expect(component.plan.trend.map(point => point.percentage)).toEqual([90, 20]);
      expect(fixture.nativeElement.querySelector('svg.chart')).toBeTruthy();
      expect(fixture.nativeElement.querySelectorAll('.chart .dot').length).toBe(2);
    });

    it('labels the scale, so a dip can be read', () => {
      // An unlabelled line is decoration; an adult needs to know how far down
      progress.record(round(5));
      open();
      passGate();

      expect(fixture.nativeElement.querySelector('.chart-max').textContent).toContain('100');
      expect(fixture.nativeElement.querySelector('.chart-min').textContent).toContain('0');
    });

    it('says plainly that this line is not for the child', () => {
      progress.record(round(5));
      open();
      passGate();

      expect(fixture.nativeElement.querySelector('.trend-note')).toBeTruthy();
    });

    it('draws a single round without collapsing the line', () => {
      progress.record(round(5));
      open();
      passGate();

      expect(component.trendPoints.split(' ').length).toBe(1);
      expect(component.trendDots[0].x).toBe(component.chartWidth / 2);
    });

    it('puts a perfect round at the top of the chart and a blank one at the bottom', () => {
      progress.record(round(0));
      progress.record(round(10));
      open();
      passGate();

      const dots = component.trendDots;
      expect(dots[0].y).toBe(component.chartHeight);
      expect(dots[1].y).toBe(0);
    });

    it('counts everything played, not just what history kept', () => {
      for (let i = 0; i < 25; i++) {
        progress.record(round(6));
      }
      open();
      passGate();

      expect(component.totals.rounds).toBe(25);
      expect(component.totals.questions).toBe(250);
    });

    it('lists at most three facts, each with its method', () => {
      [[8, 7], [9, 6], [7, 8], [6, 9]].forEach(([num1, num2]) =>
        progress.recordMissed({ num1, num2, operation: '+' }));
      open();
      passGate();

      const facts = fixture.nativeElement.querySelectorAll('.fact');
      expect(facts.length).toBe(3);
      expect(fixture.nativeElement.querySelectorAll('.fact-worked').length).toBe(3);
    });

    it('says how far each fact has got, and what is still waiting', () => {
      // The clock has to hold still for this one. A fact missed today is due
      // TOMORROW, and the component asks the real clock what day it is — so
      // writing "22 September 2026" here as the day they were missed made the
      // test pass on the 22nd and fail on the 23rd, on a branch nobody had
      // touched. Freezing the clock is what makes "today" mean today.
      // See src/testing/shift-clock.ts for the run that catches the rest.
      jasmine.clock().install();
      try {
        jasmine.clock().mockDate(new Date(2026, 8, 22, 12));
        progress.recordMissed({ num1: 8, num2: 7, operation: '+' });
        progress.recordMissed({ num1: 9, num2: 6, operation: '*' });
        open();
        passGate();

        expect(fixture.nativeElement.querySelectorAll('.fact-reviews').length).toBe(2);
        expect(fixture.nativeElement.querySelector('.fact-reviews').textContent)
          .toContain('0 / ' + component.plan.facts[0].toGraduate);
        // Both were missed today, so both are waiting for tomorrow
        expect(component.plan.waiting).toBe(2);
        expect(component.waitingLine).not.toContain('{count}');
        expect(fixture.nativeElement.querySelector('.waiting')).toBeTruthy();
      } finally {
        jasmine.clock().uninstall();
      }
    });

    it('explains why facts are not coming back the same afternoon', () => {
      progress.recordMissed({ num1: 8, num2: 7, operation: '+' });
      open();
      passGate();

      expect(fixture.nativeElement.querySelector('.spacing-note').textContent.length)
        .toBeGreaterThan(40);
    });

    it('says so when nothing is being missed', () => {
      progress.record(round(10));
      open();
      passGate();

      expect(fixture.nativeElement.querySelector('.facts')).toBeNull();
      expect(fixture.nativeElement.querySelector('.nothing')).toBeTruthy();
    });

    it('tells an adult how to use it, not just what is wrong', () => {
      // The research finding this screen is built around: handing a parent a
      // list of weaknesses is the part that can backfire; the structure of
      // the ask is what protects against it
      progress.record(round(4));
      open();
      passGate();

      expect(fixture.nativeElement.querySelector('.how')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.how p').textContent.length)
        .toBeGreaterThan(40);
    });

    it('names the operation missed most, in words', () => {
      [[8, 7], [9, 6], [7, 8]].forEach(([num1, num2]) =>
        progress.recordMissed({ num1, num2, operation: '*' }));
      open();
      passGate();

      expect(component.plan.weakest).toBe('*');
      expect(component.weakestName).toBe('times tables');
      expect(component.weakestLine).not.toContain('{operation}');
    });

    it('says nothing about a pattern when there is only one miss', () => {
      progress.recordMissed({ num1: 8, num2: 7, operation: '*' });
      open();
      passGate();

      expect(component.weakestName).toBeNull();
      expect(fixture.nativeElement.querySelector('.weakest')).toBeNull();
    });

    it('names the child it is about', () => {
      localStorage.setItem('username', 'Sam');
      open();
      passGate();

      expect(component.playerName).toBe('Sam');
      expect(component.heading).toContain('Sam');
      expect(component.heading).not.toContain('{name}');
    });

    it('falls back to the guest wording when nobody is signed in', () => {
      open();
      passGate();

      expect(component.heading).not.toContain('{name}');
      expect(component.heading.length).toBeGreaterThan(0);
    });

    it('opens on an empty store without breaking', () => {
      open();
      passGate();

      expect(component.hasTrend).toBe(false);
      expect(component.trendPoints).toBe('');
      expect(fixture.nativeElement.querySelector('svg.chart')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.nothing').length).toBeGreaterThan(0);
    });
  });
});

describe('AdultsComponent telling an adult what stuck', () => {
  let fixture: ComponentFixture<AdultsComponent>;
  let component: AdultsComponent;

  function open() {
    fixture = TestBed.createComponent(AdultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.typed = String(component.challenge.value);
    component.tryGate();
    fixture.detectChanges();
  }

  /** Puts facts straight into the store, dated relative to today. */
  function stuckDaysAgo(...daysAgo: number[]) {
    const entries = daysAgo.map((ago, i) => {
      const day = new Date();
      day.setDate(day.getDate() - ago);
      const on = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`
        + `-${String(day.getDate()).padStart(2, '0')}`;
      return { fact: { num1: 8 + i, num2: 7, operation: '+' }, on, key: `k${i}` };
    });
    localStorage.setItem('learned:guest', JSON.stringify(entries));
  }

  const section = () => fixture.nativeElement.querySelector('.stuck');
  const facts = () => Array.from(fixture.nativeElement.querySelectorAll('.stuck-fact'));

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, HttpClientTestingModule],
      declarations: [AdultsComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('has a section for it at all, which this screen never had', () => {
    open();

    expect(section()).toBeTruthy();
  });

  it('says plainly that nothing has finished yet, rather than showing an empty list', () => {
    open();

    expect(facts().length).toBe(0);
    expect(section().querySelector('.nothing')).toBeTruthy();
    expect(section().textContent.trim().length).toBeGreaterThan(20);
  });

  it('names the facts that stuck this week', () => {
    stuckDaysAgo(0, 2);
    open();

    expect(facts().length).toBe(2);
    expect(section().textContent).toContain('8 + 7');
    expect(section().textContent).toContain('9 + 7');
  });

  it('shows the answer beside each one, labelled as in the list above', () => {
    // A bare "15" under "8 + 7" is a number an adult has to guess the job of
    stuckDaysAgo(1);
    open();

    const answer = section().querySelector('.fact-answer').textContent;
    expect(answer).toContain('15');
    expect(answer.trim().length).toBeGreaterThan(3);
  });

  it('leaves out what stuck longer ago than the window', () => {
    stuckDaysAgo(0, 40);
    open();

    expect(facts().length).toBe(1);
  });

  it('counts them in words a parent would use, singular and plural', () => {
    stuckDaysAgo(0);
    open();
    expect(component.stuckLine).toContain('One');
    expect(component.stuckLine).not.toContain('{count}');

    localStorage.clear();
    stuckDaysAgo(0, 1, 2);
    open();
    expect(component.stuckLine).toContain('3');
    expect(component.stuckLine).not.toContain('{count}');
  });

  it('never turns it into a score, a streak or a target', () => {
    // This screen exists to keep an adult doing a short scripted thing, not
    // to give them a number to chase
    stuckDaysAgo(0, 1);
    open();

    const text = section().textContent;
    expect(text).not.toMatch(/\bstreak\b/i);
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toMatch(/\bgoal\b|\btarget\b/i);
    expect(section().querySelector('svg')).toBeNull();
  });

  it('keeps it apart from the facts still being practised', () => {
    localStorage.setItem('missedFacts:guest',
      JSON.stringify([{ num1: 5, num2: 5, operation: '+' }]));
    stuckDaysAgo(0);
    open();

    const practise = fixture.nativeElement.querySelector('.practise');
    expect(practise.textContent).toContain('5 + 5');
    expect(practise.textContent).not.toContain('8 + 7');
    expect(section().textContent).toContain('8 + 7');
    expect(section().textContent).not.toContain('5 + 5');
  });

  it('survives a store with rubbish in it', () => {
    localStorage.setItem('learned:guest', '{not json');
    open();

    expect(section()).toBeTruthy();
    expect(facts().length).toBe(0);
  });
});

/**
 * The one control in the game that deletes something. Its own describe
 * because who is signed in has to be in storage before the services read it.
 */
describe('AdultsComponent and the copy kept on the account', () => {
  let fixture: ComponentFixture<AdultsComponent>;
  let component: AdultsComponent;
  let http: HttpTestingController;

  async function arrive(signedIn: boolean) {
    localStorage.clear();
    if (signedIn) {
      localStorage.setItem('username', 'ada');
      localStorage.setItem('token', 'a-token');
    }
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, FormsModule, HttpClientTestingModule],
      declarations: [AdultsComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Through the door
    component.typed = String(component.challenge.value);
    component.tryGate();
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  it('is not shown to a guest, who has no copy anywhere to delete', async () => {
    await arrive(false);

    expect(component.canForget).toBe(false);
    expect(fixture.nativeElement.querySelector('.copy')).toBeNull();
  });

  it('says what is kept and, more importantly, what is not', async () => {
    await arrive(true);

    const text = fixture.nativeElement.querySelector('.copy').textContent;
    expect(text).toContain(component.languageService.translate('adults-copy-what'));
    expect(text).toContain(component.languageService.translate('adults-copy-not'));
  });

  it('asks before deleting, rather than deleting on one tap', async () => {
    await arrive(true);

    fixture.nativeElement.querySelector('.forget-btn').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.forget-sure')).toBeTruthy();
    http.verify();
  });

  it('lets an adult change their mind without anything happening', async () => {
    await arrive(true);
    component.askToForget();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.keep-btn').click();
    fixture.detectChanges();

    expect(component.forgetState).toBe('idle');
    http.verify();
  });

  it('deletes the copy and says so', async () => {
    await arrive(true);
    component.askToForget();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.forget-btn').click();

    const request = http.expectOne(r => r.method === 'DELETE');
    expect(request.request.url).toContain('/api/progress');
    request.flush({ deleted: true });
    fixture.detectChanges();

    expect(component.forgetState).toBe('done');
    expect(fixture.nativeElement.querySelector('.forget-done')).toBeTruthy();
  });

  it('leaves the game on this device completely alone', async () => {
    await arrive(true);
    const progress = TestBed.inject(ProgressService);
    progress.addXp(240);
    progress.record({ correctAnswers: 8, total: 10, percentage: 80, score: 16, grade: 2 });

    component.confirmForget();
    http.expectOne(r => r.method === 'DELETE').flush({ deleted: true });

    expect(progress.getXp()).toBe(240);
    expect(progress.getHistory().length).toBe(1);
  });

  it('does not leave an adult watching a spinner when the server is unreachable', async () => {
    await arrive(true);

    component.confirmForget();
    http.expectOne(r => r.method === 'DELETE').error(new ErrorEvent('offline'));
    fixture.detectChanges();

    expect(component.forgetState).toBe('done');
  });
});
