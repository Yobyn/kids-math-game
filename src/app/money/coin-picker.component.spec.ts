import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoinPickerComponent } from './coin-picker.component';
import { CoinsComponent } from './coins.component';
import { LanguageService } from '../services/language.service';

describe('CoinPickerComponent', () => {
  let fixture: ComponentFixture<CoinPickerComponent>;
  let component: CoinPickerComponent;

  const coins = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.piece'));
  const purseCoins = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.purse .piece'));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CoinPickerComponent, CoinsComponent],
      providers: [LanguageService],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CoinPickerComponent);
    component = fixture.componentInstance;
    component.tray = [50, 20, 10, 5];
    component.picked = [];
    fixture.detectChanges();
  });

  it('draws every coin on the tray', () => {
    expect(coins().length).toBe(4);
  });

  it('makes each one a real button, not a picture that happens to respond', () => {
    coins().forEach(coin => expect(coin.tagName.toLowerCase()).toBe('button'));
  });

  it('never puts a coin under a fingertip', () => {
    // 44px, the floor this project has broken three times while compressing
    coins().forEach(coin => {
      const rect = coin.getBoundingClientRect();
      expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44);
    });
  });

  it('says what tapping one will do, for a child who cannot see it', () => {
    coins().forEach(coin => {
      const label = coin.getAttribute('aria-label') || '';
      expect(label.length).toBeGreaterThan(2);
      expect(label).toContain(coin.textContent!.trim());
    });
  });

  it('hands back which coin was tapped', () => {
    const taken: number[] = [];
    component.take.subscribe((index: number) => taken.push(index));

    coins()[2].click();

    expect(taken).toEqual([2]);
  });

  it('hands back which coin was taken out of the purse', () => {
    component.picked = [20, 20, 5];
    fixture.detectChanges();
    const back: number[] = [];
    component.putBack.subscribe((index: number) => back.push(index));

    purseCoins()[1].click();

    expect(back).toEqual([1]);
  });

  it('adds up what is in the purse as it fills', () => {
    component.picked = [50, 20, 5];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.so-far').textContent).toContain('75c');
  });

  it('reads the total out as it changes', () => {
    // A child who cannot see the coins still has to know what is down
    expect(fixture.nativeElement.querySelector('.so-far').getAttribute('aria-live'))
      .toBe('polite');
  });

  it('writes the total the way the band writes amounts', () => {
    component.picked = [100, 20, 5];
    component.decimal = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.so-far').textContent).toContain('€1.25');

    component.decimal = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.so-far').textContent).toContain('€1 and 25c');
  });

  it('draws a purse a child can actually see', () => {
    // It was white at 35% opacity on a white card once: present in the DOM,
    // invisible on the screen, and passing every test that did not look
    const purse = fixture.nativeElement.querySelector('.purse');
    const style = getComputedStyle(purse);
    const channels = (colour: string) =>
      (colour.match(/\d+/g) || ['255', '255', '255']).slice(0, 3).map(Number);
    const [r, g, b] = channels(style.borderTopColor);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    expect(parseFloat(style.borderTopWidth)).toBeGreaterThanOrEqual(2);
    // The card behind it is near white, so the edge has to be well below it
    expect(luminance).toBeLessThan(0.85);
  });

  it('holds the purse open while it is empty, so the tray does not jump', () => {
    const purse = fixture.nativeElement.querySelector('.purse');

    expect(purse.getBoundingClientRect().height).toBeGreaterThan(40);
  });

  it('never counts the coins at a child', () => {
    // Any combination that makes the amount is right, so a count only
    // invites hunting for a shorter one — a different lesson entirely
    component.picked = [20, 20, 20, 10, 5];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toMatch(/\b5\s*(coins|munten|monedas)\b/i);
  });

  it('stops offering to move coins once the question is answered', () => {
    component.disabled = true;
    fixture.detectChanges();

    coins().forEach(coin => expect(coin.tagName.toLowerCase()).toBe('span'));
  });
});
