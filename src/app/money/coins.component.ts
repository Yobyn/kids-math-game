import { Component, Input } from '@angular/core';
import { formatCents, pieceKind } from '../teaching/money';

/**
 * The pieces of money a question puts on the table.
 *
 * EVERY PIECE IS THE SAME SIZE, and that is a decision rather than laziness.
 * Practitioner guidance on teaching coins keeps returning to the same
 * confusion: children read value off size. Drawing a €2 coin bigger than a
 * 50c one would teach that confusion rather than correct it — and the real
 * euro set does not even agree, since a 5c coin is physically larger than a
 * 10c. Colour separates them the way the real coins do (copper, gold,
 * two-tone, notes) and the value is written on the face, which is also what
 * makes the pile readable to a screen reader without any extra labelling.
 */
@Component({
  selector: 'app-coins',
  templateUrl: './coins.component.html',
  styleUrls: ['./coins.component.css']
})
export class CoinsComponent {
  /** The pieces, in cents, largest first. */
  @Input() pieces: number[] = [];

  /** True once the child writes amounts with a decimal point. */
  @Input() decimal = false;

  face(cents: number): string {
    return formatCents(cents, this.decimal);
  }

  kind(cents: number): string {
    return pieceKind(cents);
  }
}
