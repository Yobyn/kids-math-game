import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AvatarService } from './avatar.service';
import { ProgressService } from './progress.service';
import { SyncedProgress, addsTo, mergeSynced, worthSyncing } from './synced-progress';

interface PulledProgress {
  progress: SyncedProgress | null;
  updatedAt: string | null;
}

/**
 * Carries an account's progress between the devices it is played on.
 *
 * TWO THINGS ARE DELIBERATE AND NEITHER IS AN OVERSIGHT.
 *
 * First, EVERY FAILURE IS SILENT. A child on a train with no signal, or
 * playing against a server that is not running at all — which is the normal
 * case for anyone who opened the game without starting one — must not be
 * shown a network error, and must not be stopped from playing. The whole
 * feature is an improvement on top of a game that already works entirely on
 * the device, so when it cannot work, the game is simply the game.
 *
 * Second, THE DEVICE IS THE AUTHORITY. A pull merges into what is here and
 * writes the result back; it never replaces. The server holds a copy, and
 * merging in one place — see synced-progress.ts — is what keeps that copy
 * from ever being able to take something away.
 *
 * A guest syncs nothing: there is no account to sync with.
 */
@Injectable({
  providedIn: 'root'
})
export class ProgressSyncService {
  private apiUrl = 'http://localhost:3000/api/progress';
  /** So signing in twice in one session does not pull twice. */
  private pulledFor: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private progressService: ProgressService,
    private avatarService: AvatarService
  ) {}

  /**
   * Starts watching who is playing. Called once, from the root component:
   * signing in is the moment a new device has an account to ask, and it is
   * the moment that makes the difference between a new phone showing an
   * empty scrapbook and showing what the child earned.
   */
  start(): void {
    this.authService.getCurrentUser().subscribe(username => {
      if (!username) {
        this.pulledFor = null;
        return;
      }
      if (this.pulledFor === username) {
        return;
      }
      this.pulledFor = username;
      this.pull().subscribe();
    });
  }

  /**
   * Asks the account for what it has, merges it into this device, and sends
   * the result back when the merge added anything the account did not have.
   * Resolves to true when this device gained something.
   */
  pull(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    return this.http.get<PulledProgress>(this.apiUrl, { headers: this.authorised() }).pipe(
      switchMap(response => {
        const mine = this.collect();
        const theirs = response && response.progress;
        if (!worthSyncing(theirs) && !worthSyncing(mine)) {
          return of(false);
        }

        const merged = mergeSynced(mine, theirs);
        const gained = addsTo(merged, mine);
        if (gained) {
          this.apply(merged);
        }

        // The account has not seen this device's rounds until they are sent
        const owed = addsTo(merged, theirs);
        return owed ? this.send(merged).pipe(map(() => gained)) : of(gained);
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Sends what this device has. Called after a round: that is the moment
   * something new exists to keep, and it is once every couple of minutes at
   * the very most, so there is nothing here to throttle.
   */
  push(): Observable<boolean> {
    const mine = this.collect();
    if (!this.authService.isLoggedIn() || !mine || !worthSyncing(mine)) {
      return of(false);
    }
    return this.send(mine).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Forgets the account's copy. What is on this device is the child's and is
   * not deleted with it — an adult asking the server to forget is not asking
   * the child to lose their scrapbook.
   */
  forget(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }
    return this.http.delete<{ deleted: boolean }>(this.apiUrl, { headers: this.authorised() }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /** What this device has, character included. Null for a guest. */
  private collect(): SyncedProgress | null {
    const progress = this.progressService.exportSynced();
    if (!progress) {
      return null;
    }
    const avatar = this.avatarService.exportAvatar();
    return avatar === null ? progress : { ...progress, avatar };
  }

  private apply(merged: SyncedProgress): void {
    this.progressService.importSynced(merged);
    if (merged.avatar) {
      this.avatarService.importAvatar(merged.avatar);
    }
  }

  private send(progress: SyncedProgress): Observable<unknown> {
    return this.http.put(this.apiUrl, { progress }, { headers: this.authorised() });
  }

  private authorised(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.currentToken() || ''}` });
  }
}
