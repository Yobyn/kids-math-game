import { Component, NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { routes } from './app-routing.module';

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
  /** A route a child reaches while playing: it must be there immediately. */
  const EAGER = ['login', 'grade', 'difficulty', 'questions', 'result'];
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
    EAGER.concat(LAZY).forEach(path => expect(find(path)).toBeTruthy());
    expect(find('')).toBeTruthy();
    expect(routes[routes.length - 1].path).toBe('**');
  });

  it('carries the game itself in the first load', () => {
    // A child who is playing must never wait for a network fetch between
    // one question and the next
    EAGER.forEach(path => {
      expect(find(path)!.component).toBeTruthy();
      expect(find(path)!.loadChildren).toBeUndefined();
    });
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
    // Genuinely async, not fakeAsync: a lazy route is a real dynamic
    // import(), and fakeAsync cannot flush a promise webpack settles
    // outside the zone's timer queue — it reports the navigation as simply
    // never having happened.
    async function open(path: string) {
      const fixture = TestBed.createComponent(HostComponent);
      const router = TestBed.inject(Router);
      const zone = TestBed.inject(NgZone);
      fixture.detectChanges();

      const arrived = await zone.run(() => router.navigateByUrl('/' + path));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      return { arrived, router, fixture };
    }

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
