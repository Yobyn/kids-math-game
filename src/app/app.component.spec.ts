import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SoundService } from './services/sound.service';
import { AuthService } from './services/auth.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('shows no header before a child has chosen how to play', () => {
    expect(fixture.nativeElement.querySelector('.app-header')).toBeNull();
  });

  it('gives a guest the same header controls, minus a logout', () => {
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('.app-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toContain('Player');
    expect(header.querySelector('.sound-btn')).toBeTruthy();
    expect(header.textContent).toContain('Sign in');
    expect(header.textContent).not.toContain('Logout');
  });

  it('starts with sound enabled', () => {
    expect(component.soundEnabled).toBe(true);
  });

  it('toggles sound off and back on', () => {
    component.toggleSound();
    expect(component.soundEnabled).toBe(false);

    component.toggleSound();
    expect(component.soundEnabled).toBe(true);
  });

  it('remembers the muted choice for the next visit', () => {
    component.toggleSound();
    expect(localStorage.getItem('soundEnabled')).toBe('false');

    const service = new SoundService();
    expect(service.enabledValue).toBe(false);
  });
});
