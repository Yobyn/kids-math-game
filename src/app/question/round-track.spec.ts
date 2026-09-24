import { ComponentFixture, TestBed } from '@angular/core/testing';
import { currentStep, roundPips } from './round-track';
import { RoundTrackComponent } from './round-track.component';
import { stepColour } from '../theme/palette';

describe('round track: the pips', () => {
  it('has one pip per question', () => {
    expect(roundPips(0, 10).length).toBe(10);
    expect(roundPips(0, 5).length).toBe(5);
  });

  it('lights the questions done, rings the one the child is on, and leaves the rest', () => {
    expect(roundPips(3, 6).map(pip => pip.state))
      .toEqual(['done', 'done', 'done', 'current', 'ahead', 'ahead']);
  });

  it('starts with nothing lit and the first question current', () => {
    const pips = roundPips(0, 10);
    expect(pips[0].state).toBe('current');
    expect(pips.filter(pip => pip.state === 'done').length).toBe(0);
  });

  it('has no current question once every one is done', () => {
    expect(roundPips(10, 10).every(pip => pip.state === 'done')).toBe(true);
  });

  it('never lights more pips than there are, or fewer than none', () => {
    expect(roundPips(14, 10).filter(pip => pip.state === 'done').length).toBe(10);
    expect(roundPips(-3, 10)[0].state).toBe('current');
    expect(roundPips(NaN, 10)[0].state).toBe('current');
    expect(roundPips(3, NaN)).toEqual([]);
    expect(roundPips(3, -1)).toEqual([]);
  });

  it('walks the ring from its blue to its magenta, as the grade cards do', () => {
    const pips = roundPips(0, 10);
    expect(pips[0].colour).toBe('#3880ff');
    expect(pips[9].colour).toBe('#d633eb');
    pips.forEach(pip => expect(pip.colour).toBe(stepColour(pip.step, 10)));
  });

  it('never says which answers were right: a pip has a step, a state and a colour, nothing else', () => {
    roundPips(4, 10).forEach(pip => expect(Object.keys(pip).sort()).toEqual(['colour', 'state', 'step']));
  });

  it('keeps each pip’s colour as the round goes on', () => {
    const before = roundPips(2, 10).map(pip => pip.colour);
    const after = roundPips(7, 10).map(pip => pip.colour);
    expect(after).toEqual(before);
  });
});

describe('round track: the question a child is on', () => {
  it('is one past the questions done', () => {
    expect(currentStep(0, 10)).toBe(1);
    expect(currentStep(4, 10)).toBe(5);
  });

  it('never runs past the last question, or below the first', () => {
    expect(currentStep(10, 10)).toBe(10);
    expect(currentStep(99, 10)).toBe(10);
    expect(currentStep(-5, 10)).toBe(1);
    expect(currentStep(3, 0)).toBe(0);
  });
});

describe('RoundTrackComponent', () => {
  let fixture: ComponentFixture<RoundTrackComponent>;

  beforeEach(async () => {
    localStorage.removeItem('language');
    await TestBed.configureTestingModule({ declarations: [RoundTrackComponent] }).compileComponents();
    fixture = TestBed.createComponent(RoundTrackComponent);
  });

  function render(inputs: Partial<RoundTrackComponent>) {
    Object.assign(fixture.componentInstance, inputs);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('colours each pip from the ring', () => {
    const page = render({ answered: 2, total: 10 });
    const pips = Array.from(page.querySelectorAll('.pip')) as HTMLElement[];
    expect(pips.length).toBe(10);
    expect(pips[0].style.getPropertyValue('--pip')).toBe('#3880ff');
    expect(getComputedStyle(pips[0]).backgroundColor).toBe('rgb(56, 128, 255)');
    expect(pips[2].classList).toContain('current');
  });

  it('makes the current pip stand out from the ones ahead', () => {
    const page = render({ answered: 2, total: 10 });
    const current = page.querySelector('.pip.current') as HTMLElement;
    const ahead = page.querySelectorAll('.pip')[5] as HTMLElement;
    expect(current.getBoundingClientRect().height).toBeGreaterThan(ahead.getBoundingClientRect().height);
  });

  it('tells assistive tech where the child is, in words', () => {
    const bar = render({ answered: 6, total: 10 }).querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute('aria-label')).toBe('Question 7 of 10');
    expect(bar.getAttribute('aria-valuenow')).toBe('6');
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
  });

  it('hides the pips themselves from screen readers', () => {
    const pips = Array.from(render({}).querySelectorAll('.pip'));
    expect(pips.every(pip => pip.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('shows the score, and names it for assistive tech', () => {
    const chip = render({ score: 14 }).querySelector('.score-chip')!;
    expect(chip.textContent).toContain('14');
    expect(chip.getAttribute('aria-label')).toBe('Score: 14');
  });

  it('shows a streak only from three in a row', () => {
    expect(render({ streak: 2 }).querySelector('.streak-chip')).toBeNull();
    const chip = render({ streak: 3 }).querySelector('.streak-chip')!;
    expect(chip.textContent).toContain('3');
  });

  it('shows no "out of" to the child', () => {
    const text = (render({ answered: 3, total: 10 }).querySelector('.round-track') as HTMLElement).innerText;
    expect(text).not.toMatch(/\bof\b|\/\s*10|Question/);
  });
});
