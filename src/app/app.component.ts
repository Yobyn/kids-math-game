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
}
