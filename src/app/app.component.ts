import {
  AfterViewInit, Component, ComponentFactoryResolver, ComponentRef, ElementRef, OnDestroy, OnInit, ViewChild,
  ViewContainerRef
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';
import { SoundService } from './services/sound.service';
import { AvatarService } from './services/avatar.service';
import { Avatar } from './avatar/avatar-model';
import { LayoutService } from './services/layout.service';
import { PwaService } from './services/pwa.service';
import { ProgressSyncService } from './services/progress-sync.service';
import { environment } from '../environments/environment';
import { DECLINED_KEY, mayOffer } from './pwa/update-offer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  username: string | null = null;
  isGuest = false;
  avatar!: Avatar;
  soundEnabled = true;

  /**
   * True while the child is being told a new version is ready. It only ever
   * appears between rounds — see pwa/update-offer.ts for why never during one.
   */
  showUpdate = false;
  private updateVersion: string | null = null;
  private route = '/';

  @ViewChild('tapLayer', { read: ViewContainerRef }) tapLayer?: ViewContainerRef;
  /** Resolves true once the tap layer is on screen, false if it was not loaded. */
  tapLayerLoaded: Promise<boolean> = Promise.resolve(false);

  @ViewChild('soundLayer', { read: ViewContainerRef }) soundLayer?: ViewContainerRef;
  @ViewChild('soundButton') soundButton?: ElementRef<HTMLButtonElement>;
  /** True while the sound picker is open. */
  soundsOpen = false;
  private soundPicker?: ComponentRef<{ closed: { subscribe(fn: () => void): unknown } }>;
  private opening?: Promise<boolean>;
  private destroyed = false;

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public soundService: SoundService,
    private avatarService: AvatarService,
    private layoutService: LayoutService,
    private pwaService: PwaService,
    private progressSync: ProgressSyncService,
    private router: Router,
    private resolver: ComponentFactoryResolver
  ) {}

  ngOnInit() {
    // Published before anything else renders, so no screen paints in the
    // wrong shape and then jumps
    this.layoutService.start();
    // Registered through the injector, so the instance that watches for a new
    // version is the same one this component asks about it
    this.pwaService.register(navigator, environment.production);
    // Signing in is the moment a new device has an account to ask what this
    // child earned. Nothing on screen waits for the answer.
    this.progressSync.start();
    this.authService.getCurrentUser().subscribe(username => {
      this.username = username;
    });
    this.authService.isGuest$().subscribe(isGuest => {
      this.isGuest = isGuest;
    });
    this.avatarService.changes().subscribe(avatar => {
      this.avatar = avatar;
    });
    this.soundService.isEnabled().subscribe(enabled => {
      this.soundEnabled = enabled;
    });

    // Seeded from the router, not only from its events. The initial
    // navigation finishes before this component's ngOnInit runs, so a child
    // who opens the game straight onto /grade never sees a NavigationEnd —
    // and the route stayed '/' for the rest of the session, which meant the
    // offer could never appear at all. Invisible to a unit test that sets
    // the route by hand; obvious the moment a real browser ran two deploys.
    this.route = this.router.url;

    // And it follows the child around rather than appearing wherever the
    // update happened to finish installing
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.route = event.urlAfterRedirects;
        this.considerUpdate();
      }
    });
    this.pwaService.version().subscribe(version => {
      this.updateVersion = version;
      this.considerUpdate();
    });
  }

  /** Asks the rule, rather than deciding here. */
  private considerUpdate(): void {
    this.showUpdate = mayOffer({
      ready: this.pwaService.isReady(),
      route: this.route,
      version: this.updateVersion,
      declined: this.declinedVersion()
    });
  }

  /** Yes: the waiting version takes over, and the page reloads when it has. */
  takeUpdate(): void {
    this.showUpdate = false;
    this.pwaService.apply();
  }

  /**
   * Later: nothing happens now, and this version does not ask again. A newer
   * one will, because that is a different question.
   */
  laterUpdate(): void {
    this.showUpdate = false;
    if (!this.updateVersion) {
      return;
    }
    try {
      localStorage.setItem(DECLINED_KEY, this.updateVersion);
    } catch {
      // Without storage it asks again next time, which is the safer way round
    }
  }

  private declinedVersion(): string | null {
    try {
      return localStorage.getItem(DECLINED_KEY);
    } catch {
      return null;
    }
  }

  ngAfterViewInit() {
    this.tapLayerLoaded = this.loadTapLayer();
    // The sounds are fetched after the first screen too, so the first right
    // answer is not waiting on a download. Not at all for a child with none.
    if (this.soundService.enabledValue) {
      this.soundService.preload();
    }
  }

  /**
   * Fetches the layer that answers a tap, after the first screen is drawn:
   * nothing can be tapped before then, so it has no business in the first
   * load. Under reduced motion it would never draw anything, so it is not
   * fetched at all. If the fetch fails (offline before it was ever cached)
   * the game is the same, only quieter.
   */
  private async loadTapLayer(): Promise<boolean> {
    if (typeof window === 'undefined' || (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      return false;
    }
    try {
      const { TapSparksComponent } = await import('./particles/tap-sparks.module');
      if (this.destroyed || !this.tapLayer) {
        return false;
      }
      const layer = this.tapLayer.createComponent(this.resolver.resolveComponentFactory(TapSparksComponent));
      layer.changeDetectorRef.detectChanges();
      return true;
    } catch {
      return false;
    }
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.soundPicker?.destroy();
    this.layoutService.stop();
  }

  openCharacter() {
    this.router.navigate(['/avatar']);
  }

  /**
   * Opens the sound picker over whatever is on screen: fetched the first time,
   * never in the first load. A round in progress is untouched underneath.
   */
  openSounds(): Promise<boolean> {
    // A second press while the first is still fetching waits for the same picker
    if (!this.opening) {
      this.opening = this.showSounds().finally(() => this.opening = undefined);
    }
    return this.opening;
  }

  private async showSounds(): Promise<boolean> {
    if (this.soundPicker) {
      return true;
    }
    this.soundsOpen = true;
    try {
      const { SoundPickerComponent } = await import('./sound/sound-picker.module');
      if (this.destroyed || !this.soundLayer) {
        this.soundsOpen = false;
        return false;
      }
      const picker = this.soundLayer.createComponent(this.resolver.resolveComponentFactory(SoundPickerComponent));
      this.soundPicker = picker;
      picker.instance.closed.subscribe(() => this.closeSounds());
      picker.changeDetectorRef.detectChanges();
      return true;
    } catch {
      // Offline before it was ever fetched: nothing to show, and nothing broken
      this.soundsOpen = false;
      return false;
    }
  }

  closeSounds() {
    this.soundPicker?.destroy();
    this.soundPicker = undefined;
    this.soundsOpen = false;
    // Back to the button that opened it, so a keyboard is not lost
    this.soundButton?.nativeElement.focus();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * A guest keeps their guest flag on the way to the login screen: if they
   * change their mind they can still step back into the round they were in.
   */
  signIn() {
    this.router.navigate(['/login']);
  }
}
