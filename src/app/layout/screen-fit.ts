/**
 * Which shape the screen is, kept free of the DOM so the rule can be checked
 * against any size rather than only the one the test runner happens to open.
 *
 * WHY THIS IS NOT JUST A MEDIA QUERY. Two reasons, and the second is the one
 * that decided it.
 *
 * First, the thing that matters is not "landscape", it is SHORT. A tablet on
 * its side is landscape and has 820px of height to stack things in; a phone
 * on its side is landscape and has 390px, which is not enough for a header, a
 * sum and a twelve-key pad one above the other. Those two want opposite
 * layouts and `(orientation: landscape)` cannot tell them apart.
 *
 * Second, karma opens one window and cannot resize it, so a layout expressed
 * only in media queries CANNOT BE TESTED AT ALL. Driving it from an attribute
 * on the document means a test can set the attribute and then read back what
 * the layout actually did, which is the difference between a landscape layout
 * that is checked and one that is merely written.
 */

/** What the layout does with the space it has been given. */
export type Fit = 'stack' | 'short' | 'wide';

/**
 * Above this height there is room to stack, below it there is not.
 *
 * The numbers it sits between: a large phone on its side is 390-430px tall,
 * a small tablet on its side about 600, an iPad 768-1024. 540 is the gap,
 * and it is the height that decides rather than the width so that a tall
 * narrow window on a desktop is treated like the phone it resembles.
 */
export const SHORT_MAX_HEIGHT = 540;

/**
 * Wide enough that a single 600px column in the middle is wasted space
 * rather than a comfortable measure. A tablet on its side starts at 1024;
 * 1100 keeps the smallest of those stacking, where they read better.
 */
export const WIDE_MIN_WIDTH = 1100;

/** The attribute the layout is published on, set on the document element. */
export const FIT_ATTRIBUTE = 'data-fit';

/**
 * The viewport the game asks for.
 *
 * `viewport-fit=cover` is what makes `env(safe-area-inset-*)` mean anything:
 * without it those values resolve to zero, so safe-area padding written in
 * the CSS is dead code that looks alive. Measured before this changed —
 * `env(safe-area-inset-top, 99px)` came back as `0px`, not the fallback.
 *
 * What is NOT here matters as much. `maximum-scale=1.0, user-scalable=no`
 * used to be, and blocking pinch zoom fails WCAG 1.4.4 and takes away the
 * one thing a low-vision player has. The usual reason to add it is iOS
 * zooming when a small input is focused, which only happens below 16px —
 * every input here is already 1rem, so there was nothing to protect.
 */
export const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, viewport-fit=cover';

export interface ScreenSize {
  width: number;
  height: number;
}

/**
 * The layout for a screen of this size. Anything unreadable falls back to
 * stacking, which is the layout that works everywhere.
 */
export function layoutFor(size: ScreenSize | null | undefined): Fit {
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) {
    return 'stack';
  }
  if (size.width <= 0 || size.height <= 0) {
    return 'stack';
  }

  // A phone on its side: wider than it is tall, and not tall enough to stack
  if (size.height <= SHORT_MAX_HEIGHT && size.width > size.height) {
    return 'short';
  }

  if (size.width >= WIDE_MIN_WIDTH) {
    return 'wide';
  }

  return 'stack';
}

/** True where the vertical stack has to become something else. */
export function isShort(size: ScreenSize): boolean {
  return layoutFor(size) === 'short';
}
