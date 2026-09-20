import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SoundService } from './services/sound.service';

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
