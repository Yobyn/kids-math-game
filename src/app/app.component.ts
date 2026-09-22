import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';
import { SoundService } from './services/sound.service';
import { AvatarService } from './services/avatar.service';
import { Avatar } from './avatar/avatar-model';
import { LayoutService } from './services/layout.service';

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

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public soundService: SoundService,
    private avatarService: AvatarService,
    private layoutService: LayoutService,
    private router: Router
  ) {}

  ngOnInit() {
    // Published before anything else renders, so no screen paints in the
    // wrong shape and then jumps
    this.layoutService.start();
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
