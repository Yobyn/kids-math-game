import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Lets the game tell the backdrop that something worth noticing happened,
 * without the question screen knowing anything about particles.
 *
 * Deliberately not fired on every tap: motion guidance is consistent that a
 * celebration for a trivial action stops meaning anything. A correct answer,
 * a streak and a finished round are the three that earn it.
 */
@Injectable({
  providedIn: 'root'
})
export class FieldPulseService {
  private pulses = new Subject<number>();

  /** @param strength 0 to 1, clamped. */
  pulse(strength: number) {
    this.pulses.next(Math.min(1, Math.max(0, strength)));
  }

  get pulses$(): Observable<number> {
    return this.pulses.asObservable();
  }
}
