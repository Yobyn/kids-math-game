import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { angleAt, handsAt, hoursAt, minutesAt, nearerHand, onFace } from './clock-face';

/** A time on the clock: 3:45 is { hours: 3, minutes: 45 }. */
export interface ClockTime {
  hours: number;
  minutes: number;
}

/**
 * Zet de klok op 3:45 (Yobyn, 2026-11-25): the clock a child sets, the
 * other way round from reading one (clock-face.component.ts). A finger on
 * the face takes the nearer hand and turns it: the long hand to the minutes
 * (every 5, or every 1 in groep 5), the short hand to the hour, creeping on
 * with the minutes as a real one does. Each hand is a slider for the arrow
 * keys too. The time it shows is the question component's, which this only
 * asks to change (move), so a second try starts from where the hands were.
 */
@Component({
  selector: 'app-clock-set',
  templateUrl: './clock-set.component.html',
  styleUrls: ['./clock-set.component.css']
})
export class ClockSetComponent {
  @Input() hours = 12;
  @Input() minutes = 0;
  /** How far the long hand moves at a time: 5 minutes, or 1 for a time to the minute. */
  @Input() step = 5;
  @Input() disabled = false;
  @Input() label = '';
  /** "Sleep de wijzers": said under the clock until it is answered. */
  @Input() hint = '';
  @Input() bigLabel = '';
  @Input() smallLabel = '';
  @Output() move = new EventEmitter<ClockTime>();

  @ViewChild('face') face?: ElementRef<SVGSVGElement>;

  /** The hand a finger has hold of, while it is down. */
  holding: 'hour' | 'minute' | null = null;

  readonly numbers = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, ...onFace((i + 1) * 30, 36.5) }));
  readonly marks = Array.from({ length: 60 }, (_, i) => {
    const hour = i % 5 === 0;
    const outer = onFace(i * 6, 46.5);
    const inner = onFace(i * 6, hour ? 43 : 45);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, hour };
  });

  get hourAngle(): number {
    return handsAt(this.hours, this.minutes).hour;
  }

  get minuteAngle(): number {
    return handsAt(this.hours, this.minutes).minute;
  }

  /** The time as a screen reader says it, the hands' own value */
  get time(): string {
    return `${this.hours}:${String(this.minutes).padStart(2, '0')}`;
  }

  pressed(event: PointerEvent) {
    if (this.disabled) {
      return;
    }
    const degrees = this.angleOf(event);
    if (degrees === null) {
      return;
    }
    this.holding = nearerHand(degrees, this.hours, this.minutes);
    (event.target as Element).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    this.turn(degrees);
  }

  moved(event: PointerEvent) {
    if (!this.holding || this.disabled) {
      return;
    }
    const degrees = this.angleOf(event);
    if (degrees !== null) {
      this.turn(degrees);
    }
  }

  released() {
    this.holding = null;
  }

  /** The arrow keys on a hand: the long hand a step of minutes, the short hand an hour. */
  key(hand: 'hour' | 'minute', event: KeyboardEvent) {
    const way = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!way || this.disabled) {
      return;
    }
    event.preventDefault();
    if (hand === 'minute') {
      this.emit(this.hours, (this.minutes + way * this.step + 60) % 60);
    } else {
      this.emit((this.hours + way + 11) % 12 + 1, this.minutes);
    }
  }

  /** The hand held, turned to a finger's angle and snapped to where it can stand. */
  private turn(degrees: number) {
    if (this.holding === 'minute') {
      this.emit(this.hours, minutesAt(degrees, this.step));
    } else {
      this.emit(hoursAt(degrees, this.minutes), this.minutes);
    }
  }

  private emit(hours: number, minutes: number) {
    if (hours !== this.hours || minutes !== this.minutes) {
      this.move.emit({ hours, minutes });
    }
  }

  /** Where a finger is on the face, as an angle; none in the middle, where it points nowhere. */
  private angleOf(event: PointerEvent): number | null {
    const svg = this.face?.nativeElement;
    if (!svg) {
      return null;
    }
    const box = svg.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * 100;
    const y = (event.clientY - box.top) / box.height * 100;
    return Math.hypot(x - 50, y - 50) < 6 ? null : angleAt(x, y);
  }
}
