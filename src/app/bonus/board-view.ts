/**
 * Keeping the whole board on screen once a game starts. On a short phone
 * (320 × 568) the header and the score leave less room than the smallest
 * playable board, so its bottom, where the paddle slides and Springbal
 * rolls, ran past the screen: the page has to come up to meet it.
 */

/** How far to scroll so the board's bottom, and a margin, are on screen, never pushing its top off. */
export function scrollToShow(top: number, bottom: number, viewHeight: number, margin: number): number {
  return Math.max(0, Math.min(bottom + margin - viewHeight, top));
}

/** Brings the whole board on screen, when it is not already. */
export function showWholeBoard(board: HTMLElement, margin: number): void {
  const box = board.getBoundingClientRect();
  const by = scrollToShow(box.top, box.bottom, window.innerHeight, margin);
  if (by > 0) {
    window.scrollBy(0, by);
  }
}
