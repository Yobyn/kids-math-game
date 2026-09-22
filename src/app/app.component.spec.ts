import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { SoundService } from './services/sound.service';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { PwaService } from './services/pwa.service';

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

  it('puts the child\u2019s own character in the header, as a way in to changing it', () => {
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.avatar-button');
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('Your character');
    expect(button.querySelector('app-avatar')).toBeTruthy();
  });

  it('opens the character screen when the header character is tapped', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.avatar-button').click();

    expect(router.navigate).toHaveBeenCalledWith(['/avatar']);
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

describe('AppComponent: a new version arriving', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let pwa: PwaService;

  /** Pretends a version is waiting, as PwaService would report it. */
  function waiting(version: string | null = 'math-game-abc') {
    spyOn(pwa, 'isReady').and.returnValue(true);
    (pwa as any).waitingVersion.next(version);
  }

  function arriveAt(route: string) {
    (component as any).route = route;
    (component as any).considerUpdate();
    fixture.detectChanges();
  }

  const strip = () => fixture.nativeElement.querySelector('.update-offer');

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    pwa = TestBed.inject(PwaService);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('knows where the child is without waiting for them to navigate', () => {
    // The initial navigation finishes before ngOnInit subscribes, so a
    // component that only listens for NavigationEnd thinks it is at '/'
    // for the whole session
    expect((component as any).route).toBe(TestBed.inject(Router).url);
  });

  it('says nothing while no version is waiting', () => {
    arriveAt('/grade');

    expect(strip()).toBeNull();
  });

  it('tells the child between rounds', () => {
    waiting();
    arriveAt('/grade');

    expect(strip()).toBeTruthy();
    expect(strip().textContent).toContain('new version');
  });

  it('NEVER tells them while a question is on screen', () => {
    waiting();
    arriveAt('/questions');

    expect(strip()).toBeNull();
  });

  it('follows them from a question to the grade screen', () => {
    waiting();
    arriveAt('/questions');
    expect(strip()).toBeNull();

    arriveAt('/result');

    expect(strip()).toBeTruthy();
  });

  it('gives the waiting worker the word, only when the child says so', () => {
    const apply = spyOn(pwa, 'apply');
    waiting();
    arriveAt('/grade');
    expect(apply).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.update-yes').click();

    expect(apply).toHaveBeenCalled();
  });

  it('remembers a "later" against that version and stops asking', () => {
    waiting('math-game-abc');
    arriveAt('/grade');

    fixture.nativeElement.querySelector('.update-later').click();
    fixture.detectChanges();
    expect(strip()).toBeNull();

    arriveAt('/result');
    expect(strip()).toBeNull();
  });

  it('asks again when a newer version turns up', () => {
    waiting('math-game-abc');
    arriveAt('/grade');
    fixture.nativeElement.querySelector('.update-later').click();

    (pwa as any).waitingVersion.next('math-game-def');
    arriveAt('/grade');

    expect(strip()).toBeTruthy();
  });

  it('does not apply anything when the child says later', () => {
    const apply = spyOn(pwa, 'apply');
    waiting();
    arriveAt('/grade');

    fixture.nativeElement.querySelector('.update-later').click();

    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps both answers big enough to hit', () => {
    waiting();
    arriveAt('/grade');

    ['.update-yes', '.update-later'].forEach(selector => {
      const button = fixture.nativeElement.querySelector(selector);
      const rect = button.getBoundingClientRect();
      expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44, selector);
    });
  });

  it('reads as a status rather than interrupting a screen reader', () => {
    waiting();
    arriveAt('/grade');

    expect(strip().getAttribute('role')).toBe('status');
  });

  it('offers a version that will not name itself, and cannot remember a no', () => {
    waiting(null);
    arriveAt('/grade');
    expect(strip()).toBeTruthy();

    fixture.nativeElement.querySelector('.update-later').click();
    fixture.detectChanges();
    // Dismissed for now, but nothing was written down — a nameless build
    // must not silence the ones after it
    expect(localStorage.getItem('updateDeclined')).toBeNull();
  });
});
