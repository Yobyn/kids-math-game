import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    public languageService: LanguageService
  ) {}

  register() {
    if (!this.username || !this.password) {
      this.error = this.languageService.translate('fill-all-fields');
      return;
    }

    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/grade']);
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error.message || this.languageService.translate('registration-failed');
      }
    });
  }
} 