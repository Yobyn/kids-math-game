import { fieldColour } from '../particles/particle-field';

/**
 * The game's colours, taken from the particle field rather than chosen
 * alongside it.
 *
 * The field is the one piece of art in this game anyone has praised, and the
 * screens were white forms stuck on top of it. The CSS tokens in
 * `src/styles.css` already had the field's blue and magenta as their accents
 * — the theme was designed — but fourteen stylesheets never adopted them.
 * This module is the half of the theme that has to be COMPUTED rather than
 * written down: a colour for each of N steps along the ring, and the contrast
 * arithmetic that proves a themed surface is still readable.
 *
 * Kept free of the DOM so it can be tested as what it is: arithmetic.
 */

function hex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

/** A point on the field's ring as a CSS hex colour. 0 is blue, 1 magenta. */
export function fieldHex(mix: number): string {
  const { r, g, b } = fieldColour(mix);
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * The colour of one step in an ordered set of N, walking the ring from blue
 * to magenta. Used for the grade cards: it replaced a red-to-purple rainbow
 * that had nothing to do with the field and meant nothing — ten arbitrary
 * colours. Along the ring, the first grade is the field's blue, the last its
 * magenta, and every grade between sits in order, so the progression reads
 * as one journey rather than ten unrelated labels.
 */
export function stepColour(step: number, total: number): string {
  if (total <= 1) {
    return fieldHex(0);
  }
  const clamped = Math.min(Math.max(step, 1), total);
  return fieldHex((clamped - 1) / (total - 1));
}

/** Parses `#rrggbb` (or `#rgb`) to channels. Anything else is null. */
export function parseHex(value: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  let digits = match[1];
  if (digits.length === 3) {
    digits = digits.split('').map(d => d + d).join('');
  }
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16)
  };
}

/** WCAG 2 relative luminance of a `#rrggbb` colour, 0 (black) to 1 (white). */
export function relativeLuminance(value: string): number {
  const rgb = parseHex(value);
  if (!rgb) {
    throw new Error(`not a hex colour: ${value}`);
  }
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/**
 * WCAG 2 contrast ratio between two colours, 1 to 21. Normal text needs 4.5
 * and large text or an interface edge needs 3. This is what makes "prettier
 * must never mean harder to read" something a test can hold the theme to
 * rather than something a reviewer has to remember.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG 2.x AA thresholds. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;
