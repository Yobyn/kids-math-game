import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  error: string = '';
  isRegistering: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  onSubmit() {
    if (this.isRegistering) {
      this.register();
    } else {
      this.login();
    }
  }

  login() {
    if (!this.username || !this.password) {
      this.error = this.languageService.translate('fill-all-fields');
      return;
    }

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.error = '';
        this.router.navigate(['/grade']);
      },
      error: (error) => {
        this.error = error.error?.message || this.languageService.translate('login-failed');
      }
    });
  }

  register() {
    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.error = '';
        this.isRegistering = false;
      },
      error: (error) => {
        this.error = error.error.message || this.languageService.translate('registration-failed');
      }
    });
  }

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.error = '';
  }
}
