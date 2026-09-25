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

  afterEach(() => {
    // Destroyed, so the tap layer it loads takes its document listeners with it
    fixture.destroy();
    localStorage.clear();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('loads the tap layer after the first screen, last, so it draws over everything', async () => {
    expect(await component.tapLayerLoaded).toBe(true);

    const root: HTMLElement = fixture.nativeElement;
    expect(root.lastElementChild!.tagName).toBe('APP-TAP-SPARKS');
    expect(root.querySelectorAll('app-tap-sparks').length).toBe(1);
  });

  it('does not even fetch the tap layer under reduced motion', async () => {
    // Answers only the real question, so asking the wrong one loads the layer
    spyOn(window, 'matchMedia').and.callFake(query =>
      ({ matches: query === '(prefers-reduced-motion: reduce)' } as MediaQueryList));
    const still = TestBed.createComponent(AppComponent);
    still.detectChanges();

    expect(await still.componentInstance.tapLayerLoaded).toBe(false);
    expect(still.nativeElement.querySelector('app-tap-sparks')).toBeNull();
    still.destroy();
  });

  it('does not add a tap layer to a page that has already gone', async () => {
    const gone = TestBed.createComponent(AppComponent);
    gone.detectChanges();
    gone.destroy();

    expect(await gone.componentInstance.tapLayerLoaded).toBe(false);
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

  it('starts with sound on', () => {
    expect(component.soundEnabled).toBe(true);
  });

  it('opens the sound picker from the header, over the screen, without going anywhere', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sound-btn');
    expect(button.getAttribute('aria-label')).toBe('Sounds');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    expect(await component.openSounds()).toBe(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-sound-picker').length).toBe(1);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens only one picker however many times the button is pressed', async () => {
    await Promise.all([component.openSounds(), component.openSounds(), component.openSounds()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-sound-picker').length).toBe(1);
  });

  it('closes the picker when it asks, and hands focus back to the sound button', async () => {
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();
    await component.openSounds();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-sound-picker .close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-sound-picker')).toBeNull();
    expect(component.soundsOpen).toBe(false);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('.sound-btn'));
  });

  it('shows the header button muted once "no sound" is picked there', async () => {
    TestBed.inject(AuthService).playAsGuest();
    fixture.detectChanges();
    await component.openSounds();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('app-sound-picker [data-choice="off"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.soundEnabled).toBe(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.sound-btn');
    expect(button.classList).toContain('muted');
    expect(button.textContent).toContain('🔇');
    expect(new SoundService().choiceValue).toBe('off');
  });

  it('puts the picker under the tap layer, so a tap on it still sparkles', async () => {
    await component.tapLayerLoaded;
    await component.openSounds();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const picker = root.querySelector('app-sound-picker')!;
    const sparks = root.querySelector('app-tap-sparks')!;
    expect(picker.compareDocumentPosition(sparks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('fetches the sounds after the first screen, but not for a child with none', async () => {
    const sound = TestBed.inject(SoundService);
    expect(sound.enabledValue).toBe(true);
    const preload = spyOn(sound, 'preload').and.returnValue(Promise.resolve(true));
    const again = TestBed.createComponent(AppComponent);
    again.detectChanges();
    expect(preload).toHaveBeenCalledTimes(1);
    again.destroy();

    sound.choose('off');
    const quiet = TestBed.createComponent(AppComponent);
    quiet.detectChanges();
    expect(preload).toHaveBeenCalledTimes(1);
    quiet.destroy();
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

  afterEach(() => {
    // Destroyed, so the tap layer it loads takes its document listeners with it
    fixture.destroy();
    localStorage.clear();
  });

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
