import { Component, NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreloadingStrategy, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AppRoutingModule, PreloadGameScreens, routes } from './app-routing.module';
import { LOGIN_WORDS } from './login/login-words';
import { SELECT_WORDS } from './grade-select/select-words';

@Component({ template: '<router-outlet></router-outlet>' })
class HostComponent {}

/**
 * What the routing table actually does, rather than what it looks like.
 *
 * The split between what loads up front and what loads on demand is a
 * performance decision that is invisible in every other test here: a lazy
 * route that fails to load looks exactly like a lazy route nobody
 * navigated to. These navigate for real.
 */
describe('the routes, and which of them the first load carries', () => {
  /**
   * The way to play (title, grade, difficulty, the round, its result):
   * each fetched on its own, the one being opened first and the rest as soon
   * as it is up, so a child never waits for the next one.
   */
  const PRELOADED = ['login', 'grade', 'difficulty', 'questions', 'result'];
  /** A screen a child opens BETWEEN rounds: fetched when they open it. */
  const LAZY = ['register', 'avatar', 'progress', 'scrapbook', 'grown-ups'];

  const find = (path: string) => routes.find(route => route.path === path);

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('guest', 'true');
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(routes), HttpClientTestingModule],
      declarations: [HostComponent]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('still has every screen it had before', () => {
    PRELOADED.concat(LAZY).forEach(path => expect(find(path)).toBeTruthy());
    expect(find('')).toBeTruthy();
    expect(routes[routes.length - 1].path).toBe('**');
  });

  it('keeps every screen out of the first load: each is fetched on its own', () => {
    // The first load is the frame round the screens, so it does not grow as they do
    routes.filter(route => route.path && route.path !== '**').forEach(route => {
      expect(route.loadChildren).withContext(route.path!).toBeTruthy();
      expect(route.component).withContext(route.path!).toBeUndefined();
    });
  });

  it('fetches the way to play as soon as the app opens, and only that, so a child never waits for it', () => {
    const strategy = new PreloadGameScreens();
    const preloaded = (path: string) => {
      let loaded = false;
      strategy.preload(find(path)!, () => {
        loaded = true;
        return of(null);
      }).subscribe();
      return loaded;
    };
    // The title, grade and difficulty screens, the round, its result: fetched (and cached for offline) while the child is still choosing
    PRELOADED.forEach(path => {
      expect(find(path)!.loadChildren).withContext(path).toBeTruthy();
      expect(preloaded(path)).withContext(path).toBeTrue();
    });
    // Not the between-rounds screens: the dressing-up screen's 3D is not worth a child's data until they open it
    LAZY.forEach(path => expect(preloaded(path)).withContext(path).toBeFalse());
  });

  it('has the app\u2019s own router preload that way', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AppRoutingModule, HttpClientTestingModule] });
    expect(TestBed.inject(PreloadingStrategy) instanceof PreloadGameScreens).toBeTrue();
  });

  it('fetches the between-rounds screens when they are opened', () => {
    LAZY.forEach(path => {
      expect(find(path)!.loadChildren).toBeTruthy();
      expect(find(path)!.component).toBeUndefined();
    });
  });

  it('keeps the guard on every screen that had one', () => {
    // Going lazy must not quietly open a door
    ['grade', 'difficulty', 'questions', 'result', 'avatar', 'progress',
     'scrapbook', 'grown-ups'].forEach(path =>
      expect(find(path)!.canActivate).toBeTruthy());
  });

  describe('opening one of them', () => {
    let opened: ComponentFixture<HostComponent> | undefined;

    // A screen left open keeps running after its test: the dressing-up
    // screen's 3D stage would hold a WebGL context and keep drawing
    afterEach(() => {
      opened?.destroy();
      opened = undefined;
    });

    // Genuinely async, not fakeAsync: a lazy route is a real dynamic
    // import(), and fakeAsync cannot flush a promise webpack settles
    // outside the zone's timer queue — it reports the navigation as simply
    // never having happened.
    async function open(path: string) {
      const fixture = TestBed.createComponent(HostComponent);
      opened = fixture;
      const router = TestBed.inject(Router);
      const zone = TestBed.inject(NgZone);
      fixture.detectChanges();

      const arrived = await zone.run(() => router.navigateByUrl('/' + path));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      return { arrived, router, fixture };
    }

    it('really loads a round when a child starts one', async () => {
      // As a child arrives from the difficulty screen: with a grade and a difficulty chosen
      localStorage.setItem('grade', '1');
      localStorage.setItem('difficulty', 'easy');
      const { arrived, router, fixture } = await open('questions');

      expect(arrived).toBe(true);
      expect(router.url).toBe('/questions');
      expect(fixture.nativeElement.querySelector('.question-box')).toBeTruthy();
    });

    // Each in its own words, which come with it rather than in the first load
    const OPENING: Array<[string, string, string[]]> = [
      ['login', '.login-container, form, button', [LOGIN_WORDS.en['play-as-guest']]],
      ['grade', '.grade-card', [SELECT_WORDS.en['select-grade'], SELECT_WORDS.en['maths-for-grade']]],
      ['difficulty', '.difficulty-card, [role=button]', [SELECT_WORDS.en['select-difficulty'], SELECT_WORDS.en['climb-easy']]]
    ];
    OPENING.forEach(([path, selector, words]) => {
      it(`really loads /${path}, in its own words`, async () => {
        localStorage.setItem('language', 'en');
        if (path === 'login') {
          localStorage.removeItem('guest');
        }
        if (path === 'difficulty') {
          localStorage.setItem('grade', '3');
        }
        const { arrived, router, fixture } = await open(path);

        expect(arrived).toBe(true);
        expect(router.url).toBe('/' + path);
        expect(fixture.nativeElement.querySelector(selector)).withContext(path).toBeTruthy();
        const text = fixture.nativeElement.textContent;
        words.forEach(word => expect(text).withContext(path).toContain(word));
      });
    });

    it('really loads the result screen, which sends a child with no round behind it to the grades', async () => {
      const { arrived, router } = await open('result');

      // It arrived, and its own screen sent the child on: a module that failed to load would not have arrived
      expect(arrived).toBe(true);
      expect(router.url).toBe('/grade');
    });

    LAZY.forEach(path => {
      it(`really loads /${path} when a child goes there`, async () => {
        const { arrived, router, fixture } = await open(path);

        expect(arrived).toBe(true);
        expect(router.url).toBe('/' + path);
        // The module really produced a component, rather than resolving to
        // an empty outlet that would look the same to a passing assertion
        expect(fixture.nativeElement.textContent.trim().length).toBeGreaterThan(0);
      });
    });

    it('sends an unknown address to the grades, as it always did', async () => {
      const { router } = await open('nowhere');

      expect(router.url).toBe('/grade');
    });
  });
});
