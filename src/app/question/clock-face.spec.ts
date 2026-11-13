import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRICULUM, Moment, Random, TOPICS } from '../teaching/school/groep';
import { clockTime, formWorkedStep } from '../teaching/school/written-form';
import { ClockFaceComponent } from './clock-face.component';
import { handsAt, onFace } from './clock-face';

function seeded(seed: number): Random {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

/** Where on a clock face the hand points, as a child says it: the number it is on or has just passed. */
const pointsAt = (degrees: number) => Math.floor(((degrees % 360) + 360) % 360 / 30) || 12;

describe('klokkijken (groep 3 to 5, Yobyn 2026-10-24)', () => {
  it('stands the hands where a real clock has them: 3:00, half 4, kwart voor 4, 3:37', () => {
    expect(handsAt(3, 0)).toEqual({ hour: 90, minute: 0 });
    // Half past 3 ("half 4"): the hour hand halfway to the 4, the minute hand on the 6
    expect(handsAt(3, 30)).toEqual({ hour: 105, minute: 180 });
    expect(handsAt(3, 45)).toEqual({ hour: 112.5, minute: 270 });
    expect(pointsAt(handsAt(3, 37).hour)).toBe(3);
    expect(handsAt(12, 15)).toEqual({ hour: 7.5, minute: 90 });
    // The 12 at the top, the 3 on the right, the 6 at the bottom
    expect(onFace(0, 40)).toEqual({ x: 50, y: 10 });
    expect(onFace(90, 40).x).toBeCloseTo(90);
    expect(onFace(180, 40).y).toBeCloseTo(90);
  });

  it('asks each groep the times its school year reads: whole and half hours, quarters, fives, then any minute', () => {
    const random = seeded(5);
    const minutesOf = (topic: string) => Array.from({ length: 300 }, () => TOPICS[topic](random)).map(sum => {
      // Kept as 300 + 45: hours × 100 and the minutes, one o'clock to twelve
      expect(sum.form).toBe('klok');
      expect(sum.operation).toBe('+');
      expect(sum.num1 % 100).toBe(0);
      expect(sum.num1 / 100).toBeGreaterThanOrEqual(1);
      expect(sum.num1 / 100).toBeLessThanOrEqual(12);
      expect(sum.num2).toBeGreaterThanOrEqual(0);
      expect(sum.num2).toBeLessThan(60);
      return sum.num2;
    });
    expect(new Set(minutesOf('klok-uren'))).toEqual(new Set([0, 30]));
    expect(new Set(minutesOf('klok-kwartier'))).toEqual(new Set([0, 15, 30, 45]));
    minutesOf('klok-5-minuten').forEach(minutes => expect(minutes % 5 === 0 && minutes > 0).withContext(`${minutes}`).toBeTrue());
    minutesOf('klok-minuten').forEach(minutes => expect(minutes % 5).withContext(`${minutes}`).not.toBe(0));

    const first = (topic: string) => [3, 4, 5].map(groep => (['B', 'M', 'E'] as Moment[])
      .map(moment => `${groep}${moment}`).find(at => CURRICULUM[+at[0]][at[1] as Moment][topic])).find(Boolean);
    expect(first('klok-uren')).toBe('3E');
    expect(first('klok-kwartier')).toBe('4M');
    expect(first('klok-5-minuten')).toBe('4E');
    expect(first('klok-minuten')).toBe('5M');
    // and no clock before the end of groep 3, nor after groep 5
    expect(Object.keys(CURRICULUM[3].M).some(topic => topic.startsWith('klok'))).toBeFalse();
    [6, 7, 8].forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment =>
      expect(Object.keys(CURRICULUM[groep][moment]).some(topic => topic.startsWith('klok'))).toBeFalse()));
  });

  it('writes the answer as a digital clock does, and works it out from the big hand', () => {
    expect(clockTime(300, 45)).toBe('3:45');
    expect(clockTime(1200, 5)).toBe('12:05');
    expect(clockTime(400, 0)).toBe('4:00');
    // The sum the child is marked against is the time typed: 3, 4, 5 is 345
    expect(300 + 45).toBe(Number('345'));
    expect(formWorkedStep('klok', 300, 45)).toBe('9 × 5 = 45 → 3:45');
  });

  describe('the clock face', () => {
    let fixture: ComponentFixture<ClockFaceComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ declarations: [ClockFaceComponent] }).compileComponents();
      fixture = TestBed.createComponent(ClockFaceComponent);
    });

    describe('on a short phone (2026-11-13)', () => {
      /** The clock as rendered, with its styles, in a frame the size of a phone's screen: its media queries apply there. */
      function onPhone(width: number, height: number): Promise<{ wide: number; room: number }> {
        fixture.componentInstance.hours = 3;
        fixture.componentInstance.minutes = 37;
        fixture.detectChanges();
        const frame = document.createElement('iframe');
        frame.style.cssText = `width:${width}px;height:${height}px;border:0;position:absolute;left:-2000px;top:0`;
        document.body.appendChild(frame);
        const rules = Array.from(document.styleSheets).map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch {
            return '';
          }
        }).join('\n');
        const doc = frame.contentDocument!;
        doc.open();
        // in a row of its own, as the sum's row holds it: the row is as high as the room the clock takes
        doc.write(`<!doctype html><html><head><style>${rules}</style></head>`
          + `<body style="margin:0"><div id="row" style="display:flex;align-items:center">${fixture.nativeElement.outerHTML}</div></body></html>`);
        doc.close();
        return new Promise(resolve => setTimeout(() => {
          const wide = doc.querySelector('svg')!.getBoundingClientRect().width;
          const room = doc.getElementById('row')!.getBoundingClientRect().height;
          frame.remove();
          resolve({ wide, room });
        }, 50));
      }

      afterEach(() => document.querySelectorAll('iframe').forEach(frame => frame.remove()));

      it('takes 22px less of the card on a 320 by 568 screen, so Check Answer comes on it, and stays a clock to read', async () => {
        // The card of a clock question was 590px there: with the page come up to the card's top,
        // Check Answer still ended 13px under the screen. The clock took 141px of it
        const { wide, room } = await onPhone(320, 568);
        expect(room).toBeLessThanOrEqual(141 - 22);
        // still nearly the clock it was: every minute mark is to be read on it
        expect(wide).toBeGreaterThanOrEqual(130);
      });

      it('is the clock it was on a taller phone', async () => {
        for (const [width, height, was] of [[320, 700, 140.8], [360, 740, 158.4], [390, 844, 170]]) {
          const { wide, room } = await onPhone(width, height);
          expect(wide).withContext(`${width} by ${height}`).toBeCloseTo(was, 0);
          expect(room).withContext(`${width} by ${height}`).toBeCloseTo(was, 0);
        }
      });
    });

    it('draws twelve numbers, a mark for every minute, and the hands turned to the time', () => {
      fixture.componentInstance.hours = 3;
      fixture.componentInstance.minutes = 45;
      fixture.componentInstance.label = 'Een klok';
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
      expect(Array.from(svg.querySelectorAll('text')).map(text => Number(text.textContent))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(svg.querySelectorAll('.mark').length).toBe(60);
      expect(svg.querySelectorAll('.mark.hour').length).toBe(12);
      expect(svg.querySelector('.hour-hand')!.getAttribute('transform')).toBe('rotate(112.5 50 50)');
      expect(svg.querySelector('.minute-hand')!.getAttribute('transform')).toBe('rotate(270 50 50)');
      // The hour hand is the short one
      const length = (hand: string) => 50 - Number(svg.querySelector(hand)!.getAttribute('y2'));
      expect(length('.hour-hand')).toBeLessThan(length('.minute-hand'));
      // Read aloud as a clock, never as its time: reading it is the question
      expect(svg.getAttribute('aria-label')).toBe('Een klok');
      expect(svg.getAttribute('role')).toBe('img');
    });
  });
});
