import { Component } from '@angular/core';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  isRegistering: boolean = false;

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (this.isRegistering) {
      this.register();
    } else {
      this.login();
    }
  }

  login() {
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = error.error.message || 'Login failed';
      }
    });
  }

  register() {
    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.errorMessage = '';
        this.isRegistering = false;
      },
      error: (error) => {
        this.errorMessage = error.error.message || 'Registration failed';
      }
    });
  }

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.errorMessage = '';
  }
}
