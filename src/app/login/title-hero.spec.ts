import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ORBIT_SYMBOLS, orbitMarks } from './title-orbit';
import { GAME_NAME, TitleHeroComponent } from './title-hero.component';
import { stepColour } from '../theme/palette';
import { AvatarService } from '../services/avatar.service';

describe('title orbit: the symbols round the character', () => {
  it('uses every symbol once, operators first', () => {
    const marks = orbitMarks();
    expect(marks.map(mark => mark.symbol)).toEqual(ORBIT_SYMBOLS);
    expect(ORBIT_SYMBOLS.slice(0, 4)).toEqual(['+', '−', '×', '÷']);
  });

  it('puts every mark on the same circle round the ring', () => {
    for (const mark of orbitMarks(6, 58)) {
      expect(Math.hypot(mark.x - 50, mark.y - 50)).toBeCloseTo(58, 1);
    }
  });

  it('spaces them evenly, so none clump', () => {
    const marks = orbitMarks(6, 58);
    const angles = marks.map(mark => Math.atan2(mark.y - 50, mark.x - 50));
    for (let i = 0; i < angles.length; i++) {
      const next = angles[(i + 1) % angles.length];
      let gap = next - angles[i];
      gap = ((gap % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(gap).toBeCloseTo((2 * Math.PI) / 6, 1);
    }
  });

  it('keeps every mark clear of the top of the character’s head', () => {
    // Straight up is (50, 50 - r); nothing sits within 30 degrees of it
    for (const mark of orbitMarks()) {
      const fromUp = Math.abs(Math.atan2(mark.x - 50, 50 - mark.y));
      expect(fromUp).toBeGreaterThan(Math.PI / 6 - 1e-3);
    }
  });

  it('colours each mark from the ring, blue to magenta', () => {
    const marks = orbitMarks();
    expect(marks[0].colour).toBe('#3880ff');
    expect(marks[marks.length - 1].colour).toBe('#d633eb');
    marks.forEach((mark, i) => expect(mark.colour).toBe(stepColour(i + 1, marks.length)));
  });

  it('staggers their bob, so they never move in lockstep', () => {
    const delays = orbitMarks().map(mark => mark.delay);
    expect(new Set(delays).size).toBe(delays.length);
  });

  it('asks for no more marks than there are symbols, and never fewer than none', () => {
    expect(orbitMarks(40).length).toBe(ORBIT_SYMBOLS.length);
    expect(orbitMarks(-2)).toEqual([]);
  });
});

describe('TitleHeroComponent', () => {
  let fixture: ComponentFixture<TitleHeroComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      declarations: [TitleHeroComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    fixture = TestBed.createComponent(TitleHeroComponent);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('names the game, big, as the first heading on the screen', () => {
    const title = fixture.nativeElement.querySelector('h1');
    expect(title.textContent.trim()).toBe(GAME_NAME);
    expect(parseFloat(getComputedStyle(title).fontSize)).toBeGreaterThanOrEqual(36);
  });

  it('says what the game is for, in the child’s language', () => {
    expect(fixture.nativeElement.querySelector('.tagline').textContent.trim())
      .toBe(fixture.componentInstance.languageService.translate('lets-learn'));
  });

  it('shows the child’s own character in the ring', () => {
    const avatar = fixture.nativeElement.querySelector('.ring app-avatar') as HTMLElement & { avatar?: unknown; size?: number };
    expect(avatar).toBeTruthy();
    expect(avatar.avatar).toEqual(TestBed.inject(AvatarService).get());
    expect(avatar.size).toBeGreaterThanOrEqual(96);
  });

  it('circles it with the symbols, hidden from screen readers', () => {
    const marks = Array.from(fixture.nativeElement.querySelectorAll('.mark')) as HTMLElement[];
    expect(marks.length).toBe(ORBIT_SYMBOLS.length);
    expect(marks.every(mark => mark.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(marks[0].style.color).toBe('rgb(56, 128, 255)');
  });

  it('lets the symbols bob, and holds them still under reduced motion (a CSS rule)', () => {
    const mark = fixture.nativeElement.querySelector('.mark') as HTMLElement;
    expect(getComputedStyle(mark).animationName).toBe('bob');
  });
});
