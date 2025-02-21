import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  username: string | null = null;

  constructor(
    public authService: AuthService,
    public languageService: LanguageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(username => {
      this.username = username;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
