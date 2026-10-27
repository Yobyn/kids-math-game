import { Component, Input } from '@angular/core';
import { handsAt, onFace } from './clock-face';

interface Mark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hour: boolean;
}

/**
 * The clock a klok question is asked on: a face with its twelve numbers and
 * a mark for every minute, a short hour hand and a long minute hand. Drawn,
 * so it is as sharp on a phone as on a board, and in the card's own reading
 * colours. The time is never in its label: reading it is the question.
 */
@Component({
  selector: 'app-clock-face',
  templateUrl: './clock-face.component.html',
  styleUrls: ['./clock-face.component.css']
})
export class ClockFaceComponent {
  @Input() hours = 12;
  @Input() minutes = 0;
  @Input() label = '';

  /** The numbers round the face, 12 at the top. */
  readonly numbers = Array.from({ length: 12 }, (_, i) => ({ n: i + 1, ...onFace((i + 1) * 30, 36.5) }));

  /** A mark for every minute, a longer one at each hour. */
  readonly marks: Mark[] = Array.from({ length: 60 }, (_, i) => {
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
}
