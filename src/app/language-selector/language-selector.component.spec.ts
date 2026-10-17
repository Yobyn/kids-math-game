import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSelectorComponent } from './language-selector.component';
import { LanguageService } from '../services/language.service';

describe('LanguageSelectorComponent', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let component: LanguageSelectorComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [LanguageSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers every language the app is translated into', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.lang-btn');

    expect(buttons.length).toBe(3);
    expect(component.languages.map(l => l.code)).toEqual(['en', 'nl', 'es']);
  });

  it('offers Spanish, which the translations already carry', () => {
    const labels = [...fixture.nativeElement.querySelectorAll('.lang-name')]
      .map((el: any) => el.textContent.trim());

    expect(labels).toContain('Español');
  });

  it('switches and stores the language when tapped', () => {
    const spanish = fixture.nativeElement.querySelectorAll('.lang-btn')[2];
    spanish.click();

    expect(localStorage.getItem('language')).toBe('es');
  });

  it('marks the active language for the child to see', () => {
    TestBed.inject(LanguageService).setLanguage('nl');
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelectorAll('.lang-btn.active');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('Nederlands');
  });
});

describe('LanguageSelectorComponent on a small screen', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let component: LanguageSelectorComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [LanguageSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('names every language for a screen reader, not just with a flag', () => {
    // On a phone the visible name is hidden to fit the header; a flag emoji
    // alone is not a name, so the label has to carry it.
    const buttons = fixture.nativeElement.querySelectorAll('.lang-btn');

    expect(buttons.length).toBe(component.languages.length);
    component.languages.forEach((language, index) => {
      expect(buttons[index].getAttribute('aria-label')).toBe(language.name);
    });
  });

  it('keeps the written name in the document, only hiding it visually', () => {
    const names = Array.from(fixture.nativeElement.querySelectorAll('.lang-name'))
      .map((el: any) => el.textContent.trim());

    expect(names).toEqual(component.languages.map(l => l.name));
  });

  it('never shrinks a language button below a finger', () => {
    // The label may go, but the target must not go with it
    const button = fixture.nativeElement.querySelector('.lang-btn');
    const style = getComputedStyle(button);

    expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
  });

  it('lets the row wrap rather than run off the side of the screen', () => {
    const selector = fixture.nativeElement.querySelector('.language-selector');

    expect(getComputedStyle(selector).flexWrap).toBe('wrap');
  });

  it('still switches language when a flag is tapped', () => {
    fixture.nativeElement.querySelectorAll('.lang-btn')[1].click();

    expect(localStorage.getItem('language')).toBe('nl');
  });
});

describe('LanguageSelectorComponent on the title screen of a phone', () => {
  let fixture: ComponentFixture<LanguageSelectorComponent>;
  let screen: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [LanguageSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSelectorComponent);
    // Where the login screen puts it, 320px wide like the smallest phone
    screen = document.createElement('div');
    screen.className = 'title-screen';
    screen.style.width = '320px';
    screen.appendChild(fixture.nativeElement);
    document.body.appendChild(screen);
    fixture.detectChanges();
  });

  afterEach(() => {
    screen.remove();
    localStorage.clear();
  });

  it('fits all three on one row, each still big enough for a finger', () => {
    // A media query on the window, and karma cannot resize its window: this
    // only runs where the runner's window is phone-sized
    if (!window.matchMedia('(max-width: 600px)').matches) {
      pending('the window is wider than a phone');
      return;
    }
    const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.lang-btn'));
    const boxes = buttons.map(b => b.getBoundingClientRect());

    expect(new Set(boxes.map(b => Math.round(b.top))).size).toBe(1);
    boxes.forEach(b => {
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    });
    buttons.forEach(b => expect(b.scrollWidth).toBeLessThanOrEqual(b.clientWidth + 1));
  });
});
