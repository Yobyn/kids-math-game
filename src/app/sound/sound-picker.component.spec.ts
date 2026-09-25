import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageService } from '../services/language.service';
import { SoundService } from '../services/sound.service';
import { SOUND_SET_IDS } from './sound-choice';
import { PICKER_OPTIONS, PICKER_WORDS, SoundPickerComponent } from './sound-picker.component';
import { SoundPickerModule } from './sound-picker.module';

describe('SoundPickerComponent', () => {
  let fixture: ComponentFixture<SoundPickerComponent>;
  let component: SoundPickerComponent;
  let sound: SoundService;
  let played: string[];

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('soundSet', 'bubbles');
    await TestBed.configureTestingModule({ imports: [SoundPickerModule] }).compileComponents();
    sound = TestBed.inject(SoundService);
    played = [];
    sound.loader = () => Promise.resolve({ play: (choice: string, event: string) => { played.push(`${choice}:${event}`); } });
    fixture = TestBed.createComponent(SoundPickerComponent);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
    localStorage.clear();
  });

  const options = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('.option'));

  it('offers every set, then no sound', () => {
    expect(options().map(b => b.getAttribute('data-choice'))).toEqual([...SOUND_SET_IDS, 'off']);
    expect(PICKER_OPTIONS.length).toBe(SOUND_SET_IDS.length + 1);
    options().forEach(b => expect(b.querySelector('.icon')!.textContent!.trim().length).toBeGreaterThan(0));
  });

  it('is a labelled dialog, with the options as one group of choices', () => {
    const panel = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    const title = fixture.nativeElement.querySelector('#' + panel.getAttribute('aria-labelledby'));
    expect(title.textContent).toContain('Pick your sounds');
    expect(fixture.nativeElement.querySelector('[role="radiogroup"]')).toBeTruthy();
    options().forEach(b => {
      expect(b.getAttribute('role')).toBe('radio');
      expect(b.getAttribute('type')).toBe('button');
    });
  });

  it('shows which set is picked now, and starts the keyboard there', () => {
    const checked = options().filter(b => b.getAttribute('aria-checked') === 'true');
    expect(checked.map(b => b.getAttribute('data-choice'))).toEqual(['bubbles']);
    expect(checked[0].classList).toContain('chosen');
    expect(document.activeElement).toBe(checked[0]);
  });

  it('picks, remembers and plays a set when it is tapped', async () => {
    options()[2].click();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));
    expect(sound.choiceValue).toBe('retro');
    expect(localStorage.getItem('soundSet')).toBe('retro');
    expect(played).toEqual(['retro:correct']);
    expect(options()[2].getAttribute('aria-checked')).toBe('true');
    expect(options().filter(b => b.classList.contains('chosen')).length).toBe(1);
  });

  it('bounces the one that was tapped, on the next frame', async () => {
    options()[0].click();
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)));
    fixture.detectChanges();
    expect(component.played).toBe('chimes');
    expect(options()[0].classList).toContain('played');
  });

  it('turns sound off with "no sound", and plays nothing to say so', async () => {
    options()[options().length - 1].click();
    await new Promise(resolve => setTimeout(resolve));
    expect(sound.choiceValue).toBe('off');
    expect(played).toEqual([]);
  });

  it('closes on the close button, on the dim outside, and on Escape', () => {
    let closed = 0;
    component.closed.subscribe(() => closed++);
    fixture.nativeElement.querySelector('.close').click();
    fixture.nativeElement.querySelector('.backdrop').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(3);
  });

  it('moves between options with the arrow keys, round the ends', () => {
    const buttons = options();
    const press = (key: string, index: number) =>
      buttons[index].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    press('ArrowRight', 3);
    expect(document.activeElement).toBe(buttons[4]);
    press('ArrowLeft', 0);
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    press('ArrowDown', buttons.length - 1);
    expect(document.activeElement).toBe(buttons[0]);
    press('ArrowUp', 1);
    expect(document.activeElement).toBe(buttons[0]);
    // Other keys are left alone
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    buttons[2].dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(false);
  });

  it('speaks the child’s language', () => {
    TestBed.inject(LanguageService).setLanguage('nl');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Kies je geluiden');
    expect(options()[3].textContent).toContain('Bubbels');
    expect(options()[5].textContent).toContain('Geen geluid');
  });

  it('has every word in every language', () => {
    const keys = Object.keys(PICKER_WORDS.en);
    expect(keys).toEqual(jasmine.arrayContaining(['title', 'hint', 'close', 'off', ...SOUND_SET_IDS]));
    (Object.keys(PICKER_WORDS) as Array<keyof typeof PICKER_WORDS>).forEach(lang => {
      expect(Object.keys(PICKER_WORDS[lang]).sort()).toEqual([...keys].sort(), lang);
      keys.forEach(key => expect(PICKER_WORDS[lang][key].trim().length).toBeGreaterThan(0, `${lang} ${key}`));
    });
  });
});
