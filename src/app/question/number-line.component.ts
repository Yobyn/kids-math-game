import { Component, Input } from '@angular/core';
import { NumberLineForm } from './sum-form';
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
 */
@Component({
  selector: 'app-number-line',
  templateUrl: './number-line.component.html',
  styleUrls: ['./number-line.component.css']
})
export class NumberLineComponent {
  @Input() form: NumberLineForm = 'getallenlijn-1';
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

  /** Where the arrow points: over its mark. */
  get arrowX(): number {
    return this.at(this.line.arrow);
  }

  private at(mark: number): number {
    return LEFT + (RIGHT - LEFT) * mark / this.line.steps;
  }
}
