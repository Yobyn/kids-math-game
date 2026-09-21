import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  email: string = '';
  error: string = '';
  isRegistering: boolean = false;
  isForgotPassword: boolean = false;
  isLoading: boolean = false;
  successMessage: string = '';

  // Form validation
  usernameValid: boolean = true;
  passwordValid: boolean = true;
  emailValid: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    public languageService: LanguageService
  ) {}

  ngOnInit() {
    // The result screen's offer sends a guest here to sign up, not to sign in
    if (this.route.snapshot.queryParamMap.get('create')) {
      this.isRegistering = true;
    }
  }

  validateForm(): boolean {
    this.usernameValid = !this.isForgotPassword && this.username.length >= 3;
    this.passwordValid = !this.isForgotPassword && this.password.length >= 6;
    this.emailValid = !this.isForgotPassword || this.validateEmail(this.email);

    return this.usernameValid && this.passwordValid && this.emailValid;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSubmit() {
    this.error = '';
    this.successMessage = '';
    
    if (!this.validateForm()) {
      this.error = this.languageService.translate('invalid-form');
      return;
    }

    this.isLoading = true;

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
      this.isLoading = false;
      return;
    }

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.error = '';
        this.isLoading = false;
        this.router.navigate(['/grade']);
      },
      error: (error) => {
        this.error = error.error?.message || this.languageService.translate('login-failed');
        this.isLoading = false;
      }
    });
  }

  register() {
    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.error = '';
        this.successMessage = this.languageService.translate('registration-success');
        this.isLoading = false;
        setTimeout(() => {
          this.isRegistering = false;
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        this.error = error.error?.message || this.languageService.translate('registration-failed');
        this.isLoading = false;
      }
    });
  }

  handlePasswordReset() {
    if (!this.email || !this.validateEmail(this.email)) {
      this.error = this.languageService.translate('enter-valid-email');
      this.isLoading = false;
      return;
    }

    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.error = '';
        this.successMessage = this.languageService.translate('password-reset-sent');
        this.isLoading = false;
        setTimeout(() => {
          this.isForgotPassword = false;
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.error = error.error?.message || this.languageService.translate('password-reset-failed');
        this.isLoading = false;
      }
    });
  }

  /**
   * Straight into a round with no account. Progress is kept locally only;
   * an account is what makes it survive a new device or a cleared browser.
   */
  playAsGuest() {
    this.authService.playAsGuest();
    this.router.navigate(['/grade']);
  }

  toggleMode() {
    if (this.isForgotPassword) {
      this.isForgotPassword = false;
    } else {
      this.isRegistering = !this.isRegistering;
    }
    this.resetForm();
  }

  forgotPassword() {
    this.isForgotPassword = true;
    this.resetForm();
  }

  cancelPasswordReset() {
    this.isForgotPassword = false;
    this.resetForm();
  }

  resetForm() {
    this.error = '';
    this.successMessage = '';
    this.username = '';
    this.password = '';
    this.email = '';
    this.usernameValid = true;
    this.passwordValid = true;
    this.emailValid = true;
  }
}
