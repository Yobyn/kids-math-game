/**
 * What a key press does to the answer a child is typing, kept free of the DOM
 * so every key can be checked against every state of the box.
 *
 * This lived inside the question component, tangled up with the field it was
 * editing, which meant the only way to test "does the minus key toggle" was
 * to build the whole quiz screen. It is a pure string transform and now says
 * so.
 */

/** The keys, in the order they are laid out: three columns, four rows. */
export const KEYPAD_KEYS = [
  '1', '2', '3',
  '4', '5', '6',
  '7', '8', '9',
  '-', '0', 'del'
];

/**
 * Longer than any answer the game can ask for. It exists so a child leaning
 * on a key cannot push the question off the screen.
 */
export const MAX_DIGITS = 6;

/** The key that removes the last character. */
export const DELETE_KEY = 'del';

/** What the answer box should hold after `key` is pressed. */
export function applyKey(current: string, key: string): string {
  const answer = current == null ? '' : String(current);

  if (key === DELETE_KEY) {
    return answer.slice(0, -1);
  }

  if (key === '-') {
    // A toggle rather than a character: a minus is only ever meaningful at
    // the front, and a child who types one in the middle has made a typo the
    // game should not have allowed.
    return answer.startsWith('-') ? answer.slice(1) : '-' + answer;
  }

  return digitsIn(answer) < MAX_DIGITS ? answer + key : answer;
}

/** How many digits are typed, not counting a leading minus. */
export function digitsIn(answer: string): number {
  return (answer || '').replace('-', '').length;
}

/** What to show in the empty box, which is a prompt rather than a value. */
export function placeholderFor(answer: string): string {
  return answer ? '' : '?';
}

/** The face of a key: the delete key is drawn rather than spelled. */
export function keyFace(key: string): string {
  return key === DELETE_KEY ? '⌫' : key;
}

/** What a screen reader should say, since "⌫" is not a word. */
export function keyLabel(key: string): string {
  return key === DELETE_KEY ? 'delete' : key;
}
