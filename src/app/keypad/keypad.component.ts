import { Component, EventEmitter, Input, Output } from '@angular/core';
import { KEYPAD_KEYS, keyFace, keyLabel } from './answer-entry';

/**
 * The touch keypad, so the phone's own keyboard never covers the question.
 *
 * Lifted out of the question screen, which had grown a stylesheet within a
 * few hundred bytes of the build's per-component error budget — the next
 * thing added to that screen would have failed CI rather than warned. The
 * budget is per component, so a genuine seam is a genuine fix.
 *
 * The styles came with it, and had to. Angular's default emulated view
 * encapsulation scopes a component's CSS to that component's own template by
 * rewriting its selectors with a generated attribute, so rules left behind in
 * question.component.css would simply have stopped matching these keys. The
 * refactor that moves the markup and not the styles is silently broken, and
 * looks fine until you open it on a phone.
 */
@Component({
  selector: 'app-keypad',
  templateUrl: './keypad.component.html',
  styleUrls: ['./keypad.component.css']
})
export class KeypadComponent {
  /** True while the answer is settled and the keys should not respond. */
  @Input() disabled = false;

  /** The key that was pressed. What it means is the answer box's business. */
  @Output() press = new EventEmitter<string>();

  readonly keys = KEYPAD_KEYS;

  face(key: string): string {
    return keyFace(key);
  }

  label(key: string): string {
    return keyLabel(key);
  }

  onPress(key: string) {
    if (this.disabled) {
      return;
    }
    this.press.emit(key);
  }
}
