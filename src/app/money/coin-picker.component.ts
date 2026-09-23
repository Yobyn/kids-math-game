import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LanguageService } from '../services/language.service';
import { formatCents } from '../teaching/money';
import { pickTotal } from '../teaching/coin-pick';

/**
 * Putting coins down to make an amount: the purse a child fills, the tray
 * they take from, and the running total between the two.
 *
 * ITS OWN COMPONENT FOR THE SAME REASON THE KEYPAD IS. The question screen's
 * stylesheet sits under a 6 kB error budget, and the roadmap has been
 * naming the next thing to move out of it for several runs; these rules
 * would have put it 1.23 kB over its warning. Angular scopes a component's
 * CSS to its own template, so the markup and the rules travel together or
 * neither works.
 *
 * NO COUNT OF COINS APPEARS HERE, anywhere. The curriculum objective is to
 * find combinations that make an amount, and there is more than one — so
 * telling a child they have used four coins invites them to hunt for three,
 * which is a different lesson nobody asked for.
 */
@Component({
  selector: 'app-coin-picker',
  templateUrl: './coin-picker.component.html',
  styleUrls: ['./coin-picker.component.css']
})
export class CoinPickerComponent {
  /** The denominations on offer, largest first. */
  @Input() tray: number[] = [];

  /** What the child has put down, in the order they put it. */
  @Input() picked: number[] = [];

  /** True once the child writes amounts with a decimal point. */
  @Input() decimal = false;

  /** True once the question is answered and nothing more may be moved. */
  @Input() disabled = false;

  /** A coin taken from the tray, by its position in it. */
  @Output() take = new EventEmitter<number>();

  /** A coin taken back out of the purse, by its position in there. */
  @Output() putBack = new EventEmitter<number>();

  constructor(public languageService: LanguageService) {}

  /** What is down so far, written the way this band writes amounts. */
  get soFar(): string {
    return formatCents(pickTotal(this.picked), this.decimal, {
      and: this.languageService.translate('money-and')
    });
  }
}
