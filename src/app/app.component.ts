import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';
import { SoundService } from './services/sound.service';
import { AvatarService } from './services/avatar.service';
import { Avatar } from './avatar/avatar-model';
import { LayoutService } from './services/layout.service';
import { PwaService } from './services/pwa.service';
import { environment } from '../environments/environment';
import { DECLINED_KEY, mayOffer } from './pwa/update-offer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
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

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public soundService: SoundService,
    private avatarService: AvatarService,
    private layoutService: LayoutService,
    private pwaService: PwaService,
    private router: Router
  ) {}

  ngOnInit() {
    // Published before anything else renders, so no screen paints in the
    // wrong shape and then jumps
    this.layoutService.start();
    // Registered through the injector, so the instance that watches for a new
    // version is the same one this component asks about it
    this.pwaService.register(navigator, environment.production);
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

  ngOnDestroy() {
    this.layoutService.stop();
  }

  openCharacter() {
    this.router.navigate(['/avatar']);
  }

  toggleSound() {
    this.soundService.toggle();
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
