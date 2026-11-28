import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { NumberLineForm, NumberLinePlaceForm } from './sum-form';
import { NumberLine, lineValue, markValue, numberLine } from '../teaching/school/written-form';

/** The drawing's own width and height, in its units: as wide as a 320px phone's card leaves, and low. */
export const LINE_WIDTH = 300;
export const LINE_HEIGHT = 66;
/** Where the line runs: room at the ends for an end's number and the arrowheads, room above for the arrow. */
const LEFT = 32;
const RIGHT = LINE_WIDTH - 32;
const Y = 34;

interface Mark {
  x: number;
  /** How tall the mark stands: the ends and the numbered marks tallest, every fifth taller than the rest. */
  size: 'big' | 'half' | 'small';
  text: string | null;
}

/**
 * De getallenlijn (Yobyn, 2026-11-23): a line with a mark at every step,
 * a number on its ends (and in the middle of a line of twenty), and an
 * arrow over the mark a child is asked for: welk getal hoort bij de pijl?
 * Drawn as in the workbook and on Wikipedia's getallenlijn, with an arrowhead
 * at each end, since the numbers go on. The number at the arrow is never in
 * its label: reading it is the question.
 *
 * The other way round (2026-11-25), `placing`: waar hoort 47? No arrow at
 * first; a tap or a drag on the line puts it on the nearest mark, and the
 * arrow keys move it a mark at a time. Where it stands is the question
 * component's (`chosen`), which this only asks to change (choose).
 */
@Component({
  selector: 'app-number-line',
  templateUrl: './number-line.component.html',
  styleUrls: ['./number-line.component.css']
})
export class NumberLineComponent {
  @Input() form: NumberLineForm | NumberLinePlaceForm = 'getallenlijn-1';
  /** The child puts the arrow on the line, rather than reading where it is. */
  @Input() placing = false;
  /** In placing: the mark the arrow is on, counted from the left end, or null before it is put down. */
  @Input() chosen: number | null = null;
  /**
   * Out of tries (2026-11-26): the mark the child had put the arrow on, drawn pale beside the arrow
   * where the number goes, so they see how far off it was. Null when there is none to show.
   */
  @Input() missed: number | null = null;
  /**
   * Once answered, right or given (2026-11-28): the number at the arrow, said beside it, so the line
   * and the box say the same. Null before.
   */
  @Input() said: string | null = null;
  @Input() disabled = false;
  /** "Tik of sleep de pijl": said under the line until it is answered. */
  @Input() hint = '';
  @Output() choose = new EventEmitter<number>();

  @ViewChild('drawing') drawing?: ElementRef<SVGSVGElement>;
  private dragging = false;
  @Input() num1 = 0;
  @Input() num2 = 0;
  @Input() label = '';
  /** The decimal sign the child's school writes: 3,5 in Dutch and Spanish, 3.5 in English. */
  @Input() point = ',';

  readonly width = LINE_WIDTH;
  readonly height = LINE_HEIGHT;
  readonly left = LEFT;
  readonly right = RIGHT;
  readonly y = Y;

  get line(): NumberLine {
    return numberLine(this.form, this.num1, this.num2);
  }

  get marks(): Mark[] {
    const line = this.line;
    return Array.from({ length: line.steps + 1 }, (_, i) => {
      const numbered = line.labelled.includes(i);
      return {
        x: this.at(i),
        size: numbered ? 'big' : i % 5 === 0 ? 'half' : 'small',
        text: numbered ? lineValue(line, markValue(line, i), this.point) : null
      };
    });
  }

  /** Where the arrow points: over its mark; in placing, over the mark chosen, if any. */
  get arrowX(): number {
    return this.at(this.placing ? this.chosen ?? 0 : this.line.arrow);
  }

  get missedX(): number | null {
    return this.placing && this.missed !== null ? this.at(this.missed) : null;
  }

  /** The number said on the arrow's left near the line's right end, where its right has no room. */
  get saidLeft(): boolean {
    return this.arrowX > LINE_WIDTH - 70;
  }

  get showArrow(): boolean {
    return !this.placing || this.chosen !== null;
  }

  /** The number at the chosen mark, as a screen reader says the arrow's place. */
  get chosenText(): string {
    return this.chosen === null ? '' : lineValue(this.line, markValue(this.line, this.chosen), this.point);
  }

  pressed(event: PointerEvent) {
    if (!this.placing || this.disabled) {
      return;
    }
    this.dragging = true;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    this.pick(event);
  }

  moved(event: PointerEvent) {
    if (this.dragging && !this.disabled) {
      this.pick(event);
    }
  }

  released() {
    this.dragging = false;
  }

  /** The arrow keys: a mark to the left or the right; from the middle when nothing is chosen yet. */
  key(event: KeyboardEvent) {
    const way = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!this.placing || !way || this.disabled) {
      return;
    }
    event.preventDefault();
    const from = this.chosen ?? this.line.steps / 2;
    this.emit(Math.min(this.line.steps, Math.max(0, from + (this.chosen === null ? 0 : way))));
  }

  /** The mark nearest a finger, along the line. */
  markAt(x: number): number {
    const steps = this.line.steps;
    return Math.min(steps, Math.max(0, Math.round((x - LEFT) / (RIGHT - LEFT) * steps)));
  }

  private pick(event: PointerEvent) {
    const svg = this.drawing?.nativeElement;
    if (!svg) {
      return;
    }
    const box = svg.getBoundingClientRect();
    this.emit(this.markAt((event.clientX - box.left) / box.width * LINE_WIDTH));
  }

  private emit(mark: number) {
    if (mark !== this.chosen) {
      this.choose.emit(mark);
    }
  }

  private at(mark: number): number {
    return LEFT + (RIGHT - LEFT) * mark / this.line.steps;
  }
}
