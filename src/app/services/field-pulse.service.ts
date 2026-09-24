import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/** Where a tap landed, in CSS pixels from the top-left of the window. */
export interface TapPoint {
  x: number;
  y: number;
}

/**
 * Lets the game tell the backdrop that something happened, without the
 * question screen knowing anything about particles.
 *
 * It speaks two vocabularies, and keeping them apart is the point. A PULSE
 * swells the whole field and is kept for what earns it: a correct answer, a
 * streak, a finished round. A TAP answers a touch where the finger is, and
 * nowhere else.
 *
 * This used to say the field was deliberately not fired on every tap,
 * because a celebration for a trivial action stops meaning anything. That
 * reasoning still holds, and it is why a tap is NOT a small pulse: it never
 * reaches the ring, it is local and over in 300ms, while the surge stays
 * rare and full-field. Yobyn asked for the field to answer a tap (2026-09-23);
 * two vocabularies is how that is done without spending the reward.
 */
@Injectable({
  providedIn: 'root'
})
export class FieldPulseService {
  private pulses = new Subject<number>();
  private taps = new Subject<TapPoint>();

  /** @param strength 0 to 1, clamped. */
  pulse(strength: number) {
    this.pulses.next(Math.min(1, Math.max(0, strength)));
  }

  get pulses$(): Observable<number> {
    return this.pulses.asObservable();
  }

  /** A tap at (x, y). Points that are not finite numbers are dropped. */
  tap(x: number, y: number) {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      this.taps.next({ x, y });
    }
  }

  get taps$(): Observable<TapPoint> {
    return this.taps.asObservable();
  }
}
