import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { DifficultySelectComponent } from './difficulty-select.component';
import { ProgressService } from '../services/progress.service';

describe('DifficultySelectComponent', () => {
  let fixture: ComponentFixture<DifficultySelectComponent>;
  let component: DifficultySelectComponent;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [DifficultySelectComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DifficultySelectComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers a card for every difficulty', () => {
    const cards = fixture.nativeElement.querySelectorAll('.difficulty-card');
    expect(cards.length).toBe(component.difficulties.length);
  });

  it('exposes each card to assistive tech as a button', () => {
    const card = fixture.nativeElement.querySelector('.difficulty-card');

    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
  });

  it('edges the cards in the ring\u2019s colours, not a traffic light', () => {
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.difficulty-card')) as HTMLElement[];
    // Blue, violet, magenta: the old green/yellow/red rules outranked these
    expect(getComputedStyle(cards[0]).borderTopColor).toBe('rgb(56, 128, 255)');
    expect(getComputedStyle(cards[2]).borderTopColor).toBe('rgb(214, 51, 235)');
  });

  it('draws each difficulty as a climb, and never as stars', () => {
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.difficulty-card')) as HTMLElement[];
    cards.forEach(card => {
      expect(card.querySelector('svg.climb path')).toBeTruthy();
      expect(card.textContent).not.toMatch(/[★⭐🌟]/);
    });
    expect(cards[2].querySelector('.flag')).toBeTruthy();
    expect(cards[0].querySelector('.flag')).toBeNull();
  });

  it('names the climbs without the word "Level", which belongs to the character', () => {
    const t = (key: any) => component.languageService.translate(key);
    const names = Array.from(fixture.nativeElement.querySelectorAll('.difficulty-card h2') as NodeListOf<HTMLElement>)
      .map(h => h.textContent!.trim());
    expect(names).toEqual([t('climb-easy'), t('climb-medium'), t('climb-hard')]);
    names.forEach(name => expect(name).not.toContain(t('level')));
  });

  it('can be chosen with the keyboard, not just a tap', () => {
    const card = fixture.nativeElement.querySelector('.difficulty-card');
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(localStorage.getItem('difficulty')).toBe(component.difficulties[0].level);
  });

  it('counts the 96px minimum from the edge a finger lands on, on a phone', () => {
    // Measured from the content box, the minimum came on top of the padding
    // and border: every card was 125px, and the third climb ended 99px
    // below a 360x640 screen
    if (!window.matchMedia('(max-width: 560px)').matches) {
      pending('the window is wider than a phone');
      return;
    }
    const cards = Array.from(fixture.nativeElement.querySelectorAll('.difficulty-card')) as HTMLElement[];
    cards.forEach(card => {
      expect(getComputedStyle(card).boxSizing).toBe('border-box');
      expect(card.getBoundingClientRect().height).toBeGreaterThanOrEqual(96);
    });
  });
});

describe('DifficultySelectComponent suggesting a setting', () => {
  let fixture: ComponentFixture<DifficultySelectComponent>;
  let component: DifficultySelectComponent;
  let progress: ProgressService;

  function played(percentage: number, difficulty: string, grade = 2) {
    progress.record({
      correctAnswers: Math.round(percentage / 10),
      total: 10,
      percentage,
      score: 20,
      grade,
      difficulty
    });
  }

  function open() {
    fixture = TestBed.createComponent(DifficultySelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [DifficultySelectComponent]
    }).compileComponents();

    progress = TestBed.inject(ProgressService);
    localStorage.setItem('grade', '2');
  });

  afterEach(() => localStorage.clear());

  it('says nothing to a child arriving for the first time', () => {
    open();

    expect(component.suggested).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.difficulty-card.suggested')).toBeNull();
    expect(fixture.nativeElement.querySelector('.suggestion')).toBeNull();
  });

  it('marks a harder card after two rounds that were too easy', () => {
    played(90, 'easy');
    played(95, 'easy');
    open();

    const marked = fixture.nativeElement.querySelector('.difficulty-card.suggested');
    expect(component.suggested).toBe('medium');
    expect(marked).toBeTruthy();
    expect(marked.textContent).toContain('Ready for this one?');
  });

  it('marks an easier card after two rounds that were too hard', () => {
    played(30, 'hard');
    played(20, 'hard');
    open();

    expect(component.suggested).toBe('medium');
    expect(fixture.nativeElement.querySelector('.suggestion').textContent.trim())
      .toBe('Try this one today');
  });

  it('marks exactly one card, never two', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();

    expect(fixture.nativeElement.querySelectorAll('.difficulty-card.suggested').length).toBe(1);
  });

  it('leaves every card just as choosable as before', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();

    // The point of advising rather than deciding: nothing is taken away
    const cards = fixture.nativeElement.querySelectorAll('.difficulty-card');
    expect(cards.length).toBe(3);
    cards.forEach((card: HTMLElement) => {
      expect(card.hasAttribute('disabled')).toBe(false);
      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
    });
  });

  it('still lets a child pick a card the game did not suggest', () => {
    played(95, 'easy');
    played(95, 'easy');
    open();
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    // Suggested medium; the child picks hard anyway
    fixture.nativeElement.querySelectorAll('.difficulty-card')[2].click();

    expect(localStorage.getItem('difficulty')).toBe('hard');
    expect(router.navigate).toHaveBeenCalledWith(['/questions']);
  });

  it('tells a screen reader why a card is marked', () => {
    played(90, 'easy');
    played(90, 'easy');
    open();

    const marked = fixture.nativeElement.querySelector('.difficulty-card.suggested');
    const plain = fixture.nativeElement.querySelector('.difficulty-card:not(.suggested)');

    expect(marked.getAttribute('aria-label')).toContain('Ready for this one?');
    expect(plain.getAttribute('aria-label')).not.toContain('Ready');
  });

  it('says nothing about a grade the child has not played', () => {
    played(95, 'easy', 2);
    played(95, 'easy', 2);
    localStorage.setItem('grade', '5');
    open();

    expect(component.suggested).toBeUndefined();
  });

  describe('on the smallest phone, 320 by 568 (2026-11-02)', () => {
    /** The screen as rendered, with its styles, in a frame the size of a phone: its own media queries apply there. */
    function onPhone(width: number, height: number): Promise<Document> {
      const screen = TestBed.createComponent(DifficultySelectComponent);
      screen.detectChanges();
      const frame = document.createElement('iframe');
      frame.style.cssText = `width:${width}px;height:${height}px;border:0;position:absolute;left:-2000px;top:0`;
      document.body.appendChild(frame);
      // every rule the page has, the component's own (scoped to its attributes) among them
      const rules = Array.from(document.styleSheets).map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
        } catch {
          return '';
        }
      }).join('\n');
      const styles = `<style>${rules}</style>`;
      const doc = frame.contentDocument!;
      doc.open();
      doc.write(`<!doctype html><html><head>${styles}</head><body style="margin:0">${screen.nativeElement.outerHTML}</body></html>`);
      doc.close();
      return new Promise(resolve => setTimeout(() => resolve(doc), 50));
    }

    afterEach(() => document.querySelectorAll('iframe').forEach(frame => frame.remove()));

    it('narrows the climb and tightens the cards, so all three climbs come up on screen', async () => {
      const doc = await onPhone(320, 568);
      const card = doc.querySelector('.difficulty-card') as HTMLElement;
      const climb = doc.querySelector('.climb') as Element;
      expect(getComputedStyle(climb).width).toBe('64px');
      expect(getComputedStyle(card).paddingTop).toBe('9.6px');
      expect(getComputedStyle(doc.querySelector('.difficulty-cards')!).rowGap).toBe('8px');
      // still a card a finger lands on: 96px at the least
      Array.from(doc.querySelectorAll('.difficulty-card')).forEach(each =>
        expect(each.getBoundingClientRect().height).toBeGreaterThanOrEqual(96));
    });

    it('leaves the phones it already fitted as they were: 360 by 740, 390 by 844', async () => {
      for (const [width, height] of [[360, 740], [390, 844]]) {
        const doc = await onPhone(width, height);
        expect(getComputedStyle(doc.querySelector('.climb')!).width).withContext(`${width}`).toBe('84px');
        expect(getComputedStyle(doc.querySelector('.difficulty-card')!).paddingTop).withContext(`${width}`).toBe('16px');
        document.querySelectorAll('iframe').forEach(frame => frame.remove());
      }
    });
  });
});
