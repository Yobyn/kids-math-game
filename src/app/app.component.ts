import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';
import { SoundService } from './services/sound.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  username: string | null = null;
  isGuest = false;
  soundEnabled = true;

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    public soundService: SoundService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(username => {
      this.username = username;
    });
    this.authService.isGuest$().subscribe(isGuest => {
      this.isGuest = isGuest;
    });
    this.soundService.isEnabled().subscribe(enabled => {
      this.soundEnabled = enabled;
    });
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
