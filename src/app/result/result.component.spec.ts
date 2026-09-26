import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ROUND_TUNE_AFTER_STARS_MS, ResultComponent } from './result.component';
import { STAR_STEP_MS } from './round-card';
import { SoundService } from '../services/sound.service';
import { ScoreService } from '../services/score.service';
import { ProgressService } from '../services/progress.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ROUND_COMPLETION_XP, xpForRound, xpToReach } from '../levels/level-curve';
import { NO_ITEM, levelItems } from '../avatar/avatar-model';
import { EASED_KEY } from '../levels/in-round-tuner';
import { RESULT_WINDOW_MS } from './result-state';
import { SEASONAL_EVENTS } from '../events/seasonal-events';

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
      imports: [RouterTestingModule, HttpClientTestingModule],
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

    // It used to say "Your best: 90%" here, quietly. That is a gap between
    // this round and a better one, in front of the child, at the moment of
    // reward — the progress screen already shows the best, as a number that
    // only rises. See round-card.ts.
    it('says nothing about an old best that this round fell short of', () => {
      progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 9, grade: 3 });
      renderWith(60);

      expect(component.isPersonalBest).toBe(false);
      expect(component.previousBest).toBe(90);
      expect(fixture.nativeElement.querySelector('.personal-best')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('90');
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

describe('ResultComponent offering an account', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let scoreService: ScoreService;
  let progress: ProgressService;
  let auth: AuthService;
  let router: Router;

  /** Rounds already behind this child, before the one just finished. */
  function withRoundsPlayed(count: number) {
    for (let i = 0; i < count; i++) {
      progress.record({ correctAnswers: 8, total: 10, percentage: 80, score: 18, grade: 2 });
    }
  }

  function render() {
    spyOn(scoreService, 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: 9, percentage: 90
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    scoreService = TestBed.inject(ScoreService);
    progress = TestBed.inject(ProgressService);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => localStorage.clear());

  it('says nothing on a guest’s first round — there is nothing to lose yet', () => {
    auth.playAsGuest();
    render();

    expect(component.showKeepOffer).toBe(false);
    expect(fixture.nativeElement.querySelector('.keep-offer')).toBeNull();
  });

  it('offers once a guest has built up something worth keeping', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();

    expect(component.showKeepOffer).toBe(true);
    expect(fixture.nativeElement.querySelector('.keep-offer')).toBeTruthy();
  });

  it('promises only what the game can actually do today', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();

    const body = fixture.nativeElement.querySelector('.keep-offer-body').textContent;
    // An account now really does carry progress between devices, so the offer
    // is allowed to say so. The test below is the other half of this one: it
    // checks the promise is kept, not just made.
    expect(body).toMatch(/phone or tablet/i);
  });

  it('never offers to a child who already has an account', () => {
    localStorage.setItem('username', 'ada');
    withRoundsPlayed(9);
    render();

    expect(component.showKeepOffer).toBe(false);
  });

  it('keeps the offer below Play Again, so the score lands first', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();

    const container = fixture.nativeElement.querySelector('.result-container');
    const children = Array.from(container.children) as Element[];

    expect(children.indexOf(container.querySelector('.keep-offer')))
      .toBeGreaterThan(children.indexOf(container.querySelector('.play-again')));
  });

  it('does not cover the celebration with a dialog', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();

    const offer = fixture.nativeElement.querySelector('.keep-offer');
    expect(offer.getAttribute('role')).toBe('note');
    expect(getComputedStyle(offer).position).not.toBe('fixed');
  });

  it('takes a child who accepts straight to signing up, not signing in', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();
    spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.keep-offer-create').click();

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { create: 1 } });
  });

  it('stops asking once a child has said no', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();

    fixture.nativeElement.querySelector('.keep-offer-dismiss').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.keep-offer')).toBeNull();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: 9, percentage: 90
    });
    const again = TestBed.createComponent(ResultComponent);
    again.detectChanges();

    expect(again.componentInstance.showKeepOffer).toBe(false);
  });

  it('still renders the score when storage refuses to remember the answer', () => {
    auth.playAsGuest();
    withRoundsPlayed(2);
    render();
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    expect(() => component.dismissKeepOffer()).not.toThrow();
    expect(component.showKeepOffer).toBe(false);
  });
});

describe('ResultComponent levels', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let progress: ProgressService;

  function render(percentage: number) {
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: Math.round(percentage / 10), percentage
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('pays for a round that went badly', () => {
    render(0);

    expect(component.xpEarned).toBe(ROUND_COMPLETION_XP);
    expect(progress.getXp()).toBe(ROUND_COMPLETION_XP);
  });

  it('pays more for a round that went well', () => {
    render(100);

    expect(component.xpEarned).toBeGreaterThan(ROUND_COMPLETION_XP);
    expect(component.xpEarned).toBe(xpForRound(10, 10));
  });

  it('banks the round on top of what was already earned', () => {
    progress.addXp(40);

    render(80);

    expect(progress.getXp()).toBe(40 + xpForRound(8, 10));
  });

  it('celebrates crossing a level, and only then', () => {
    render(100);
    expect(component.leveledUp).toBe(true);
    expect(fixture.nativeElement.querySelector('.level-up')).toBeTruthy();

    // Park the child just inside a level so the next round cannot cross it
    localStorage.clear();
    progress.addXp(xpToReach(5));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: 5, percentage: 50
    });
    const quiet = TestBed.createComponent(ResultComponent);
    quiet.detectChanges();

    expect(quiet.componentInstance.leveledUp).toBe(false);
    expect(quiet.nativeElement.querySelector('.level-up')).toBeNull();
  });

  it('shows the level the child is now on', () => {
    progress.addXp(xpToReach(4));

    render(90);

    const badge = fixture.nativeElement.querySelector('.level-badge').textContent;
    expect(badge).toContain(String(component.level.level));
    expect(component.level.level).toBeGreaterThanOrEqual(4);
  });

  it('describes the bar to a screen reader in the same terms it draws it', () => {
    progress.addXp(60);
    render(70);

    const track = fixture.nativeElement.querySelector('.level-track');
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(Number(track.getAttribute('aria-valuenow'))).toBe(component.level.xpIntoLevel);
    expect(Number(track.getAttribute('aria-valuemax'))).toBe(component.level.xpForLevel);
  });

  it('fills the bar to where the child actually stands', fakeAsync(() => {
    progress.addXp(xpToReach(3));
    render(60);

    tick(1000);
    expect(component.levelFillPercent).toBe(Math.round(component.level.fraction * 100));

    component.ngOnDestroy();
  }));

  it('starts the bar from the level floor after a level up', () => {
    progress.addXp(xpToReach(2) - 1);

    render(100);

    expect(component.leveledUp).toBe(true);
    expect(component.levelFillPercent).toBe(0);
  });

  it('keeps the bar still when motion is not wanted', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    progress.addXp(40);

    render(80);

    // No timers to wait on: it is already where it belongs
    expect(component.levelFillPercent).toBe(Math.round(component.level.fraction * 100));
  });
});

describe('ResultComponent naming the reward', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let progress: ProgressService;

  function finishRoundAt(startingXp: number, percentage: number) {
    progress.addXp(startingXp);
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: Math.round(percentage / 10), percentage
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('says what a level handed over, not just that one happened', () => {
    // One round short of level 2, which wins the cap
    finishRoundAt(xpToReach(2) - 5, 100);

    expect(component.leveledUp).toBe(true);
    expect(component.unlocked.map(i => i.id)).toEqual(['cap']);
    expect(fixture.nativeElement.querySelector('.unlocked').textContent).toContain('Cap');
  });

  it('records which setting the round was played at', () => {
    // Without it, nothing can tell whether a child is on the right rung
    localStorage.setItem('difficulty', 'hard');
    localStorage.setItem('grade', '3');
    finishRoundAt(0, 40);

    const latest = TestBed.inject(ProgressService).getHistory()[0];
    expect(latest.difficulty).toBe('hard');
    expect(latest.grade).toBe(3);
  });

  it('records no setting for a round whose difficulty changed part way through', () => {
    // A half-easy round cannot answer "how hard was it", so it must not
    // become evidence about which rung the child belongs on
    localStorage.setItem('difficulty', 'hard');
    localStorage.setItem('grade', '3');
    localStorage.setItem(EASED_KEY, 'true');
    finishRoundAt(0, 40);

    expect(TestBed.inject(ProgressService).getHistory()[0].difficulty).toBeUndefined();
  });

  it('clears the mark, so the next round records its own setting again', () => {
    localStorage.setItem('difficulty', 'hard');
    localStorage.setItem(EASED_KEY, 'true');
    finishRoundAt(0, 40);

    expect(localStorage.getItem(EASED_KEY)).toBeNull();
  });

  it('records no setting rather than a wrong one when none was chosen', () => {
    finishRoundAt(0, 40);

    expect(TestBed.inject(ProgressService).getHistory()[0].difficulty).toBeUndefined();
  });

  it('offers a way to the character, on every round', () => {
    // It was reachable only from an unlabelled circle in the header: findable
    // by anyone using a screen reader, invisible to everyone else
    finishRoundAt(0, 50);

    const door = fixture.nativeElement.querySelector('.see-character');
    expect(door).toBeTruthy();
    expect(door.textContent.trim().length).toBeGreaterThan(0);
  });

  it('goes to the character when it is taken', () => {
    finishRoundAt(0, 50);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture.nativeElement.querySelector('.see-character').click();

    expect(router.navigate).toHaveBeenCalledWith(['/avatar']);
  });

  it('says put it on when the round actually handed something over', () => {
    // The screen says "Unlocked: Cap" and then, until now, offered no way to
    // go and wear it
    finishRoundAt(xpToReach(2) - ROUND_COMPLETION_XP, 0);

    expect(component.unlocked.length).toBeGreaterThan(0);
    expect(component.justEarnedSomething).toBe(true);
    expect(fixture.nativeElement.querySelector('.see-character.earned')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.see-character').textContent)
      .toContain(component.languageService.translate('put-it-on'));
  });

  it('is quieter on a round that handed nothing over', () => {
    // "Handed nothing over" has to be arranged, not assumed. Finishing a round
    // while a seasonal event is on wins the event's item whatever the score,
    // so on about forty-five days of the year this round DOES hand something
    // over — and this test, written on an ordinary day, would have gone red
    // every winter, spring and autumn for nobody's mistake. Claiming the
    // events first makes the premise true on all 365.
    SEASONAL_EVENTS.forEach(event => progress.earnEvent(event.id));

    finishRoundAt(0, 50);

    expect(component.justEarnedSomething).toBe(false);
    expect(fixture.nativeElement.querySelector('.see-character.earned')).toBeNull();
    expect(fixture.nativeElement.querySelector('.see-character').textContent)
      .toContain(component.languageService.translate('your-character'));
  });

  it('says nothing about items on a level that hands none over', () => {
    // Derived, not written down: a level that wins nothing today may win
    // something tomorrow, and this test must not silently stop testing
    const winning = new Set(levelItems().map(item => item.unlockLevel));
    const barren = [5, 11, 13, 15, 17].find(level => !winning.has(level))!;
    expect(barren).toBeDefined();

    // The level up still shows; the reward line does not
    finishRoundAt(xpToReach(barren) - 5, 100);

    expect(component.leveledUp).toBe(true);
    expect(component.unlocked).toEqual([]);
    expect(fixture.nativeElement.querySelector('.unlocked')).toBeNull();
    expect(fixture.nativeElement.querySelector('.level-up')).toBeTruthy();
  });

  it('hands over everything a big round crossed, not only the last level', () => {
    // Sitting at the very top of level 1 with a perfect round: the round is
    // worth more than the single level in front of it
    const justBelowTwo = xpToReach(2) - 1;
    finishRoundAt(justBelowTwo, 100);

    expect(component.level.level).toBeGreaterThanOrEqual(2);
    expect(component.unlocked.length).toBeGreaterThanOrEqual(1);
    component.unlocked.forEach(item => {
      expect(item.unlockLevel).toBeLessThanOrEqual(component.level.level);
    });
  });

  it('mentions no reward at all on a round that crossed nothing', () => {
    finishRoundAt(xpToReach(3), 50);

    expect(component.leveledUp).toBe(false);
    expect(component.unlocked).toEqual([]);
  });
});

describe('ResultComponent and seasonal events', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let progress: ProgressService;

  function finishRoundOn(date: Date) {
    jasmine.clock().mockDate(date);
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: 8, percentage: 80
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    jasmine.clock().install();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('says nothing about events on an ordinary day', () => {
    finishRoundOn(new Date(2026, 8, 22));

    expect(component.eventItem).toBeUndefined();
    expect(component.eventJustEarned).toBe(false);
    expect(fixture.nativeElement.querySelector('.event-earned')).toBeNull();
    expect(progress.getEarnedEvents()).toEqual([]);
  });

  it('hands over the item for a round played while an event is on', () => {
    finishRoundOn(new Date(2026, 2, 25));

    expect(component.eventItem!.event).toBe('spring');
    expect(component.eventJustEarned).toBe(true);
    expect(progress.getEarnedEvents()).toEqual(['spring']);
    expect(fixture.nativeElement.querySelector('.event-earned').textContent)
      .toContain('Flower shirt');
  });

  it('announces it once, not on every round of the event', () => {
    progress.earnEvent('spring');

    finishRoundOn(new Date(2026, 2, 25));

    // Still theirs, but the celebration was last time
    expect(component.eventItem!.event).toBe('spring');
    expect(component.eventJustEarned).toBe(false);
    expect(fixture.nativeElement.querySelector('.event-earned')).toBeNull();
  });

  it('earns it for a bad round too — being there is the whole requirement', () => {
    jasmine.clock().mockDate(new Date(2026, 9, 31));
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 0, total: 10, correctAnswers: 0, percentage: 0
    });
    fixture = TestBed.createComponent(ResultComponent);
    fixture.detectChanges();

    expect(progress.getEarnedEvents()).toEqual(['autumn']);
  });

  it('works across the year end, where the window wraps', () => {
    finishRoundOn(new Date(2027, 0, 2));

    expect(progress.getEarnedEvents()).toEqual(['winter']);
  });
});

describe('ResultComponent showing a round that was never seen', () => {
  let fixture: ComponentFixture<ResultComponent>;
  let component: ResultComponent;
  let progress: ProgressService;
  let router: Router;

  /** Plays a round through the screen, exactly as finishing one does. */
  function finish(percentage = 80) {
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: Math.round(percentage / 10), percentage
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  }

  /** Comes back to the screen with nothing in memory, as a reload does. */
  function reopen() {
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: 0, total: 0, correctAnswers: 0, percentage: NaN
    });
    fixture = TestBed.createComponent(ResultComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
    return component;
  }

  const stored = () => JSON.parse(localStorage.getItem('result:guest') || 'null');

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  it('writes the result down when the round finishes', () => {
    finish(80);

    expect(stored().total).toBe(10);
    expect(stored().correctAnswers).toBe(8);
    expect(stored().percentage).toBe(80);
    expect(stored().seen).toBe(true);
  });

  it('shows it again to a child who never got to see it', () => {
    finish(80);
    const banked = stored();
    banked.seen = false;
    localStorage.setItem('result:guest', JSON.stringify(banked));
    TestBed.resetTestingModule();

    // A fresh screen with nothing behind it, which is what a reload is
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    reopen();

    expect(component.showingAgain).toBe(true);
    expect(component.total).toBe(10);
    expect(component.correctAnswers).toBe(8);
    expect(component.percentage).toBe(80);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('PAYS FOR THE ROUND ONCE, however many times the screen is shown', () => {
    // The whole risk of this feature in one test: the round was banked when
    // it finished, so showing it again must add nothing at all
    finish(80);
    const afterFirst = {
      history: progress.getHistory().length,
      xp: progress.getXp(),
      totals: JSON.stringify(progress.getTotals()),
      keepsakes: JSON.stringify(progress.getKeepsakes()),
      events: JSON.stringify(progress.getEarnedEvents())
    };

    const banked = stored();
    banked.seen = false;
    localStorage.setItem('result:guest', JSON.stringify(banked));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    reopen();
    const after = TestBed.inject(ProgressService);

    expect(after.getHistory().length).toBe(afterFirst.history);
    expect(after.getXp()).toBe(afterFirst.xp);
    expect(JSON.stringify(after.getTotals())).toBe(afterFirst.totals);
    expect(JSON.stringify(after.getKeepsakes())).toBe(afterFirst.keepsakes);
    expect(JSON.stringify(after.getEarnedEvents())).toBe(afterFirst.events);
  });

  it('marks it read, so nothing offers it back again', () => {
    finish(80);
    const banked = stored();
    banked.seen = false;
    localStorage.setItem('result:guest', JSON.stringify(banked));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    reopen();

    expect(stored().seen).toBe(true);
  });

  it('never asks a returning child for an account', () => {
    // The offer belongs to the moment a round is finished. An hour later, on
    // a screen they are seeing because something interrupted them, it is an
    // ambush rather than an offer.
    finish(80);
    const banked = stored();
    banked.seen = false;
    banked.roundsPlayed = 9;
    localStorage.setItem('result:guest', JSON.stringify(banked));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    reopen();

    expect(component.showKeepOffer).toBe(false);
  });

  it('goes back to the grades when there is nothing to show at all', () => {
    reopen();

    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('writes no round of nothing into the history on the way', () => {
    // It used to render NaN% and record a round with no questions in it
    reopen();

    expect(progress.getHistory().length).toBe(0);
    expect(component.percentage).toBe(0);
  });

  it('goes back to the grades when the result has aged out', () => {
    finish(80);
    const banked = stored();
    banked.seen = false;
    banked.savedAt = Date.now() - (RESULT_WINDOW_MS + 60000);
    localStorage.setItem('result:guest', JSON.stringify(banked));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    });
    reopen();

    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('forgets the result when the child chooses to play again', () => {
    finish(80);
    TestBed.inject(Router);
    spyOn(TestBed.inject(Router), 'navigate');

    component.playAgain();

    expect(stored()).toBeNull();
  });
});

/**
 * The other half of the offer above: it promises a child's progress is theirs
 * on another phone, and this is where that promise is kept or broken. Its own
 * describe because who is signed in has to be in storage BEFORE the services
 * wake up and read it, which is also how it happens in the real app.
 */
describe('ResultComponent sending a finished round to the account', () => {
  let scoreService: ScoreService;
  let http: HttpTestingController;

  function render() {
    spyOn(scoreService, 'getFinalScore').and.returnValue({
      score: 20, total: 10, correctAnswers: 9, percentage: 90
    });
    const fixture = TestBed.createComponent(ResultComponent);
    fixture.detectChanges();
    return fixture;
  }

  async function signedInAs(username: string | null) {
    localStorage.clear();
    if (username) {
      localStorage.setItem('username', username);
      localStorage.setItem('token', 'a-token');
    }
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    scoreService = TestBed.inject(ScoreService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => localStorage.clear());

  it('sends it, so it is there on the child\'s other device', async () => {
    await signedInAs('ada');

    render();

    const pushed = http.expectOne(request => request.method === 'PUT');
    expect(pushed.request.url).toContain('/api/progress');
    expect(pushed.request.body.progress.roundHistory.length).toBe(1);
    expect(pushed.request.headers.get('Authorization')).toBe('Bearer a-token');
    pushed.flush({ updatedAt: 'now' });
  });

  it('sends nothing for a guest, because there is nowhere to send it', async () => {
    await signedInAs(null);
    TestBed.inject(AuthService).playAsGuest();

    render();

    http.verify();
  });

  it('shows the score even when the account cannot be reached', async () => {
    await signedInAs('ada');

    const fixture = render();
    http.expectOne(request => request.method === 'PUT').error(new ErrorEvent('offline'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.score-card')).toBeTruthy();
    expect(fixture.componentInstance.percentage).toBe(90);
  });
});

describe('ResultComponent: the end of a round is a reward, not a report', () => {
  let fixture: ComponentFixture<ResultComponent>;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('guest', 'true');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ResultComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    localStorage.clear();
  });

  function finishAt(correctAnswers: number) {
    spyOn(TestBed.inject(ScoreService), 'getFinalScore').and.returnValue({
      score: correctAnswers * 2, total: 10, correctAnswers, percentage: correctAnswers * 10
    });
    fixture = TestBed.createComponent(ResultComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('never shows the words of a test: no quiz, no accuracy, no score table', () => {
    const page = finishAt(6).textContent!.toLowerCase();
    for (const word of ['quiz', 'accuracy', 'your score', 'total score', 'bonus', '%']) {
      expect(page).not.toContain(word);
    }
    expect(page).not.toContain('6/10');
  });

  it('praises the work in the headline, even for a round with no stars', () => {
    const page = finishAt(2);
    const component = fixture.componentInstance;
    expect(component.starsEarned).toBe(0);
    expect(page.querySelector('h1')!.textContent).toBe(component.languageService.translate('praise-0'));
  });

  it('says how many the child got right, and what it paid', () => {
    const page = finishAt(8);
    const tiles = Array.from(page.querySelectorAll('.tile'));
    expect(tiles.map(tile => tile.getAttribute('data-kind'))).toEqual(['right', 'xp']);
    expect(tiles[0].textContent).toContain('8');
    expect(tiles[1].textContent).toContain('+' + fixture.componentInstance.xpEarned);
  });

  it('draws the child\u2019s own character at the centre of it, large', () => {
    const page = finishAt(9);
    const hero = page.querySelector('.hero .ring app-avatar') as HTMLElement & { size?: number };
    expect(hero).toBeTruthy();
    // Bound as a property on the (undeclared, in this spec) avatar element
    expect(hero.size).toBeGreaterThanOrEqual(96);
  });

  it('draws three stars and fills in the ones earned', () => {
    spyOn(window, 'matchMedia').and.callFake(query =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    const page = finishAt(8);
    fixture.detectChanges();
    const stars = Array.from(page.querySelectorAll('.stars .star'));
    expect(stars.length).toBe(3);
    expect(stars.filter(star => star.classList.contains('earned')).length).toBe(2);
  });

  it('shows everything at once under reduced motion', () => {
    spyOn(window, 'matchMedia').and.callFake(query =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    const page = finishAt(10);
    fixture.detectChanges();
    expect(fixture.componentInstance.starsShown).toBe(3);
    const tiles = Array.from(page.querySelectorAll('.tile'));
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every(tile => tile.classList.contains('shown'))).toBe(true);
  });

  it('rings each star as it lands, a step higher each time, then plays the round\u2019s tune', () => {
    const sound = TestBed.inject(SoundService);
    const heard: string[] = [];
    spyOn(sound, 'playStar').and.callFake((step: number) => { heard.push('star' + step); });
    spyOn(sound, 'playRoundDone').and.callFake(() => { heard.push('done'); });
    spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
    jasmine.clock().install();
    try {
      finishAt(10);
      expect(heard).toEqual([]);
      jasmine.clock().tick(STAR_STEP_MS);
      expect(heard).toEqual(['star0']);
      jasmine.clock().tick(STAR_STEP_MS * 2);
      expect(heard).toEqual(['star0', 'star1', 'star2']);
      jasmine.clock().tick(ROUND_TUNE_AFTER_STARS_MS - 1);
      expect(heard).toEqual(['star0', 'star1', 'star2']);
      jasmine.clock().tick(1);
      expect(heard).toEqual(['star0', 'star1', 'star2', 'done']);
      jasmine.clock().tick(5000);
      expect(heard.length).toBe(4);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('plays the round\u2019s tune straight away after a round with no stars: the work is praised whatever', () => {
    const sound = TestBed.inject(SoundService);
    const star = spyOn(sound, 'playStar');
    const done = spyOn(sound, 'playRoundDone');
    spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
    jasmine.clock().install();
    try {
      finishAt(2);
      jasmine.clock().tick(0);
      expect(done).toHaveBeenCalledTimes(1);
      jasmine.clock().tick(5000);
      expect(star).not.toHaveBeenCalled();
      expect(done).toHaveBeenCalledTimes(1);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('makes the character hop for joy as the round\u2019s tune plays, and not before', () => {
    spyOn(TestBed.inject(SoundService), 'playRoundDone');
    spyOn(window, 'matchMedia').and.callFake(() => ({ matches: false } as MediaQueryList));
    jasmine.clock().install();
    try {
      finishAt(10);
      jasmine.clock().tick(STAR_STEP_MS * 3 + ROUND_TUNE_AFTER_STARS_MS - 1);
      expect(fixture.componentInstance.hopping).toBeFalse();
      jasmine.clock().tick(1);
      expect(fixture.componentInstance.hopping).toBeTrue();
      fixture.detectChanges();
      // Bound as a property on the (undeclared, in this spec) avatar element
      const hero = fixture.nativeElement.querySelector('.hero .ring app-avatar') as HTMLElement & { hop?: boolean };
      expect(hero.hop).toBeTrue();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('does not make the character hop under reduced motion', () => {
    spyOn(window, 'matchMedia').and.callFake(query =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    finishAt(10);
    expect(fixture.componentInstance.hopping).toBeFalse();
  });

  it('plays just the tune, once, under reduced motion', () => {
    const sound = TestBed.inject(SoundService);
    const star = spyOn(sound, 'playStar');
    const done = spyOn(sound, 'playRoundDone');
    spyOn(window, 'matchMedia').and.callFake(query =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    finishAt(10);
    expect(done).toHaveBeenCalledTimes(1);
    expect(star).not.toHaveBeenCalled();
  });

  it('fills in over time otherwise, and the buttons work before it has', () => {
    jasmine.clock().install();
    try {
      const page = finishAt(10);
      expect(fixture.componentInstance.tilesShown).toBe(0);
      expect((page.querySelector('.play-again') as HTMLButtonElement).disabled).toBe(false);

      jasmine.clock().tick(2000);
      fixture.detectChanges();
      expect(fixture.componentInstance.starsShown).toBe(3);
      expect(fixture.componentInstance.tilesShown).toBe(fixture.componentInstance.tiles.length);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
