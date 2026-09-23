import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProgressSyncService } from './progress-sync.service';
import { ProgressService, accountOwner } from './progress.service';
import { AvatarService } from './avatar.service';
import { AuthService } from './auth.service';
import { SyncedProgress } from './synced-progress';

const API = 'http://localhost:3000/api/progress';

/** Signs somebody in the way the rest of the app reads it. */
function signIn(username: string): void {
  localStorage.setItem('token', 'a-token');
  localStorage.setItem('username', username);
}

function round(date: string): any {
  return { date, correctAnswers: 5, total: 10, percentage: 50, score: 50, grade: 1 };
}

describe('ProgressSyncService', () => {
  let sync: ProgressSyncService;
  let http: HttpTestingController;
  let progress: ProgressService;
  let avatars: AvatarService;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
  });

  /** Built after storage is set up, since services read it as they wake. */
  function build(): void {
    sync = TestBed.inject(ProgressSyncService);
    http = TestBed.inject(HttpTestingController);
    progress = TestBed.inject(ProgressService);
    avatars = TestBed.inject(AvatarService);
    auth = TestBed.inject(AuthService);
  }

  afterEach(() => {
    if (http) {
      http.verify();
    }
    localStorage.clear();
  });

  it('a new device gets back what the child earned on the old one', () => {
    signIn('sam');
    build();

    const gained: boolean[] = [];
    sync.pull().subscribe(result => gained.push(result));

    const request = http.expectOne(API);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer a-token');
    request.flush({
      progress: {
        version: 1,
        xp: 600,
        roundHistory: [round('2026-09-22T10:00:00.000Z')],
        totals: { rounds: 12, questions: 120, correct: 90 },
        events: [{ id: 'harvest' }],
        keepsakes: [{ id: 'acorn' }],
        avatar: { hat: 'crown' }
      } as SyncedProgress,
      updatedAt: '2026-09-22T10:00:01.000Z'
    });

    expect(gained).toEqual([true]);
    expect(progress.getXp()).toBe(600);
    expect(progress.getHistory().length).toBe(1);
    expect(progress.getTotals().rounds).toBe(12);
    expect(progress.getKeepsakes().map(k => k.id)).toEqual(['acorn']);
    // Nothing owed back: the account already has everything this device does
    http.verify();
  });

  it('sends this device\'s rounds to an account that has never seen them', () => {
    signIn('sam');
    build();
    progress.record({ correctAnswers: 5, total: 10, percentage: 50, score: 50, grade: 1 });

    sync.pull().subscribe();

    http.expectOne(API).flush({ progress: null, updatedAt: null });

    const pushed = http.expectOne(request => request.method === 'PUT');
    expect(pushed.request.body.progress.roundHistory.length).toBe(1);
    expect(pushed.request.headers.get('Authorization')).toBe('Bearer a-token');
    pushed.flush({ updatedAt: 'now' });
  });

  it('makes no request at all when neither side has anything', () => {
    signIn('sam');
    build();

    sync.pull().subscribe();

    http.expectOne(API).flush({ progress: null, updatedAt: null });
    // No PUT: there is nothing to say
    http.verify();
  });

  it('a pull never takes anything away from this device', () => {
    signIn('sam');
    build();
    progress.record({ correctAnswers: 9, total: 10, percentage: 90, score: 90, grade: 3 });
    progress.addXp(600);

    sync.pull().subscribe();
    http.expectOne(API).flush({ progress: { version: 1, xp: 10 }, updatedAt: 'then' });

    expect(progress.getXp()).toBe(600);
    expect(progress.getHistory().length).toBe(1);
    http.expectOne(request => request.method === 'PUT').flush({ updatedAt: 'now' });
  });

  it('a guest never syncs, because there is no account to sync with', () => {
    build();

    const pushed: boolean[] = [];
    sync.push().subscribe(result => pushed.push(result));
    sync.pull().subscribe();

    expect(pushed).toEqual([false]);
    http.verify();
  });

  it('a server that cannot be reached never stops the game', () => {
    signIn('sam');
    build();
    progress.addXp(240);

    const gained: boolean[] = [];
    const pushed: boolean[] = [];
    sync.pull().subscribe(result => gained.push(result));
    http.expectOne(API).error(new ErrorEvent('offline'));

    sync.push().subscribe(result => pushed.push(result));
    http.expectOne(request => request.method === 'PUT').error(new ErrorEvent('offline'));

    expect(gained).toEqual([false]);
    expect(pushed).toEqual([false]);
    // And the child still has everything they had
    expect(progress.getXp()).toBe(240);
  });

  it('sends nothing a child would not want sent', () => {
    signIn('sam');
    build();
    progress.recordMissed({ num1: 8, num2: 7, operation: '+' });
    progress.addXp(240);

    sync.push().subscribe();

    const pushed = http.expectOne(request => request.method === 'PUT');
    const body = pushed.request.body.progress;
    expect(body.xp).toBe(240);
    expect(body.missedFacts).toBeUndefined();
    expect(body.learned).toBeUndefined();
    expect(body.round).toBeUndefined();
    expect(body.result).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('operation');
    pushed.flush({ updatedAt: 'now' });
  });

  it('asks the account to forget, without touching this device', () => {
    signIn('sam');
    build();
    progress.addXp(240);

    const forgot: boolean[] = [];
    sync.forget().subscribe(result => forgot.push(result));

    const request = http.expectOne(API);
    expect(request.request.method).toBe('DELETE');
    request.flush({ deleted: true });

    expect(forgot).toEqual([true]);
    expect(progress.getXp()).toBe(240);
  });

  it('pulls once when a child signs in, and not again on every emission', () => {
    signIn('sam');
    build();

    sync.start();
    http.expectOne(API).flush({ progress: null, updatedAt: null });

    // Whatever else re-publishes the current player, one sign-in is one pull
    auth.endGuest();
    http.verify();
  });

  it('will not hand a child something they have not earned', () => {
    // A store edited by hand, or an account that lost experience somewhere,
    // must not be a way to arrive wearing a crown. Found by playing it: the
    // gate is real, and this is where it has to hold.
    signIn('sam');
    build();

    sync.pull().subscribe();
    http.expectOne(API).flush({
      progress: { version: 1, xp: 5, avatar: { hat: 'crown' } },
      updatedAt: 'then'
    });

    // Checked on what is WRITTEN, not on what is read back: reading applies
    // the gate again, so a read-side check would pass even if the crown had
    // been stored.
    expect(avatars.exportAvatar().hat).not.toBe('crown');
    expect(avatars.get().hat).not.toBe('crown');
  });

  it('gives a brand new device the character from the account', () => {
    signIn('sam');
    build();
    expect(localStorage.getItem(`avatar:${accountOwner('sam')}`)).toBeNull();

    sync.pull().subscribe();
    http.expectOne(API).flush({
      progress: { version: 1, xp: 5, avatar: { hat: 'crown' } },
      updatedAt: 'then'
    });

    expect(avatars.hasChosen()).toBe(true);
  });
});
