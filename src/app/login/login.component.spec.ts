import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [ LoginComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('LoginComponent theme', () => {
  let fixture: ComponentFixture<LoginComponent>;

  /** Relative luminance, per the WCAG definition. */
  const luminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map(channel => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  /** Handles both `rgb(...)` from computed styles and `#rrggbb` from tokens. */
  const parse = (colour: string): number[] => {
    const hex = colour.trim().match(/^#([0-9a-f]{6})$/i);
    if (hex) {
      const value = parseInt(hex[1], 16);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    }
    return (colour.match(/\d+/g) || ['0', '0', '0']).slice(0, 3).map(Number);
  };

  const contrast = (foreground: string, background: string): number => {
    const a = luminance(parse(foreground));
    const b = luminance(parse(background));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [LoginComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('sits on a dark surface rather than pure black', () => {
    const card = fixture.nativeElement.querySelector('.login-container');
    const background = parse(getComputedStyle(card).backgroundColor);

    expect(background.every(channel => channel > 0)).toBe(true);
    expect(luminance(background)).toBeLessThan(0.2);
  });

  it('keeps the heading readable against the card (WCAG AA)', () => {
    const card = fixture.nativeElement.querySelector('.login-container');
    const heading = fixture.nativeElement.querySelector('h2');

    const ratio = contrast(
      getComputedStyle(heading).color,
      getComputedStyle(card).backgroundColor
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps typed answers readable in the inputs', () => {
    const input = fixture.nativeElement.querySelector('input');
    const style = getComputedStyle(input);

    expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps placeholder text above the large-text minimum', () => {
    const input = fixture.nativeElement.querySelector('input');
    const style = getComputedStyle(input);
    // The placeholder colour is a token; check the token itself resolves dark-safe
    const dim = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-dim').trim();

    expect(dim).toBeTruthy();
    expect(contrast(dim, style.backgroundColor)).toBeGreaterThanOrEqual(3);
  });
});

describe('LoginComponent guest play', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let auth: AuthService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule, HttpClientTestingModule],
      declarations: [LoginComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('offers a way in without an account', () => {
    const button = fixture.nativeElement.querySelector('.guest-btn');

    expect(button).toBeTruthy();
    expect(button.textContent.trim()).toBe('Play without an account');
  });

  it('takes a guest straight to picking a grade', () => {
    fixture.nativeElement.querySelector('.guest-btn').click();

    expect(auth.isGuest()).toBe(true);
    expect(router.navigate).toHaveBeenCalledWith(['/grade']);
  });

  it('gives the guest button a thumb-sized target', () => {
    const button = fixture.nativeElement.querySelector('.guest-btn');

    expect(parseFloat(getComputedStyle(button).minHeight)).toBeGreaterThanOrEqual(44);
  });

  it('hides the guest route while resetting a password', () => {
    component.forgotPassword();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.guest-btn')).toBeNull();
  });
});
