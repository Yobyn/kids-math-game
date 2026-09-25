import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CHOICE_KEY, LEGACY_KEY, SoundChoice, SoundEvent, readChoice } from '../sound/sound-choice';

/** What plays the sounds: loaded later, so the first load carries only the choice. */
export interface SoundPlayer {
  play(choice: SoundChoice, event: SoundEvent, step?: number): void;
}

export type PlayerLoader = () => Promise<SoundPlayer>;

const loadEngine: PlayerLoader = () => import('../sound/sound-engine').then(m => new m.SoundEngine());

/**
 * The sounds a child has picked, and the game's one way to make a sound or a
 * buzz. A child picks a set of sounds — or none, to play in a classroom or
 * next to a sleeping sibling — from the header, and it is remembered.
 * "None" turns the haptics off too, as the old switch did.
 */
@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private choice = new BehaviorSubject<SoundChoice>(this.readStoredChoice());
  private player: Promise<SoundPlayer | null> | null = null;

  /** Swapped in tests; in the app it fetches the engine. */
  loader: PlayerLoader = loadEngine;

  /** The set picked, or 'off'. */
  choice$(): Observable<SoundChoice> {
    return this.choice.asObservable();
  }

  get choiceValue(): SoundChoice {
    return this.choice.value;
  }

  isEnabled(): Observable<boolean> {
    return this.choice$().pipe(map(choice => choice !== 'off'));
  }

  get enabledValue(): boolean {
    return this.choice.value !== 'off';
  }

  /** Picks a set (or none), remembers it, and plays it so the child hears what they picked. */
  choose(choice: SoundChoice) {
    this.choice.next(choice);
    try {
      localStorage.setItem(CHOICE_KEY, choice);
    } catch {
      // Kept for this visit only
    }
    if (choice !== 'off') {
      this.vibrate(15);
      this.play('correct');
    }
  }

  /** Fetches the engine ahead of the first sound, so that sound is not late. */
  preload(): Promise<boolean> {
    return this.engine().then(player => !!player);
  }

  playSuccess() {
    this.play('correct');
  }

  playError() {
    this.play('tryAgain');
  }

  playTap() {
    this.play('tap');
  }

  /** A star landing on the result screen: 0, 1 or 2, each a step higher. */
  playStar(step: number) {
    this.play('star', step);
  }

  playRoundDone() {
    this.play('roundDone');
  }

  vibrate(pattern: number | number[]) {
    if (!this.enabledValue) {
      return;
    }
    const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
    if (typeof nav.vibrate === 'function') {
      nav.vibrate(pattern);
    }
  }

  private play(event: SoundEvent, step = 0) {
    const choice = this.choice.value;
    if (choice === 'off') {
      return;
    }
    this.engine().then(player => player?.play(choice, event, step));
  }

  private engine(): Promise<SoundPlayer | null> {
    if (!this.player) {
      // A failed fetch (offline before it was ever cached) is a quiet game,
      // not a broken one; the next sound tries again
      this.player = this.loader().catch(() => {
        this.player = null;
        return null;
      });
    }
    return this.player;
  }

  private readStoredChoice(): SoundChoice {
    try {
      return readChoice(localStorage.getItem(CHOICE_KEY), localStorage.getItem(LEGACY_KEY));
    } catch {
      return readChoice(null, null);
    }
  }
}
