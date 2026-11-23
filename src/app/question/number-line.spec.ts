import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CURRICULUM, Moment, Random, TOPICS } from '../teaching/school/groep';
import { formWorkedStep, lineValue, markValue, numberLine, sumLayout } from '../teaching/school/written-form';
import { NUMBER_LINE_FORMS, NumberLineForm, placesOf, readForm } from './sum-form';
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
      expect(NUMBER_LINE_FORMS).toContain(sum.form as NumberLineForm);
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
