import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ProgressService } from './progress.service';

describe('AuthService guest play', () => {
  let http: HttpTestingController;

  function makeService(): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('starts as neither a guest nor an account', () => {
    const service = makeService();

    expect(service.isGuest()).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
    expect(service.canPlay()).toBe(false);
  });

  it('lets a child play once they choose to play as a guest', () => {
    const service = makeService();

    service.playAsGuest();

    expect(service.isGuest()).toBe(true);
    expect(service.canPlay()).toBe(true);
  });

  it('remembers a guest across a reload so a round survives a refresh', () => {
    makeService().playAsGuest();

    expect(makeService().isGuest()).toBe(true);
  });

  it('publishes guest state to subscribers', () => {
    const service = makeService();
    const seen: boolean[] = [];
    service.isGuest$().subscribe(value => seen.push(value));

    service.playAsGuest();
    service.endGuest();

    expect(seen).toEqual([false, true, false]);
  });

  it('stops being a guest once an account signs in', () => {
    const service = makeService();
    service.playAsGuest();

    service.login('ada', 'secret123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/login').flush({ token: 'tok' });

    expect(service.isGuest()).toBe(false);
    expect(service.isLoggedIn()).toBe(true);
    expect(service.canPlay()).toBe(true);
  });

  it('stops being a guest once an account registers', () => {
    const service = makeService();
    service.playAsGuest();

    service.register('ada', 'secret123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/register').flush({ token: 'tok' });

    expect(service.isGuest()).toBe(false);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('drops both the account and the guest flag on logout', () => {
    const service = makeService();
    service.playAsGuest();
    service.login('ada', 'secret123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/login').flush({ token: 'tok' });

    service.logout();

    expect(service.canPlay()).toBe(false);
    expect(localStorage.getItem('guest')).toBeNull();
  });

  it('treats a junk guest flag as not a guest', () => {
    localStorage.setItem('guest', 'maybe');

    expect(makeService().isGuest()).toBe(false);
  });

  it('still lets a guest play when storage is unavailable', () => {
    const service = makeService();
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    service.playAsGuest();

    expect(service.isGuest()).toBe(true);
  });
});

describe('AuthService carrying guest progress', () => {
  let http: HttpTestingController;
  let service: AuthService;
  let progress: ProgressService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
    progress = TestBed.inject(ProgressService);
  });

  afterEach(() => localStorage.clear());

  function signUp(username: string) {
    service.register(username, 'secret123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/register').flush({ token: 'tok' });
  }

  it('carries what a guest earned into their new account', () => {
    service.playAsGuest();
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 21, grade: 2 });

    signUp('ada');

    expect(progress.getRoundsPlayed()).toBe(1);
    expect(progress.getBestPercentage()).toBe(90);
  });

  it('does not hand a returning account the last guest’s rounds', () => {
    progress.record({ correctAnswers: 3, total: 10, percentage: 30, score: 5, grade: 1 });
    // No playAsGuest() — this is someone signing in on a device a guest used
    service.login('ada', 'secret123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/login').flush({ token: 'tok' });

    expect(progress.getRoundsPlayed()).toBe(0);
    expect(progress.hasGuestProgress()).toBe(true);
  });

  it('leaves the guest slot empty after a signup so the next child starts clean', () => {
    service.playAsGuest();
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 21, grade: 2 });

    signUp('ada');
    service.logout();

    expect(progress.getRoundsPlayed()).toBe(0);
  });
});
