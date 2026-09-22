import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeypadComponent } from './keypad.component';
import { KEYPAD_KEYS } from './answer-entry';

describe('KeypadComponent', () => {
  let fixture: ComponentFixture<KeypadComponent>;
  let component: KeypadComponent;

  function keys(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.key'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KeypadComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KeypadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('draws a key for every key there is', () => {
    expect(keys().length).toBe(KEYPAD_KEYS.length);
  });

  it('carries its own styles, which is the point of the move', () => {
    // Angular scopes a component's CSS to its own template, so rules left
    // behind in the question screen's stylesheet would simply not match
    const key = keys()[0];

    expect(getComputedStyle(key).borderRadius).not.toBe('0px');
    expect(getComputedStyle(key).minHeight).not.toBe('0px');
  });

  it('keeps the keys light, like everything else there is to read', () => {
    const luminance = (colour: string): number => {
      const parts = (colour.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
      const [r, g, b] = parts.map(channel => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    expect(luminance(getComputedStyle(keys()[0]).backgroundColor)).toBeGreaterThan(0.7);
  });

  it('gives every key a tap target a child can hit', () => {
    keys().forEach(key => {
      expect(parseFloat(getComputedStyle(key).minHeight)).toBeGreaterThanOrEqual(44);
    });
  });

  it('names the delete key for anyone reading by ear', () => {
    const del = keys().find(key => key.getAttribute('aria-label') === 'delete');

    expect(del).toBeTruthy();
    expect(del!.textContent!.trim()).not.toBe('delete');
  });

  it('says which key was pressed and nothing about what it means', () => {
    const pressed: string[] = [];
    component.press.subscribe((key: string) => pressed.push(key));

    keys()[0].click();
    expect(pressed).toEqual([KEYPAD_KEYS[0]]);
  });

  it('goes quiet when it is disabled', () => {
    const pressed: string[] = [];
    component.press.subscribe((key: string) => pressed.push(key));
    component.disabled = true;
    fixture.detectChanges();

    keys()[0].click();
    component.onPress('9');

    expect(pressed).toEqual([]);
    expect(keys()[0].disabled).toBe(true);
  });

  it('marks the keys that are not digits, so they read differently', () => {
    const marked = keys().filter(key => key.classList.contains('key-action'));

    expect(marked.length).toBe(2);
    expect(marked.map(key => key.getAttribute('aria-label')).sort()).toEqual(['-', 'delete']);
  });
});
