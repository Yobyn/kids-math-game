import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRICULUM, Moment, Random, TOPICS } from '../teaching/school/groep';
import { formWorkedStep, lineFormOf, lineValue, markValue, numberLine, sumLayout } from '../teaching/school/written-form';
import { LINE_PLACE_SHARE } from '../teaching/school/groep';
import { NUMBER_LINE_FORMS, NUMBER_LINE_PLACE_FORMS, NumberLineForm, placesOf, readForm } from './sum-form';
import { NumberLineComponent } from './number-line.component';

function seeded(seed: number): Random {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

const TOPIC_NAMES = ['getallenlijn-tot-20', 'getallenlijn-tot-100', 'getallenlijn-tiental', 'getallenlijn-tot-1000', 'getallenlijn-honderdtal',
  'getallenlijn-tot-10000', 'getallenlijn-tienden', 'getallenlijn-negatief'];

/** Sums of a topic, many of them. */
function made(topic: string, count = 400) {
  const random = seeded(7);
  return Array.from({ length: count }, () => TOPICS[topic](random));
}

/** Where a topic first comes in the school year: "3M" for the middle of groep 3. */
function first(topic: string): string | undefined {
  const moments: string[] = [];
  Object.keys(CURRICULUM).map(Number).forEach(groep => (['B', 'M', 'E'] as Moment[]).forEach(moment => moments.push(`${groep}${moment}`)));
  return moments.find(at => CURRICULUM[+at.slice(0, -1)][at.slice(-1) as Moment][topic]);
}

describe('de getallenlijn (Yobyn, 2026-11-23)', () => {
  it('asks each groep the numbers it is learning to count in, on a line of its size', () => {
    const lines = (topic: string) => made(topic).map(sum => {
      expect(sum.operation).toBe('+');
      // read, or the other way round, the arrow put on it (getallenlijn-zet-, 2026-11-25)
      expect([...NUMBER_LINE_FORMS, ...NUMBER_LINE_PLACE_FORMS] as string[]).toContain(sum.form!);
      const line = numberLine(sum.form as NumberLineForm, sum.num1, sum.num2);
      return { line, start: line.from, end: markValue(line, line.steps), answer: sum.num1 + sum.num2, step: line.step, form: sum.form };
    });
    // Groep 3: 0 to 20 in ones
    lines('getallenlijn-tot-20').forEach(({ start, end, answer, step }) => {
      expect([start, end, step]).toEqual([0, 20, 1]);
      expect(answer).toBeGreaterThan(0);
      expect(answer).toBeLessThan(20);
    });
    // Groep 4: the tens to 100, then the ones between two tens
    expect(new Set(lines('getallenlijn-tot-100').map(({ start, end, step }) => `${start} ${end} ${step}`))).toEqual(new Set(['0 100 10']));
    lines('getallenlijn-tiental').forEach(({ start, end, step, answer }) => {
      expect(start % 10).toBe(0);
      expect(end).toBe(start + 10);
      expect(step).toBe(1);
      expect(end).toBeLessThanOrEqual(100);
      expect(answer % 10).not.toBe(0);
    });
    // Groep 5: the hundreds to 1000, then the tens between two hundreds
    expect(new Set(lines('getallenlijn-tot-1000').map(({ start, end, step }) => `${start} ${end} ${step}`))).toEqual(new Set(['0 1000 100']));
    lines('getallenlijn-honderdtal').forEach(({ start, end, step }) => {
      expect(start % 100).toBe(0);
      expect([end - start, step]).toEqual([100, 10]);
      expect(end).toBeLessThanOrEqual(1000);
    });
    // Groep 6: to 10 000, in thousands or in the hundreds between two thousands
    const big = lines('getallenlijn-tot-10000');
    expect(new Set(big.map(({ step }) => step))).toEqual(new Set([100, 1000]));
    big.forEach(({ end }) => expect(end).toBeLessThanOrEqual(10000));
    // Tenths between two whole numbers, counted in tenths: 3,7 is 37 tenths
    lines('getallenlijn-tienden').forEach(({ line, start, end, answer }) => {
      expect(line.places).toBe(1);
      expect(start % 10).toBe(0);
      expect(end).toBe(start + 10);
      expect(answer % 10).not.toBe(0);
    });
    // Below nought: −10 to 10, the answer below nought as often as not
    const below = lines('getallenlijn-negatief');
    below.forEach(({ start, end }) => expect([start, end]).toEqual([-10, 10]));
    expect(below.filter(({ answer }) => answer < 0).length).toBeGreaterThan(below.length * 0.35);
    expect(below.filter(({ answer }) => answer > 0).length).toBeGreaterThan(below.length * 0.35);
  });

  it('never points the arrow at a mark with its number on it, and reaches every other mark', () => {
    TOPIC_NAMES.forEach(topic => {
      const arrows = new Set<number>();
      made(topic).forEach(sum => {
        const line = numberLine(sum.form as NumberLineForm, sum.num1, sum.num2);
        expect(Number.isInteger(line.arrow)).withContext(topic).toBeTrue();
        expect(line.labelled).not.toContain(line.arrow);
        expect(line.arrow).toBeGreaterThan(0);
        expect(line.arrow).toBeLessThan(line.steps);
        // The arrow's mark is the answer
        expect(markValue(line, line.arrow)).withContext(topic).toBe(sum.num1 + sum.num2);
        arrows.add(line.arrow);
      });
      const line = numberLine(made(topic, 1)[0].form as NumberLineForm, 0, 1);
      expect(arrows.size).withContext(topic).toBe(line.steps + 1 - line.labelled.length);
    });
  });

  it('comes in as each number range does at school, and every groep from 3 to 8 reads one', () => {
    expect(first('getallenlijn-tot-20')).toBe('3M');
    expect(first('getallenlijn-tot-100')).toBe('3E');
    expect(first('getallenlijn-tiental')).toBe('4M');
    expect(first('getallenlijn-tot-1000')).toBe('4E');
    expect(first('getallenlijn-honderdtal')).toBe('5M');
    expect(first('getallenlijn-tot-10000')).toBe('6M');
    expect(first('getallenlijn-tienden')).toBe('6E');
    // Below nought with klas 1's negative numbers: groep 3 to 8 never need the minus key
    expect(first('getallenlijn-negatief')).toBe('9B');
    // Nothing before groep 3's middle: a child starting groep 3 is still counting to 10 on its fingers
    expect(Object.keys(CURRICULUM[3].B).some(topic => topic.startsWith('getallenlijn'))).toBeFalse();
    [3, 4, 5, 6, 7, 8].forEach(groep => expect((['B', 'M', 'E'] as Moment[])
      .some(moment => Object.keys(CURRICULUM[groep][moment]).some(topic => topic.startsWith('getallenlijn')))).withContext(`groep ${groep}`).toBeTrue());
  });

  it('is kept as a form a saved round reads back, typed with a comma on a line of tenths', () => {
    NUMBER_LINE_FORMS.forEach(form => expect(readForm(form)).toBe(form));
    expect(placesOf('getallenlijn-tiende')).toBe(1);
    expect(placesOf('getallenlijn-10')).toBe(0);
    // Nothing is written round the box: the line is the question
    expect(sumLayout({ num1: 40, num2: 7, sign: '+', form: 'getallenlijn-1' }, {} as any)).toEqual({ before: [], after: [] });
  });

  it('writes a mark as school does: 10 000 with a space, −6 with a real minus, 3,7 with a comma', () => {
    expect(lineValue(numberLine('getallenlijn-1000', 0, 3000), 10000)).toBe('10 000');
    expect(lineValue(numberLine('getallenlijn-negatief', -10, 4), -6)).toBe('−6');
    expect(lineValue(numberLine('getallenlijn-tiende', 30, 7), 37)).toBe('3,7');
    expect(lineValue(numberLine('getallenlijn-tiende', 30, 7), 40)).toBe('4');
    expect(lineValue(numberLine('getallenlijn-tiende', 30, 7), 37, '.')).toBe('3.7');
  });

  it('works it out from the nearest number on the line, a step at a time', () => {
    expect(formWorkedStep('getallenlijn-1', 40, 7)).toBe('50 − 3 = 47');
    expect(formWorkedStep('getallenlijn-1', 40, 3)).toBe('40 + 3 = 43');
    // In the middle, it counts on from the left
    expect(formWorkedStep('getallenlijn-1', 40, 5)).toBe('40 + 5 = 45');
    expect(formWorkedStep('getallenlijn-20', 0, 13)).toBe('10 + 3 = 13');
    expect(formWorkedStep('getallenlijn-20', 0, 18)).toBe('20 − 2 = 18');
    expect(formWorkedStep('getallenlijn-10', 0, 30)).toBe('0 + 3 × 10 = 30');
    expect(formWorkedStep('getallenlijn-10', 0, 90)).toBe('100 − 10 = 90');
    expect(formWorkedStep('getallenlijn-100', 0, 200)).toBe('0 + 2 × 100 = 200');
    expect(formWorkedStep('getallenlijn-1000', 0, 8000)).toBe('10 000 − 2 × 1000 = 8000');
    expect(formWorkedStep('getallenlijn-tiende', 30, 7)).toBe('4 − 3 × 0,1 = 3,7');
    expect(formWorkedStep('getallenlijn-tiende', 0, 2)).toBe('0 + 2 × 0,1 = 0,2');
    expect(formWorkedStep('getallenlijn-negatief', -10, 4)).toBe('−10 + 4 = −6');
    expect(formWorkedStep('getallenlijn-negatief', -10, 7)).toBe('0 − 3 = −3');
    expect(formWorkedStep('getallenlijn-negatief', -10, 16)).toBe('10 − 4 = 6');
    // Every line of every topic is true: the steps from the number come to the answer
    TOPIC_NAMES.forEach(topic => made(topic, 200).forEach(sum => {
      const line = formWorkedStep(sum.form, sum.num1, sum.num2, sum.operation)!;
      const answer = lineValue(numberLine(sum.form as NumberLineForm, sum.num1, sum.num2), sum.num1 + sum.num2);
      expect(line.endsWith(`= ${answer}`)).withContext(line).toBeTrue();
      // Never more than half the line's steps from a number on it
      const steps = numberLine(sum.form as NumberLineForm, sum.num1, sum.num2);
      const times = / (\d+) × /.exec(line);
      const count = times ? Number(times[1]) : steps.step === 1 && !steps.places ? Number(/ [+−] (\d+) = /.exec(line)![1]) : 1;
      expect(count).withContext(line).toBeLessThanOrEqual(5);
    }));
  });

  describe('the drawing', () => {
    let fixture: ComponentFixture<NumberLineComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ declarations: [NumberLineComponent] }).compileComponents();
      fixture = TestBed.createComponent(NumberLineComponent);
    });

    function draw(form: NumberLineForm, num1: number, num2: number, point = ',') {
      Object.assign(fixture.componentInstance, { form, num1, num2, point, label: 'Een getallenlijn' });
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('svg') as SVGElement;
    }

    const texts = (svg: SVGElement) => Array.from(svg.querySelectorAll('text')).map(text => text.textContent!.trim());
    const xOf = (node: Element) => Number(node.getAttribute('x1') ?? node.getAttribute('x'));
    const arrowX = (svg: SVGElement) => Number(/translate\(([\d.]+)/.exec(svg.querySelector('.arrow')!.getAttribute('transform')!)![1]);

    it('draws a mark for every step, numbers on the ends, and the arrow over the asked mark', () => {
      const svg = draw('getallenlijn-1', 40, 7);
      const marks = Array.from(svg.querySelectorAll('.mark'));
      expect(marks.length).toBe(11);
      expect(texts(svg)).toEqual(['40', '50']);
      // At equal steps, left to right
      const gaps = marks.slice(1).map((mark, i) => xOf(mark) - xOf(marks[i]));
      gaps.forEach(gap => expect(gap).toBeCloseTo(gaps[0], 6));
      expect(gaps[0]).toBeGreaterThan(0);
      // The arrow over the eighth mark, 47
      expect(arrowX(svg)).toBeCloseTo(xOf(marks[7]), 6);
      // The fifth mark, 45, a little taller than its neighbours, to count by fives
      expect(marks[5].classList).toContain('half');
      expect(marks[0].classList).toContain('big');
      expect(marks[10].classList).toContain('big');
    });

    it('numbers the middle of a line of twenty, and writes below nought with a minus', () => {
      expect(texts(draw('getallenlijn-20', 0, 13))).toEqual(['0', '10', '20']);
      const svg = draw('getallenlijn-negatief', -10, 4);
      expect(texts(svg)).toEqual(['−10', '0', '10']);
      expect(svg.querySelectorAll('.mark').length).toBe(21);
    });

    it('writes tenths with the school\'s own decimal sign, and big numbers with a space', () => {
      expect(texts(draw('getallenlijn-tiende', 30, 7))).toEqual(['3', '4']);
      expect(texts(draw('getallenlijn-tiende', 0, 7, '.'))).toEqual(['0', '1']);
      expect(texts(draw('getallenlijn-1000', 0, 3000))).toEqual(['0', '10 000']);
    });

    it('says the number beside the arrow once it is answered, inside the drawing at either end (2026-11-28)', () => {
      draw('getallenlijn-1', 40, 7);
      expect(fixture.nativeElement.querySelector('.said')).toBeNull();
      Object.assign(fixture.componentInstance, { said: '47' });
      fixture.detectChanges();
      const said = fixture.nativeElement.querySelector('.arrow .said') as SVGTextElement;
      expect(said.textContent!.trim()).toBe('47');
      // the widest, at the last mark before the end, stays inside the drawing
      fixture.nativeElement.style.width = '290px';
      document.body.appendChild(fixture.nativeElement);
      for (const [form, num1, num2, text] of [['getallenlijn-1000', 0, 9000, '9000'], ['getallenlijn-20', 0, 19, '19'],
        ['getallenlijn-1', 40, 1, '41']] as [NumberLineForm, number, number, string][]) {
        Object.assign(fixture.componentInstance, { form, num1, num2, said: text });
        fixture.detectChanges();
        const box = (fixture.nativeElement.querySelector('svg') as SVGElement).getBoundingClientRect();
        const own = (fixture.nativeElement.querySelector('.said') as SVGElement).getBoundingClientRect();
        expect(own.left).withContext(text).toBeGreaterThanOrEqual(box.left);
        expect(own.right).withContext(text).toBeLessThanOrEqual(box.right);
      }
      fixture.nativeElement.remove();
    });

    it('is read aloud as a number line, never as its answer, and has an arrowhead at each end', () => {
      const svg = draw('getallenlijn-1', 40, 7);
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toBe('Een getallenlijn');
      expect(svg.textContent).not.toContain('47');
      expect(svg.querySelectorAll('.axis-end').length).toBe(2);
    });

    it('keeps every number on the drawing, the ends and the widest, 10 000', () => {
      const svg = draw('getallenlijn-1000', 0, 3000);
      fixture.nativeElement.style.width = '290px';
      document.body.appendChild(fixture.nativeElement);
      const box = svg.getBoundingClientRect();
      svg.querySelectorAll('text').forEach(text => {
        const own = text.getBoundingClientRect();
        expect(own.left).toBeGreaterThanOrEqual(box.left - 0.5);
        expect(own.right).toBeLessThanOrEqual(box.right + 0.5);
        expect(own.bottom).toBeLessThanOrEqual(box.bottom + 0.5);
      });
      fixture.nativeElement.remove();
    });
  });
});

describe('de getallenlijn the other way round: waar hoort 47? (Yobyn, 2026-11-25: "can that be a game")', () => {
  it('asks half of every line the other way round, the same line and number, kept as a read one', () => {
    expect(LINE_PLACE_SHARE).toBe(0.5);
    TOPIC_NAMES.forEach(topic => {
      const sums = made(topic, 400);
      const placed = sums.filter(sum => /^getallenlijn-zet-/.test(sum.form || ''));
      expect(placed.length).withContext(topic).toBeGreaterThan(140);
      expect(placed.length).withContext(topic).toBeLessThan(260);
      placed.forEach(sum => {
        expect(readForm(sum.form)).toBe(sum.form);
        const line = numberLine(sum.form as any, sum.num1, sum.num2);
        expect(line).toEqual(numberLine(lineFormOf(sum.form as any), sum.num1, sum.num2));
        expect(line.labelled).not.toContain(line.arrow);
      });
    });
    expect(placesOf('getallenlijn-zet-tiende')).toBe(1);
    expect(sumLayout({ num1: 40, num2: 7, sign: '+', form: 'getallenlijn-zet-1' }, {} as any)).toEqual({ before: [], after: [] });
    expect(formWorkedStep('getallenlijn-zet-1', 40, 7)).toBe('50 − 3 = 47');
    expect(formWorkedStep('getallenlijn-zet-tiende', 30, 7)).toBe('4 − 3 × 0,1 = 3,7');
  });

  describe('the line to put the arrow on', () => {
    let fixture: ComponentFixture<NumberLineComponent>;
    let line: NumberLineComponent;
    let chosen: number[];

    beforeEach(async () => {
      await TestBed.configureTestingModule({ declarations: [NumberLineComponent] }).compileComponents();
      fixture = TestBed.createComponent(NumberLineComponent);
      line = fixture.componentInstance;
      chosen = [];
      line.choose.subscribe((mark: number) => {
        chosen.push(mark);
        line.chosen = mark;
        fixture.detectChanges();
      });
      Object.assign(line, { form: 'getallenlijn-zet-1', num1: 40, num2: 7, placing: true, chosen: null, label: 'Een getallenlijn',
        hint: 'Tik of sleep de pijl.' });
      fixture.nativeElement.style.cssText = 'display:block;width:300px';
      document.body.appendChild(fixture.nativeElement);
      fixture.detectChanges();
    });

    afterEach(() => fixture.nativeElement.remove());

    const svg = () => fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    const marks = () => Array.from(svg().querySelectorAll('.mark')) as SVGElement[];
    /** A finger on the line, at a mark (a fraction of the way to the next one beside). */
    function finger(type: string, mark: number, off = 0) {
      const box = svg().getBoundingClientRect();
      const [a, b] = [Number(marks()[0].getAttribute('x1')), Number(marks()[1].getAttribute('x1'))];
      const x = a + (b - a) * (mark + off);
      svg().dispatchEvent(new PointerEvent(type, { clientX: box.left + x / 300 * box.width, clientY: box.top + box.height / 2, bubbles: true, pointerId: 1 }));
      fixture.detectChanges();
    }
    const arrowX = () => Number(/translate\(([\d.]+)/.exec(svg().querySelector('.arrow')!.getAttribute('transform')!)![1]);

    it('has no arrow until one is put down, and never gives the number away', () => {
      expect(svg().querySelector('.arrow')).toBeNull();
      expect(svg().textContent).not.toContain('47');
      expect(Array.from(svg().querySelectorAll('text')).map(text => text.textContent!.trim())).toEqual(['40', '50']);
      expect(fixture.nativeElement.querySelector('.hint').textContent).toContain('Tik of sleep de pijl.');
    });

    it('puts the arrow on the mark nearest a tap', () => {
      finger('pointerdown', 7, 0.3);
      finger('pointerup', 7, 0.3);
      expect(chosen).toEqual([7]);
      expect(arrowX()).toBeCloseTo(Number(marks()[7].getAttribute('x1')), 6);
    });

    it('drags the arrow along, a mark at a time, and lets go', () => {
      finger('pointerdown', 2);
      finger('pointermove', 4.4);
      finger('pointermove', 6.6);
      finger('pointerup', 6.6);
      expect(chosen).toEqual([2, 4, 7]);
      finger('pointermove', 9);
      expect(line.chosen).toBe(7);
    });

    it('keeps to the line: a finger past an end is on the end', () => {
      finger('pointerdown', -3);
      expect(line.chosen).toBe(0);
      finger('pointermove', 14);
      expect(line.chosen).toBe(10);
    });

    it('moves the arrow with the arrow keys, from the middle at first, as a slider says it does', () => {
      expect(svg().getAttribute('role')).toBe('slider');
      expect(svg().getAttribute('tabindex')).toBe('0');
      svg().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(line.chosen).toBe(5);
      svg().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      svg().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      fixture.detectChanges();
      expect(line.chosen).toBe(7);
      expect(svg().getAttribute('aria-valuetext')).toBe('47');
    });

    it('stays as it is once answered', () => {
      line.disabled = true;
      fixture.detectChanges();
      finger('pointerdown', 3);
      svg().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      expect(chosen).toEqual([]);
      expect(fixture.nativeElement.querySelector('.hint')).toBeNull();
    });

    it('shows where the child put the arrow, pale, beside where the number goes, once the answer is given (2026-11-26)', () => {
      Object.assign(line, { chosen: 7, missed: 4, disabled: true });
      fixture.detectChanges();
      const arrows = Array.from(svg().querySelectorAll('.arrow')) as SVGElement[];
      expect(arrows.length).toBe(2);
      const at = (arrow: SVGElement) => Number(/translate\(([\d.]+)/.exec(arrow.getAttribute('transform')!)![1]);
      const missed = arrows.find(arrow => arrow.classList.contains('missed'))!;
      const right = arrows.find(arrow => !arrow.classList.contains('missed'))!;
      expect(at(missed)).toBeCloseTo(Number(marks()[4].getAttribute('x1')), 6);
      expect(at(right)).toBeCloseTo(Number(marks()[7].getAttribute('x1')), 6);
      // drawn first, so the right arrow is on top; and paler than it
      expect(arrows.indexOf(missed)).toBeLessThan(arrows.indexOf(right));
      const fill = (arrow: SVGElement) => getComputedStyle(arrow.querySelector('path')!).fill;
      expect(fill(missed)).not.toBe(fill(right));
    });

    it('shows no pale arrow without a miss', () => {
      Object.assign(line, { chosen: 7, missed: null });
      fixture.detectChanges();
      expect(svg().querySelectorAll('.arrow').length).toBe(1);
      expect(svg().querySelector('.arrow.missed')).toBeNull();
    });

    it('is a picture, not a slider, when the line is read', () => {
      Object.assign(line, { form: 'getallenlijn-1', placing: false });
      fixture.detectChanges();
      expect(svg().getAttribute('role')).toBe('img');
      expect(svg().getAttribute('tabindex')).toBeNull();
      finger('pointerdown', 3);
      expect(chosen).toEqual([]);
    });
  });
});
