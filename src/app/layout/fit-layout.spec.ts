import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { QuestionComponent } from '../question/question.component';
import { KeypadComponent } from '../keypad/keypad.component';
import { CoinsComponent } from '../money/coins.component';
import { FIT_ATTRIBUTE } from './screen-fit';

/**
 * What the landscape and large-tablet layouts actually DO, rather than what
 * their stylesheet says.
 *
 * This is the reason the layout is driven by an attribute rather than by a
 * media query alone: karma opens one window and cannot resize it, so a
 * landscape layout written only in `@media (orientation: landscape)` could
 * not be checked here at all. Setting the attribute is the whole test.
 */
describe('the layout on a screen that is not a phone held upright', () => {
  let fixture: ComponentFixture<QuestionComponent>;

  const fit = (value: string) => {
    document.documentElement.setAttribute(FIT_ATTRIBUTE, value);
    fixture.detectChanges();
  };

  const box = () => fixture.nativeElement.querySelector('.question-box');
  const keypad = () => fixture.nativeElement.querySelector('app-keypad');
  const keys = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.keypad .key'));

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('difficulty', 'medium');
    localStorage.setItem('grade', '3');
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [QuestionComponent, KeypadComponent, CoinsComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionComponent);
    fixture.detectChanges();
    // The keypad is what the landscape layout moves, so it has to be there.
    // After the first change detection, because ngOnInit decides this from
    // whether the runner looks like a touch device.
    fixture.componentInstance.useKeypad = true;
    // And the question has to be one that HAS a keypad. The coin-picking
    // shape deliberately has none — a tray of coins takes its place — so a
    // generated question that happened to be that one left these tests
    // measuring an element that was not there.
    fixture.componentInstance.currentQuestion = { num1: 7, num2: 5, operation: '+' };
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.setAttribute(FIT_ATTRIBUTE, 'stack');
    localStorage.clear();
  });

  describe('a phone on its side', () => {
    it('stacks the question box when the screen is not short', () => {
      fit('stack');

      expect(getComputedStyle(box()).display).not.toBe('grid');
    });

    it('puts the keypad beside the sum instead of under it', () => {
      // Measured before this existed: the keypad keys, Check Answer and Back
      // were all below the fold at 844x390. A child could not see the thing
      // they answer with.
      fit('short');

      expect(getComputedStyle(box()).display).toBe('grid');
      expect(getComputedStyle(keypad()).gridColumnStart).toBe('2');
    });

    it('keeps everything else in the first column', () => {
      fit('short');

      const others = Array.from(box().children)
        .filter((child: any) => child.tagName.toLowerCase() !== 'app-keypad');
      others.forEach((child: any) => {
        expect(getComputedStyle(child).gridColumnStart).toBe('1');
      });
    });

    it('spans the keypad past the first row, or the sum lands under it', () => {
      // `grid-row: 1 / -1` reads like "every row" and is not: -1 is the last
      // line of the EXPLICIT grid, and only columns are declared. The sum
      // and the button flowed into column two underneath the keypad.
      fit('short');

      const span = getComputedStyle(keypad()).gridRowEnd;
      expect(span === 'auto' || span === '1').toBe(false);
    });

    it('never shrinks a key below the size of a fingertip', () => {
      // Twice on the way here: the back button reached 38px and the keys 43
      fit('short');

      expect(keys().length).toBeGreaterThan(0);
      keys().forEach(key => {
        const rect = key.getBoundingClientRect();
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
      });
    });

    it('keeps the answer surface light, whichever way the phone is held', () => {
      const luminance = (colour: string): number => {
        const parts = (colour.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
        const [r, g, b] = parts.map(channel => {
          const c = channel / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      ['stack', 'short', 'wide'].forEach(shape => {
        fit(shape);
        expect(luminance(getComputedStyle(box()).backgroundColor)).toBeGreaterThan(0.7);
      });
    });
  });

  describe('a large tablet', () => {
    it('puts the keypad beside the sum here too', () => {
      // Not because the screen is short — 820px is plenty — but because
      // stacking was the wrong axis: 1072px of page in an 820px window
      fit('wide');

      expect(getComputedStyle(box()).display).toBe('grid');
      expect(getComputedStyle(keypad()).gridColumnStart).toBe('2');
    });

    it('gives the card more room than a phone gets, but still a limit', () => {
      fit('stack');
      const stacked = parseFloat(getComputedStyle(box()).maxWidth);
      fit('wide');
      const wide = parseFloat(getComputedStyle(box()).maxWidth);

      expect(wide).toBeGreaterThan(stacked);
      // A line of text the whole width of a 1366px tablet is harder to read,
      // not easier, so the cap comes up rather than off
      expect(wide).toBeLessThan(1000);
    });
  });

  it('leaves no layout without a stylesheet answer', () => {
    ['stack', 'short', 'wide'].forEach(shape => {
      fit(shape);
      expect(box()).toBeTruthy();
      expect(getComputedStyle(box()).display).toBeTruthy();
    });
  });
});
