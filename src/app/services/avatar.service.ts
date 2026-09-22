import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Avatar, defaultAvatar, normaliseAvatar } from '../avatar/avatar-model';
import { GUEST_OWNER, accountOwner } from './progress.service';

const AVATAR_KEY = 'avatar';

/**
 * The child's character, filed per player exactly as their progress is: two
 * children on one tablet each keep their own, and a guest's carries into the
 * account they sign up for rather than being left behind.
 */
@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private subject = new BehaviorSubject<Avatar>(this.read(this.currentOwner()));

  get(): Avatar {
    return this.subject.value;
  }

  changes(): Observable<Avatar> {
    return this.subject.asObservable();
  }

  save(avatar: Avatar): void {
    const clean = normaliseAvatar(avatar);
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
      this.write(owner, normaliseAvatar(guest));
    }
    this.remove(this.key(GUEST_OWNER));
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
    return stored === null ? defaultAvatar() : normaliseAvatar(stored);
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
