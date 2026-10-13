import { scrollToShow } from './board-view';

describe('scrollToShow, bringing a bonus board on screen', () => {
  it('scrolls a board that runs past a short phone up by what is hidden, and the margin', () => {
    // 320 × 568: the board starts at 306 and is 280 tall
    expect(scrollToShow(306, 586, 568, 16)).toBe(34);
  });

  it('leaves a board that is already on screen where it is', () => {
    expect(scrollToShow(306, 744, 760, 16)).toBe(0);
    expect(scrollToShow(306, 500, 760, 16)).toBe(0);
  });

  it('never pushes the board\'s top off the screen, even when it is taller than the screen', () => {
    expect(scrollToShow(100, 900, 568, 16)).toBe(100);
  });
});
