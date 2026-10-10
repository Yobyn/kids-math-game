import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AVATAR_KEY, Avatar, Family, defaultAvatar, hatchlingFor, normaliseAvatar } from '../avatar/avatar-model';
import { GUEST_OWNER, ProgressService, accountOwner } from './progress.service';
import { levelForXp } from '../levels/level-curve';

/**
 * The child's character, filed per player exactly as their progress is: two
 * children on one tablet each keep their own, and a guest's carries into the
 * account they sign up for rather than being left behind.
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private subject: BehaviorSubject<Avatar>;

  constructor(private progressService: ProgressService) {
    this.subject = new BehaviorSubject<Avatar>(this.read(this.currentOwner()));
  }

  /**
   * What the child has earned with this kind of character, which decides
   * the stage it is at and what it may wear: each family climbs on its own.
   */
  private level(family: Family): number {
    return levelForXp(this.progressService.getXp(family));
  }

  /** Normalised at the level of the family it is, not the one it was. */
  private clean(raw: any): Avatar {
    return normaliseAvatar(raw, this.level(normaliseAvatar(raw).family), this.earned());
  }

  /** Events they were here for, which decide the rest of it. */
  private earned(): string[] {
    return this.progressService.getEarnedEvents();
  }

  get(): Avatar {
    return this.subject.value;
  }

  changes(): Observable<Avatar> {
    return this.subject.asObservable();
  }

  save(avatar: Avatar): void {
    const clean = this.clean(avatar);
    this.write(this.currentOwner(), clean);
    this.subject.next(clean);
  }

  /** Re-reads from storage — used when the player changes under us. */
  refresh(): void {
    this.subject.next(this.read(this.currentOwner()));
  }

  /** True once a child has made the character theirs. */
  hasChosen(): boolean {
    return this.stored(this.currentOwner()) !== null;
  }

  /**
   * Moves a guest's character into the account they have just made. A child
   * who spent time on their character before signing up must not meet a
   * stranger afterwards.
   */
  adoptGuestAvatar(username: string): void {
    const guest = this.stored(GUEST_OWNER);
    if (guest === null) {
      return;
    }

    const owner = accountOwner(username);
    // An account that already has a character keeps it; the guest's is only
    // taken when there is nothing of their own to overwrite.
    if (this.stored(owner) === null) {
      this.write(owner, this.clean(guest));
    }
    this.remove(this.key(GUEST_OWNER));
    this.refresh();
  }

  /**
   * The stored character, or null when this player has never chosen one.
   * For syncing: a device with no character of its own is the case where
   * taking the account's is right.
   */
  exportAvatar(): any {
    return this.stored(this.currentOwner());
  }

  /**
   * Takes a character that came back from the account. Only ever called with
   * the result of a merge that already decided this device has none of its
   * own — see synced-progress.ts.
   */
  importAvatar(avatar: any): void {
    if (avatar === null || avatar === undefined) {
      return;
    }
    this.write(this.currentOwner(), this.clean(avatar));
    this.refresh();
  }

  private currentOwner(): string {
    try {
      const username = localStorage.getItem('username');
      return username ? accountOwner(username) : GUEST_OWNER;
    } catch {
      return GUEST_OWNER;
    }
  }

  private key(owner: string): string {
    return `${AVATAR_KEY}:${owner}`;
  }

  private read(owner: string): Avatar {
    const stored = this.stored(owner);
    // Never chosen is the default character, at the stage this level has earned
    const avatar = this.clean(stored === null ? defaultAvatar() : stored);
    // The pet their egg hatches into: picked for this child, and kept from the first save
    return avatar.hatchling ? avatar : { ...avatar, hatchling: hatchlingFor(owner) };
  }

  /** The raw stored object, or null when this player has never chosen. */
  private stored(owner: string): any {
    try {
      const raw = localStorage.getItem(this.key(owner));
      return raw ? JSON.parse(raw) : null;
    } catch {
      // Corrupt or unreadable storage reads as "never chosen"
      return null;
    }
  }

  private write(owner: string, avatar: Avatar): void {
    try {
      localStorage.setItem(this.key(owner), JSON.stringify(avatar));
    } catch {
      // A character that cannot be saved is still worth drawing this session
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to clean up if storage is unavailable
    }
  }
}
