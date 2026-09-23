import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  /**
   * True where the pieces are a choice rather than a picture — the tray a
   * child takes coins from, and the coins they have put down and may take
   * back. The same drawing either way: one coin, two jobs.
   */
  @Input() tappable = false;

  /** What tapping one does, for the accessible label ("Take back 20c"). */
  @Input() actionLabel = '';

  /** The position of the piece tapped, so the caller can add or remove it. */
  @Output() take = new EventEmitter<number>();

  face(cents: number): string {
    return formatCents(cents, this.decimal);
  }

  kind(cents: number): string {
    return pieceKind(cents);
  }

  /** The class the stylesheet uses for this piece's colour. */
  classFor(cents: number): string {
    switch (pieceKind(cents)) {
      case 'copper': return 'copper';
      case 'gold': return 'gold';
      case 'silverCentre': return 'silver-centre';
      case 'goldCentre': return 'gold-centre';
      default: return 'note';
    }
  }
}
