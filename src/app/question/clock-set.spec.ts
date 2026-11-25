import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CLOCK_SET_SHARE, Random, TOPICS } from '../teaching/school/groep';
import { formWorkedStep, sumLayout } from '../teaching/school/written-form';
import { angleAt, handsAt, hoursAt, minutesAt, nearerHand, onFace } from './clock-face';
import { ClockSetComponent, ClockTime } from './clock-set.component';
import { readForm } from './sum-form';

function seeded(seed: number): Random {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

describe('zet de klok (Yobyn, 2026-11-25: "moving the clock hand in the right position")', () => {
  it('reads a finger on the face as an angle from the 12, clockwise', () => {
    expect(angleAt(50, 10)).toBeCloseTo(0, 6);
    expect(angleAt(90, 50)).toBeCloseTo(90, 6);
    expect(angleAt(50, 90)).toBeCloseTo(180, 6);
    expect(angleAt(10, 50)).toBeCloseTo(270, 6);
    // wherever on the face, the angle of a point is where onFace put it
    [17, 123, 359].forEach(degrees => {
      const point = onFace(degrees, 30);
      expect(angleAt(point.x, point.y)).toBeCloseTo(degrees, 6);
    });
  });

  it('snaps the long hand to the minutes it can stand on: fives, or every minute', () => {
    expect(minutesAt(270, 5)).toBe(45);
    expect(minutesAt(262, 5)).toBe(45);
    expect(minutesAt(255, 5)).toBe(45);
    expect(minutesAt(250, 5)).toBe(40);
    expect(minutesAt(359, 5)).toBe(0);
    expect(minutesAt(222, 1)).toBe(37);
    expect(minutesAt(358, 1)).toBe(0);
  });

  it('reads the short hand as the hour it has passed, creeping on with the minutes as a real one does', () => {
    expect(hoursAt(90, 0)).toBe(3);
    expect(hoursAt(0, 0)).toBe(12);
    // At 3:45 the short hand stands three quarters of the way to the 4: still 3
    expect(hoursAt(handsAt(3, 45).hour, 45)).toBe(3);
    // and a finger right on the 4 with 45 minutes is near enough to 3:45 to be taken as it
    expect(hoursAt(120, 45)).toBe(3);
    // every hour, at every minute, reads back as itself
    for (let hours = 1; hours <= 12; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 7) {
        expect(hoursAt(handsAt(hours, minutes).hour, minutes)).withContext(`${hours}:${minutes}`).toBe(hours);
      }
    }
  });

  it('takes the hand nearer the finger, the long one when both are as near', () => {
    // 3:00: the short hand on the 3, the long hand on the 12
    expect(nearerHand(95, 3, 0)).toBe('hour');
    expect(nearerHand(5, 3, 0)).toBe('minute');
    // 12:00: both on the 12
    expect(nearerHand(0, 12, 0)).toBe('minute');
  });

  it('asks half the clocks the other way round, never at the 12:00 the hands start from, kept as a read clock is', () => {
    expect(CLOCK_SET_SHARE).toBe(0.5);
    const random = seeded(3);
    ['klok-uren', 'klok-kwartier', 'klok-5-minuten', 'klok-minuten'].forEach(topic => {
      const sums = Array.from({ length: 400 }, () => TOPICS[topic](random));
      const set = sums.filter(sum => sum.form === 'klok-zet');
      expect(set.length).withContext(topic).toBeGreaterThan(140);
      expect(set.length).withContext(topic).toBeLessThan(260);
      set.forEach(sum => {
        expect(sum.operation).toBe('+');
        expect(sum.num1 % 100).toBe(0);
        expect(sum.num1 + sum.num2).not.toBe(1200);
      });
    });
    expect(readForm('klok-zet')).toBe('klok-zet');
    // nothing is written round it, and its worked line is a read clock's
    expect(sumLayout({ num1: 300, num2: 45, sign: '+', form: 'klok-zet' }, {} as any)).toEqual({ before: [], after: [] });
    expect(formWorkedStep('klok-zet', 300, 45)).toBe('9 × 5 = 45 → 3:45');
  });

  describe('the clock to set', () => {
    let fixture: ComponentFixture<ClockSetComponent>;
    let clock: ClockSetComponent;
    let moves: ClockTime[];

    beforeEach(async () => {
      await TestBed.configureTestingModule({ declarations: [ClockSetComponent] }).compileComponents();
      fixture = TestBed.createComponent(ClockSetComponent);
      clock = fixture.componentInstance;
      moves = [];
      // Kept as the question does: the time it asks for is the time it is set to
      clock.move.subscribe((time: ClockTime) => {
        moves.push(time);
        clock.hours = time.hours;
        clock.minutes = time.minutes;
        fixture.detectChanges();
      });
      Object.assign(clock, { hours: 12, minutes: 0, step: 5, bigLabel: 'De grote wijzer', smallLabel: 'De kleine wijzer', label: 'Een klok',
        hint: 'Sleep de wijzers.' });
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
    });

    afterEach(() => fixture.nativeElement.remove());

    const svg = () => fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    /** A finger at an angle on the face, a distance out from the middle (of 50). */
    function finger(type: string, degrees: number, distance = 38) {
      const box = svg().getBoundingClientRect();
      const point = onFace(degrees, distance);
      svg().dispatchEvent(new PointerEvent(type, {
        clientX: box.left + point.x / 100 * box.width, clientY: box.top + point.y / 100 * box.height, bubbles: true, pointerId: 1
      }));
      fixture.detectChanges();
    }

    it('turns the long hand to where a finger drags it, snapped to the five minutes', () => {
      finger('pointerdown', 10);
      finger('pointermove', 140);
      finger('pointermove', 268);
      finger('pointerup', 268);
      expect([clock.hours, clock.minutes]).toEqual([12, 45]);
      expect(svg().querySelector('.minute-hand')!.getAttribute('transform')).toBe('rotate(270 50 50)');
      // let go, a move does nothing
      finger('pointermove', 90);
      expect(clock.minutes).toBe(45);
    });

    it('turns the short hand when the finger starts on it, and sets the hour', () => {
      finger('pointerdown', 268);
      finger('pointerup', 268);
      expect(clock.minutes).toBe(45);
      // the short hand is on the 12; a finger on it, dragged round to the 3
      finger('pointerdown', handsAt(12, 45).hour);
      finger('pointermove', 100);
      finger('pointerup', 100);
      expect([clock.hours, clock.minutes]).toEqual([3, 45]);
      // drawn creeping on towards the 4
      expect(svg().querySelector('.hour-hand')!.getAttribute('transform')).toBe('rotate(112.5 50 50)');
    });

    it('sets a time to the minute when asked for one', () => {
      clock.step = 1;
      finger('pointerdown', 5);
      finger('pointermove', 222);
      expect(clock.minutes).toBe(37);
    });

    it('turns each hand with the arrow keys too, as a slider says it does', () => {
      const big = svg().querySelector('.minute-hand') as SVGElement;
      const small = svg().querySelector('.hour-hand') as SVGElement;
      expect(big.getAttribute('role')).toBe('slider');
      expect(big.getAttribute('aria-label')).toBe('De grote wijzer');
      expect(small.getAttribute('aria-label')).toBe('De kleine wijzer');
      big.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      big.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      small.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      small.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect([clock.hours, clock.minutes]).toEqual([2, 10]);
      big.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      big.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      big.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
      expect([clock.hours, clock.minutes]).toEqual([2, 55]);
      expect(big.getAttribute('aria-valuetext')).toBe('2:55');
    });

    it('stays as it is once answered, and drops its hint', () => {
      expect(fixture.nativeElement.querySelector('.hint').textContent).toContain('Sleep de wijzers.');
      clock.disabled = true;
      fixture.detectChanges();
      finger('pointerdown', 10);
      finger('pointermove', 270);
      (svg().querySelector('.minute-hand') as SVGElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(moves).toEqual([]);
      expect(fixture.nativeElement.querySelector('.hint')).toBeNull();
    });

    it('points nowhere from the very middle, so a tap on the pin moves no hand', () => {
      finger('pointerdown', 90, 2);
      expect(moves).toEqual([]);
    });

    it('is big enough to hold with a finger: wider than the clock that is only read (170px at most)', () => {
      expect(svg().getBoundingClientRect().width).toBeGreaterThan(170);
    });
  });
});
