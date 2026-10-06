import { Component, NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { PreloadGameScreens, routes } from './app-routing.module';

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
  /** The way into a round: there immediately. */
  const EAGER = ['login', 'grade', 'difficulty'];
  /** The round and its result: fetched on their own, but as soon as the app opens. */
  const PRELOADED = ['questions', 'result'];
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
    EAGER.concat(PRELOADED, LAZY).forEach(path => expect(find(path)).toBeTruthy());
    expect(find('')).toBeTruthy();
    expect(routes[routes.length - 1].path).toBe('**');
  });

  it('carries the way into a round in the first load', () => {
    EAGER.forEach(path => {
      expect(find(path)!.component).toBeTruthy();
      expect(find(path)!.loadChildren).toBeUndefined();
    });
  });

  it('fetches the round and its result as soon as the app opens, and only those, so a child never waits for them', () => {
    const strategy = new PreloadGameScreens();
    const preloaded = (path: string) => {
      let loaded = false;
      strategy.preload(find(path)!, () => {
        loaded = true;
        return of(null);
      }).subscribe();
      return loaded;
    };
    // The round, its result: fetched (and cached for offline) while the child is still choosing
    PRELOADED.forEach(path => {
      expect(find(path)!.loadChildren).withContext(path).toBeTruthy();
      expect(preloaded(path)).withContext(path).toBeTrue();
    });
    // Not the between-rounds screens: the dressing-up screen's 3D is not worth a child's data until they open it
    LAZY.forEach(path => expect(preloaded(path)).withContext(path).toBeFalse());
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
