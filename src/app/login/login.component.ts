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
  email: string = '';
  error: string = '';
  isRegistering: boolean = false;
  isForgotPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  onSubmit() {
    if (this.isForgotPassword) {
      this.handlePasswordReset();
    } else if (this.isRegistering) {
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

  handlePasswordReset() {
    if (!this.email) {
      this.error = this.languageService.translate('enter-email');
      return;
    }

    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.error = '';
        alert(this.languageService.translate('password-reset-sent'));
        this.isForgotPassword = false;
      },
      error: (error) => {
        this.error = error.error?.message || this.languageService.translate('password-reset-failed');
      }
    });
  }

  toggleMode() {
    if (this.isForgotPassword) {
      this.isForgotPassword = false;
    } else {
      this.isRegistering = !this.isRegistering;
    }
    this.error = '';
  }

  forgotPassword() {
    this.isForgotPassword = true;
    this.error = '';
  }

  cancelPasswordReset() {
    this.isForgotPassword = false;
    this.error = '';
  }
}
