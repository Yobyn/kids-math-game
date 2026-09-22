import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultComponent } from './result.component';
import { ScoreService } from '../services/score.service';
import { ProgressService } from '../services/progress.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { ROUND_COMPLETION_XP, xpForRound, xpToReach } from '../levels/level-curve';
import { NO_ITEM } from '../avatar/avatar-model';

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
    // Account progress still lives in localStorage, so it does NOT follow a
    // child to another device. The copy must not imply that it does.
    expect(body).not.toMatch(/another device|somewhere else|anywhere/i);
    expect(body).toContain('your own name');
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

  it('records no setting rather than a wrong one when none was chosen', () => {
    finishRoundAt(0, 40);

    expect(TestBed.inject(ProgressService).getHistory()[0].difficulty).toBeUndefined();
  });

  it('says nothing about items on a level that hands none over', () => {
    // Level 5 unlocks nothing; the level up still shows, the reward does not
    finishRoundAt(xpToReach(5) - 5, 100);

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
