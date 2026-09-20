import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const STORAGE_KEY = 'soundEnabled';

/**
 * Central switch for the game's sound effects and haptics, so a child can play
 * in a classroom or next to a sleeping sibling without the tablet buzzing.
 */
@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private enabled = new BehaviorSubject<boolean>(this.readStoredPreference());

  isEnabled(): Observable<boolean> {
    return this.enabled.asObservable();
  }

  get enabledValue(): boolean {
    return this.enabled.value;
  }

  toggle() {
    const next = !this.enabled.value;
    this.enabled.next(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    // Confirm the tap itself, otherwise switching sound back on gives no feedback
    if (next) {
      this.vibrate(15);
    }
  }

  playSuccess() {
    this.play('assets/sounds/success.mp3', 0.5);
  }

  playError() {
    this.play('assets/sounds/error.mp3', 0.3);
  }

  vibrate(pattern: number | number[]) {
    if (!this.enabled.value) {
      return;
    }
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === 'function') {
      nav.vibrate(pattern);
    }
  }

  private play(source: string, volume: number) {
    if (!this.enabled.value) {
      return;
    }
    const audio = new Audio(source);
    audio.volume = volume;
    audio.play().catch(() => {}); // Ignore errors if sound can't play
  }

  private readStoredPreference(): boolean {
    // Sound is on by default; only an explicit 'false' turns it off
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  }
}
