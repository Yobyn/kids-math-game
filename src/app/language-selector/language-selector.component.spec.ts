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
